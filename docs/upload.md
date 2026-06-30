# 对象存储（OSS / S3）集成

timex 用 S3 兼容协议做对象存储，默认本地 MinIO，生产可一键切到 Aliyun OSS / AWS S3。

## 架构

```
┌──────────┐  1. presign   ┌──────────┐                  ┌──────────┐
│ Frontend │──────────────▶│ Backend  │  getSignedUrl()  │   S3     │
│          │◀──────────────│          │─────────────────▶│ (MinIO)  │
│          │  signed URL   │          │                  │          │
│          │                                               │          │
│          │  2. PUT 直传文件到 S3                          │          │
│          │──────────────────────────────────────────────▶│          │
│          │                                               │          │
│          │  3. complete (通知后端校验)                    │          │
│          │──────────────▶│  HeadObject  ────────────────▶│          │
│          │               │  返回 publicUrl              │          │
│          │◀──────────────│                              │          │
│ 4. create Moment  ──────▶│  moment.mediaUrl = publicUrl │          │
└──────────┘               └──────────┘                  └──────────┘
```

**优势**：客户端直传不经过后端带宽；后端只发签名（轻量）；S3 端承受流量。

## 本地开发（MinIO）

### 1. 启动 MinIO

`docker-compose.yml` 已包含 minio + minio-init（自动建 bucket）：

```bash
docker compose up -d minio
```

若已运行其它项目的 MinIO（端口 9000-9001 占用），可复用：

```bash
docker exec <minio-container> sh -c "
  mc alias set local http://localhost:9000 minioadmin minioadmin &&
  mc mb --ignore-existing local/timex-uploads &&
  mc anonymous set download local/timex-uploads
"
```

控制台：<http://localhost:9001>（账号 `minioadmin` / `minioadmin`）

### 2. 配置 ENV

`backend/.env`（默认已就位）：

```bash
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=timex-uploads
S3_PUBLIC_URL=http://localhost:9000/timex-uploads
S3_PRESIGNED_TTL=900         # 签名 15 分钟过期
MAX_UPLOAD_SIZE=104857600    # 100MB 全局上限
```

### 3. 启动后端 + 上传

```bash
cd backend && npm run start:dev

# 浏览器登录 → 进入任意事件 → 点 FAB → 上传素材
# 进度条显示 %，完成后自动创建 Moment
```

## 生产：切 Aliyun OSS

只需改 ENV，**代码零改动**：

```bash
S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
S3_REGION=oss-cn-hangzhou
S3_ACCESS_KEY=<your-access-key-id>
S3_SECRET_KEY=<your-access-key-secret>
S3_BUCKET=timex-prod
S3_PUBLIC_URL=https://timex-prod.oss-cn-hangzhou.aliyuncs.com
S3_PRESIGNED_TTL=900
MAX_UPLOAD_SIZE=104857600
S3_FORCE_PATH_STYLE=false   # OSS 用 virtual-hosted-style
```

Aliyun 控制台 → OSS → 创建 bucket `timex-prod`（读写权限：私有；CDN 回源可选）→ 创建 RAM 子账号，授权 `AliyunOSSFullAccess` 或更细的 `oss:PutObject / GetObject / HeadObject / DeleteObject`。

> **路径风格**：MinIO 必须 path-style（`{endpoint}/{bucket}/{key}`），Aliyun OSS / AWS S3 默认 virtual-hosted。`S3_FORCE_PATH_STYLE` 默认 `true`（兼容 MinIO），切云端时设 `false`。

## 切 AWS S3

```bash
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY=<IAM access key>
S3_SECRET_KEY=<IAM secret>
S3_BUCKET=timex-prod
S3_PUBLIC_URL=https://timex-prod.s3.amazonaws.com
S3_FORCE_PATH_STYLE=false
```

IAM 策略最小权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:HeadObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::timex-prod/*"
    }
  ]
}
```

## 客户端 API

`frontend/src/api/upload.js` 暴露：

```js
import { uploadApi } from '../api/upload';

// 1) 一站式：返回 { key, url, fileSize, contentType }
const result = await uploadApi.uploadFile(file, 'photo', {
  onProgress: (pct) => console.log(pct, '%'),
  width: 1920,
  height: 1080,
});

// 2) 分步（更细控制）
const presigned = await uploadApi.presign({ kind: 'photo', mimeType: 'image/jpeg', fileSize: 1234 });
await uploadApi.uploadToUrl(presigned.url, file, onProgress);
const done = await uploadApi.complete({ key: presigned.key, width: 1920 });

// 3) 删除
await uploadApi.remove('uploads/user-1/photo/abc.jpg');
```

## 后端 API

| Method | Path                      | 用途                                    | 鉴权 |
|--------|---------------------------|-----------------------------------------|------|
| POST   | `/api/upload/sign`        | 拿签名 URL（body: kind, mimeType, fileSize） | JWT  |
| POST   | `/api/upload/complete`    | 通知上传完成（body: key, width?, height?, duration?） | JWT  |
| DELETE | `/api/upload/:key`        | 删除对象（带所有权校验）                | JWT  |

### curl 示例

```bash
# 1) 拿签名
TOKEN=eyJ...
SIGNED=$(curl -sS -X POST http://localhost:3000/api/upload/sign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"photo","mimeType":"image/jpeg","fileSize":12345}')
URL=$(echo $SIGNED | jq -r .url)
KEY=$(echo $SIGNED | jq -r .key)

# 2) 上传
echo "fake jpg content" > /tmp/x.jpg
curl -sS -X PUT "$URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/tmp/x.jpg

# 3) 通知后端
curl -sS -X POST http://localhost:3000/api/upload/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$KEY\"}"
# → { key, url, fileSize, contentType, ... }
```

## 校验

### 限制

| kind     | mime 白名单                                            | size 上限 |
|----------|--------------------------------------------------------|-----------|
| photo    | jpeg / png / webp / gif / heic / heif                 | 20 MB     |
| video    | mp4 / quicktime / webm / x-matroska                   | 500 MB    |
| audio    | mpeg / mp3 / wav / aac / ogg / x-m4a / mp4            | 50 MB     |
| document | pdf                                                    | 10 MB     |

全局上限 `MAX_UPLOAD_SIZE`（默认 100MB）会覆盖 kind 级上限。

### 所有权

所有 key 强制前缀 `uploads/{userId}/`，complete/remove 校验失败抛 `ForbiddenException`，**防止横向越权**。

## 排错

- **`HeadBucket failed: networking error`** → 检查 `S3_ENDPOINT` 可达，防火墙 / VPC
- **CORS 报错（前端 PUT 失败）** → MinIO/OSS 控制台配 CORS：
  ```
  AllowedOrigins: *
  AllowedMethods: PUT, GET, HEAD
  AllowedHeaders: *
  ```
- **签名 URL 403 on PUT** → 时钟偏移。`S3_PRESIGNED_TTL` 内完成；服务器开启 NTP
- **`forcePathStyle` 错误** → MinIO/OSS 必须 path-style；AWS S3 切 `S3_FORCE_PATH_STYLE=false`

## 文件清单

- 后端：`backend/src/upload/`（config / client / service / controller / specs）
- 前端：`frontend/src/api/upload.js` + `frontend/src/components/UploadModal.jsx`
- ENV：`backend/.env` / `.env.example`
- 基础设施：`docker-compose.yml`（minio + minio-init）

## 进阶

- **缩略图**：上传后调用后端图片处理（sharp/imagor）生成 thumbnail，存到 `uploads/{userId}/thumb/{key}`
- **AI 打标**：上传图片后异步任务 → 调用视觉模型 → 写回 `Moment.aiTags`（详见 `ai-integration.md`，待写）
- **CDN**：Aliyun CDN / CloudFront 绑自定义域名替换 `S3_PUBLIC_URL`，前端无需改动
