# OSS 上传集成 实现计划

> **目标**：完成 `upload/` 模块，实现照片 / 视频 / 音频的真实上传流程。

**架构**：Adapter 模式
- `S3Adapter`（@aws-sdk/client-s3 + s3-request-presigner）— 兼容 MinIO / Aliyun OSS / AWS S3
- 客户端直传（presigned PUT URL，不经过后端带宽）
- 后端只发签名 + 完成后校验入库

**技术栈**：
- 后端：`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` + `mime-types` + `class-validator`
- 前端：XHR + `axios` 已有
- 基础设施：MinIO（docker-compose），S3 endpoint 兼容

**环境变量**（.env）：
```
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=timex-uploads
S3_PUBLIC_URL=http://localhost:9000/timex-uploads
S3_PRESIGNED_TTL=900
MAX_UPLOAD_SIZE=104857600  # 100MB
```

---

## 任务清单

### Task 1: MinIO 加入 docker-compose
**目标**：本地起 S3 兼容服务

**变更**：
- `docker-compose.yml`：加 `minio` service + `minio-data` volume + `minio-init` 一次性建 bucket
- 暴露 9000（S3 API）+ 9001（控制台）

### Task 2: 安装 S3 SDK
**目标**：后端依赖就绪

**变更**：
- `backend/package.json`：`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` + `mime-types`
- pnpm install

### Task 3: Upload 配置 + Module
**目标**：S3 client + bucket ensure

**新建**：
- `backend/src/upload/upload.config.ts` — 从 ENV 读 S3Config
- `backend/src/upload/s3.client.ts` — S3Client 单例 + ensureBucket()
- `backend/src/upload/upload.module.ts` — 导出 S3Client provider

### Task 4: UploadService（adapter）
**目标**：签名 / 完成 / 删除

**新建**：
- `backend/src/upload/upload.service.ts`
  - `presign(userId, mimeType, fileSize)` → `{ key, url, expiresAt, maxSize }`
  - `complete(userId, key, meta)` → `{ url, thumbnailUrl?, width?, height?, fileSize }`（存 DB）
  - `remove(userId, key)` → void（带所有权校验）
- 校验：mime 白名单、size 上限、key 前缀 (`uploads/{userId}/`)

### Task 5: UploadController
**目标**：暴露 3 个端点

**新建**：
- `backend/src/upload/upload.controller.ts`
  - `POST /api/upload/sign` body: `{mimeType, fileSize, kind: 'photo'|'video'|'audio'}` → `{url, key, expiresAt}`
  - `POST /api/upload/complete` body: `{key, kind, duration?, width?, height?}` → `{url, thumbnailUrl?, ...}`
  - `DELETE /api/upload/:key` → 204

### Task 6: 测试
**目标**：100% 覆盖 service

**新建**：
- `backend/src/upload/upload.service.spec.ts`（mock S3Client）

### Task 7: 前端 uploadApi
**目标**：客户端封装

**新建**：
- `frontend/src/api/upload.js`：`presign()` / `complete()` / `remove()` / `uploadFile(file, onProgress)`
- 进度回调基于 XHR `progress` 事件

### Task 8: UploadButton 组件
**目标**：可复用 UI

**新建**：
- `frontend/src/components/UploadButton.jsx` — 接收 `onUploaded(url, meta)` 回调 + kind + accept
- 进度条 + 错误处理 + 上传中禁用

### Task 9: Moments create 流程串入
**目标**：创建 Moment 时能直接上传

**变更**：
- `frontend/src/pages/EventPage.jsx`（或对应添加 Moment 的 UI）：加 UploadButton
- 改 `momentsApi.create` 流程：先 upload → 用返回 url → create Moment

### Task 10: 文档
**目标**：开发者可上手

**新建**：
- `docs/upload.md` — 架构 / ENV / MinIO 控制台 / Aliyun OSS 切换指南
- 更新 `docs/api.md` + `docs/deployment.md`

### Task 11: 健康检查覆盖
**目标**：CI 验证新模块

**变更**：
- `scripts/health-check.sh`：加 upload module 测试

---

## 验收

- [ ] `docker compose up minio` 启动后控制台可见（http://localhost:9001）
- [ ] 集成测试：presign → 上传文件到 URL → complete → 返回可访问 URL
- [ ] curl 能从 `S3_PUBLIC_URL` 拉到上传的文件
- [ ] 后端测试：156+ → 170+ tests passing
- [ ] 前端：UploadButton 在 EventPage 中可见可用
- [ ] 切 Aliyun OSS 只需改 ENV（验证文档 step-by-step）
