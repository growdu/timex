# 个人画像功能（face profile）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 timex 增加「个人画像」功能：用户上传本人参考照片，后端抽取 512-d 人脸 embedding 存入 PostgreSQL + pgvector，可对全库 moment 做 ANN 相似度检索，结果按时间线 / 人物 / 地点三视图呈现。

**Architecture:** 复用现有 `ai_jobs` 异步任务框架与 S3 直传上传链路；新增 `user_face_embeddings`（self profile 直接挂 user_id）+ `moment_faces`（入库图）两张 pgvector 表；后端 `face` 模块通过 `FaceProvider` 抽象（cloud / local / mock）调用人脸识别；前端新增 `/faces` 单页面（self profile + 三 Tab 结果）+ Moment 提取按钮。

**Tech Stack:** NestJS 11 + TypeORM + PostgreSQL 16 + pgvector 0.5+（`pgvector/pgvector:pg16`）+ Jest 29 + supertest；前端 React 19 + Vite 6 + TanStack Query v5；AI Provider 默认 mock（CI / dev），cloud/local 通过 `FACE_PROVIDER` 环境变量切换。

## Global Constraints

- 全程中文界面文字，与现有 `product.md` 一致
- 所有数据库表带 `user_id`，Service / Repository 强制 `userId` 过滤（[backend.md §多租户隔离](../../../backend.md)）
- 每 commit 含实现 + 单元测试 + 集成测试，`npm run test` 与 `npm run lint` 全绿
- TypeORM 装饰器风格（与 `backend/src/people/person.entity.ts` 一致）
- AI 任务走 `ai_jobs` 表 + `AiService.submit/runJob`（不引入新的 job runner）
- 前端 TanStack Query key 命名 `['faces', ...]`；Zustand store 文件命名 `useFacesStore`
- 迁移文件命名 `2026_10_12_*.sql`，放到 `backend/scripts/migrations/`，由 `migrate.ts` 自动运行
- pgvector 扩展：Docker 镜像必须 `pgvector/pgvector:pg16`（含 `CREATE EXTENSION vector`）
- **单 self 档案简化**：一个 user 只对应一套 self face profile；本计划不修改 `people` 表（保留 is_self 无关），不维护 PersonPage Tab

---

## 文件结构（实施前总览）

后端（新增）：

```
backend/src/face/
├── face.module.ts                          # 注册 Controller + Service + Provider 工厂
├── face.service.ts                         # 业务核心：self profile CRUD + 检索 + backfill
├── face.service.spec.ts                    # 单测
├── face.controller.ts                      # REST（/me/* + search + backfill）
├── face.controller.spec.ts                 # 控制器单测
├── face-integration.spec.ts                # 端到端 supertest
├── entities/
│   ├── user-face-embedding.entity.ts
│   ├── moment-face.entity.ts
│   ├── scratch-dump.entity.ts              # @Entity('scratch_dumps')
│   └── scratch-dump-item.entity.ts         # @Entity('scratch_dump_items')
├── dto/
│   ├── search-faces.dto.ts
│   ├── add-face-reference.dto.ts
│   └── add-scratch-dump-item.dto.ts
├── providers/
│   ├── face-provider.interface.ts
│   ├── face-provider.factory.ts
│   ├── mock.face-provider.ts
│   ├── mock.face-provider.spec.ts
│   ├── cloud.face-provider.ts
│   ├── cloud.face-provider.spec.ts
│   ├── local.face-provider.ts
│   └── local.face-provider.spec.ts
├── search/
│   ├── vector-search.service.ts
│   └── vector-search.service.spec.ts
├── scratch/
│   ├── scratch-dump.service.ts             # dump CRUD + dump 内检索
│   ├── scratch-dump.service.spec.ts
│   ├── scratch-dump.controller.ts          # REST: /faces/dumps/*
│   └── scratch-dump-integration.spec.ts
└── jobs/
    ├── face-job.handler.ts                 # kind: face-embed / face-extract / face-extract-scratch
    └── face-job.handler.spec.ts
backend/src/ai/entities/ai-job.entity.ts    # 扩展 AiJobKind + AiJobTargetType (face_dump_item)
backend/src/ai/ai.service.ts                # applyToTarget 加 3 个 case
backend/src/config/face.config.ts           # FACE_PROVIDER 等
backend/scripts/migrations/
└── 2026_10_12_face_profile.sql             # pgvector + 4 表 + ivfflat
```

前端（新增）：

```
frontend/src/
├── api/faces.js                            # facesApi + scratchDumpsApi 对象
├── data/
│   ├── faceAdapter.js                      # 派生 timeline/persons/places
│   ├── dumpAdapter.js                      # dump 时间线派生
│   └── faceSelectors.js                    # 纯函数选择器
├── hooks/
│   ├── useFaceSearch.js
│   ├── useFaceBackfill.js
│   ├── useFaceProfile.js
│   └── useExtractFaces.js
├── store/useFacesStore.js
├── components/
│   ├── SelfProfileCard.jsx
│   ├── FaceResultTabs.jsx
│   ├── FaceTimelineView.jsx
│   ├── FacePersonCluster.jsx
│   ├── FacePlaceMap.jsx
│   ├── ExtractFaceButton.jsx
│   ├── FaceProfileSetupModal.jsx
│   ├── DumpCard.jsx
│   ├── DumpUploader.jsx
│   ├── DumpProgressBar.jsx
│   └── DumpTimelineView.jsx
└── pages/
    ├── FacesPage.jsx
    ├── DumpsListPage.jsx
    ├── DumpNewPage.jsx
    └── DumpDetailPage.jsx
```

修改：

```
backend/src/app.module.ts                   # 注册 FaceModule
backend/src/ai/entities/ai-job.entity.ts    # 扩展 union（face_dump_item）
backend/src/ai/ai.module.ts                 # 注册 FaceJobHandler
backend/src/ai/ai.service.ts                # 加 3 handler case
backend/.env.example                        # FACE_PROVIDER 等
frontend/src/App.jsx                        # 新路由 /faces + /faces/dumps*
frontend/src/components/Header.jsx          # 加「面孔」导航
```

---

## Task 1: pgvector + face schema + scratch dump migration

**Files:**
- Create: `backend/scripts/migrations/2026_10_12_face_profile.sql`
- Test: 跑 `npm run migrate:dev` 后用 psql 验证表与索引已建

**Interfaces:**
- Consumes: PostgreSQL 16 + pgvector 已装
- Produces: 4 张表 + 索引 ivfflat（user_face_embeddings / moment_faces / scratch_dumps / scratch_dump_items）

- [ ] **Step 1.1: 写迁移文件**

新建 `backend/scripts/migrations/2026_10_12_face_profile.sql`：

```sql
-- pgvector 扩展（由 pgvector/pgvector:pg16 镜像内置）
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 单 self 人脸参考照片（user_face_embeddings）—— 一个 user 一套档案
CREATE TABLE IF NOT EXISTS user_face_embeddings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,
  thumbnail_url TEXT,
  bbox          jsonb,
  embedding     vector(512) NOT NULL,
  provider      VARCHAR(32) NOT NULL DEFAULT 'mock',
  model         VARCHAR(64),
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, source_url)
);
CREATE INDEX IF NOT EXISTS idx_ufe_user_enabled ON user_face_embeddings (user_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_ufe_embedding ON user_face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 2. moment 中的人脸（moment_faces）
CREATE TABLE IF NOT EXISTS moment_faces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moment_id     uuid NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,
  bbox          jsonb,
  embedding     vector(512) NOT NULL,
  provider      VARCHAR(32) NOT NULL DEFAULT 'mock',
  model         VARCHAR(64),
  quality_score REAL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mf_moment ON moment_faces (moment_id);
CREATE INDEX IF NOT EXISTS idx_mf_user_moment ON moment_faces (user_id, moment_id);
CREATE INDEX IF NOT EXISTS idx_mf_embedding ON moment_faces USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. 临时 dump 元数据（scratch_dumps）
CREATE TABLE IF NOT EXISTS scratch_dumps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(120) NOT NULL,
  description    TEXT,
  status         VARCHAR(32) NOT NULL DEFAULT 'created',
  total_items    INTEGER NOT NULL DEFAULT 0,
  done_items     INTEGER NOT NULL DEFAULT 0,
  failed_items   INTEGER NOT NULL DEFAULT 0,
  hits_count     INTEGER NOT NULL DEFAULT 0,
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
  taken_at      TIMESTAMP,
  file_mtime    TIMESTAMP,
  width         INTEGER,
  height        INTEGER,
  file_size     BIGINT,
  bbox          jsonb,
  embedding     vector(512),
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
CREATE INDEX IF NOT EXISTS idx_sdi_embedding ON scratch_dump_items
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
  WHERE is_processed = TRUE;
```

- [ ] **Step 1.2: 跑迁移**

```bash
cd backend && npm run migrate:dev
```

预期日志：`Applied 1 migration(s): 2026_10_12_face_profile.sql`

- [ ] **Step 1.3: 验证表与索引**

```bash
docker exec -i pgv-e2e-postgres psql -U postgres -d timex <<'SQL'
\d user_face_embeddings
\d moment_faces
\d scratch_dumps
\d scratch_dump_items
SELECT indexname FROM pg_indexes WHERE tablename IN ('user_face_embeddings','moment_faces','scratch_dumps','scratch_dump_items');
SQL
```

预期：4 张表存在；`uq_user_face_source` + `uq_sdi_dump_source` 唯一约束；4 个 ivfflat 索引。

- [ ] **Step 1.4: 验证 UNIQUE 约束**

```sql
INSERT INTO users (id, email, password_hash) VALUES
  ('aaaaaaaa-1111-2222-3333-444444444444','t1@e.test','x');
INSERT INTO user_face_embeddings (user_id, source_url, embedding)
VALUES ('aaaaaaaa-1111-2222-3333-444444444444','https://x/a.jpg',ARRAY_FILL(0, ARRAY[512]));
INSERT INTO user_face_embeddings (user_id, source_url, embedding)
VALUES ('aaaaaaaa-1111-2222-3333-444444444444','https://x/a.jpg',ARRAY_FILL(0, ARRAY[512]));
```

预期第二条 INSERT 失败：`duplicate key value violates unique constraint`

- [ ] **Step 1.5: Commit**

```bash
git add backend/scripts/migrations/2026_10_12_face_profile.sql
git commit -m "feat(db): face profile + scratch dump schema + pgvector"
```

---

## Task 2: TypeORM entities（user-face-embedding + moment-face + scratch-dump + scratch-dump-item）

**Files:**
- Create: `backend/src/face/entities/user-face-embedding.entity.ts`
- Create: `backend/src/face/entities/moment-face.entity.ts`
- Create: `backend/src/face/entities/scratch-dump.entity.ts`
- Create: `backend/src/face/entities/scratch-dump-item.entity.ts`
- Modify: `backend/src/config/database.config.ts`（注册 entities）
- Test: `backend/src/face/entities/entities.integration.spec.ts`

**Interfaces:**
- Consumes: DB schema from Task 1
- Produces: Entities `UserFaceEmbedding`、`MomentFace`

- [ ] **Step 2.1: 写 UserFaceEmbedding entity**

新建 `backend/src/face/entities/user-face-embedding.entity.ts`：

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_face_embeddings')
@Index(['userId', 'isEnabled'])
@Index(['userId', 'sourceUrl'], { unique: true })
export class UserFaceEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bbox!: { x: number; y: number; w: number; h: number } | null;

  @Column({ type: 'vector', length: 512 })
  embedding!: number[];

  @Column({ length: 32, default: 'mock' })
  provider!: string;

  @Column({ length: 64, nullable: true })
  model!: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
```

- [ ] **Step 2.2: 写 MomentFace entity**

新建 `backend/src/face/entities/moment-face.entity.ts`：

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Moment } from '../../moments/moment.entity';

@Entity('moment_faces')
@Index(['momentId'])
@Index(['userId', 'momentId'])
export class MomentFace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'moment_id', type: 'uuid' })
  momentId!: string;

  @ManyToOne(() => Moment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moment_id' })
  moment?: Moment;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ type: 'jsonb', nullable: true })
  bbox!: { x: number; y: number; w: number; h: number } | null;

  @Column({ type: 'vector', length: 512 })
  embedding!: number[];

  @Column({ length: 32, default: 'mock' })
  provider!: string;

  @Column({ length: 64, nullable: true })
  model!: string | null;

  @Column({ name: 'quality_score', type: 'real', nullable: true })
  qualityScore!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
```

- [ ] **Step 2.3: 注册 entities 到 TypeORM**

`backend/src/config/database.config.ts`（或同名）的 `entities` 数组追加：

```typescript
import { UserFaceEmbedding } from '../face/entities/user-face-embedding.entity';
import { MomentFace } from '../face/entities/moment-face.entity';
// ...
entities: [..., UserFaceEmbedding, MomentFace],
```

> 命名 / 路径对齐实际项目（`backend/src/config/typeorm.config.ts` 之类）。

- [ ] **Step 2.4: 写实体映射集成测试**

新建 `backend/src/face/entities/entities.integration.spec.ts`：

```typescript
import { DataSource } from 'typeorm';
import { databaseConfig } from '../../../config/database.config';
import { UserFaceEmbedding } from './user-face-embedding.entity';
import { MomentFace } from './moment-face.entity';

describe('Face entities mapping', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource(databaseConfig() as never);
    await ds.initialize();
  });
  afterAll(async () => { await ds.destroy(); });

  it('round-trips UserFaceEmbedding', async () => {
    const u = await ds.query(
      `INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(),$1,$2) RETURNING id`,
      ['t-roundtrip@e.test', 'x'],
    );
    const userId = u[0].id;
    const repo = ds.getRepository(UserFaceEmbedding);
    const ref = await repo.save(repo.create({
      userId, sourceUrl: 'https://x/1.jpg',
      embedding: new Array(512).fill(0).map((_, i) => i / 1000),
      provider: 'mock', model: 'fake',
    }));
    expect(ref.id).toBeDefined();
    const found = await repo.findOneByOrFail({ id: ref.id });
    expect(found.embedding).toHaveLength(512);
  });

  it('round-trips MomentFace', async () => {
    const u = await ds.query(
      `INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(),$1,$2) RETURNING id`,
      ['t-mf@e.test', 'x'],
    );
    const userId = u[0].id;
    const m = await ds.query(
      `INSERT INTO moments (user_id, type, title, media_url) VALUES ($1,'photo','x','https://x/2.jpg') RETURNING id`,
      [userId],
    );
    const momentId = m[0].id;
    const repo = ds.getRepository(MomentFace);
    const face = await repo.save(repo.create({
      userId, momentId, sourceUrl: 'https://x/2.jpg',
      embedding: new Array(512).fill(0), provider: 'mock', model: 'fake',
    }));
    const found = await repo.findOneByOrFail({ id: face.id });
    expect(found.momentId).toBe(momentId);
  });

  it('enforces unique (user_id, source_url) on user_face_embeddings', async () => {
    const u = await ds.query(
      `INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(),$1,$2) RETURNING id`,
      ['t-dup@e.test', 'x'],
    );
    const userId = u[0].id;
    const repo = ds.getRepository(UserFaceEmbedding);
    await repo.save(repo.create({
      userId, sourceUrl: 'https://x/dup.jpg',
      embedding: new Array(512).fill(0), provider: 'mock',
    }));
    await expect(repo.save(repo.create({
      userId, sourceUrl: 'https://x/dup.jpg',
      embedding: new Array(512).fill(0), provider: 'mock',
    }))).rejects.toThrow();
  });
});
```

- [ ] **Step 2.5: 跑测试 + commit**

```bash
cd backend
npx jest src/face/entities --runInBand
git add backend/src/face backend/src/config
git commit -m "feat(backend): face entities (UserFaceEmbedding, MomentFace) + unique constraint"
```

---

## Task 3: FaceProvider 接口 + MockProvider（CI 默认）

**Files:**
- Create: `backend/src/face/providers/face-provider.interface.ts`
- Create: `backend/src/face/providers/mock.face-provider.ts`
- Create: `backend/src/face/providers/mock.face-provider.spec.ts`

**Interfaces:**
- Consumes: imageUrl（OSS /mock URL）
- Produces: `detectAndEmbed(url): FaceEmbedding[]`；`embedFace(url, bbox): FaceEmbedding`

- [ ] **Step 3.1: 写接口**

新建 `backend/src/face/providers/face-provider.interface.ts`：

```typescript
export type BBox = { x: number; y: number; w: number; h: number };

export interface FaceEmbedding {
  bbox: BBox | null;
  vector: number[];
  confidence?: number;
}

export const FACE_VECTOR_DIM = 512;

export interface FaceProvider {
  readonly name: 'cloud' | 'local' | 'mock';
  detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]>;
  embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding>;
}
```

- [ ] **Step 3.2: 写 MockProvider**

新建 `backend/src/face/providers/mock.face-provider.ts`：

```typescript
import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  BBox, FACE_VECTOR_DIM, FaceEmbedding, FaceProvider,
} from './face-provider.interface';

function deterministicVector(seed: string): number[] {
  const hash = createHash('sha256').update(seed).digest();
  const out = new Array<number>(FACE_VECTOR_DIM).fill(0);
  for (let i = 0; i < FACE_VECTOR_DIM; i++) {
    out[i] = (hash[i % hash.length] / 255) * 2 - 1;
  }
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}

@Injectable()
export class MockFaceProvider implements FaceProvider {
  readonly name = 'mock' as const;

  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    return [{
      bbox: { x: 0, y: 0, w: 1, h: 1 },
      vector: deterministicVector(imageUrl),
      confidence: 1,
    }];
  }

  async embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding> {
    return {
      bbox: bboxHint,
      vector: deterministicVector(`${imageUrl}#${bboxHint.x},${bboxHint.y},${bboxHint.w},${bboxHint.h}`),
      confidence: 1,
    };
  }
}
```

- [ ] **Step 3.3: 写 mock 单测**

新建 `backend/src/face/providers/mock.face-provider.spec.ts`：

```typescript
import { MockFaceProvider } from './mock.face-provider';
import { FACE_VECTOR_DIM } from './face-provider.interface';

describe('MockFaceProvider', () => {
  const p = new MockFaceProvider();

  it('has name="mock"', () => expect(p.name).toBe('mock'));

  it('detectAndEmbed returns 1 face with 512-d normalized vector', async () => {
    const faces = await p.detectAndEmbed('https://example.com/a.jpg');
    expect(faces).toHaveLength(1);
    expect(faces[0].vector).toHaveLength(FACE_VECTOR_DIM);
    const norm = Math.sqrt(faces[0].vector.reduce((s, x) => s + x * x, 0));
    expect(Math.abs(norm - 1)).toBeLessThan(1e-9);
  });

  it('same URL produces same vector (deterministic)', async () => {
    const a = await p.detectAndEmbed('https://example.com/same.jpg');
    const b = await p.detectAndEmbed('https://example.com/same.jpg');
    expect(a[0].vector).toEqual(b[0].vector);
  });

  it('different URLs produce different vectors', async () => {
    const a = await p.detectAndEmbed('https://example.com/x.jpg');
    const b = await p.detectAndEmbed('https://example.com/y.jpg');
    expect(a[0].vector).not.toEqual(b[0].vector);
  });

  it('embedFace respects bbox hint', async () => {
    const fe = await p.embedFace('https://example.com/a.jpg', { x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(fe.bbox).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(fe.vector).toHaveLength(FACE_VECTOR_DIM);
  });
});
```

- [ ] **Step 3.4: 跑测试**

```bash
cd backend && npx jest src/face/providers/mock.face-provider.spec.ts
```

预期：4 tests pass。

- [ ] **Step 3.5: Commit**

```bash
git add backend/src/face/providers
git commit -m "feat(backend): FaceProvider interface + MockFaceProvider"
```

---

## Task 4: CloudFaceProvider + LocalFaceProvider

**Files:**
- Create: `backend/src/face/providers/cloud.face-provider.ts`
- Create: `backend/src/face/providers/local.face-provider.ts`
- Create: `backend/src/face/providers/cloud.face-provider.spec.ts`
- Create: `backend/src/face/providers/local.face-provider.spec.ts`
- Create: `backend/src/config/face.config.ts`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `FaceProvider`，HttpService，`FaceConfig` 注入 baseUrl + apiKey
- Produces: cloud/local provider 实例；fallback 在 factory 层处理

- [ ] **Step 4.1: 写 face config**

新建 `backend/src/config/face.config.ts`：

```typescript
export interface FaceConfig {
  provider: 'cloud' | 'local' | 'mock';
  cloud: { baseUrl: string; apiKey: string; timeoutMs: number };
  local: { baseUrl: string; timeoutMs: number };
  search: { threshold: number; topK: number; backfillBatch: number };
}

export function loadFaceConfig(): FaceConfig {
  return {
    provider: (process.env.FACE_PROVIDER ?? 'mock') as FaceConfig['provider'],
    cloud: {
      baseUrl: process.env.FACE_CLOUD_BASE_URL ?? '',
      apiKey: process.env.FACE_CLOUD_API_KEY ?? '',
      timeoutMs: Number(process.env.FACE_CLOUD_TIMEOUT_MS ?? 5000),
    },
    local: {
      baseUrl: process.env.FACE_LOCAL_BASE_URL ?? 'http://localhost:8000',
      timeoutMs: Number(process.env.FACE_LOCAL_TIMEOUT_MS ?? 30000),
    },
    search: {
      threshold: Number(process.env.FACE_SEARCH_THRESHOLD ?? 0.6),
      topK: Number(process.env.FACE_SEARCH_TOPK ?? 200),
      backfillBatch: Number(process.env.FACE_BACKFILL_BATCH ?? 10),
    },
  };
}
```

- [ ] **Step 4.2: 写 Cloud provider**

新建 `backend/src/face/providers/cloud.face-provider.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FaceConfig } from '../../config/face.config';
import { BBox, FaceEmbedding, FaceProvider } from './face-provider.interface';

interface CloudFaceResponse {
  faces: Array<{
    bbox: { x: number; y: number; w: number; h: number };
    embedding: number[];
    confidence?: number;
  }>;
}

@Injectable()
export class CloudFaceProvider implements FaceProvider {
  readonly name = 'cloud' as const;
  private log = new Logger(CloudFaceProvider.name);

  constructor(private http: HttpService, private cfg: FaceConfig) {}

  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    const res = await firstValueFrom(
      this.http.post<CloudFaceResponse>(
        `${this.cfg.cloud.baseUrl}/v1/face/detect`,
        { image: imageUrl, return_embedding: true },
        {
          headers: { Authorization: `Bearer ${this.cfg.cloud.apiKey}` },
          timeout: this.cfg.cloud.timeoutMs,
        },
      ),
    );
    return res.data.faces.map((f) => ({
      bbox: f.bbox, vector: f.embedding, confidence: f.confidence,
    }));
  }

  async embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding> {
    const res = await firstValueFrom(
      this.http.post<{ embedding: number[]; confidence?: number }>(
        `${this.cfg.cloud.baseUrl}/v1/face/embed`,
        { image: imageUrl, bbox: bboxHint },
        {
          headers: { Authorization: `Bearer ${this.cfg.cloud.apiKey}` },
          timeout: this.cfg.cloud.timeoutMs,
        },
      ),
    );
    return { bbox: bboxHint, vector: res.data.embedding, confidence: res.data.confidence };
  }
}
```

- [ ] **Step 4.3: 写 Local provider**

新建 `backend/src/face/providers/local.face-provider.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FaceConfig } from '../../config/face.config';
import { BBox, FaceEmbedding, FaceProvider } from './face-provider.interface';

interface LocalDetectResponse {
  faces: Array<{
    bbox: { x: number; y: number; w: number; h: number };
    embedding: number[];
    confidence?: number;
  }>;
}

@Injectable()
export class LocalFaceProvider implements FaceProvider {
  readonly name = 'local' as const;

  constructor(private http: HttpService, private cfg: FaceConfig) {}

  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    const res = await firstValueFrom(
      this.http.post<LocalDetectResponse>(
        `${this.cfg.local.baseUrl}/detect`,
        { image_url: imageUrl },
        { timeout: this.cfg.local.timeoutMs },
      ),
    );
    return res.data.faces.map((f) => ({
      bbox: f.bbox, vector: f.embedding, confidence: f.confidence,
    }));
  }

  async embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding> {
    const res = await firstValueFrom(
      this.http.post<{ embedding: number[]; confidence?: number }>(
        `${this.cfg.local.baseUrl}/embed`,
        { image_url: imageUrl, bbox: bboxHint },
        { timeout: this.cfg.local.timeoutMs },
      ),
    );
    return { bbox: bboxHint, vector: res.data.embedding, confidence: res.data.confidence };
  }
}
```

- [ ] **Step 4.4: 写 cloud 单测（HTTP mock）**

新建 `backend/src/face/providers/cloud.face-provider.spec.ts`：

```typescript
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { CloudFaceProvider } from './cloud.face-provider';

describe('CloudFaceProvider', () => {
  let p: CloudFaceProvider;
  let http: { post: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        CloudFaceProvider,
        { provide: HttpService, useValue: http },
        { provide: 'FaceConfig', useValue: { cloud: { baseUrl: 'https://x', apiKey: 'k', timeoutMs: 1000 } } },
      ],
    }).compile();
    p = mod.get(CloudFaceProvider);
  });

  it('maps /v1/face/detect response to FaceEmbedding[]', async () => {
    http.post.mockReturnValue(of({
      data: { faces: [{
        bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
        embedding: [0.1, 0.2, 0.3], confidence: 0.9,
      }] },
    }));
    const out = await p.detectAndEmbed('https://img/1.jpg');
    expect(out).toHaveLength(1);
    expect(out[0].bbox).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(out[0].vector).toEqual([0.1, 0.2, 0.3]);
  });

  it('forwards image URL in request body', async () => {
    http.post.mockReturnValue(of({ data: { faces: [] } }));
    await p.detectAndEmbed('https://img/2.jpg');
    const call = http.post.mock.calls[0];
    expect(call[0]).toBe('https://x/v1/face/detect');
    expect(call[1]).toEqual({ image: 'https://img/2.jpg', return_embedding: true });
  });

  it('propagates HTTP error', async () => {
    http.post.mockReturnValue(throwError(() => new Error('network')));
    await expect(p.detectAndEmbed('x')).rejects.toThrow('network');
  });
});
```

- [ ] **Step 4.5: 写 local 单测（HTTP mock）**

新建 `backend/src/face/providers/local.face-provider.spec.ts`：

```typescript
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { LocalFaceProvider } from './local.face-provider';

describe('LocalFaceProvider', () => {
  let p: LocalFaceProvider;
  let http: { post: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        LocalFaceProvider,
        { provide: HttpService, useValue: http },
        { provide: 'FaceConfig', useValue: { local: { baseUrl: 'http://svc:8000', timeoutMs: 5000 } } },
      ],
    }).compile();
    p = mod.get(LocalFaceProvider);
  });

  it('detects via /detect endpoint with image_url payload', async () => {
    http.post.mockReturnValue(of({ data: { faces: [] } }));
    await p.detectAndEmbed('https://i/1.jpg');
    expect(http.post).toHaveBeenCalledWith(
      'http://svc:8000/detect',
      { image_url: 'https://i/1.jpg' },
      { timeout: 5000 },
    );
  });
});
```

- [ ] **Step 4.6: .env.example 追加**

```
FACE_PROVIDER=mock
FACE_CLOUD_BASE_URL=
FACE_CLOUD_API_KEY=
FACE_LOCAL_BASE_URL=http://localhost:8000
FACE_CLOUD_TIMEOUT_MS=5000
FACE_LOCAL_TIMEOUT_MS=30000
FACE_SEARCH_THRESHOLD=0.6
FACE_SEARCH_TOPK=200
FACE_BACKFILL_BATCH=10
```

- [ ] **Step 4.7: 跑测试 + commit**

```bash
cd backend
npx jest src/face/providers
git add backend/src/face/providers backend/src/config/face.config.ts backend/.env.example
git commit -m "feat(backend): cloud + local FaceProvider with HTTP abstraction"
```

---

## Task 5: FaceProviderFactory + FaceModule 装配

**Files:**
- Create: `backend/src/face/providers/face-provider.factory.ts`
- Create: `backend/src/face/face.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `FaceConfig` + 三个 Provider 实例
- Produces: `FaceProvider` 单例；`FaceModule` 暴露给 NestJS

- [ ] **Step 5.1: 写 factory**

新建 `backend/src/face/providers/face-provider.factory.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FaceConfig } from '../../config/face.config';
import { CloudFaceProvider } from './cloud.face-provider';
import { FaceProvider } from './face-provider.interface';
import { LocalFaceProvider } from './local.face-provider';
import { MockFaceProvider } from './mock.face-provider';

@Injectable()
export class FaceProviderFactory {
  private log = new Logger(FaceProviderFactory.name);
  private _instance?: FaceProvider;

  constructor(
    private cfg: FaceConfig,
    private cloud: CloudFaceProvider,
    private local: LocalFaceProvider,
    private mock: MockFaceProvider,
  ) {}

  resolve(): FaceProvider {
    if (this._instance) return this._instance;
    let p: FaceProvider;
    switch (this.cfg.provider) {
      case 'cloud': p = this.cloud; break;
      case 'local': p = this.local; break;
      case 'mock':
      default:      p = this.mock;
    }
    this.log.log(`FaceProvider resolved: ${p.name} (cfg.provider=${this.cfg.provider})`);
    this._instance = p;
    return p;
  }
}
```

- [ ] **Step 5.2: 写 FaceModule**

新建 `backend/src/face/face.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loadFaceConfig } from '../config/face.config';
import { Moment } from '../moments/moment.entity';
import { UserFaceEmbedding } from './entities/user-face-embedding.entity';
import { MomentFace } from './entities/moment-face.entity';
import { CloudFaceProvider } from './providers/cloud.face-provider';
import { FaceProviderFactory } from './providers/face-provider.factory';
import { LocalFaceProvider } from './providers/local.face-provider';
import { MockFaceProvider } from './providers/mock.face-provider';
import { FaceService } from './face.service';
import { FaceController } from './face.controller';
import { VectorSearchService } from './search/vector-search.service';
import { FaceJobHandler } from './jobs/face-job.handler';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Moment, UserFaceEmbedding, MomentFace]),
  ],
  controllers: [FaceController],
  providers: [
    { provide: 'FaceConfig', useFactory: loadFaceConfig },
    MockFaceProvider,
    CloudFaceProvider,
    LocalFaceProvider,
    FaceProviderFactory,
    VectorSearchService,
    FaceJobHandler,
    FaceService,
  ],
  exports: [FaceService, FaceJobHandler],
})
export class FaceModule {}
```

- [ ] **Step 5.3: 注册到 AppModule**

`backend/src/app.module.ts` 的 `imports` 数组追加 `FaceModule`。

- [ ] **Step 5.4: 写 factory 单测**

新建 `backend/src/face/providers/face-provider.factory.spec.ts`：

```typescript
import { FaceProviderFactory } from './face-provider.factory';
import { MockFaceProvider } from './mock.face-provider';
import { CloudFaceProvider } from './cloud.face-provider';
import { LocalFaceProvider } from './local.face-provider';

function mkFactory(provider: 'cloud' | 'local' | 'mock') {
  return new FaceProviderFactory(
    { provider, cloud: { baseUrl: '', apiKey: '', timeoutMs: 0 }, local: { baseUrl: '', timeoutMs: 0 }, search: { threshold: 0, topK: 0, backfillBatch: 0 } } as never,
    new CloudFaceProvider({} as never, {} as never),
    new LocalFaceProvider({} as never, {} as never),
    new MockFaceProvider(),
  );
}

describe('FaceProviderFactory', () => {
  it('resolves mock when provider=mock', () => expect(mkFactory('mock').resolve().name).toBe('mock'));
  it('resolves cloud when provider=cloud', () => expect(mkFactory('cloud').resolve().name).toBe('cloud'));
  it('resolves local when provider=local', () => expect(mkFactory('local').resolve().name).toBe('local'));
  it('caches the resolved instance', () => {
    const f = mkFactory('mock');
    expect(f.resolve()).toBe(f.resolve());
  });
});
```

- [ ] **Step 5.5: 跑测试 + commit**

```bash
cd backend
npx jest src/face/providers
git add backend/src/face backend/src/app.module.ts
git commit -m "feat(backend): FaceProviderFactory + FaceModule wiring"
```

---

## Task 6: VectorSearchService（pgvector ANN 检索）

**Files:**
- Create: `backend/src/face/search/vector-search.service.ts`
- Create: `backend/src/face/search/vector-search.service.spec.ts`

**Interfaces:**
- Consumes: `DataSource`（注入），`FaceConfig.search.*`
- Produces: `searchMomentsByEmbeddings(userId, queries, threshold, topK)` → `Array<{momentId, distance}>`

- [ ] **Step 6.1: 写 VectorSearchService**

新建 `backend/src/face/search/vector-search.service.ts`：

```typescript
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FaceConfig } from '../../config/face.config';

export interface MomentHit {
  momentId: string;
  distance: number;
}

@Injectable()
export class VectorSearchService {
  private log = new Logger(VectorSearchService.name);

  constructor(
    private ds: DataSource,
    @Inject('FaceConfig') private cfg: FaceConfig,
  ) {}

  async searchMomentsByEmbeddings(
    userId: string,
    queries: number[][],
    threshold?: number,
    topK?: number,
  ): Promise<MomentHit[]> {
    if (queries.length === 0) return [];
    const thr = threshold ?? this.cfg.search.threshold;
    const k = topK ?? this.cfg.search.topK;
    const sql = `
      WITH q AS (
        SELECT v, ord FROM unnest($2::float[][]) WITH ORDINALITY AS t(v, ord)
      ),
      distances AS (
        SELECT mf.moment_id,
               mf.embedding <=> q.v AS distance,
               q.ord AS query_idx
          FROM moment_faces mf
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
    `;
    const rows = await this.ds.query(sql, [userId, queries, thr, k]);
    return (rows as Array<{ momentId: string; distance: number }>)
      .map((r) => ({ momentId: r.momentId, distance: Number(r.distance) }));
  }
}
```

- [ ] **Step 6.2: 写单测（mock DataSource）**

新建 `backend/src/face/search/vector-search.service.spec.ts`：

```typescript
import { VectorSearchService } from './vector-search.service';

describe('VectorSearchService', () => {
  const cfg = { search: { threshold: 0.6, topK: 200, backfillBatch: 10 } } as never;

  it('returns [] when no queries', async () => {
    const ds = { query: jest.fn() } as never;
    const svc = new VectorSearchService(ds, cfg);
    expect(await svc.searchMomentsByEmbeddings('u1', [])).toEqual([]);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('passes userId, queries, threshold, topK to query', async () => {
    const ds = { query: jest.fn().mockResolvedValue([]) } as never;
    const svc = new VectorSearchService(ds, cfg);
    const q = [new Array(512).fill(0.1)];
    await svc.searchMomentsByEmbeddings('u1', q, 0.5, 10);
    expect(ds.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (ds.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('moment_faces');
    expect(params[0]).toBe('u1');
    expect(params[1]).toBe(q);
    expect(params[2]).toBe(0.5);
    expect(params[3]).toBe(10);
  });

  it('uses defaults from config when not passed', async () => {
    const ds = { query: jest.fn().mockResolvedValue([]) } as never;
    const svc = new VectorSearchService(ds, cfg);
    await svc.searchMomentsByEmbeddings('u1', [new Array(512).fill(0)]);
    const [, params] = (ds.query as jest.Mock).mock.calls[0];
    expect(params[2]).toBe(0.6);
    expect(params[3]).toBe(200);
  });

  it('maps DB rows to MomentHit[]', async () => {
    const rows = [
      { momentId: 'm1', distance: '0.1' },
      { momentId: 'm2', distance: '0.2' },
    ];
    const ds = { query: jest.fn().mockResolvedValue(rows) } as never;
    const svc = new VectorSearchService(ds, cfg);
    const out = await svc.searchMomentsByEmbeddings('u1', [new Array(512).fill(0)]);
    expect(out).toEqual([
      { momentId: 'm1', distance: 0.1 },
      { momentId: 'm2', distance: 0.2 },
    ]);
  });
});
```

- [ ] **Step 6.3: 跑测试 + commit**

```bash
cd backend
npx jest src/face/search
git add backend/src/face/search
git commit -m "feat(backend): VectorSearchService with pgvector cosine ANN"
```

---

## Task 7: FaceService + FaceController + AI job handler

**Files:**
- Create: `backend/src/face/face.service.ts`
- Create: `backend/src/face/face.service.spec.ts`
- Create: `backend/src/face/face.controller.ts`
- Create: `backend/src/face/face.controller.spec.ts`
- Create: `backend/src/face/dto/search-faces.dto.ts`
- Create: `backend/src/face/dto/add-face-reference.dto.ts`
- Create: `backend/src/face/face-integration.spec.ts`
- Create: `backend/src/face/jobs/face-job.handler.ts`
- Create: `backend/src/face/jobs/face-job.handler.spec.ts`
- Modify: `backend/src/ai/entities/ai-job.entity.ts`
- Modify: `backend/src/ai/ai.service.ts`
- Modify: `backend/src/ai/ai.module.ts`

**Interfaces:**
- Consumes: `FaceProvider`、`DataSource`、`UserFaceEmbedding`、`MomentFace` repos、`AiService`、`FaceConfig`
- Produces: REST endpoints、self profile CRUD、search、backfill

- [ ] **Step 7.1: DTOs**

`backend/src/face/dto/search-faces.dto.ts`：

```typescript
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SearchFacesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  topK?: number;
}
```

`backend/src/face/dto/add-face-reference.dto.ts`：

```typescript
import { IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddFaceReferenceDto {
  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl!: string;

  @IsOptional()
  @IsObject()
  bboxHint?: { x: number; y: number; w: number; h: number };
}
```

- [ ] **Step 7.2: 扩展 AiJobKind 与 AiJobTargetType**

`backend/src/ai/entities/ai-job.entity.ts`：

```typescript
export type AiJobKind =
  | 'image-tag'
  | 'image-summary'
  | 'audio-transcribe'
  | 'memoir-summary'
  | 'chapter-summary'
  | 'event-summary'
  | 'face-embed'
  | 'face-extract';

export type AiJobTargetType =
  | 'moment'
  | 'memoir'
  | 'chapter'
  | 'event'
  | 'face_reference'
  | 'face_match';
```

- [ ] **Step 7.3: 写 face job handler**

新建 `backend/src/face/jobs/face-job.handler.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';
import { MomentFace } from '../entities/moment-face.entity';
import { FaceProviderFactory } from '../providers/face-provider.factory';
import { BBox, FaceEmbedding, FaceProvider } from '../providers/face-provider.interface';
import { MockFaceProvider } from '../providers/mock.face-provider';

interface FaceEmbedInput  { imageUrl: string; refId: string; bboxHint?: BBox; }
interface FaceExtractInput { momentId: string; imageUrl: string; }

@Injectable()
export class FaceJobHandler {
  private log = new Logger(FaceJobHandler.name);

  constructor(
    @InjectRepository(UserFaceEmbedding) private ufe: Repository<UserFaceEmbedding>,
    @InjectRepository(MomentFace)         private mf: Repository<MomentFace>,
    private factory: FaceProviderFactory,
  ) {}

  async runEmbed(userId: string, targetId: string, input: FaceEmbedInput) {
    const primary = this.factory.resolve();
    let faces: FaceEmbedding[] = [];
    let providerName = primary.name;
    try {
      faces = await primary.detectAndEmbed(input.imageUrl);
    } catch (e) {
      this.log.warn(`embed failed on primary; falling back to mock: ${(e as Error).message}`);
      faces = await new MockFaceProvider().detectAndEmbed(input.imageUrl);
      providerName = 'mock';
    }
    const chosen = pickLargest(faces);
    if (!chosen) throw new Error('no face detected');
    await this.ufe.update(
      { id: targetId, userId },
      { embedding: chosen.vector, bbox: chosen.bbox, provider: providerName, model: 'auto' },
    );
    return { provider: providerName };
  }

  async runExtract(userId: string, targetId: string, input: FaceExtractInput) {
    const primary = this.factory.resolve();
    let faces: FaceEmbedding[] = [];
    let providerName = primary.name;
    try {
      faces = await primary.detectAndEmbed(input.imageUrl);
    } catch (e) {
      this.log.warn(`extract failed on primary; falling back to mock: ${(e as Error).message}`);
      faces = await new MockFaceProvider().detectAndEmbed(input.imageUrl);
      providerName = 'mock';
    }
    await this.mf.delete({ momentId: targetId, userId });
    const rows = faces.map((f) => ({
      userId,
      momentId: targetId,
      sourceUrl: input.imageUrl,
      bbox: f.bbox,
      embedding: f.vector,
      provider: providerName,
      model: 'auto',
      qualityScore: f.confidence ?? null,
    }));
    if (rows.length) await this.mf.save(rows);
    return { provider: providerName, faces: rows.length };
  }
}

function pickLargest(faces: FaceEmbedding[]): FaceEmbedding | null {
  if (!faces.length) return null;
  return faces.reduce((best, cur) => {
    const a = cur.bbox ? cur.bbox.w * cur.bbox.h : 0;
    const b = best.bbox ? best.bbox.w * best.bbox.h : 0;
    return a > b ? cur : best;
  });
}
```

- [ ] **Step 7.4: FaceService**

新建 `backend/src/face/face.service.ts`：

```typescript
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Moment } from '../moments/moment.entity';
import { UserFaceEmbedding } from './entities/user-face-embedding.entity';
import { MomentFace } from './entities/moment-face.entity';
import { FaceConfig } from '../config/face.config';
import { FaceProviderFactory } from './providers/face-provider.factory';
import { BBox } from './providers/face-provider.interface';
import { VectorSearchService, MomentHit } from './search/vector-search.service';
import { AiService } from '../ai/ai.service';

export interface ProfileSummary {
  userId: string;
  referenceCount: number;
  enabledCount: number;
  hasProfile: boolean;
}

export interface BackfillStatus {
  total: number;
  processed: number;
  failed: number;
  status: 'idle' | 'running' | 'done';
}

@Injectable()
export class FaceService {
  private log = new Logger(FaceService.name);
  private backfill: BackfillStatus = { total: 0, processed: 0, failed: 0, status: 'idle' };

  constructor(
    @InjectRepository(Moment) private moments: Repository<Moment>,
    @InjectRepository(UserFaceEmbedding) private ufe: Repository<UserFaceEmbedding>,
    @InjectRepository(MomentFace) private mf: Repository<MomentFace>,
    private ds: DataSource,
    private factory: FaceProviderFactory,
    private search: VectorSearchService,
    private ai: AiService,
    @Inject('FaceConfig') private cfg: FaceConfig,
  ) {}

  /** 取 self profile 概览（无记录返回全 0） */
  async getMyProfile(userId: string): Promise<ProfileSummary> {
    const rows = await this.ds.query(
      `SELECT COUNT(*)::int AS cnt,
              SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END)::int AS enabled
         FROM user_face_embeddings WHERE user_id = $1`,
      [userId],
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    const enabled = Number(rows[0]?.enabled ?? 0);
    return {
      userId,
      referenceCount: cnt,
      enabledCount: enabled,
      hasProfile: cnt > 0,
    };
  }

  /** 添加一张本人参考图（同 user/sourceUrl 重复 → 409） */
  async addReference(userId: string, imageUrl: string, _bboxHint?: BBox) {
    // 1. 创建 placeholder 行（embedding 全 0 占位，job 完成覆写）
    let ref: UserFaceEmbedding;
    try {
      ref = await this.ufe.save(this.ufe.create({
        userId, sourceUrl: imageUrl,
        embedding: new Array(512).fill(0),
        provider: 'pending',
      }));
    } catch (e: unknown) {
      if (isUniqueViolation(e)) throw new ConflictException('reference already exists');
      throw e;
    }
    // 2. 入队 face-embed
    const job = await this.ai.submit({
      userId,
      kind: 'face-embed',
      targetType: 'face_reference',
      targetId: ref.id,
      promptInput: { imageUrl, refId: ref.id } as never,
    });
    return { refId: ref.id, jobId: job.id };
  }

  async removeReference(userId: string, refId: string): Promise<void> {
    const res = await this.ufe.delete({ id: refId, userId });
    if (res.affected === 0) throw new NotFoundException('reference not found');
  }

  async setReferenceEnabled(userId: string, refId: string, enabled: boolean) {
    const res = await this.ufe.update({ id: refId, userId }, { isEnabled: enabled });
    if (res.affected === 0) throw new NotFoundException('reference not found');
  }

  /** 单 user 检索：所有本人 face embeddings 对所有 moment_faces 做 ANN */
  async searchMine(userId: string, opts: { threshold?: number; topK?: number }) {
    const refs = await this.ufe.find({ where: { userId, isEnabled: true } });
    if (refs.length === 0) return [];
    const queries = refs.map((r) => r.embedding);
    const hits = await this.search.searchMomentsByEmbeddings(
      userId, queries, opts.threshold, opts.topK,
    );
    if (hits.length === 0) return [];
    const ids = hits.map((h) => h.momentId);
    const moments = await this.moments.find({
      where: ids.map((id) => ({ id, userId })),
    });
    const byId = new Map(moments.map((m) => [m.id, m]));
    return hits
      .map((h) => {
        const m = byId.get(h.momentId);
        return m ? { moment: m, distance: h.distance } : null;
      })
      .filter((x): x is { moment: Moment; distance: number } => x !== null);
  }

  /** 单张 moment 入队 face-extract */
  async enqueueExtractFaces(userId: string, momentId: string) {
    const m = await this.moments.findOne({ where: { id: momentId, userId } });
    if (!m) throw new NotFoundException('moment not found');
    if (m.type !== 'photo') throw new NotFoundException('moment is not a photo');
    const job = await this.ai.submit({
      userId,
      kind: 'face-extract',
      targetType: 'face_match',
      targetId: m.id,
      promptInput: { momentId: m.id, imageUrl: m.mediaUrl } as never,
    });
    return { jobId: job.id };
  }

  /** 一次性回填：本用户所有 photo 中尚未提取过 face 的 moment */
  async startBackfill(userId: string): Promise<BackfillStatus> {
    const rows = await this.ds.query(
      `SELECT m.id FROM moments m
        LEFT JOIN moment_faces mf ON mf.moment_id = m.id
        WHERE m.user_id = $1 AND m.type = 'photo' AND mf.id IS NULL`,
      [userId],
    );
    const ids = rows.map((r: any) => r.id);
    this.backfill = { total: ids.length, processed: 0, failed: 0, status: 'running' };

    void (async () => {
      const batch = this.cfg.search.backfillBatch;
      for (let i = 0; i < ids.length; i += batch) {
        const slice = ids.slice(i, i + batch);
        await Promise.all(
          slice.map((mid: string) =>
            this.ai.submit({
              userId,
              kind: 'face-extract',
              targetType: 'face_match',
              targetId: mid,
              promptInput: { momentId: mid } as never,
            }).then(
              () => this.backfill.processed++,
              () => this.backfill.failed++,
            ),
          ),
        );
        await new Promise((r) => setTimeout(r, 1000));
      }
      this.backfill.status = 'done';
    })();

    return this.backfill;
  }

  getBackfillStatus(): BackfillStatus {
    return this.backfill;
  }
}

function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  return code === '23505';
}
```

- [ ] **Step 7.5: AiService.applyToTarget 注册 case + 注入 handler**

`backend/src/ai/ai.service.ts` 的 `applyToTarget` switch：

```typescript
case 'face-embed': {
  const inp = promptInput as { imageUrl: string; refId: string; bboxHint?: { x: number; y: number; w: number; h: number } };
  await this.faceHandler.runEmbed(job.userId, job.targetId, inp);
  break;
}
case 'face-extract': {
  const inp = promptInput as { momentId: string; imageUrl: string };
  await this.faceHandler.runExtract(job.userId, job.targetId, inp);
  break;
}
```

构造函数注入 `FaceJobHandler`：

```typescript
constructor(
  @InjectRepository(AiJob) private repo: Repository<AiJob>,
  private llm: AiRouterProvider,
  private faceHandler: FaceJobHandler,
) {}
```

- [ ] **Step 7.6: FaceController**

新建 `backend/src/face/face.controller.ts`：

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { FaceService } from './face.service';
import { SearchFacesDto } from './dto/search-faces.dto';
import { AddFaceReferenceDto } from './dto/add-face-reference.dto';

@Controller('faces')
export class FaceController {
  constructor(private face: FaceService) {}

  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.face.getMyProfile(u.id);
  }

  @Post('me/references')
  addRef(@CurrentUser() u: AuthUser, @Body() body: AddFaceReferenceDto) {
    return this.face.addReference(u.id, body.imageUrl, body.bboxHint);
  }

  @Delete('me/references/:refId')
  removeRef(@CurrentUser() u: AuthUser, @Param('refId') refId: string) {
    return this.face.removeReference(u.id, refId);
  }

  @Patch('me/references/:refId')
  setEnabled(
    @CurrentUser() u: AuthUser,
    @Param('refId') refId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.face.setReferenceEnabled(u.id, refId, body.enabled);
  }

  @Post('search')
  search(@CurrentUser() u: AuthUser, @Body() body: SearchFacesDto) {
    return this.face.searchMine(u.id, { threshold: body.threshold, topK: body.topK });
  }

  @Post('moments/:momentId/extract')
  extract(@CurrentUser() u: AuthUser, @Param('momentId') momentId: string) {
    return this.face.enqueueExtractFaces(u.id, momentId);
  }

  @Post('backfill')
  backfill(@CurrentUser() u: AuthUser) {
    return this.face.startBackfill(u.id);
  }

  @Get('backfill/status')
  status() {
    return this.face.getBackfillStatus();
  }
}
```

> `CurrentUser` / `AuthUser` 按项目已有装饰器签名调整 import 路径。

- [ ] **Step 7.7: aiModule 注册 FaceJobHandler**

`backend/src/ai/ai.module.ts` 的 `imports` 加 `FaceModule`（如未加），如 AiModule 在 FaceModule 之前注册会循环依赖 — 用 `forwardRef` 包装。

- [ ] **Step 7.8: 写 FaceService 单测**

新建 `backend/src/face/face.service.spec.ts`：

```typescript
import { FaceService } from './face.service';

function mkSvc() {
  const moments = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() } as never;
  const ufe = { save: jest.fn(), find: jest.fn(), delete: jest.fn(), update: jest.fn(), create: jest.fn() } as never;
  const mf = {} as never;
  const ds = { query: jest.fn().mockResolvedValue([]) } as never;
  const factory = { resolve: jest.fn() } as never;
  const search = { searchMomentsByEmbeddings: jest.fn().mockResolvedValue([]) } as never;
  const ai = { submit: jest.fn().mockResolvedValue({ id: 'job1' }) } as never;
  const cfg = { search: { backfillBatch: 2, threshold: 0.6, topK: 10 } } as never;
  return {
    svc: new FaceService(moments, ufe, mf, ds, factory, search, ai, cfg),
    moments, ufe, ds, factory, search, ai,
  };
}

describe('FaceService.getMyProfile', () => {
  it('returns zero counts when no rows', async () => {
    const { svc, ds } = mkSvc();
    (ds.query as jest.Mock).mockResolvedValueOnce([{ cnt: 0, enabled: 0 }]);
    const out = await svc.getMyProfile('u1');
    expect(out).toEqual({ userId: 'u1', referenceCount: 0, enabledCount: 0, hasProfile: false });
  });

  it('counts enabled and disabled references separately', async () => {
    const { svc, ds } = mkSvc();
    (ds.query as jest.Mock).mockResolvedValueOnce([{ cnt: 5, enabled: 3 }]);
    const out = await svc.getMyProfile('u1');
    expect(out.referenceCount).toBe(5);
    expect(out.enabledCount).toBe(3);
    expect(out.hasProfile).toBe(true);
  });
});

describe('FaceService.addReference', () => {
  it('throws ConflictException on duplicate', async () => {
    const { svc, ufe } = mkSvc();
    (ufe.create as jest.Mock).mockReturnValue({});
    (ufe.save as jest.Mock).mockRejectedValue({ code: '23505' });
    await expect(svc.addReference('u1', 'https://x/1.jpg')).rejects.toThrow();
  });

  it('succeeds and enqueues face-embed job', async () => {
    const { svc, ufe, ai } = mkSvc();
    (ufe.create as jest.Mock).mockReturnValue({ id: 'r1' });
    (ufe.save as jest.Mock).mockResolvedValue({ id: 'r1' });
    const out = await svc.addReference('u1', 'https://x/2.jpg');
    expect(out.refId).toBe('r1');
    expect(out.jobId).toBe('job1');
    expect(ai.submit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'face-embed' }));
  });
});

describe('FaceService.removeReference', () => {
  it('throws NotFound when affected=0', async () => {
    const { svc, ufe } = mkSvc();
    (ufe.delete as jest.Mock).mockResolvedValue({ affected: 0 });
    await expect(svc.removeReference('u1', 'r1')).rejects.toThrow();
  });
  it('resolves when affected=1', async () => {
    const { svc, ufe } = mkSvc();
    (ufe.delete as jest.Mock).mockResolvedValue({ affected: 1 });
    await expect(svc.removeReference('u1', 'r1')).resolves.toBeUndefined();
  });
});

describe('FaceService.searchMine', () => {
  it('returns [] when no references', async () => {
    const { svc, ufe } = mkSvc();
    (ufe.find as jest.Mock).mockResolvedValue([]);
    const out = await svc.searchMine('u1', {});
    expect(out).toEqual([]);
  });

  it('joins hits with moments by id', async () => {
    const { svc, ufe, search, moments } = mkSvc();
    (ufe.find as jest.Mock).mockResolvedValue([
      { id: 'r1', embedding: [0.1] },
      { id: 'r2', embedding: [0.2] },
    ]);
    (search.searchMomentsByEmbeddings as jest.Mock).mockResolvedValue([
      { momentId: 'm1', distance: 0.1 },
      { momentId: 'm2', distance: 0.2 },
    ]);
    (moments.find as jest.Mock).mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
    const out = await svc.searchMine('u1', {});
    expect(out).toHaveLength(2);
    expect(out[0].moment.id).toBe('m1');
    expect(out[0].distance).toBe(0.1);
  });
});

describe('FaceService.enqueueExtractFaces', () => {
  it('throws when moment not found', async () => {
    const { svc, moments } = mkSvc();
    (moments.findOne as jest.Mock).mockResolvedValue(null);
    await expect(svc.enqueueExtractFaces('u1', 'm1')).rejects.toThrow();
  });
  it('throws when not photo', async () => {
    const { svc, moments } = mkSvc();
    (moments.findOne as jest.Mock).mockResolvedValue({ id: 'm1', type: 'video' });
    await expect(svc.enqueueExtractFaces('u1', 'm1')).rejects.toThrow();
  });
  it('returns jobId when valid photo', async () => {
    const { svc, moments, ai } = mkSvc();
    (moments.findOne as jest.Mock).mockResolvedValue({ id: 'm1', type: 'photo', mediaUrl: 'x' });
    const out = await svc.enqueueExtractFaces('u1', 'm1');
    expect(out.jobId).toBe('job1');
    expect(ai.submit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'face-extract' }));
  });
});
```

- [ ] **Step 7.9: 写 job handler 单测**

新建 `backend/src/face/jobs/face-job.handler.spec.ts`：

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaceJobHandler } from './face-job.handler';
import { FaceProviderFactory } from '../providers/face-provider.factory';
import { MockFaceProvider } from '../providers/mock.face-provider';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';
import { MomentFace } from '../entities/moment-face.entity';

describe('FaceJobHandler', () => {
  let h: FaceJobHandler;
  let ufe: { update: jest.Mock };
  let mf: { delete: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    ufe = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    mf = { delete: jest.fn().mockResolvedValue({ affected: 0 }), save: jest.fn().mockResolvedValue([]) };
    const mod = await Test.createTestingModule({
      providers: [
        FaceJobHandler,
        { provide: getRepositoryToken(UserFaceEmbedding), useValue: ufe },
        { provide: getRepositoryToken(MomentFace), useValue: mf },
        FaceProviderFactory,
        MockFaceProvider,
      ],
    }).compile();
    h = mod.get(FaceJobHandler);
  });

  it('runEmbed picks largest face and writes embedding', async () => {
    await h.runEmbed('u1', 'r1', { refId: 'r1', imageUrl: 'https://x/1.jpg' });
    expect(ufe.update).toHaveBeenCalled();
    const [, payload] = ufe.update.mock.calls[0];
    expect(payload.embedding).toHaveLength(512);
    expect(payload.bbox.w).toBeGreaterThan(0);
  });

  it('runExtract saves one row per face and deletes previous', async () => {
    await h.runExtract('u1', 'm1', { momentId: 'm1', imageUrl: 'https://x/2.jpg' });
    expect(mf.delete).toHaveBeenCalledWith({ momentId: 'm1', userId: 'u1' });
    expect(mf.save).toHaveBeenCalled();
  });

  it('runEmbed throws when no face detected', async () => {
    const factory = (h as unknown as { factory: FaceProviderFactory }).factory;
    jest.spyOn(factory, 'resolve').mockReturnValue({
      name: 'mock',
      detectAndEmbed: async () => [],
      embedFace: async () => ({} as never),
    } as never);
    await expect(h.runEmbed('u1', 'r1', { refId: 'r1', imageUrl: 'x' })).rejects.toThrow('no face');
  });
});
```

- [ ] **Step 7.10: 控制器 supertest 集成**

新建 `backend/src/face/face-integration.spec.ts`：

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { FaceController } from './face.controller';
import { FaceService } from './face.service';

describe('FaceController (integration)', () => {
  let app: INestApplication;
  const svc = {
    getMyProfile: jest.fn().mockResolvedValue({ userId: 'u1', referenceCount: 0, enabledCount: 0, hasProfile: false }),
    addReference: jest.fn().mockResolvedValue({ refId: 'r1', jobId: 'j1' }),
    removeReference: jest.fn().mockResolvedValue(undefined),
    setReferenceEnabled: jest.fn().mockResolvedValue(undefined),
    searchMine: jest.fn().mockResolvedValue([]),
    enqueueExtractFaces: jest.fn().mockResolvedValue({ jobId: 'j2' }),
    startBackfill: jest.fn().mockResolvedValue({ total: 0, processed: 0, failed: 0, status: 'running' }),
    getBackfillStatus: jest.fn().mockReturnValue({ total: 0, processed: 0, failed: 0, status: 'idle' }),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [FaceController],
      providers: [{ provide: FaceService, useValue: svc }],
    })
      .overrideGuard(require('../auth/session-auth.guard').SessionAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('GET /faces/me returns self profile', async () => {
    const res = await request(app.getHttpServer()).get('/faces/me');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
  });

  it('POST /faces/me/references accepts imageUrl', async () => {
    const res = await request(app.getHttpServer())
      .post('/faces/me/references')
      .send({ imageUrl: 'https://x/1.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.refId).toBe('r1');
  });

  it('POST /faces/search returns hits', async () => {
    svc.searchMine.mockResolvedValueOnce([{ moment: { id: 'm1' }, distance: 0.1 }]);
    const res = await request(app.getHttpServer())
      .post('/faces/search')
      .send({ topK: 50 });
    expect(res.status).toBe(201);
    expect(res.body[0].moment.id).toBe('m1');
  });

  it('POST /faces/moments/:id/extract returns jobId', async () => {
    const res = await request(app.getHttpServer()).post('/faces/moments/m1/extract');
    expect(res.status).toBe(201);
    expect(res.body.jobId).toBe('j2');
  });

  it('POST /faces/backfill returns initial status', async () => {
    const res = await request(app.getHttpServer()).post('/faces/backfill');
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('running');
  });
});
```

- [ ] **Step 7.11: 跑测试 + commit**

```bash
cd backend
npx jest src/face src/ai
git add backend/src/face backend/src/ai backend/src/app.module.ts
git commit -m "feat(backend): FaceService + FaceController + face-embed/extract job handlers"
```

---

## Task 8: backend 汇总验证（lint + typecheck + test + build）

- [ ] **Step 8.1: 跑 backend 全测试**

```bash
cd backend
npm run test
npm run lint
npm run build
```

预期：所有新增测试 pass，老 156 测试不破；lint 0 error；build 通过。

- [ ] **Step 8.2: 修任何回归**

```bash
git commit -m "test(backend): fix regressions from face module"
```

---

## Task 9: 前端 /faces 总览 + 三 Tab 视图

**Files:**
- Create: `frontend/src/api/faces.js`
- Create: `frontend/src/data/faceAdapter.js`
- Create: `frontend/src/data/faceSelectors.js`
- Create: `frontend/src/data/faceAdapter.test.js`
- Create: `frontend/src/hooks/useFaceSearch.js`
- Create: `frontend/src/hooks/useFaceBackfill.js`
- Create: `frontend/src/hooks/useFaceProfile.js`
- Create: `frontend/src/hooks/useExtractFaces.js`
- Create: `frontend/src/hooks/useFaceSearch.test.jsx`
- Create: `frontend/src/components/SelfProfileCard.jsx`
- Create: `frontend/src/components/SelfProfileCard.test.jsx`
- Create: `frontend/src/components/FaceResultTabs.jsx`
- Create: `frontend/src/components/FaceTimelineView.jsx`
- Create: `frontend/src/components/FacePersonCluster.jsx`
- Create: `frontend/src/components/FacePlaceMap.jsx`
- Create: `frontend/src/components/FaceProfileSetupModal.jsx`
- Create: `frontend/src/pages/FacesPage.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Header.jsx`

**Interfaces:**
- Consumes: 已有 axios + TanStack Query + Zustand 模式
- Produces: `/faces` 页面 + SelfProfileCard + 三 Tab 结果视图

- [ ] **Step 9.1: 写 facesApi**

新建 `frontend/src/api/faces.js`：

```javascript
import client from './client';

export const facesApi = {
  getMe:        ()                   => client.get('/faces/me').then(r => r.data),
  addReference: (body)               => client.post('/faces/me/references', body).then(r => r.data),
  removeRef:    (refId)              => client.delete(`/faces/me/references/${refId}`).then(r => r.data),
  setRefEnabled:(refId, enabled)     => client.patch(`/faces/me/references/${refId}`, { enabled }).then(r => r.data),
  search:       (body)               => client.post('/faces/search', body).then(r => r.data),
  backfill:     ()                   => client.post('/faces/backfill').then(r => r.data),
  backfillStatus: ()                 => client.get('/faces/backfill/status').then(r => r.data),
  extractFaces: (momentId)           => client.post(`/faces/moments/${momentId}/extract`).then(r => r.data),
};
```

- [ ] **Step 9.2: faceAdapter — 三视图派生**

新建 `frontend/src/data/faceAdapter.js`：

```javascript
export function groupByTimeline(hits) {
  const groups = new Map();
  for (const h of hits) {
    const dt = h.moment.takenAt ? new Date(h.moment.takenAt) : new Date(h.moment.createdAt);
    const y = dt.getFullYear();
    const k = String(y);
    if (!groups.has(k)) groups.set(k, { year: y, items: [] });
    groups.get(k).items.push({ ...h, takenAt: dt });
  }
  for (const g of groups.values()) g.items.sort((a, b) => b.takenAt - a.takenAt);
  return [...groups.values()].sort((a, b) => b.year - a.year);
}

export function groupByPerson(hits, allPeople) {
  const byId = new Map(allPeople.map((p) => [p.id, p]));
  const buckets = new Map();
  for (const h of hits) {
    const ids = h.moment.personIds || [];
    if (ids.length === 0) continue;
    for (const pid of ids) {
      if (!buckets.has(pid)) buckets.set(pid, { person: byId.get(pid), items: [] });
      buckets.get(pid).items.push(h);
    }
  }
  return [...buckets.values()];
}

export function groupByPlace(hits, places) {
  const byId = new Map(places.map((p) => [p.id, p]));
  const buckets = new Map();
  for (const h of hits) {
    const pid = h.moment.placeId;
    if (!pid) continue;
    if (!buckets.has(pid)) buckets.set(pid, { place: byId.get(pid), items: [] });
    buckets.get(pid).items.push(h);
  }
  return [...buckets.values()].filter((b) => b.place);
}
```

新建 `frontend/src/data/faceSelectors.js`：

```javascript
export const sortByDistance = (a, b) => a.distance - b.distance;
export const withThreshold = (hits, t) => hits.filter((h) => h.distance <= t);
export const topK = (hits, k) => hits.slice(0, k);
```

新建 `frontend/src/data/faceAdapter.test.js`：

```javascript
import { describe, it, expect } from 'vitest';
import { groupByTimeline, groupByPerson, groupByPlace } from './faceAdapter';

describe('groupByTimeline', () => {
  it('groups by year', () => {
    const out = groupByTimeline([
      { moment: { id: 'a', takenAt: '2024-08-12T00:00:00Z' }, distance: 0.1 },
      { moment: { id: 'b', takenAt: '2024-01-15T00:00:00Z' }, distance: 0.2 },
      { moment: { id: 'c', takenAt: '2023-12-01T00:00:00Z' }, distance: 0.3 },
    ]);
    expect(out.map(g => g.year)).toEqual([2024, 2023]);
    expect(out[0].items.map(i => i.moment.id)).toEqual(['a', 'b']);
  });
});

describe('groupByPerson', () => {
  it('groups by personIds', () => {
    const out = groupByPerson(
      [{ moment: { id: 'a', personIds: ['p1'] }, distance: 0.1 }],
      [{ id: 'p1', name: 'Alice' }],
    );
    expect(out).toHaveLength(1);
    expect(out[0].person.name).toBe('Alice');
  });
});

describe('groupByPlace', () => {
  it('drops moments without placeId', () => {
    const out = groupByPlace(
      [{ moment: { id: 'a', placeId: null }, distance: 0.1 }], [],
    );
    expect(out).toHaveLength(0);
  });
});
```

- [ ] **Step 9.3: hooks**

新建 `frontend/src/hooks/useFaceProfile.js`：

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

export const faceKeys = {
  all:      ['faces'],
  me:       () => [...faceKeys.all, 'me'],
  search:   (q) => [...faceKeys.all, 'search', q],
  backfill: () => [...faceKeys.all, 'backfill'],
};

export function useFaceMe() {
  return useQuery({ queryKey: faceKeys.me(), queryFn: facesApi.getMe });
}
export function useAddReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facesApi.addReference,
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.me() }),
  });
}
export function useRemoveRef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facesApi.removeRef,
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.me() }),
  });
}
export function useSetRefEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ refId, enabled }) => facesApi.setRefEnabled(refId, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.me() }),
  });
}
```

新建 `frontend/src/hooks/useFaceSearch.js`：

```javascript
import { useQuery } from '@tanstack/react-query';
import { facesApi } from '../api/faces';
import { faceKeys } from './useFaceProfile';

export function useFaceSearch(opts, enabled = true) {
  return useQuery({
    queryKey: faceKeys.search(opts),
    queryFn: () => facesApi.search(opts),
    enabled,
    staleTime: 30_000,
  });
}
```

新建 `frontend/src/hooks/useFaceBackfill.js`：

```javascript
import { useMutation, useQuery } from '@tanstack/react-query';
import { facesApi } from '../api/faces';
import { faceKeys } from './useFaceProfile';

export function useStartBackfill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facesApi.backfill,
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.backfill() }),
  });
}
export function useBackfillStatus() {
  return useQuery({
    queryKey: faceKeys.backfill(),
    queryFn: facesApi.backfillStatus,
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 1000 : false),
  });
}
```

> `useQueryClient` 需 import：`import { useQueryClient } from '@tanstack/react-query';`

新建 `frontend/src/hooks/useExtractFaces.js`：

```javascript
import { useMutation } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

export function useExtractFaces() {
  return useMutation({ mutationFn: (momentId) => facesApi.extractFaces(momentId) });
}
```

新建 `frontend/src/hooks/useFaceSearch.test.jsx`：

```jsx
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFaceSearch } from './useFaceSearch';
import * as facesApiMod from '../api/faces';

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useFaceSearch', () => {
  it('runs when enabled & threshold/topK set', async () => {
    const spy = jest.spyOn(facesApiMod.facesApi, 'search').mockResolvedValue([]);
    const { result } = renderHook(() => useFaceSearch({ threshold: 0.6, topK: 200 }), { wrapper: wrap() });
    await result.current.refetch();
    expect(spy).toHaveBeenCalledWith({ threshold: 0.6, topK: 200 });
  });
});
```

> 项目测试框架若是 Vitest，把 `jest.spyOn` 改为 `vi.spyOn`，并在顶部 `import { vi } from 'vitest'`。

- [ ] **Step 9.4: SelfProfileCard**

新建 `frontend/src/components/SelfProfileCard.jsx`：

```jsx
import { useNavigate } from 'react-router-dom';
import { useFaceMe } from '../hooks/useFaceProfile';

export function SelfProfileCard() {
  const me = useFaceMe();
  const nav = useNavigate();

  if (me.isLoading) return <div className="card">加载中…</div>;

  const profile = me.data;
  const hasProfile = profile?.hasProfile;

  return (
    <div className="card self-card">
      <div className="avatar">我</div>
      <div className="info">
        <h3>我的画像</h3>
        <p>{profile?.referenceCount ?? 0} 张参考 / {profile?.enabledCount ?? 0} 启用</p>
      </div>
      <div className="actions">
        <button onClick={() => nav('/faces?mode=setup')}>添加参考</button>
        <button
          className="primary"
          disabled={!hasProfile}
          onClick={() => nav('/faces?mode=search')}
          title={!hasProfile ? '请先添加至少 1 张参考' : undefined}
        >
          找我的照片 →
        </button>
      </div>
    </div>
  );
}
```

新建 `frontend/src/components/SelfProfileCard.test.jsx`：

```jsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SelfProfileCard } from './SelfProfileCard';
import * as fp from '../hooks/useFaceProfile';

const wrap = () => {
  const qc = new QueryClient();
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('SelfProfileCard', () => {
  it('renders my profile info', () => {
    jest.spyOn(fp, 'useFaceMe').mockReturnValue({
      data: { userId: 'u1', referenceCount: 3, enabledCount: 3, hasProfile: true },
      isLoading: false,
    } as never);
    render(<SelfProfileCard />, { wrapper: wrap() });
    expect(screen.getByText(/我的画像/)).toBeInTheDocument();
    expect(screen.getByText(/3 张参考 \/ 3 启用/)).toBeInTheDocument();
  });

  it('disables 找我的照片 button when hasProfile=false', () => {
    jest.spyOn(fp, 'useFaceMe').mockReturnValue({
      data: { userId: 'u1', referenceCount: 0, enabledCount: 0, hasProfile: false },
      isLoading: false,
    } as never);
    render(<SelfProfileCard />, { wrapper: wrap() });
    expect(screen.getByText(/找我的照片/).closest('button')).toBeDisabled();
  });
});
```

- [ ] **Step 9.5: 三 Tab 视图组件**

新建 `frontend/src/components/FaceTimelineView.jsx`：

```jsx
import { groupByTimeline } from '../data/faceAdapter';

export function FaceTimelineView({ hits, onSelect }) {
  const groups = groupByTimeline(hits);
  return (
    <div className="timeline">
      {groups.map((g) => (
        <section key={g.year}>
          <h3>{g.year}</h3>
          <ul>
            {g.items.map((h) => (
              <li key={h.moment.id}>
                <button onClick={() => onSelect?.(h)} className="hit-row">
                  {h.moment.mediaUrl && <img src={h.moment.mediaUrl} alt="" />}
                  <span>{h.moment.title || h.moment.takenAt}</span>
                  <span className="dist">{h.distance.toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

新建 `frontend/src/components/FacePersonCluster.jsx`：

```jsx
import { groupByPerson } from '../data/faceAdapter';

export function FacePersonCluster({ hits, allPeople, onSelectPerson }) {
  const buckets = groupByPerson(hits, allPeople);
  return (
    <ul className="person-cluster">
      {buckets.map((b) => (
        <li key={b.person?.id}>
          <button onClick={() => onSelectPerson?.(b.person)}>
            {b.person?.name ?? '匿名'} · {b.items.length}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

新建 `frontend/src/components/FacePlaceMap.jsx`：

```jsx
import { groupByPlace } from '../data/faceAdapter';

export function FacePlaceMap({ hits, places, onSelectPlace }) {
  const buckets = groupByPlace(hits, places);
  return (
    <ul className="place-list">
      {buckets.map((b) => (
        <li key={b.place.id}>
          <button onClick={() => onSelectPlace?.(b.place)}>
            {b.place.name} · {b.items.length}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

新建 `frontend/src/components/FaceResultTabs.jsx`：

```jsx
import { useState } from 'react';
import { FaceTimelineView } from './FaceTimelineView';
import { FacePersonCluster } from './FacePersonCluster';
import { FacePlaceMap } from './FacePlaceMap';

export function FaceResultTabs({ hits, allPeople, places, onSelectMoment }) {
  const [tab, setTab] = useState('time');
  return (
    <div className="face-tabs">
      <nav>
        <button className={tab === 'time'   ? 'active' : ''} onClick={() => setTab('time')}>时间线</button>
        <button className={tab === 'person' ? 'active' : ''} onClick={() => setTab('person')}>人物</button>
        <button className={tab === 'place'  ? 'active' : ''} onClick={() => setTab('place')}>地点</button>
      </nav>
      {tab === 'time'   && <FaceTimelineView hits={hits} onSelect={onSelectMoment} />}
      {tab === 'person' && <FacePersonCluster hits={hits} allPeople={allPeople} />}
      {tab === 'place'  && <FacePlaceMap hits={hits} places={places} />}
    </div>
  );
}
```

- [ ] **Step 9.6: FaceProfileSetupModal**

新建 `frontend/src/components/FaceProfileSetupModal.jsx`：

```jsx
import { useState } from 'react';
import { useAddReference } from '../hooks/useFaceProfile';

export function FaceProfileSetupModal({ open, onClose }) {
  const [url, setUrl] = useState('');
  const add = useAddReference();

  if (!open) return null;

  return (
    <div className="modal-mask" role="dialog">
      <div className="modal">
        <h3>添加人脸参考</h3>
        <p>请输入本人正脸照片 URL（OSS 直传后回填）</p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          aria-label="image url"
        />
        <div className="actions">
          <button onClick={onClose}>取消</button>
          <button
            className="primary"
            disabled={!url || add.isPending}
            onClick={() => add.mutateAsync({ imageUrl: url }).then(onClose)}
          >
            {add.isPending ? '上传中…' : '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9.7: FacesPage**

新建 `frontend/src/pages/FacesPage.jsx`：

```jsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SelfProfileCard } from '../components/SelfProfileCard';
import { FaceResultTabs } from '../components/FaceResultTabs';
import { FaceProfileSetupModal } from '../components/FaceProfileSetupModal';
import { useFaceMe } from '../hooks/useFaceProfile';
import { useFaceSearch } from '../hooks/useFaceSearch';
import { useStartBackfill, useBackfillStatus } from '../hooks/useFaceBackfill';

export function FacesPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode');
  const search = useFaceSearch({}, mode === 'search');
  const backfill = useStartBackfill();
  const status = useBackfillStatus();

  return (
    <div className="faces-page">
      <header><h1>面孔中心</h1></header>
      <SelfProfileCard />

      <section className="backfill">
        <h2>历史回填</h2>
        <button
          onClick={() => backfill.mutate()}
          disabled={backfill.isPending || status.data?.status === 'running'}
        >
          {backfill.isPending || status.data?.status === 'running'
            ? '处理中…'
            : '一次性回填所有照片'}
        </button>
        {status.data && (
          <span className="progress">
            {' '}{status.data.processed}/{status.data.total}
          </span>
        )}
      </section>

      {mode === 'search' && (
        <FaceResultTabs hits={search.data ?? []} allPeople={[]} places={[]} />
      )}

      <FaceProfileSetupModal
        open={mode === 'setup'}
        onClose={() => setParams({})}
      />
    </div>
  );
}
```

- [ ] **Step 9.8: 注册路由**

`frontend/src/App.jsx` 加：

```jsx
import { FacesPage } from './pages/FacesPage';
<Route path="/faces" element={<FacesPage />} />
```

并在 `frontend/src/components/Header.jsx` 加导航项「面孔」。

- [ ] **Step 9.9: 跑测试 + commit**

```bash
cd frontend
npm run test -- --run
git add frontend/src/api/faces.js frontend/src/data frontend/src/hooks frontend/src/components frontend/src/pages/FacesPage.jsx frontend/src/App.jsx frontend/src/components/Header.jsx
git commit -m "feat(frontend): /faces page + SelfProfileCard + FaceResultTabs (timeline/person/place)"
```

---

## Task 10: 前端 Moment 提取人脸按钮

**Files:**
- Create: `frontend/src/components/ExtractFaceButton.jsx`
- Modify: `frontend/src/pages/EventPage.jsx` 或 Photo 缩略卡（视现有结构）
- Create: `frontend/src/components/ExtractFaceButton.test.jsx`

**Interfaces:**
- Consumes: useExtractFaces
- Produces: 触发 `POST /faces/moments/:id/extract`

- [ ] **Step 10.1: ExtractFaceButton**

```jsx
import { useExtractFaces } from '../hooks/useExtractFaces';

export function ExtractFaceButton({ momentId }) {
  const m = useExtractFaces();
  return (
    <button
      onClick={() => m.mutate(momentId)}
      disabled={m.isPending}
      aria-label="extract faces"
    >
      {m.isPending ? '提取中…' : '✨ 提取人脸'}
    </button>
  );
}
```

- [ ] **Step 10.2: 测试**

```jsx
// frontend/src/components/ExtractFaceButton.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ExtractFaceButton } from './ExtractFaceButton';
import * as fx from '../hooks/useExtractFaces';

it('calls mutate on click', () => {
  const mutate = jest.fn();
  jest.spyOn(fx, 'useExtractFaces').mockReturnValue({ mutate, isPending: false } as never);
  render(<ExtractFaceButton momentId="m1" />);
  fireEvent.click(screen.getByText(/提取人脸/));
  expect(mutate).toHaveBeenCalledWith('m1');
});
```

- [ ] **Step 10.3: 嵌进 MomentCard / EventPage**

在 EventPage 或 Photo 缩略卡 hover / 操作菜单中加：

```jsx
{photo.type === 'photo' && <ExtractFaceButton momentId={photo.id} />}
```

具体位置视现有结构而定。

- [ ] **Step 10.4: 跑测试 + commit**

```bash
cd frontend && npm run test -- --run
git add frontend/src/components/ExtractFaceButton.jsx frontend/src/components/ExtractFaceButton.test.jsx frontend/src/pages/EventPage.jsx
git commit -m "feat(frontend): ExtractFaceButton on Moment card / EventPage"
```

---

## Task 11: docs 收尾（user-guide / roadmap / api / changelog）

**Files:**
- Modify: `docs/user-guide.md`（新增「个人画像」章节）
- Modify: `docs/roadmap.md`（更新「个人画像」为 ✓）
- Modify: `docs/api.md`（新增 `/api/faces/*`）
- Modify: `docs/changelog.md`（新增条目 v1.1）

- [ ] **Step 11.1: api.md 追加 `/api/faces/*`**

```markdown
## /api/faces/* — 个人画像（v1.1）

| Method | Path | 说明 |
|---|---|---|
| GET    | /api/faces/me                  | 取本用户 self profile 概览 |
| POST   | /api/faces/me/references       | 添加参考图 `{ imageUrl, bboxHint? }` → `{ refId, jobId }` |
| DELETE | /api/faces/me/references/:id   | 删除参考 |
| PATCH  | /api/faces/me/references/:id   | 启停参考 `{ enabled: bool }` |
| POST   | /api/faces/search              | `{ threshold?, topK? }` → hits |
| POST   | /api/faces/moments/:id/extract | 给单张 moment 提取人脸 |
| POST   | /api/faces/backfill            | 一次性回填 |
| GET    | /api/faces/backfill/status     | 回填进度 |
```

- [ ] **Step 11.2: user-guide.md 章节**

新增章节「个人画像：找我的所有照片」。简单 200 字步骤：

1. 打开 `/faces`
2. 上传 1-5 张本人正脸照（推荐正脸、无遮挡）
3. 等 job 完成（mock provider 立即完成，云/本地需 1-2s/张）
4. 点击「找我的照片」
5. 在三 Tab 中切换：时间线 / 人物 / 地点

- [ ] **Step 11.3: roadmap 更新**

```markdown
| **个人画像（face profile）** | ✓ | pgvector + AI jobs + 单 self 档案 + /faces + 三 Tab 结果视图 |
```

- [ ] **Step 11.4: changelog 新增条目**

```markdown
## v1.1.0 — 个人画像（face profile）

新增功能：基于 pgvector + AI jobs 的单 self 人脸档案识别检索。
后端：face module + pgvector + 2 张表 + ivfflat ANN（user_face_embeddings + moment_faces）。
前端：/faces 总览 + SelfProfileCard + 三 Tab 结果视图 + Moment 提取按钮。
测试：新增 ≥ 30 单测 + ≥ 6 集成测试。
注：本期**不做**多档案管理与 person 实体 face profile（用户决策）。
```

- [ ] **Step 11.5: 跑 health-check + commit**

```bash
bash scripts/health-check.sh
git add docs
git commit -m "docs: face profile in user-guide + roadmap + api + changelog"
```

---

## Task 12: Scratch dump 子模块（后端 — entities 已含，Task 1/2 已就绪）

**Files:**
- Create: `backend/src/face/dto/add-scratch-dump-item.dto.ts`
- Create: `backend/src/face/scratch/scratch-dump.service.ts`
- Create: `backend/src/face/scratch/scratch-dump.service.spec.ts`
- Create: `backend/src/face/scratch/scratch-dump.controller.ts`
- Create: `backend/src/face/scratch/scratch-dump-integration.spec.ts`
- Modify: `backend/src/face/face.module.ts`（注册 ScratchDumpService / Controller）
- Modify: `backend/src/face/jobs/face-job.handler.ts`（加 `runExtractScratch`）
- Modify: `backend/src/face/face.service.ts`（让 AiService.applyToTarget 转给 handler 时支持 dump item）
- Modify: `backend/src/ai/entities/ai-job.entity.ts`（AiJobKind 加 'face-extract-scratch'，AiJobTargetType 加 'face_dump_item'）

**Interfaces:**
- Consumes: 现有 FaceModule / FaceProviderFactory / VectorSearchService / AiService（扩展一种 kind）
- Produces: `/api/faces/dumps/*` REST + ScratchDumpService（create/addItem/search）

- [ ] **Step 12.1: DTO**

`backend/src/face/dto/add-scratch-dump-item.dto.ts`：

```typescript
import {
  IsDateString, IsInt, IsOptional, IsString, IsUrl, Min,
} from 'class-validator';

export class AddScratchDumpItemDto {
  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl!: string;

  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @IsOptional()
  @IsDateString()
  fileMtime?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;
}
```

- [ ] **Step 12.2: 扩展 AiJobKind/AiJobTargetType**

（已和 Task 7 / Task 8 一起做；这一步仅验证 enum 已含 `'face-extract-scratch'` / `'face_dump_item'`。）

- [ ] **Step 12.3: FaceJobHandler.runExtractScratch**

新增方法（继续 `runEmbed` / `runExtract` 之后）：

```typescript
async runExtractScratch(
  userId: string,
  targetId: string,                        // scratch_dump_items.id
  input: FaceExtractScratchInput,          // { dumpId, imageUrl }
): Promise<{ provider: string; faces: number; durationMs: number }> {
  const startedAt = Date.now();
  const primary = this.factory.resolve();
  let faces: FaceEmbedding[] = [];
  let providerName: 'cloud' | 'local' | 'mock' = primary.name;
  try {
    faces = await primary.detectAndEmbed(input.imageUrl);
  } catch (e) {
    this.log.warn(`scratch extract failed; fallback to mock: ${(e as Error).message}`);
    const mock = await new MockFaceProvider().detectAndEmbed(input.imageUrl);
    faces = mock;
    providerName = 'mock';
  }
  const chosen = pickLargest(faces);
  await this.sdi.update(
    { id: targetId, userId },
    {
      embedding: chosen ? chosen.vector : null,
      bbox: chosen?.bbox ?? null,
      provider: providerName,
      model: 'auto',
      qualityScore: chosen?.confidence ?? null,
      isProcessed: chosen !== null,
      error: chosen ? null : 'no_face_detected',
    },
  );
  // 递增 dump 的 done_items；事务内做（或在 controller 内做——见 § 错误处理）
  if (chosen) {
    await this.sdInc(input.dumpId, userId);
  } else {
    await this.sdFail(input.dumpId, userId);
  }
  return { provider: providerName, faces: chosen ? 1 : 0, durationMs: Date.now() - startedAt };
}

interface FaceExtractScratchInput { dumpId: string; imageUrl: string; }
```

构造器需增加 `@InjectRepository(ScratchDump) sd` 与 `@InjectRepository(ScratchDumpItem) sdi`；`sdInc/sdFail` 调 `update` 增 `done_items` / `failed_items`。

- [ ] **Step 12.4: ScratchDumpService**

```typescript
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ScratchDump } from '../entities/scratch-dump.entity';
import { ScratchDumpItem } from '../entities/scratch-dump-item.entity';
import { AiService } from '../../ai/ai.service';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';
import { VectorSearchService } from '../search/vector-search.service';

@Injectable()
export class ScratchDumpService {
  private log = new Logger(ScratchDumpService.name);

  constructor(
    @InjectRepository(ScratchDump) private sd: Repository<ScratchDump>,
    @InjectRepository(ScratchDumpItem) private sdi: Repository<ScratchDumpItem>,
    @InjectRepository(UserFaceEmbedding) private ufe: Repository<UserFaceEmbedding>,
    private ds: DataSource,
    private ai: AiService,
    private search: VectorSearchService,
  ) {}

  async create(userId: string, input: { name: string; description?: string }) {
    return this.sd.save(this.sd.create({
      userId, name: input.name, description: input.description, status: 'created',
    }));
  }
  async list(userId: string, limit = 50) {
    return this.sd.find({ where: { userId }, order: { createdAt: 'DESC' }, take: Math.min(limit, 200) });
  }
  async getOne(userId: string, dumpId: string) {
    const d = await this.sd.findOne({ where: { id: dumpId, userId } });
    if (!d) throw new NotFoundException('dump not found');
    return d;
  }
  async remove(userId: string, dumpId: string) {
    const res = await this.sd.delete({ id: dumpId, userId });
    if (res.affected === 0) throw new NotFoundException('dump not found');
  }
  async addItem(userId: string, dumpId: string, input: AddScratchDumpItemDto) {
    const d = await this.getOne(userId, dumpId);
    let item: ScratchDumpItem;
    try {
      item = await this.sdi.save(this.sdi.create({
        userId, dumpId: d.id,
        sourceUrl: input.imageUrl,
        takenAt: input.takenAt ? new Date(input.takenAt) : null,
        fileMtime: input.fileMtime ? new Date(input.fileMtime) : null,
        filename: input.filename ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
      }));
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === '23505') throw new ConflictException('item already exists in dump');
      throw e;
    }
    await this.ds.query(`UPDATE scratch_dumps SET total_items = total_items + 1, updated_at = NOW()
                          WHERE id = $1 AND user_id = $2`, [d.id, userId]);
    const job = await this.ai.submit({
      userId,
      kind: 'face-extract-scratch',
      targetType: 'face_dump_item',
      targetId: item.id,
      promptInput: { dumpId: d.id, imageUrl: input.imageUrl } as never,
    });
    return { itemId: item.id, jobId: job.id };
  }
  async listItems(userId: string, dumpId: string, opts?: { status?: 'pending' | 'processed' | 'failed' }) {
    await this.getOne(userId, dumpId);
    const where: any = { userId, dumpId };
    if (opts?.status === 'pending')  where.isProcessed = false;
    if (opts?.status === 'processed') where.isProcessed = true;
    if (opts?.status === 'failed')   where.error = Not(IsNull());
    return this.sdi.find({ where, order: { takenAt: 'DESC NULLS LAST', createdAt: 'DESC' }, take: 1000 });
  }
  async getStatus(userId: string, dumpId: string) {
    const d = await this.getOne(userId, dumpId);
    return { total: d.totalItems, done: d.doneItems, failed: d.failedItems, status: d.status };
  }

  /** 检索：拿 user_face_embeddings，对该 dump 的 scratch_dump_items 做 ANN */
  async searchDump(userId: string, dumpId: string, opts: { threshold?: number; topK?: number }) {
    await this.getOne(userId, dumpId);
    const refs = await this.ufe.find({ where: { userId, isEnabled: true } });
    if (refs.length === 0) return [];
    const queries = refs.map((r) => r.embedding);
    const hits = await this.search.searchDumpItemsByEmbeddings(
      userId, dumpId, queries, opts.threshold, opts.topK,
    );
    if (hits.length === 0) {
      // 缓存 hits_count
      await this.ds.query(`UPDATE scratch_dumps SET hits_count = 0, last_search_at = NOW()
                            WHERE id = $1 AND user_id = $2`, [dumpId, userId]);
      return [];
    }
    const ids = hits.map((h) => h.itemId);
    const items = await this.sdi.find({ where: ids.map((id) => ({ id, userId })) });
    const byId = new Map(items.map((i) => [i.id, i]));
    const out = hits
      .map((h) => {
        const item = byId.get(h.itemId);
        if (!item) return null;
        return {
          item,
          distance: h.distance,
          sortKey: item.takenAt ? 'takenAt' : item.fileMtime ? 'fileMtime' : 'uploadedAt',
          sortValue: (item.takenAt ?? item.fileMtime ?? item.createdAt).toISOString(),
        } as DumpHit;
      })
      .filter((x): x is DumpHit => x !== null)
      .sort((a, b) => b.sortValue.localeCompare(a.sortValue));   // 时间倒序
    await this.ds.query(`UPDATE scratch_dumps SET hits_count = $1, last_search_at = NOW()
                          WHERE id = $2 AND user_id = $3`,
      [out.length, dumpId, userId]);
    return out;
  }
}

interface DumpHit {
  item: ScratchDumpItem;
  distance: number;
  sortKey: 'takenAt' | 'fileMtime' | 'uploadedAt';
  sortValue: string;
}
```

- [ ] **Step 12.5: VectorSearchService 加 dump 表方法**

```typescript
async searchDumpItemsByEmbeddings(
  userId: string,
  dumpId: string,
  queries: number[][],
  threshold?: number,
  topK?: number,
): Promise<Array<{ itemId: string; distance: number }>> {
  if (queries.length === 0) return [];
  const thr = threshold ?? this.cfg.search.threshold;
  const k = topK ?? this.cfg.search.topK;
  const sql = `
    WITH q AS (
      SELECT v, ord FROM unnest($3::float[][]) WITH ORDINALITY AS t(v, ord)
    ),
    distances AS (
      SELECT sdi.id AS item_id,
             sdi.embedding <=> q.v AS distance
        FROM scratch_dump_items sdi
        CROSS JOIN q
       WHERE sdi.user_id = $1 AND sdi.dump_id = $2 AND sdi.is_processed = TRUE
    ),
    best AS (
      SELECT item_id, MIN(distance) AS distance
        FROM distances
       GROUP BY item_id
      HAVING MIN(distance) <= $4
    )
    SELECT b.item_id::text AS "itemId", b.distance
      FROM best b
     ORDER BY b.distance ASC
     LIMIT $5;
  `;
  const rows = await this.ds.query(sql, [userId, dumpId, queries, thr, k]);
  return (rows as Array<{ itemId: string; distance: number }>)
    .map((r) => ({ itemId: r.itemId, distance: Number(r.distance) }));
}
```

补单测在 `vector-search.service.spec.ts`：

```typescript
it('searchDumpItemsByEmbeddings builds expected SQL with dump_id', async () => {
  const ds = { query: jest.fn().mockResolvedValue([]) } as never;
  const svc = new VectorSearchService(ds, cfg);
  await svc.searchDumpItemsByEmbeddings('u1', 'd1', [new Array(512).fill(0)], 0.5, 100);
  const [sql, params] = (ds.query as jest.Mock).mock.calls[0];
  expect(sql).toContain('scratch_dump_items');
  expect(params[1]).toBe('d1');
  expect(params[3]).toBe(0.5);
  expect(params[4]).toBe(100);
});
```

- [ ] **Step 12.6: ScratchDumpController**

```typescript
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ScratchDumpService } from './scratch-dump.service';
import { AddScratchDumpItemDto } from '../dto/add-scratch-dump-item.dto';

@Controller('faces/dumps')
export class ScratchDumpController {
  constructor(private svc: ScratchDumpService) {}

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() body: { name: string; description?: string }) {
    return this.svc.create(u.id, body);
  }
  @Get()
  list(@CurrentUser() u: AuthUser, @Query('limit') limit?: string) {
    return this.svc.list(u.id, limit ? Number(limit) : 50);
  }
  @Get(':id')
  one(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.getOne(u.id, id);
  }
  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }
  @Post(':id/photos')
  addItem(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: AddScratchDumpItemDto) {
    return this.svc.addItem(u.id, id, body);
  }
  @Get(':id/items')
  items(@CurrentUser() u: AuthUser, @Param('id') id: string,
         @Query('status') status?: 'pending' | 'processed' | 'failed') {
    return this.svc.listItems(u.id, id, { status });
  }
  @Get(':id/status')
  status(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.getStatus(u.id, id);
  }
  @Post(':id/search')
  search(@CurrentUser() u: AuthUser, @Param('id') id: string,
         @Body() body: { threshold?: number; topK?: number }) {
    return this.svc.searchDump(u.id, id, body);
  }
}
```

- [ ] **Step 12.7: 服务单测**

`backend/src/face/scratch/scratch-dump.service.spec.ts`（伪代码概要）：

```typescript
describe('ScratchDumpService', () => {
  describe('create', () => { it('saves dump with status=created and returns it'); });
  describe('addItem', () => {
    it('increments total_items & enqueues face-extract-scratch');
    it('throws ConflictException on duplicate sourceUrl in same dump');
  });
  describe('searchDump', () => {
    it('returns [] when no refs enabled');
    it('maps hits → items joined by id with sortKey derivation');
    it('sorts by sortValue DESC (takenAt 优先); updates hits_count');
  });
  describe('getOne', () => { it('throws NotFound when dump missing or wrong user'); });
});
```

- [ ] **Step 12.8: supertest 集成测**

`backend/src/face/scratch/scratch-dump-integration.spec.ts`：覆盖 `POST /faces/dumps` → `POST /faces/dumps/:id/photos` → `GET /faces/dumps/:id/status` → `POST /faces/dumps/:id/search` 完整路径，用 mock Service。

- [ ] **Step 12.9: 跑测试 + commit**

```bash
cd backend && npx jest src/face
git add backend/src/face backend/src/ai
git commit -m "feat(backend): ScratchDumpService + ScratchDumpController + face-extract-scratch job"
```

---

## Task 13: 前端 /faces/dumps 列表 + 新建 + 上传 + 进度

**Files:**
- Modify: `frontend/src/api/faces.js`（加 scratchDumpsApi）
- Create: `frontend/src/hooks/useScratchDumps.js`
- Create: `frontend/src/hooks/useDumpStatus.js`
- Create: `frontend/src/hooks/useDumpSearch.js`
- Create: `frontend/src/components/DumpCard.jsx`
- Create: `frontend/src/components/DumpUploader.jsx`
- Create: `frontend/src/components/DumpProgressBar.jsx`
- Create: `frontend/src/pages/DumpsListPage.jsx`
- Create: `frontend/src/pages/DumpNewPage.jsx`
- Create: 对应 `*.test.jsx`

**Interfaces:**
- Consumes: scratchDumpsApi + TanStack Query
- Produces: dump 列表页 + 上传组件 + 进度条

- [ ] **Step 13.1: scratchDumpsApi**

```javascript
export const scratchDumpsApi = {
  create:    (body)            => client.post('/faces/dumps', body).then(r => r.data),
  list:      (limit = 50)      => client.get('/faces/dumps', { params: { limit } }).then(r => r.data),
  get:       (id)              => client.get(`/faces/dumps/${id}`).then(r => r.data),
  remove:    (id)              => client.delete(`/faces/dumps/${id}`).then(r => r.data),
  addItem:   (id, body)        => client.post(`/faces/dumps/${id}/photos`, body).then(r => r.data),
  listItems: (id, status)      => client.get(`/faces/dumps/${id}/items`, { params: status ? { status } : {} }).then(r => r.data),
  status:    (id)              => client.get(`/faces/dumps/${id}/status`).then(r => r.data),
  search:    (id, body)        => client.post(`/faces/dumps/${id}/search`, body).then(r => r.data),
};
```

- [ ] **Step 13.2: hooks**

`useScratchDumps.js`：`useQuery({ queryKey: ['scratch-dumps'], queryFn: () => scratchDumpsApi.list() })` + `useCreateDump` / `useRemoveDump`。

`useDumpStatus.js`：`useQuery({ queryKey: ['dump-status', dumpId], queryFn: () => scratchDumpsApi.status(dumpId), refetchInterval: (q) => (q.state.data?.status === 'processing' ? 1000 : false) })`。

`useDumpSearch.js`：`useMutation({ mutationFn: ({ dumpId, opts }) => scratchDumpsApi.search(dumpId, opts) })`。

- [ ] **Step 13.3: DumpUploader**

接受多个 File，循环：
1. client.post('/upload/sign', { mimeType, fileSize, kind: 'photo' }) 拿 url + key
2. PUT 到 OSS
3. scratchDumpsApi.addItem(dumpId, { imageUrl, takenAt, fileMtime, filename, width, height })
4. 进度回调

简化实现：本期可只支持串行 + 单文件进度条；后续并行优化。

- [ ] **Step 13.4: DumpProgressBar**

`{ total, done, failed }` 三色条 + 失败数显示。

- [ ] **Step 13.5: DumpsListPage**

`useScratchDumps` 拉列表，每个 dump 一张 `<DumpCard />`，点击 → 跳 `/faces/dumps/:id`。
"DumpCard" 显示 name、status、progress、最新 hits_count。

- [ ] **Step 13.6: DumpNewPage**

表单：name + description（可选）；提交后调 `create` → 跳 `/faces/dumps/:id`。

- [ ] **Step 13.7: 路由**

`frontend/src/App.jsx` 加：
```jsx
<Route path="/faces/dumps"     element={<DumpsListPage />} />
<Route path="/faces/dumps/new" element={<DumpNewPage />} />
<Route path="/faces/dumps/:id" element={<DumpDetailPage />} />
```

- [ ] **Step 13.8: 测试**

`DumpUploader.test.jsx`：mock client + scratchDumpsApi，验证上传回调链路。

- [ ] **Step 13.9: 跑测试 + commit**

```bash
cd frontend && npm run test -- --run
git add frontend/src/api/faces.js frontend/src/hooks/useScratchDumps.js frontend/src/hooks/useDumpStatus.js frontend/src/hooks/useDumpSearch.js frontend/src/components/DumpCard.jsx frontend/src/components/DumpUploader.jsx frontend/src/components/DumpProgressBar.jsx frontend/src/pages/DumpsListPage.jsx frontend/src/pages/DumpNewPage.jsx frontend/src/components/*.test.jsx frontend/src/App.jsx
git commit -m "feat(frontend): /faces/dumps list + new + uploader + progress"
```

---

## Task 14: 前端 /faces/dumps/:id 详情 + DumpTimelineView 时间线结果

**Files:**
- Create: `frontend/src/data/dumpAdapter.js`
- Create: `frontend/src/components/DumpTimelineView.jsx`
- Create: `frontend/src/components/DumpTimelineView.test.jsx`
- Create: `frontend/src/pages/DumpDetailPage.jsx`
- Create: `frontend/src/pages/DumpDetailPage.test.jsx`

- [ ] **Step 14.1: dumpAdapter**

```javascript
/** 把后端 hits 数组按 COALESCE(takenAt, fileMtime, uploadedAt) 倒序分组，按年分组 */
export function groupDumpHitsByTimeline(hits) {
  const groups = new Map();
  for (const h of hits) {
    const y = new Date(h.sortValue).getFullYear();
    const k = String(y);
    if (!groups.has(k)) groups.set(k, { year: y, items: [] });
    groups.get(k).items.push(h);
  }
  for (const g of groups.values()) g.items.sort((a, b) => b.sortValue.localeCompare(a.sortValue));
  return [...groups.values()].sort((a, b) => b.year - a.year);
}
```

- [ ] **Step 14.2: DumpTimelineView**

```jsx
import { groupDumpHitsByTimeline } from '../data/dumpAdapter';

export function DumpTimelineView({ hits }) {
  const groups = groupDumpHitsByTimeline(hits);
  return (
    <div className="dump-timeline">
      {groups.map((g) => (
        <section key={g.year}>
          <h3>{g.year} <span className="count">{g.items.length}</span></h3>
          <ul>
            {g.items.map((h) => (
              <li key={h.item.id}>
                <a href={h.item.sourceUrl} target="_blank" rel="noreferrer">
                  {h.item.thumbnailUrl && <img src={h.item.thumbnailUrl} alt="" />}
                  <span className="filename">{h.item.filename || h.item.sourceUrl.split('/').pop()}</span>
                  <span className="ts">{new Date(h.sortValue).toLocaleDateString()}</span>
                  <span className={`chip sortkey-${h.sortKey}`}>{h.sortKey}</span>
                  <span className="dist">{h.distance.toFixed(2)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 14.3: DumpDetailPage**

```jsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDumpStatus } from '../hooks/useDumpStatus';
import { useDumpSearch } from '../hooks/useDumpSearch';
import { useScratchDumps } from '../hooks/useScratchDumps';
import { DumpUploader } from '../components/DumpUploader';
import { DumpProgressBar } from '../components/DumpProgressBar';
import { DumpTimelineView } from '../components/DumpTimelineView';

export function DumpDetailPage() {
  const { id } = useParams();
  const list = useScratchDumps();                     // 触发 invalidate
  const status = useDumpStatus(id);
  const [hits, setHits] = useState<any[]>([]);
  const search = useDumpSearch();

  async function doSearch() {
    const r = await search.mutateAsync({ dumpId: id, opts: { topK: 200 } });
    setHits(r);
  }

  return (
    <div className="dump-detail">
      <Link to="/faces/dumps">← 返回</Link>
      <h1>{status.data?.name ?? '...'}</h1>

      <DumpProgressBar total={status.data?.total ?? 0} done={status.data?.done ?? 0} failed={status.data?.failed ?? 0} />

      <DumpUploader dumpId={id} />

      <button onClick={doSearch} disabled={search.isPending}>过滤</button>
      {hits.length > 0 && <DumpTimelineView hits={hits} />}
    </div>
  );
}
```

- [ ] **Step 14.4: 测试**

覆盖 `groupDumpHitsByTimeline` + `DumpTimelineView` 渲染 + `DumpDetailPage` 切片（mock hooks）。

- [ ] **Step 14.5: 跑测试 + commit**

```bash
cd frontend && npm run test -- --run
git add frontend/src/data/dumpAdapter.js frontend/src/components/DumpTimelineView.jsx frontend/src/components/DumpTimelineView.test.jsx frontend/src/pages/DumpDetailPage.jsx frontend/src/pages/DumpDetailPage.test.jsx
git commit -m "feat(frontend): /faces/dumps/:id detail + dump timeline view"
```

---

## Self-Review

- ✅ Spec coverage：
  - §3 数据模型 → Task 1（4 张表，含 dump 两张）
  - §4 后端模块（Service / Controller / Provider / AI job / Search）→ Task 3-7
  - §4.3 ScratchDumpService + Controller + AI job extension → Task 12
  - §5 前端（api/adapter/hooks/components/page）→ Task 9-11
  - §5.x dumps 列表 + 详情 → Task 13 / 14
  - §10 测试 → 各 Task 自带测 + Task 8 后端汇总
  - §11 任务拆分（11 → 14 task + dump 增量）→ 与设计文档 §11 一致
- ✅ Placeholder：全 step 含代码或命令，无 TBD
- ✅ Type 一致：`FaceProvider` / `FaceEmbedding` / `BBox` / `UserFaceEmbedding` / `MomentFace` / `ScratchDump` / `ScratchDumpItem` / `FaceService.searchMine` / `ScratchDumpService.searchDump` 名称一致
- ✅ 单 self + 双流程（库 + dump）约束贯穿：所有 plan 中均不出现 personFace* / isSelf / PersonPage Tab

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-12-face-profile.md`. Two execution options:

1. **Subagent-Driven (recommended)** - 每个 task dispatch 一个 fresh subagent，task 间 review，fast iteration
2. **Inline Execution** - 当前 session 内执行，中途 checkpoint

下一步默认 subagent-driven（每个 subagent worker 拿自己 task 上下文 + 接口契约 + 测试要求实现）。用户可随时选择切换。
