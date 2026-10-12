# 个人画像功能 — 设计文档

> 状态：Draft v1（2026-10-12）
> 配套需求：[docs/requirements/face-profile.md](../../requirements/face-profile.md)

## 1. 文档说明

### 1.1 目标

承接需求文档，**明确给出**：

- 后端模块边界、`face` 模块的接口与数据流（含临时 scratch dump 子流程）
- 数据库 schema：pgvector + 4 张表（`user_face_embeddings` / `moment_faces` / `scratch_dumps` / `scratch_dump_items`）+ ivfflat 索引
- AI 异步任务管线（face-embed / face-extract / face-extract-scratch 三种 kind）
- Provider 抽象（cloud + local + mock）
- 前端 `/faces` 页面、`/faces/dumps` 列表与详情、Moment 详情按钮的交互
- 测试策略（含具体测试用例锚点）
- 子模块拆分与 commit 节奏

### 1.2 范围

本文不展开：

- InsightsFace 模型训练 / 调参细节
- pgvector 内部 ANN 算法源码
- 商业化 / 计费
- dump 中命中照片"提升到正式 moments"流程（v1.x）
- 时间线智能排序 / 拼图叙事（v2.x）

### 1.3 与既有架构的对齐

- **AI 异步任务**：复用 [docs/AI_INTEGRATION.md](../../../AI_INTEGRATION.md) 的 `AiService` / `ai_jobs` 表 / `provider` 抽象，新增 3 个 `kind`
- **数据迁移**：使用 [backend/src/migrations/runner.ts](../../../backend/src/migrations/runner.ts)（SQL 增量）
- **多租户隔离**：Service 层强制 `userId` 过滤（与现有 CRUD 同型）
- **前端派生**：6 条线派生模式 `frontend/src/data/apiAdapter.js` 作为 layout 参考

---

## 2. 架构总览

```
┌────────────────┐        ┌─────────────────┐         ┌──────────────────┐
│ 浏览器 (SPA)   │ ──────▶│  NestJS 后端    │ ──────▶ │  face-provider   │
│ React + Vite   │  HTTPS  │  /api/faces/*   │  HTTP   │  (cloud / local) │
│  /faces        │         │  /faces/dumps/* │         │  InsightFace /  │
│  /faces/dumps  │ JSON+JWT│                 │         │  云端 face API   │
└────────────────┘         └────────┬────────┘         └──────────────────┘
                                     │
                          ┌──────────┴──────────────┐
                          ▼                          ▼
                  ┌─────────────────┐        ┌──────────────────┐
                  │  PostgreSQL     │        │   ai_jobs 表     │
                  │  + pgvector     │        │  (原有，复用)    │
                  │  - user_face_   │        │  + face-embed    │
                  │    embeddings   │        │  + face-extract  │
                  │  - moment_faces │        │  + face-extract- │
                  │  - scratch_     │        │    scratch       │
                  │    dumps        │        └──────────────────┘
                  │  - scratch_dump │
                  │    _items       │
                  └─────────────────┘
```

> 双流程并存：
> - **永久库检索流程**：`user_face_embeddings` ↔ `moment_faces`（face-extract job）
> - **临时 dump 流程**：`user_face_embeddings` ↔ `scratch_dump_items`（face-extract-scratch job）
> 两者输出 UI 形态接近（时间线/人物/地点三视图），但隔离数据生命周期。

### 2.1 数据流：典型请求"对个人永久库检索所有照片"

```
前端 POST /api/faces/search { threshold?, topK? }
        │
        ▼
FaceController.search @CurrentUser('id') userId
        │
        ▼
FaceService.searchByPerson(userId, personId)
        │
        ├─ 1. 拉 person_face_embeddings for (userId, personId) → N 个 query embedding
        │
        ├─ 2. pgvector ANN: SELECT moment_id, MIN(distance) AS dist
        │   FROM moment_faces
        │   WHERE user_id = userId AND moment_id IN (本用户照片 moments)
        │   GROUP BY moment_id
        │   HAVING MIN(distance) ≤ threshold
        │   ORDER BY dist ASC LIMIT topK;
        │
        └─ 3. 命中 moment 列表 JOIN moments LEFT JOIN places 以带回 place_id
              返回 { moment, place?, distance } 流
        ▼
前端三 Tab：Timeline / Persons / Places
```

### 2.2 数据流：新增参考照片

```
前端 POST /api/faces/me/references { imageUrl, bboxHint? }
        │
        ▼
FaceController.addReference
        │
        ▼
FaceService.addReference(userId, imageUrl)
        │
        ├─ 1. INSERT user_face_embeddings (embedding 暂全 0 占位)
        │
        └─ 2. 入队 ai_jobs(kind: 'face-embed', targetType: 'face_reference', targetId: refId)
              │
              ▼
            AiService.runJob → FaceJobHandler.runEmbed
                                              │
                                              ├─ FaceProvider.detectAndEmbed(imageUrl)
                                              │     ├─ Cloud: HTTP POST → embeddings[]
                                              │     ├─ Local: HTTP POST → embeddings[]
                                              │     └─ Mock: 确定性 1-face embeddings
                                              │
                                              └─ 选最大人脸 → UPDATE user_face_embeddings
```

### 2.3 数据流：临时 dump 创建 + 上传 + 检索

```
(1) 创建 dump
POST /api/faces/dumps { name, description? }
        │
        ▼
ScratchDumpService.create(userId, name)
        │
        └─ INSERT scratch_dumps (status='created') → { dumpId }

(2) 批量上传照片（前端轮询 OSS 直传 + 通知后端）
每张完成后：POST /api/faces/dumps/:id/photos { imageUrl, takenAt?, fileMtime? }
        │
        ▼
ScratchDumpService.addItem(userId, dumpId, ...)
        │
        ├─ 1. INSERT scratch_dump_items (embedding 暂全 0)
        ├─ 2. 更新 scratch_dumps.total_items
        └─ 3. 入队 ai_jobs(kind: 'face-extract-scratch', targetType: 'face_dump_item', targetId=itemId)
              │
              ▼
            FaceJobHandler.runExtractScratch(userId, itemId, ...)
                                              │
                                              └─ FaceProvider.detectAndEmbed(url)
                                                    → UPDATE scratch_dump_items.embedding, bbox

(3) 检索（用户已有 self profile 时）
POST /api/faces/dumps/:id/search { threshold?, topK? }
        │
        ▼
ScratchDumpService.searchDump(userId, dumpId, opts)
        │
        ├─ 1. 拉 user_face_embeddings WHERE userId AND is_enabled
        ├─ 2. 拿 scratch_dump_items.embedding 走 VectorSearchService（参数化为表名）
        │      (复用 §4.6 searchMomentsByEmbeddings → searchEmbeddingsByTable)
        └─ 3. 按 sortKey = COALESCE(takenAt, fileMtime, uploadedAt) DESC 排序
              → 返回命中 items + sortKey 来源标注
```

---

## 3. 数据模型

### 3.1 Migration: `2026_10_12_face_profile.sql`

```sql
-- pgvector 扩展（PostgreSQL 16 + pgvector 0.5+）
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 单 self 人脸参考照片（user_face_embeddings）—— 一个 user 一套档案
CREATE TABLE user_face_embeddings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,                            -- 原图 URL（OSS）
  thumbnail_url TEXT,                                     -- 缩略图（人脸 cropping 或原图压缩）
  bbox          jsonb,                                    -- {x,y,w,h} 0..1 归一化
  embedding     vector(512) NOT NULL,                     -- InsightFace buffalo_l 输出
  provider      VARCHAR(32) NOT NULL DEFAULT 'mock',      -- cloud | local | mock
  model         VARCHAR(64),                              -- e.g. 'buffalo_l' / 'facerec-v1'
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,            -- 启用/禁用某条参考
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 同一用户同一张原图去重（防止重复入队 + 节省存储）
  UNIQUE (user_id, source_url)
);
CREATE INDEX idx_ufe_user_enabled ON user_face_embeddings (user_id, is_enabled);
-- 向量 ANN 索引（核心 profile 索引）
CREATE INDEX idx_ufe_embedding ON user_face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 2. moment 中的人脸（moment_faces）
CREATE TABLE moment_faces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moment_id     uuid NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,
  bbox          jsonb,                                    -- 检出人脸 bbox
  embedding     vector(512) NOT NULL,
  provider      VARCHAR(32) NOT NULL DEFAULT 'mock',
  model         VARCHAR(64),
  quality_score REAL,                                     -- 检测置信度
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_mf_moment ON moment_faces (moment_id);
CREATE INDEX idx_mf_user_moment ON moment_faces (user_id, moment_id);
-- 向量 ANN 索引（核心检索索引）
CREATE INDEX IF NOT EXISTS idx_mf_embedding ON moment_faces USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. 临时 dump 元数据（scratch_dumps）
CREATE TABLE IF NOT EXISTS scratch_dumps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(120) NOT NULL,
  description    TEXT,
  status         VARCHAR(32) NOT NULL DEFAULT 'created',   -- created | uploading | processing | ready | failed
  total_items    INTEGER NOT NULL DEFAULT 0,
  done_items     INTEGER NOT NULL DEFAULT 0,
  failed_items   INTEGER NOT NULL DEFAULT 0,
  hits_count     INTEGER NOT NULL DEFAULT 0,               -- 最近一次 search 的命中数（缓存展示）
  last_search_at TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sd_user_created ON scratch_dumps (user_id, created_at DESC);

-- 4. 临时 dump 内单张照片 + 人脸（scratch_dump_items）
CREATE TABLE IF NOT EXISTS scratch_dump_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dump_id       uuid NOT NULL REFERENCES scratch_dumps(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,
  thumbnail_url TEXT,
  filename      VARCHAR(255),
  taken_at      TIMESTAMP,                                  -- EXIF DateTimeOriginal
  file_mtime    TIMESTAMP,                                  -- 文件 mtime（兜底）
  width         INTEGER,
  height        INTEGER,
  file_size     BIGINT,
  bbox          jsonb,
  embedding     vector(512),                                -- 暂可空（job 进行中）
  provider      VARCHAR(32) NOT NULL DEFAULT 'mock',
  model         VARCHAR(64),
  quality_score REAL,
  is_processed  BOOLEAN NOT NULL DEFAULT FALSE,
  error         TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (dump_id, source_url)
);
CREATE INDEX IF NOT EXISTS idx_sdi_dump ON scratch_dump_items (dump_id);
CREATE INDEX IF NOT EXISTS idx_sdi_user_dump ON scratch_dump_items (user_id, dump_id);
CREATE INDEX IF NOT EXISTS idx_sdi_taken ON scratch_dump_items (dump_id, taken_at DESC NULLS LAST);
-- 向量 ANN 索引（dump 检索索引；仅 processed=true 才有意义）
CREATE INDEX IF NOT EXISTS idx_sdi_embedding ON scratch_dump_items
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
  WHERE is_processed = TRUE;
```

> **注意**：`ivfflat` 在小表（< 1000 行）上不索引；首版用 ≥ 1000 行后建索引更稳。CI / 开发环境可延迟建索引；生产强制要求。
> `scratch_dumps` 删除由 `ON DELETE CASCADE` 自动清理 `scratch_dump_items`，不需要 partial index 反映状态。

### 3.2 ER 关系（增量）

```
users ─┬─ user_face_embeddings (单 self 档案直接挂 user_id)
       │
       ├─ moments ── moment_faces ──── 永久库向量 ANN 检索
       │
       ├─ scratch_dumps ── scratch_dump_items ── dump 库向量 ANN 检索
       │                  └─ face-extract-scratch job 持续 fill embedding
       │
       └─ ai_jobs (复用, kind 扩展)
```

> people 表在本期不做任何变更，不引入 is_self 列。
> 永久库 + dump 库两套流程共存，检索接口参数化表名互相隔离。

### 3.3 多租户隔离

- 所有表带 `user_id`，service 层强制 `find({ where: { userId } })`
- 一个 user **仅一套 self 档案**（`user_face_embeddings.user_id` 唯一对应 user，**允许同一 user 多张参考图**）
- 一个 user 可拥有**多个 dump 同时存在**，每个独立标识；删除 dump 时 `ON DELETE CASCADE` 自动清理 `scratch_dump_items`
- `user_face_embeddings.(user_id, source_url)` 唯一约束：防止用户重复上传同一 OSS URL
- `scratch_dump_items.(dump_id, source_url)` 唯一约束：同一 dump 内不重复同一 OSS URL
- moment_face / user_face_embedding / scratch_dump / scratch_dump_item 的 userId 直接来自列，Service 二次校验
- dump 检索与库检索**完全隔离**：检索接口参数化表名，不允许一个 user 跨 dump 串数据

---

## 4. 后端模块设计

### 4.1 目录结构

```
backend/src/face/
├── face.module.ts
├── face.service.ts
├── face.service.spec.ts
├── face.controller.ts
├── face.controller.spec.ts                  # 集成测试骨架
├── face-integration.spec.ts                # 端到端 supertest
├── entities/
│   ├── user-face-embedding.entity.ts       # @Entity('user_face_embeddings') — 单 self 档案
│   ├── moment-face.entity.ts               # @Entity('moment_faces')
│   ├── scratch-dump.entity.ts              # @Entity('scratch_dumps')
│   └── scratch-dump-item.entity.ts         # @Entity('scratch_dump_items')
├── scratch/
│   ├── scratch-dump.service.ts             # dump CRUD + dump 内检索
│   ├── scratch-dump.service.spec.ts
│   ├── scratch-dump.controller.ts          # REST: /faces/dumps/*
│   └── scratch-dump-integration.spec.ts
├── dto/
│   ├── search-faces.dto.ts
│   ├── add-face-reference.dto.ts
│   └── complete-face-reference.dto.ts
├── providers/
│   ├── face-provider.interface.ts          # 抽象 provider
│   ├── face-provider.factory.ts             # FACE_PROVIDER 选择
│   ├── mock.face-provider.ts                # CI / dev 默认
│   ├── cloud.face-provider.ts               # HTTP 调用云（如火山 / 阿里云 face body）
│   └── local.face-provider.ts               # HTTP 调用本地 InsightFace FastAPI
├── search/
│   ├── vector-search.service.ts             # pgvector SQL 封装
│   └── vector-search.service.spec.ts
└── jobs/
    ├── face-embed.handler.ts                # kind: face-embed（参考图入库）
    ├── face-extract.handler.ts              # kind: face-extract（批量提取 moment face）
    ├── face-match.handler.ts                # kind: face-match（可选，用于离线标定）
    └── handlers.spec.ts
```

### 4.2 FaceService 公共方法

```typescript
@Injectable()
export class FaceService {
  // === self profile（user-level，无 person 中间层） ===
  getMyProfile(userId: string): Promise<ProfileSummary>;
  addReference(userId: string, imageUrl: string, bboxHint?: BBox): Promise<RefJobAck>;
  removeReference(userId: string, refId: string): Promise<void>;
  enableReference(userId: string, refId: string, enabled: boolean): Promise<void>;

  // === 检索 ===
  searchMine(userId: string, opts: { threshold?: number; topK?: number }): Promise<Hit[]>;

  // === 单张提取 ===
  enqueueExtractFaces(userId: string, momentId: string): Promise<{ jobId: string }>;

  // === 回填 ===
  startBackfill(userId: string): Promise<BackfillStatus>;
  getBackfillStatus(): BackfillStatus;     // 进程内状态（不需要 userId）
}
```

每个方法独立实现 + 单测覆盖。

### 4.3.0 ScratchDumpService 公共方法（dump 子流程，独立 service）

```typescript
@Injectable()
export class ScratchDumpService {
  create(userId: string, input: { name: string; description?: string }): Promise<ScratchDump>;
  list(userId: string, opts?: { limit?: number }): Promise<ScratchDump[]>;
  getOne(userId: string, dumpId: string): Promise<ScratchDumpDetail>;
  remove(userId: string, dumpId: string): Promise<void>;

  addItem(userId: string, dumpId: string, input: AddScratchDumpItemDto): Promise<{ itemId: string; jobId: string }>;
  listItems(userId: string, dumpId: string, opts?: { status?: 'pending' | 'processed' | 'failed' }): Promise<ScratchDumpItem[]>;
  getStatus(userId: string, dumpId: string): Promise<{ total: number; done: number; failed: number; status: string }>;

  searchDump(userId: string, dumpId: string, opts: { threshold?: number; topK?: number }): Promise<DumpHit[]>;
}

interface DumpHit {
  item: ScratchDumpItem;        // 含 takenAt / fileMtime / provider
  distance: number;
  sortKey: 'takenAt' | 'fileMtime' | 'uploadedAt';
}
```

### 4.3 FaceController API

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/faces/me` | 取本用户 self profile 概览（含参考图计数） |
| POST | `/api/faces/me/references` | body: `{ imageUrl, bboxHint? }` 入队 face-embed job |
| DELETE | `/api/faces/me/references/:refId` | 删参考 |
| PATCH | `/api/faces/me/references/:refId` | body: `{ enabled: bool }` 启/停参考 |
| POST | `/api/faces/search` | body: `{ threshold?, topK? }` → hits（永久库检索） |
| POST | `/api/faces/moments/:momentId/extract` | 给单张 moment 提取人脸（同步入队） |
| POST | `/api/faces/backfill` | 启动一次性回填 |
| GET | `/api/faces/backfill/status` | 进程级回填进度 |
| **POST** | **`/api/faces/dumps`** | **创建 dump `{ name, description? }` → `{ dumpId }`** |
| **GET** | **`/api/faces/dumps`** | **列出本用户所有 dump** |
| **GET** | **`/api/faces/dumps/:id`** | **dump 详情（含 total/done/failed 进度）** |
| **DELETE** | **`/api/faces/dumps/:id`** | **删除 dump（级联清理 items）** |
| **POST** | **`/api/faces/dumps/:id/photos`** | **加一张照片到 dump `{ imageUrl, takenAt?, fileMtime?, filename?, width?, height? }` → `{ itemId, jobId }`** |
| **GET** | **`/api/faces/dumps/:id/items`** | **列 dump 内 items（支持 status 过滤）** |
| **GET** | **`/api/faces/dumps/:id/status`** | **进度查询** |
| **POST** | **`/api/faces/dumps/:id/search`** | **body `{ threshold?, topK? }` → hits（按 takenAt 优先倒序）** |

所有 endpoint 走 `SessionAuthGuard` + `@CurrentUser()` 派生 userId。
dump endpoint 走 `ScratchDumpController`，挂到 `/api/faces/dumps/*`。

### 4.4 FaceProvider 抽象

```typescript
// face/providers/face-provider.interface.ts
export interface FaceEmbedding {
  bbox: { x: number; y: number; w: number; h: number } | null;  // 0..1 归一化
  vector: number[];  // 512-d
  confidence?: number;
}

export interface FaceProvider {
  readonly name: 'cloud' | 'local' | 'mock';
  
  detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]>;
  // ↑ 输入单张照片 URL，返回该图中所有人脸的 embedding 列表
  
  embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding>;
  // ↑ 用于「重计算参考图 embedding」等场景
}

export interface FaceProviderFactory {
  create(): FaceProvider;
}
```

#### 4.4.1 MockProvider（CI / 开发默认）

- 输入 → SHA256(inputUrl) → 伪 512-d 向量（确定性：同 URL 同结果）
- 复杂度恒定，启动 < 100ms，单测毫无外部依赖
- detectAndEmbed 总是返回 1 个 face embedding（bbox=[0,0,1,1]）

#### 4.4.2 CloudProvider（默认云优先）

```typescript
@Injectable()
export class CloudFaceProvider implements FaceProvider {
  readonly name = 'cloud';
  constructor(private http: HttpService, private cfg: FaceConfig) {}
  
  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    const res = await firstValueFrom(
      this.http.post(`${this.cfg.baseUrl}/v1/face/detect`, {
        image: imageUrl,
        return_landmark: false,
        return_embedding: true,
      }, { headers: { Authorization: `Bearer ${this.cfg.apiKey}` } })
    );
    // 适配为统一 FaceEmbedding[]
    return res.data.faces.map(this.normalize);
  }
}
```

#### 4.4.3 LocalProvider（fallback）

```typescript
@Injectable()
export class LocalFaceProvider implements FaceProvider {
  readonly name = 'local';
  constructor(private http: HttpService, private cfg: FaceConfig) {}
  
  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    // localhost InsightFace FastAPI
    return this.http.post(`${this.cfg.baseUrl}/detect`, { image_url: imageUrl }).then(/* ... */);
  }
}
```

#### 4.4.4 工厂与降级

```typescript
// face-provider.factory.ts
@Injectable()
export class FaceProviderFactory {
  create(): FaceProvider {
    switch (this.cfg.provider) {
      case 'cloud': return this.cloud;
      case 'local': return this.local;
      case 'mock':
      default:      return this.mock;
    }
  }
}
```

- 启动日志打印 `FACE_PROVIDER=cloud using endpoint xxx`
- 运行时某次调用 throw → 自动 retry 一次；再次失败 → 在 job output 写 `provider: 'mock+fallback'` 并用 mock 完成（让流程不中断）
- 关键：检索侧只用已存在的 embedding；即使新上传失败，旧 embedding 仍可检索

### 4.5 AI Job 接入（face-embed / face-extract / face-match）

#### 4.5.1 扩展 `AiJobKind` 与 `AiJobTargetType`

```typescript
// backend/src/ai/entities/ai-job.entity.ts
export type AiJobKind =
  | 'image-tag'
  | 'image-summary'
  | 'audio-transcribe'
  | 'memoir-summary'
  | 'chapter-summary'
  | 'event-summary'
  | 'face-embed'             // 入参：imageUrl + bboxHint?；写回 user_face_embeddings
  | 'face-extract'           // 入参：momentId；调用 detectAndEmbed 写回 moment_faces
  | 'face-extract-scratch'   // 入参：scratchDumpItemId；调用 detectAndEmbed 写回 scratch_dump_items
  | 'face-match';            // 可选：离线标定某 moment 含哪些 person（v1.x 备用）

// targetType 扩展（face-* job 不能复用 'moment' 域）
export type AiJobTargetType =
  | 'moment'
  | 'memoir'
  | 'chapter'
  | 'event'
  | 'face_reference'     // face-embed 的 target：user_face_embeddings.id
  | 'face_match'         // face-extract 的 target：moment_id（语义上与 moment 重叠；保留独立枚举以备未来差异）
  | 'face_dump_item';    // face-extract-scratch 的 target：scratch_dump_items.id
```

#### 4.5.2 handler 注册

`AiService.applyToTarget` 现有 switch 加 4 个 case：

```typescript
case 'face-embed': {
  // 1. 读 promptInput 拿 imageUrl, bboxHint
  // 2. faceProvider.detectAndEmbed → embeddings[]
  // 3. 按 bboxHint 或面积取最大脸
  // 4. 写入 user_face_embeddings（targetType='face_reference', targetId=refId）
  break;
}
case 'face-extract': {
  // 1. 读 momentId（targetType='face_match'）—— 与 'moment' 域复用同一 momentId 列
  // 2. faceProvider.detectAndEmbed(mediaUrl)
  // 3. 全部 embedding 写入 moment_faces（先清该 moment 的旧 faces）
  break;
}
case 'face-extract-scratch': {
  // 1. 读 scratch_dump_items.id（targetType='face_dump_item'）
  // 2. faceProvider.detectAndEmbed(imageUrl)
  // 3. 选最大人脸 / 单 embedding → UPDATE scratch_dump_items SET embedding, bbox, is_processed=TRUE
  break;
}
case 'face-match': {
  // v1.x 暂留空实现
  break;
}
```

#### 4.5.3 入队入口

- `FaceService.addReference(userId, imageUrl)` 内部在 `user_face_embeddings` 写 ref 行（embedding 暂 placeholder） → 入队 `face-embed`
- `FaceService.startBackfill(userId)` 内部扫本用户 photos，循环入队 `face-extract`（一批一批，限速 5/批/s）
- `ScratchDumpService.addItem(userId, dumpId, ...)` 内部在 `scratch_dump_items` 写 item 行（embedding 暂空）→ `scratch_dumps.total_items++` → 入队 `face-extract-scratch`
- `FaceJobHandler.runExtractScratch` 完成后更新 `scratch_dumps.done_items++`（事务内）
- 上传 moment 时的"自动入队"功能本期**关闭**，仅手动触发

### 4.6 VectorSearchService

封装 pgvector 检索，支持**两种目标表**（moment_faces / scratch_dump_items）。

```typescript
@Injectable()
export class VectorSearchService {
  /**
   * 永久库检索：给 query embeddings，对 moment_faces 做 ANN
   * 排序：先按 distance asc，每 moment 取 best match
   * 过滤：distance ≤ threshold
   * 返回：[{ momentId, distance }]
   */
  async searchMomentsByEmbeddings(
    userId: string,
    queries: number[][],
    threshold?: number,
    topK?: number,
  ): Promise<Array<{ momentId: string; distance: number }>>;

  /**
   * dump 检索：给 query embeddings，对指定 dump 的 scratch_dump_items 做 ANN
   * 仅匹配 is_processed=true 的条目
   * 返回：[{ itemId, distance }]
   */
  async searchDumpItemsByEmbeddings(
    userId: string,
    dumpId: string,
    queries: number[][],
    threshold?: number,
    topK?: number,
  ): Promise<Array<{ itemId: string; distance: number }>>;
}
```

SQL 模板（库检索）：

```sql
WITH q AS (
  SELECT v, ord FROM unnest($2::float[][]) WITH ORDINALITY AS t(v, ord)
),
distances AS (
  SELECT mf.moment_id,
         mf.embedding <=> q.v AS distance,
         q.ord AS query_idx
    FROM moment_faces mf
    JOIN moments m ON m.id = mf.moment_id AND m.user_id = $1 AND m.type = 'photo'
    CROSS JOIN q
   WHERE mf.user_id = $1
),
best AS (
  SELECT moment_id, MIN(distance) AS distance
    FROM distances
   GROUP BY moment_id
  HAVING MIN(distance) <= $3
)
SELECT b.moment_id::text AS "momentId", b.distance
  FROM best b
 ORDER BY b.distance ASC
 LIMIT $4;
```

> `mf.user_id = $1` 保证跨 user 隔离；JOIN `moments` 加 `type='photo'` 过滤确保只检索照片。
> dump 检索 SQL 同型，把表换 `scratch_dump_items`、加 `dump_id = $2` 条件、返回 `item_id`。

> TypeORM pgvector 操作符兼容：`embedding <=> other` 返回 cosine distance（0..2），越小越相似。`vector_cosine_ops` 索引使用相同算子。

---

## 5. 前端设计

### 5.1 路由 + 导航

```jsx
// App.jsx
<Route path="/faces"           element={<FacesPage />} />
<Route path="/faces/dumps"     element={<DumpsListPage />} />
<Route path="/faces/dumps/new" element={<DumpNewPage />} />
<Route path="/faces/dumps/:id" element={<DumpDetailPage />} />
```

`LinesPage` / 现有导航的"更多"折叠菜单加入"面孔"。`/faces` 内有"+ 上传临时 dump"按钮，连接 `/faces/dumps/new`。

### 5.1.1 /faces/dumps 列表页草图

```
┌────────────────────────────────────────────────────┐
│  临时图片集                         [+ 上传新 dump] │
├────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐           │
│  │ 老家旧照片      │ │ 团建合照 2024   │           │
│  │ status: ready   │ │ status: upload..│           │
│  │ 120 / 120 done  │ │ 35 / 80 done    │           │
│  │ 命中 12  [查看 →]│ │ [继续上传 →]    │           │
│  └─────────────────┘ └─────────────────┘           │
└────────────────────────────────────────────────────┘
```

### 5.1.2 /faces/dumps/new + /faces/dumps/:id 草图（同一框架，detail 显示进度）

```
┌────────────────────────────────────────────────────┐
│  ← 返回     老家旧照片        [+ 继续上传]  [过滤] │
├────────────────────────────────────────────────────┤
│  进度  85/120 done   失败 0   命中预估 —          │
├────────────────────────────────────────────────────┤
│  ⏳ 处理中：b0..f3 (5)                              │
│  ✅ 已抽取：112 张                                  │
│  ❌ 失败：0                                         │
├────────────────────────────────────────────────────┤
│  命中列表（点过滤后出现）：                          │
│  ── 2018-08-12  📷 老家院子合影  distance 0.21   │
│  ── 2019-02-04  📷 春节全家福    distance 0.18   │
│  ── 2020-09-21  📷 我回乡路上    distance 0.29   │
│                                                      │
│  ……                                                  │
└────────────────────────────────────────────────────┘
```

> 上传区使用 `<UploadModal>` 复用逻辑，多选 + 直传 OSS + 逐张通知 `/faces/dumps/:id/photos`。
> "过滤"按钮：必须先有 self profile；点击调 `/faces/dumps/:id/search`，渲染为时间线。
> 时间线排序键：EXIF taken_at 优先 → 文件 mtime 兜底 → 上传时间最终兜底；每行右侧用 chip 标注 `takenAt` / `mtime` / `uploaded` 来源。

### 5.2 /faces 总览页（自适配）

```
┌────────────────────────────────────────────────────┐
│  面孔中心                                           │
├────────────────────────────────────────────────────┤
│  我的画像 (self)                                    │
│  ┌──────────┐  已建立 / 3 张参考 / 200 命中          │
│  │ self 头像 │  [ 添加参考 ]  [ 找我的照片 → ]     │
│  └──────────┘                                       │
├────────────────────────────────────────────────────┤
│  历史回填                                           │
│  [一次性回填所有照片]   已处理 124/500               │
└────────────────────────────────────────────────────┘
```

主页 = self profile（无 person 入口）。

点"找我的照片"进入 **结果三 Tab**：

```
┌────────────────────────────────────────────────────┐
│ ← 返回    我的照片                  [⚙ 阈值]      │
├────────────────────────────────────────────────────┤
│ [时间线][人物聚类][地点地图]                        │
├────────────────────────────────────────────────────┤
│ ── 2024 ──                                          │
│  📷 [缩略图] 你 + 李小宇    2024-08-12 三亚        │
│  📷 [缩略图] 你 + 小雨      2024-08-13 三亚        │
│ ── 2023 ──                                          │
│  📷 [缩略图] 你 + 王老师    2023-12-24 北京        │
│                                                      │
│  ……                                                  │
└────────────────────────────────────────────────────┘
```

> 人物 / 地点 Tab 内容**仍然存在**，但不需要 person face profile：
> - 人物 Tab：根据 hit moment 的 `event_people` 聚合（user 手动关联过 event-people）
> - 地点 Tab：根据 hit moment 的 `place_id` 聚合（用既有 `<SpaceMap>`）

### 5.3 Moment 详情

`EventPage` / Moment 缩略卡 hover 菜单加：

```
[✨ 提取人脸]  — 调用 POST /ai/moments/:id/extract-faces
```

按钮点击 → 入队 face-extract job → 0.5s 内显示 toast："已入队；完成后会标记 ✓"

`useJobPolling(momentId, kind='face-extract')` 监听 job。

### 5.5 API 客户端层

新增：

```
frontend/src/api/faces.js
frontend/src/data/faceAdapter.js
frontend/src/data/faceSelectors.js
frontend/src/hooks/useFaceSearch.js
frontend/src/hooks/useJobPolling.js  // 复用已有 useAiJob + 扩展 job kind 字段
```

`faceAdapter.js` 输出「维度化」（timeline / persons / places）的纯函数派生：

```javascript
// 输入 hits API 响应 → 派生出三个视图的纯数据
export function groupHitsByTimeline(hits, { year }) { /* ... */ }
export function groupHitsByPerson(hits, allPeople) { /* ... */ }
export function groupHitsByPlace(hits, allPlaces) { /* ... */ }
```

输出与 `apiAdapter.js#createApiAdapter().getEventsByLine` 同模式。

### 5.5 组件

| 组件 | 路径 |
|---|---|
| `<SelfProfileCard />` | `components/SelfProfileCard.jsx` |
| `<FaceResultTabs />` | `components/FaceResultTabs.jsx` |
| `<FaceTimelineView />` | `components/FaceTimelineView.jsx` |
| `<FacePersonCluster />` | `components/FacePersonCluster.jsx`（基于 event_people / dump 自带 personIds 派生） |
| `<FacePlaceMap />` | `components/FacePlaceMap.jsx` |
| `<ExtractFaceButton />` | `components/ExtractFaceButton.jsx` |
| `<FaceProfileSetupModal />` | `components/FaceProfileSetupModal.jsx` |
| `<DumpCard />` | `components/DumpCard.jsx` |
| `<DumpUploader />` | `components/DumpUploader.jsx` |
| `<DumpProgressBar />` | `components/DumpProgressBar.jsx` |
| `<DumpTimelineView />` | `components/DumpTimelineView.jsx` |

### 5.6 页面与路由

| 页面 | 路由 | 职责 |
|---|---|---|
| `<FacesPage />` | `/faces` | self profile 总览 + 库检索 + 历史回填 + dump 入口 |
| `<DumpsListPage />` | `/faces/dumps` | dump 卡片网格 |
| `<DumpNewPage />` | `/faces/dumps/new` | 创建 dump + 进入 DumpDetailPage |
| `<DumpDetailPage />` | `/faces/dumps/:id` | 上传、进度、过滤、命中时间线 |

### 5.7 状态

- Zustand：`useFacesStore`，当前阈值、当前 Tab、查询参数
- TanStack Query 5 类：
  - self profile（me）/ 库 search / 库 backfill status
  - **dumps list / dump detail / dump status（轮询） / dump search**

---

## 6. 配置与运维

### 6.1 环境变量

```bash
# .env (新增)
FACE_PROVIDER=mock                      # cloud | local | mock
FACE_CLOUD_BASE_URL=https://example.com
FACE_CLOUD_API_KEY=xxx
FACE_LOCAL_BASE_URL=http://face-service:8000
FACE_SEARCH_THRESHOLD=0.6
FACE_SEARCH_TOPK=200
FACE_BACKFILL_BATCH=10
```

启动日志：

```
[FaceModule] FACE_PROVIDER=cloud (baseUrl=https://example.com)
[FaceModule] pgvector extension detected
```

### 6.2 docker-compose 变更

默认不需要新增服务（cloud 走 HTTPS）。可选新增 `face-service`（本地）：

```yaml
face-service:
  image: timex/face-service:dev       # 自建镜像（按需）
  ports: ["8000:8000"]
  environment:
    - INSIGHTFACE_MODEL=buffalo_l
  volumes:
    - face-models:/root/.insightface
```

### 6.3 数据迁移

- `npm run migrate:dev` 应用 `2026_10_12_face_profile.sql`
- pgvector 扩展需数据库支持；docker-compose 镜像必须含 pgvector（`pgvector/pgvector:pg16`）
- ivfflat 索引在空表上创建很快；CI 跳过索引、生产启动后建

---

## 7. 错误处理

| 场景 | 行为 |
|---|---|
| Cloud provider 不可达 | `cloud.detectAndEmbed` throw → fallback mock → 仍失败则 job `failed`，error 写入 ai_jobs.error |
| Local provider fallback | 启动可读 `FACE_PROVIDER`，fallback 仅在调用失败时生效 |
| pgvector 查询失败 | service 兜底 throw → controller 返回 503 |
| 用户上传不合法（mime 非 photo） | 400 |
| 跨 user 访问 | 404（不暴露存在性） |
| 同一 user 重复上传同一 sourceUrl（参考图 / dump item） | 409 conflict（唯一约束） |
| 已删除 moment | moment_faces ON DELETE CASCADE，检索结果自动剔除 |
| 已删除 dump | scratch_dump_items ON DELETE CASCADE 清理；dump.status 不再可查 |
| dump 上传过程中 provider 全失败 | scratch_dump_items.error 写入错误信息；dump.status 保持 'processing'，UI 显示 ❌ 失败列表，可继续上传 |
| EXIF 解析失败 | taken_at 留空；fallback 到 file_mtime / uploadedAt，UI 标注排序键来源 |

---

## 8. 安全与隐私

| 维度 | 措施 |
|---|---|
| 鉴权 | 全 endpoint `SessionAuthGuard` + `@CurrentUser()` |
| userId 隔离 | 所有 Repository / Query 强制 where userId |
| dump 隔离 | dump 内查询 SQL 加 `dump_id = $2` 与 `user_id = $1`，不允许跨 dump 串 |
| Embedding 外发 | 仅返回 top-K hit + distance，不返回 embedding 本身 |
| 上传权限 | 复用 upload service 单签（key 前缀 `uploads/{userId}/face/`） |
| 删除 | user 删 → user_face_embeddings / scratch_dumps / scratch_dump_items 级联；moment 删 → moment_faces 级联 |
| 日志 | 不打印 imageUrl（可能含敏感 URL）除非 verbose 模式 |
| dump 列表 / 详情 | 仅返回当前 user 的 dump；不允许 dumpId 越界访问 |

---

## 9. 性能预算

| 操作 | 预算 |
|---|---|
| `face-embed` 单张参考图（cloud） | P95 ≤ 2.0s |
| `face-embed` 单张参考图（local buffalo_l / GPU） | P95 ≤ 1.0s |
| `face-extract` 单张（本地跑） | P50 ≤ 1.5s / P95 ≤ 3.0s |
| `face-extract-scratch` 单张（dump 内） | 同 face-extract；限制 batch 并发 |
| `searchMine`（10k moment_faces / 3 refs） | P95 ≤ 100ms |
| `searchDump`（1k scratch_dump_items / 3 refs） | P95 ≤ 100ms |
| backfill 吞吐 | ≥ 2 photos / s（cloud）/ 5 / s（local） |
| dump 上传吞吐 | 类似 backfill；ScratchDumpService.create 后批量入队 |

实测在 mock provider（CI 上）单 job ≤ 200ms。

---

## 10. 测试策略

### 10.1 测试矩阵

| 层 | 用例 | 文件 |
|---|---|---|
| Provider | mock 确定性 / 接口契约 | `mock.face-provider.spec.ts` |
| Provider | Cloud HTTP 错误重试 fallback | `cloud.face-provider.spec.ts` |
| Service | getMyProfile addReference dedupe | `face.service.spec.ts` |
| Service | addReference 入队 + 关联 | 同上 |
| Service | searchMine 阈值与 topK | 同上 |
| Service | backfill 限速与幂等 | 同上 |
| Service | ScratchDump CRUD / addItem / searchDump / 跨 user 隔离 | `scratch-dump.service.spec.ts` |
| Search | pgvector SQL 集成（带 testContainer），含 moment_faces + scratch_dump_items | `vector-search.integration.spec.ts` |
| Controller | face + scratch-dump 全部 endpoint 200/4xx | `face-integration.spec.ts` + `scratch-dump-integration.spec.ts`（supertest） |
| Job handler | face-embed / face-extract / face-extract-scratch 各一条 | `jobs/handlers.spec.ts` |
| 前端 | SelfProfileCard render | `SelfProfileCard.test.jsx` |
| 前端 | DumpUploader + DumpProgressBar 渲染与进度 | `DumpUploader.test.jsx` |
| 前端 | useDumpStatus hook（轮询模拟） | `useDumpStatus.test.jsx` |
| 端到端 | 跑通 upload → face-embed → search；create dump → upload 50 张 → face-extract-scratch → searchDump | 手动 + Playwright（可选） |

### 10.2 mock 与 contract

- `MockFaceProvider` 单测覆盖：detectAndEmbed 返回 shape 与接口一致
- `VectorSearchService` 在 test 中跑实际 Postgres（testcontainers 或 docker-compose 起的 pgv-e2e），验证 `<=>` 操作符（同时覆盖 moment_faces 与 scratch_dump_items）

### 10.3 测试工具链

- Jest 29（同现有）
- supertest（同现有）
- pgvector 在 dev pg container 内预装：复用现有 `pgv-e2e-postgres`

---

## 11. 实施任务拆分（commit 节奏建议）

> 每个 Task = 1 commit，commit 含实现 + 单测 + 集成测试，全绿
> 单 self + dump 双流程版（11 task → 14 task）

| # | Task | commit message 前缀 |
|---|---|---|
| 1 | migration: pgvector + `user_face_embeddings` + `moment_faces` + `scratch_dumps` + `scratch_dump_items` + ivfflat 索引 | `feat(db): face profile + scratch dump schema + pgvector` |
| 2 | face entities（UserFaceEmbedding, MomentFace, ScratchDump, ScratchDumpItem）+ repository + 集成测 | `feat(backend): face entities + repo` |
| 3 | FaceProvider 接口 + MockProvider | `feat(backend): face provider interface + mock` |
| 4 | CloudProvider + LocalProvider | `feat(backend): face provider cloud + local` |
| 5 | FaceProviderFactory + FaceModule 装配 | `feat(backend): FaceProviderFactory + FaceModule wiring` |
| 6 | VectorSearchService（库 + dump 双表支持）| `feat(backend): VectorSearchService (moment + scratch dump tables)` |
| 7 | FaceService + FaceController (REST + supertest) | `feat(backend): FaceService + FaceController` |
| 8 | AI job: face-embed / face-extract / face-extract-scratch handler 接入 AiService | `feat(ai): face-embed + face-extract + face-extract-scratch jobs` |
| 9 | ScratchDumpService + ScratchDumpController + dump 检索（pgvector / scratch_dump_items）集成测 | `feat(backend): ScratchDumpService + ScratchDumpController` |
| 10 | 前端 api/faces + faceAdapter + hooks + FacesPage + FaceResultTabs | `feat(frontend): /faces page + result tabs` |
| 11 | 前端 `/faces/dumps` 列表 + 新建 + 上传 + 进度 | `feat(frontend): /faces/dumps list + new + uploader + progress` |
| 12 | 前端 `/faces/dumps/:id` 详情 + DumpTimelineView 时间线结果 | `feat(frontend): /faces/dumps/:id detail + dump timeline` |
| 13 | 前端 Moment "提取人脸" 按钮 | `feat(frontend): moment extract-faces button` |
| 14 | docs 收尾：user-guide / roadmap / api / changelog | `docs: face profile in user-guide + roadmap + api + changelog` |

每个 Task 完成后：
- `npm run test` 全绿
- `npm run lint` 全绿
- `npm run health-check`（可选）
- 1 commit

### 11.1 验收点定义（按 Nyquist 验证）

- 每 Task 完成后跑对应 spec → 任务级别的「完成」
- 所有 Task 完成后跑：
  - `npx jest` 单测 + 集成测试新增 ≥ 45 条（含 dump 部分 +15）
  - `npx jest --coverage` 后端保持 ≥ 75% 或提升
  - 前端 `npm run test` 全绿
  - 端到端 US-010 ~ US-015（dump 场景）全过

---

## 12. 不在本期范围（明确放弃）

- **多档案管理（一个 user 多套 self face profile）**：用户决策，仅做单档案
- **为 people 实体建立 face profile**：用户决策；person 表不动
- **dump 中命中照片"提升到正式 moments"**：v1.x
- 多人脸追踪（track id）
- 视频帧人脸
- 自动触发（上传即入队）
- 跨用户合影匹配
- 人脸聚类
- Live camera 实时识别

---

## 13. 参考

- [需求文档 face-profile.md](../../requirements/face-profile.md)
- [产品文档 product.md §6.3 三维联动展现](../../../product.md)
- [架构文档 architecture.md](../../../architecture.md)
- [AI 集成文档 AI_INTEGRATION.md](../../../AI_INTEGRATION.md)
- [Backend docs backend.md](../../../backend.md)
- [前端文档 frontend.md](../../../frontend.md)
- [测试文档 testing.md](../../../testing.md)
- [roadmap.md §下一轮候选](../../../roadmap.md)
- InsightFace github.com/deepinsight/insightface（buffalo_l 模型）
- pgvector github.com/pgvector/pgvector
- ivfflat 索引 docs：https://github.com/pgvector/pgvector#ivfflat
