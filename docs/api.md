# API 参考

> Base URL: `http://localhost:3000/api`（开发）/ 由部署配置决定（生产）
> 鉴权：除 `/auth/*` 与 `/public/*` 外，全部需要 `Authorization: Bearer <accessToken>`

## 通用响应

成功：
```json
{ "data": <payload> }
```

失败：
```json
{ "statusCode": 400, "message": "validation failed", "error": "Bad Request" }
```

---

## Auth `/api/auth`

### `POST /auth/register`
```json
// Request
{ "email": "user@example.com", "password": "min8chars", "nickname": "可选", "phone": "可选" }

// Response 200
{
  "data": {
    "user": { "id": "uuid", "email": "...", "nickname": "..." },
    "tokens": { "accessToken": "jwt", "refreshToken": "jwt" }
  }
}
```

### `POST /auth/login`
```json
// Request
{ "email": "user@example.com", "password": "..." }

// Response 200
{
  "data": {
    "user": { "id": "uuid", "email": "...", "nickname": "...", "avatarUrl": null },
    "tokens": { "accessToken": "jwt", "refreshToken": "jwt" }
  }
}
```

### `POST /auth/refresh`
```json
// Request
{ "refreshToken": "jwt" }
// Response 200: { "data": { "accessToken": "...", "refreshToken": "..." } }
```

### `GET /auth/me`
Response 200:
```json
{
  "data": {
    "id": "uuid",
    "email": "...",
    "nickname": "...",
    "avatarUrl": null,
    "isTrialActive": true,
    "trialExpiresAt": "2026-07-12T...",
    "createdAt": "2026-06-27T..."
  }
}
```

---

## Events `/api/events`

### `GET /events?year=2024&stage=family&keyword=创业&page=1&limit=20`
Response 200:
```json
{
  "data": {
    "events": [
      {
        "id": "uuid",
        "title": "...",
        "date": "2024-06-01",
        "location": "北京协和医院",
        "placeId": "uuid",
        "place": { "id": "uuid", "name": "...", "type": "city", "latitude": "...", "longitude": "..." },
        "stage": "family",
        "summary": "...",
        "longText": "...",
        "coverUrl": null,
        "weight": 100,
        "people": [ { "id": "uuid", "name": "...", "role": "...", "avatarUrl": null } ],
        "moments": [ /* Moment 数组 */ ],
        "chapters": [ /* 关联的章节 */ ],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

### `GET /events/timeline?startYear=2020&endYear=2026&page=1&limit=50`
按年分组返回：
```json
{
  "data": {
    "timeline": [
      { "year": 2024, "events": [ /* 2024 年所有事件 */ ] },
      { "year": 2023, "events": [] },
      ...
    ],
    "total": 9
  }
}
```

### `GET /events/:id`
返回单个事件，结构同 list 中元素。

### `POST /events`
```json
// Request
{
  "title": "...",
  "date": "2024-06-01",
  "location": "...",
  "placeId": "uuid (可选)",
  "stage": "family",
  "summary": "...",
  "longText": "...",
  "coverUrl": "...",
  "weight": 0,
  "personIds": ["uuid", "uuid"]
}
```

### `PUT /events/:id`
同 POST，全部字段可选。

### `DELETE /events/:id`
204 No Content

---

## Places `/api/places`

### `GET /places?page=1&limit=20`
```json
{
  "data": {
    "places": [
      {
        "id": "uuid",
        "name": "北京中关村",
        "type": "city",
        "summary": "...",
        "latitude": "39.98",
        "longitude": "116.31",
        "firstSeenAt": "2024-01-01",
        "latestSeenAt": "2024-12-31",
        "createdAt": "..."
      }
    ],
    "total": 3
  }
}
```

### `GET /places/:id` / `POST /places` / `PUT /places/:id` / `DELETE /places/:id`
同 events 模式。

---

## People `/api/people`

### `GET /people?page=1&limit=20`
```json
{
  "data": {
    "people": [
      {
        "id": "uuid",
        "name": "张三",
        "role": "联合创始人",
        "intro": "...",
        "avatarUrl": null,
        "firstSeenAt": "2024-01-01",
        "latestSeenAt": "2024-12-31",
        "events": [ /* 关联的 events */ ],
        "createdAt": "..."
      }
    ],
    "total": 3
  }
}
```

### `GET /people/:id`
返回单个人物，结构同上。

### `POST /people` / `PUT /people/:id` / `DELETE /people/:id`

---

## Moments `/api/moments`

### `GET /moments?type=photo&eventId=uuid&page=1&limit=20`
```json
{
  "data": {
    "moments": [
      {
        "id": "uuid",
        "type": "photo | video | audio | text",
        "title": "...",
        "content": "...",
        "mediaUrl": "https://...",
        "thumbnailUrl": "https://...",
        "duration": 12,        // 视频/音频 秒数
        "width": 1920,
        "height": 1080,
        "fileSize": 1234567,
        "longitude": "116.31",
        "latitude": "39.98",
        "takenAt": "2024-06-01T10:00:00Z",
        "aiTags": ["tag1", "tag2"],
        "aiSummary": "...",
        "transcript": "...",
        "eventId": "uuid",
        "event": { /* 关联事件 */ }
      }
    ]
  }
}
```

### `POST /moments` 等 CRUD 同上

---

## Memoirs `/api/memoirs`

### `GET /memoirs?status=draft&page=1&limit=20`
```json
{
  "data": {
    "memoirs": [
      {
        "id": "uuid",
        "title": "...",
        "blurb": "...",
        "status": "draft | published | archived",
        "coverUrl": null,
        "isPublic": false,
        "shareToken": "...",
        "chapters": [
          {
            "id": "uuid",
            "title": "...",
            "content": "...",
            "sortOrder": 0,
            "coverUrl": null,
            "status": "draft",
            "events": [ /* 关联的 events */ ]
          }
        ],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

### `GET /memoirs/:id`
### `POST /memoirs` / `PUT /memoirs/:id` / `DELETE /memoirs/:id`
### `POST /memoirs/:id/share`
Response: `{ "data": { "shareToken": "abc123..." } }`

### 公开分享（无需鉴权）
`GET /public/memoirs/s/:shareToken`
返回完整 memoir + chapters（按 sortOrder 排序）。

---

## Faces `/api/faces` (v1.1)

v1.1 个人画像 API：一用户一 self 档案；pgvector 余弦 ANN；mock provider 默认，cloud/local 通过 `FACE_PROVIDER` 切换。

| Method | Path | 说明 |
|---|---|---|
| GET    | /api/faces/me                  | 取本用户 self profile 概览（含 enabled references + 命中统计） |
| POST   | /api/faces/me/references       | 添加参考图 `{ imageUrl, bboxHint? }` → `{ refId, jobId }`（后端异步 extract embedding） |
| DELETE | /api/faces/me/references/:id   | 删除参考 |
| PATCH  | /api/faces/me/references/:id   | 启停参考 `{ enabled: bool }` |
| POST   | /api/faces/search              | `{ threshold?, topK? }` → 命中数组（cosine distance + moment info） |
| POST   | /api/faces/moments/:id/extract | 给单张 moment 异步提取人脸 → `{ jobId }` |
| POST   | /api/faces/backfill            | 一次性回填本人所有未提取的 photo moments（IIFE 跑在内存） |
| GET    | /api/faces/backfill/status     | 回填进度 `{ total, done, failed, inProgress }` |

### `/api/faces/dumps/*`（v1.1 临时检索）

scratch dump 子模块（照片不进库）：临时上传一批 → 人脸提取 → 检索。

| Method | Path | 说明 |
|---|---|---|
| POST   | /api/faces/dumps                    | 新建 dump `{ name, description? }` → `{ dumpId }` |
| GET    | /api/faces/dumps                    | 列本人 dump（?limit=） |
| GET    | /api/faces/dumps/:id                | 单个 dump 详情 |
| DELETE | /api/faces/dumps/:id                | 删除 dump（CASCADE items） |
| POST   | /api/faces/dumps/:id/photos         | 加一张照片 `{ imageUrl, takenAt?, fileMtime?, filename?, width?, height? }` |
| GET    | /api/faces/dumps/:id/items          | 列出 dump 内照片（?status=pending|processed|failed） |
| GET    | /api/faces/dumps/:id/status         | 进度 `{ total, done, failed, status: 'created'\|'processing'\|'done'\|'failed' }`（status='processing' 时建议 1s 轮询） |
| POST   | /api/faces/dumps/:id/search         | 检索命中 `{ threshold?, topK? }` → hit 数组（item + distance + sortKey + sortValue） |

> 命中 sortKey 优先 `takenAt` → fallback `fileMtime` → 最后 `uploadedAt`；结果按 sortValue 倒序。

---

## License `/api/license`

### `GET /license`
当前用户的 license + 设备列表。

### `POST /license/activate`
```json
{ "licenseKey": "TRIAL-..." }
```

### `DELETE /license/devices/:deviceId`
注销某设备。

---

## 错误码

| 状态码 | 含义 |
|---|---|
| 400 | 请求参数校验失败 |
| 401 | 未登录 / token 无效 / 过期 |
| 403 | 鉴权失败（非本人资源） |
| 404 | 资源不存在 |
| 409 | 冲突（重复邮箱等） |
| 500 | 服务器内部错误 |
