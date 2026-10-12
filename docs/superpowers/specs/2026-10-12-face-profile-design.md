# 个人画像功能 — 设计文档

> 状态：Draft v1（2026-10-12）
> 配套需求：[docs/requirements/face-profile.md](../../requirements/face-profile.md)

## 1. 文档说明

### 1.1 目标

承接需求文档，**明确给出**：

- 后端模块边界、`face` 模块的接口与数据流
- 数据库 schema（pgvector + ivfflat 索引）
- AI 异步任务管线（face-embed / face-extract / face-match 三种 kind）
- Provider 抽象（cloud + local + mock）
- 前端 /faces 页面、PersonPage Tab、Moment 详情按钮的交互
- 测试策略（含具体测试用例锚点）
- 子模块拆分与 commit 节奏

### 1.2 范围

本文不展开：

- InsightsFace 模型训练 / 调参细节
- pgvector 内部 ANN 算法源码
- 商业化 / 计费

### 1.3 与既有架构的对齐

- **AI 异步任务**：复用 [docs/AI_INTEGRATION.md](../../../AI_INTEGRATION.md) 的 `AiService` / `ai_jobs` 表 / `provider` 抽象，新增 3 个 `kind`
- **数据迁移**：使用 [backend/src/migrations/runner.ts](../../../backend/src/migrations/runner.ts)（SQL 增量）
- **多租户隔离**：Service 层强制 `userId` 过滤（与现有 CRUD 同型）
- **前端派生**：6 条线派生模式 `frontend/src/data/apiAdapter.js` 作为 layout 参考

---

## 2. 架构总览

```
┌────────────────┐        ┌─────────────────┐        ┌──────────────────┐
│ 浏览器 (SPA)   │ ──────▶│  NestJS 后端    │ ──────▶│  face-provider   │
│ React + Vite   │  HTTPS  │  /api/faces/*   │  HTTP  │  (cloud / local) │
└────────────────┘  JSON+JWT └────────┬────────┘        └──────────────────┘
                                       │
                          ┌────────────┴─────────────────┐
                          ▼                              ▼
                    ┌──────────────┐            ┌──────────────┐
                    │ PostgreSQL   │            │  ai_jobs     │
                    │ + pgvector   │            │  (原有)      │
                    │ - people     │            └──────────────┘
                    │ - person_face_embeddings
                    │ - moment_faces
                    └──────────────┘
```

### 2.1 数据流：典型请求"按 person 检索所有照片"

```
前端 POST /api/faces/search { personId, threshold?, topK? }
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
前端 POST /api/faces/profiles/:id/photos (multipart)
        │
        ▼
FaceController.addReferencePhoto → UploadService.presign + 直传 OSS
        │
        ▼
完成后调 POST /api/faces/profiles/:id/photos/complete { key, bboxHint? }
        │
        ▼
FaceService.attachReference(userId, profileId, photoUrl)
        │
        └─ 入队 ai_jobs(kind: 'face-embed', targetType: 'person_face_ref', targetId: refId)
              │
              ▼
            AiService.runJob → FaceProvider.embedImage(photoUrl)
                                              │
                                              ├─ Cloud: HTTP POST → { embeddings: [{bbox, vector}, ...] }
                                              │            │
                                              │            ▼
                                              │   选出最大人脸 / 用户指定 bboxHint
                                              │   save embedding → person_face_embeddings
                                              │
                                              └─ Local: HTTP POST → 同
                                              
                                              └─ Mock: 确定性伪 embedding（用于本地 + CI）
```

---

## 3. 数据模型

### 3.1 Migration: `2026_10_12_face_profile.sql`

```sql
-- pgvector 扩展（PostgreSQL 16 + pgvector 0.5+）
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. people.is_self 标记
ALTER TABLE people ADD COLUMN is_self BOOLEAN NOT NULL DEFAULT FALSE;

-- 每个 user 仅允许一条 is_self=true 的 person（partial unique index）
CREATE UNIQUE INDEX uq_people_user_self
  ON people (user_id) WHERE is_self = TRUE;

-- 2. 人脸参考照片与 embedding（person_face_embeddings）
CREATE TABLE person_face_embeddings (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_id     uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,                            -- 原图 URL（OSS）
  thumbnail_url TEXT,                                     -- 缩略图（人脸 cropping 或原图压缩）
  bbox          jsonb,                                    -- {x,y,w,h} 0..1 归一化
  embedding     vector(512) NOT NULL,                     -- InsightFace buffalo_l 输出
  provider      VARCHAR(32) NOT NULL DEFAULT 'mock',      -- cloud | local | mock
  model         VARCHAR(64),                              -- e.g. 'buffalo_l' / 'facerec-v1'
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,            -- 启用/禁用某条参考
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pfe_person_enabled ON person_face_embeddings (person_id, is_enabled);
-- 向量 ANN 索引（profile 检索时按 person 聚合）
CREATE INDEX idx_pfe_embedding ON person_face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. moment 中的人脸（moment_faces）
CREATE TABLE moment_faces (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX idx_mf_embedding ON moment_faces USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. ai_jobs.kind 扩展支持 face-* 类型（无需 SQL 变更，TS enum 扩展即可）
```

> **注意**：`ivfflat` 在小表（< 1000 行）上不索引；首版用 ≥ 1000 行后建索引更稳。CI / 开发环境可延迟建索引；生产强制要求。

### 3.2 ER 关系（增量）

```
users ─┬─ people (新增 is_self)
       │     │
       │     └─ person_face_embeddings ─┐
       │                                │
       ├─ moments ── moment_faces ───────┤  ← 向量 ANN 检索
       │                                │
       └─ ai_jobs (复用, kind 扩展) ─────┘
```

### 3.3 多租户隔离

- 所有表带 `user_id`，service 层强制 `find({ where: { userId } })`
- `is_self=true` 的 person **不允许跨 user 查看或修改**
- moment_face/person_face_embedding 的 userId 取自 FK 链（moment.userId / person.userId），由 Service 二次校验

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
│   ├── person-face-embedding.entity.ts     # @Entity('person_face_embeddings')
│   └── moment-face.entity.ts               # @Entity('moment_faces')
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
  // === self profile ===
  ensureSelfProfile(userId: string): Promise<Person>;
  
  // === person face profile ===
  listProfiles(userId: string, opts?: { personId?: string }): Promise<ProfileSummary[]>;
  addReference(userId: string, personId: string, imageUrl: string, bboxHint?: BBox): Promise<RefJobAck>;
  removeReference(userId: string, refId: string): Promise<void>;
  enableReference(userId: string, refId: string, enabled: boolean): Promise<void>;

  // === 检索 ===
  searchByPerson(userId: string, personId: string, opts: { threshold: number; topK: number }): Promise<Hit[]>;
  
  // === 回填 ===
  startBackfill(userId: string, opts?: { kind?: 'photo'; limit?: number }): Promise<BackfillJobAck>;
  getBackfillStatus(userId: string): Promise<BackfillStatus>;
}
```

每个方法独立实现 + 单测覆盖。

### 4.3 FaceController API

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/faces/profiles` | 列出所有 person 的 face profile 概览 |
| GET | `/api/faces/profiles/self` | 取 self profile（无则建） |
| GET | `/api/faces/profiles/:personId` | 单个 profile 详情 + 启用参考图列表 |
| POST | `/api/faces/profiles/:personId/references/presign` | 申请上传签名（同 UploadService） |
| POST | `/api/faces/profiles/:personId/references` | body: `{ key, bbox? }` 入队 face-embed job |
| DELETE | `/api/faces/references/:refId` | 删参考 |
| PATCH | `/api/faces/references/:refId` | 启/停参考 |
| POST | `/api/faces/search` | body: `{ personId, threshold?, topK? }` → hits |
| POST | `/api/faces/backfill` | 启动回填 → `{ jobId }` |
| GET | `/api/faces/backfill/status` | 进度 |
| POST | `/api/faces/jobs/:jobId/retry` | 复用通用 AI job retry |

所有 endpoint 走 `SessionAuthGuard` + `@CurrentUser()` 派生 userId。

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
  | 'face-embed'         // 入参：imageUrl + bboxHint?；写回 person_face_embeddings / moment_faces
  | 'face-extract'       // 入参：momentId；调用 detectAndEmbed 写回 moment_faces
  | 'face-match';        // 可选：离线标定某 moment 含哪些 person（v1.x 备用）

// targetType 扩展（face-* job 不能复用 'moment' 域，target 指向 person_face_embeddings.id）
export type AiJobTargetType =
  | 'moment'
  | 'memoir'
  | 'chapter'
  | 'event'
  | 'face_reference'     // face-embed 的 target：person_face_embeddings.id
  | 'face_match';        // face-extract 的 target：moment_id（语义上与 moment 重叠；保留独立枚举以备未来差异）
```

#### 4.5.2 handler 注册

`AiService.applyToTarget` 现有 switch 加 3 个 case：

```typescript
case 'face-embed': {
  // 1. 读 promptInput 拿 imageUrl, bboxHint
  // 2. faceProvider.detectAndEmbed → embeddings[]
  // 3. 按 bboxHint 或面积取最大脸
  // 4. 写入 person_face_embeddings（targetType='face_reference', targetId=refId）
  break;
}
case 'face-extract': {
  // 1. 读 momentId（targetType='face_match'）—— 与 'moment' 域复用同一 momentId 列
  // 2. faceProvider.detectAndEmbed(mediaUrl)
  // 3. 全部 embedding 写入 moment_faces
  break;
}
case 'face-match': {
  // v1.x 暂留空实现
  break;
}
```

#### 4.5.3 入队入口

- `FaceService.addReference` 内部写 ref 行 → 入队 `face-embed`
- `FaceService.startBackfill` 内部扫 moments，循环入队 `face-extract`（一批一批，限速 5/批/s）
- 上传 moment 时的"自动入队"功能本期**关闭**，仅手动触发

### 4.6 VectorSearchService

封装 pgvector 检索：

```typescript
@Injectable()
export class VectorSearchService {
  /**
   * 给定 query embeddings，找出 moment_faces 中最近邻
   * 排序：先按 distance asc，每 moment 取 best match
   * 过滤：distance ≤ threshold
   */
  async searchMomentsByEmbeddings(
    userId: string,
    queries: number[][],         // 多个 query embedding（参考图）
    threshold: number,           // cosine distance 阈值（默认 0.6）
    topK: number,                // 默认 200
  ): Promise<Array<{ momentId: string; distance: number }>>;
}
```

SQL 模板：

```sql
WITH q AS (
  SELECT array_fill(0::float, ARRAY[512]) AS v
  -- 多个 query 通过 UNION ALL 聚合 → 实际用 ANY/unnest
),
flat AS (
  SELECT unnest($2::float[][]) AS v  -- queries
),
hits AS (
  SELECT m.id AS moment_id,
         MIN(mf.embedding <=> f.v) AS distance  -- cosine 距离
    FROM moment_faces mf
    JOIN moments m ON m.id = mf.moment_id AND m.user_id = $1 AND m.type = 'photo'
    CROSS JOIN LATERAL (
      SELECT v FROM flat
    ) f
   WHERE mf.user_id = $1
   GROUP BY m.id
   HAVING MIN(mf.embedding <=> f.v) <= $3  -- threshold
   ORDER BY distance ASC
   LIMIT $4
)
SELECT moment_id, distance FROM hits;
```

> TypeORM pgvector 操作符兼容：`embedding <=> other` 返回 cosine distance（0..2），越小越相似。`vector_cosine_ops` 索引使用相同算子。

---

## 5. 前端设计

### 5.1 路由 + 导航

```jsx
// App.jsx
<Route path="/faces" element={<FacesPage />} />
```

`LinesPage` / 现有导航的"更多"折叠菜单加入"面孔"。

### 5.2 /faces 总览页（自适配）

```
┌────────────────────────────────────────────────────┐
│  面孔中心                            [+ 新建档案]   │
├────────────────────────────────────────────────────┤
│  我的画像 (self)                                   │
│  ┌──────────┐  已建立 / 3 张参考 / 200 命中         │
│  │ self 头像 │  [ 添加参考 ]  [ 找我的照片 → ]     │
│  └──────────┘                                       │
├────────────────────────────────────────────────────┤
│  所有人物（共 N 个，已建档 M 个）                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  ……           │
│  │李某│ │王某│ │小雨│ │ 小宇│ │ + │               │
│  │✓档案│ │   │ │✓档案│ │   │ │   │              │
│  └────┘ └────┘ └────┘ └────┘ └────┘              │
└────────────────────────────────────────────────────┘
```

点"找我的照片"或某 person 进入 **结果三 Tab**：

```
┌────────────────────────────────────────────────────┐
│ ← 返回    李小宇 · TA 的照片           [⚙ 阈值]   │
├────────────────────────────────────────────────────┤
│ [时间线][人物聚类][地点地图]                        │
├────────────────────────────────────────────────────┤
│ ── 2024 ──                                          │
│  📷 [缩略图] 你 + 李小宇    2024-08-12 三亚        │
│  📷 [缩略图] 你 + 李小宇    2024-08-13 三亚        │
│ ── 2023 ──                                          │
│  📷 [缩略图] 你 + 李小宇    2023-12-24 北京        │
│                                                      │
│  ……                                                  │
└────────────────────────────────────────────────────┘
```

### 5.3 PersonPage Tab

`PersonPage.jsx` 加 `<Tab>`：

```jsx
<Tabs>
  <Tab label="概况">{/* existing */}</Tab>
  <Tab label="TA 的照片" badge={faceProfileCount}>  
    <PersonFaceTab personId={person.id} />
  </Tab>
  <Tab label="关系">{/* existing */}</Tab>
</Tabs>
```

`PersonFaceTab`：
- 若无 face profile：CTA 上传 1 张参考图
- 已有：显示命中数 + "看照片"按钮 → 跳 `/faces?personId=X`
- 已有参考列表（N 张），可启用/停用/删

### 5.4 Moment 详情

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

### 5.6 组件

| 组件 | 路径 |
|---|---|
| `<SelfProfileCard />` | `components/SelfProfileCard.jsx` |
| `<PersonsList />` | `components/PersonsList.jsx` |
| `<FaceResultTabs />` | `components/FaceResultTabs.jsx` |
| `<FaceTimelineView />` | `components/FaceTimelineView.jsx` |
| `<FacePersonCluster />` | `components/FacePersonCluster.jsx` |
| `<FacePlaceMap />` | `components/FacePlaceMap.jsx` |
| `<PersonFaceTab />` | `components/PersonFaceTab.jsx` |
| `<ExtractFaceButton />` | `components/ExtractFaceButton.jsx` |
| `<FaceProfileSetupModal />` | `components/FaceProfileSetupModal.jsx` |

### 5.7 状态

- Zustand：`useFacesStore`，当前选中 person、当前阈值、当前 Tab
- TanStack Query：5 个主 query（profile list / self / search / backfill status / job status）

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
| Cloud provider 不可达 | `cloud.detectAndEmbed` throw → retry once → 仍失败则 job `failed`，error 写入 ai_jobs.error |
| Local provider fallback | 启动可读 `FACE_PROVIDER`，fallback 仅在调用失败时生效 |
| pgvector 查询失败 | service 兜底 throw → controller 返回 503 |
| 用户上传不合法（mime 非 photo） | 400 |
| 跨 user 访问 | 404（不暴露存在性） |
| `is_self=true` 已存在再尝试创建 | 409 conflict |
| 已删除 moment | moment_faces ON DELETE CASCADE，检索结果自动剔除 |

---

## 8. 安全与隐私

| 维度 | 措施 |
|---|---|
| 鉴权 | 全 endpoint `SessionAuthGuard` + `@CurrentUser()` |
| userId 隔离 | 所有 Repository / Query 强制 where userId |
| 唯一自档案 | DB partial unique index `uq_people_user_self` |
| Embedding 外发 | 仅返回 top-K hit + distance，不返回 embedding 本身 |
| 上传权限 | 复用 upload service 单签（key 前缀 `uploads/{userId}/face/`） |
| 删除 | person 删 → person_face_embeddings 级联；moment 删 → moment_faces 级联 |
| 日志 | 不打印 imageUrl（可能含敏感 URL）除非 verbose 模式 |

---

## 9. 性能预算

| 操作 | 预算 |
|---|---|
| `face-embed` 单张参考图（cloud） | P95 ≤ 2.0s |
| `face-embed` 单张参考图（local buffalo_l / GPU） | P95 ≤ 1.0s |
| `face-extract` 单张（本地跑） | P50 ≤ 1.5s / P95 ≤ 3.0s |
| `searchByPerson`（10k moment_faces / 3 refs） | P95 ≤ 100ms |
| backfill 吞吐 | ≥ 2 photos / s（cloud）/ 5 / s（local） |

实测在 mock provider（CI 上）单 job ≤ 200ms。

---

## 10. 测试策略

### 10.1 测试矩阵

| 层 | 用例 | 文件 |
|---|---|---|
| Provider | mock 确定性 / 接口契约 | `mock.face-provider.spec.ts` |
| Provider | Cloud HTTP 错误重试 fallback | `cloud.face-provider.spec.ts` |
| Service | self 懒创建 idempotent | `face.service.spec.ts` |
| Service | addReference 入队 + 关联 | 同上 |
| Service | searchByPerson 阈值与 topK | 同上 |
| Service | backfill 限速与幂等 | 同上 |
| Service | 跨 user 隔离 | 同上 |
| Search | pgvector SQL 集成（带 testContainer） | `vector-search.integration.spec.ts` |
| Controller | 全部 endpoint 200/4xx | `face-integration.spec.ts`（supertest） |
| Job handler | face-embed / face-extract 各一条 | `jobs/handlers.spec.ts` |
| 前端 | SelfProfileCard render | `SelfProfileCard.test.jsx` |
| 前端 | FaceResultTabs 三 Tab 切换 | `FaceResultTabs.test.jsx` |
| 前端 | useFaceSearch hook | `useFaceSearch.test.jsx` |
| 端到端 | 跑通 upload → face-embed → search | 手动 + Playwright（可选） |

### 10.2 mock 与 contract

- `MockFaceProvider` 单测覆盖：detectAndEmbed 返回 shape 与接口一致
- `VectorSearchService` 在 test 中跑实际 Postgres（testcontainers 或 docker-compose 起的 pgv-e2e），验证 `<=>` 操作符

### 10.3 测试工具链

- Jest 29（同现有）
- supertest（同现有）
- pgvector 在 dev pg container 内预装：复用现有 `pgv-e2e-postgres`

---

## 11. 实施任务拆分（commit 节奏建议）

> 每个 Task = 1 commit，commit 含实现 + 单测 + 集成测试，全绿

| # | Task | commit message 前缀 |
|---|---|---|
| 1 | migration: pgvector + people.is_self + 两张 embedding 表 + ivfflat 索引 | `feat(db): face profile schema + pgvector` |
| 2 | face entities + repository | `feat(backend): face entities + repo` |
| 3 | FaceService CRUD（不含 provider）+ VectorSearchService 基础 | `feat(backend): face service CRUD` |
| 4 | FaceProvider 接口 + MockProvider | `feat(backend): face provider interface + mock` |
| 5 | CloudProvider + LocalProvider stub | `feat(backend): face provider cloud + local` |
| 6 | FaceController + 集成测试 | `feat(backend): face controller endpoints` |
| 7 | AI job: face-embed / face-extract handler | `feat(ai): face-embed + face-extract jobs` |
| 8 | self profile 懒创建端点 | `feat(backend): self profile ensure endpoint` |
| 9 | backfill 端点 + 限速 | `feat(backend): face backfill + ratelimit` |
| 10 | 前端 api/faces + faceAdapter + faceSelectors | `feat(frontend): face api + adapters` |
| 11 | 前端 useFaceSearch + useBackfill hooks | `feat(frontend): face search hooks` |
| 12 | 前端 FacesPage + 自适配组件（SelfProfileCard + PersonsList） | `feat(frontend): /faces overview page` |
| 13 | 前端 FaceResultTabs + 3 个 view 组件 | `feat(frontend): face result 3-tab views` |
| 14 | 前端 PersonPage Tab "TA 的照片" | `feat(frontend): person page face tab` |
| 15 | 前端 Moment "提取人脸" 按钮 | `feat(frontend): moment extract-faces button` |
| 16 | 端到端 smoke：用户指南段落 | `docs(user-guide): face profile guide` |
| 17 | docs 收尾：roadmap / changelog / api.md 更新 | `docs: face profile in roadmap + api + changelog` |

每个 Task 完成后：
- `npm run test` 全绿
- `npm run lint` 全绿
- `npm run health-check`（可选）
- 1 commit

### 11.1 验收点定义（按 Nyquist 验证）

- 每 Task 完成后跑对应 spec → 任务级别的「完成」
- 所有 Task 完成后跑：
  - `npx jest` ≥ 380 单测
  - `npx jest --testPathPattern=integration` ≥ 14 集成
  - `npx jest --coverage` 后端 ≥ 78%
  - 前端 `npm run test:cov` Page 覆盖度涨 ≥ 5%

---

## 12. 不在本期范围（明确放弃）

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
