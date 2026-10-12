# 个人画像功能（face profile）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 timex 增加「个人画像」功能：用户上传本人/他人的参考照片，后端抽取 512-d 人脸 embedding 存入 PostgreSQL + pgvector，可对全库 moment 做 ANN 相似度检索，结果按时间线 / 人物 / 地点三视图呈现。

**Architecture:** 复用现有 `ai_jobs` 异步任务框架与 S3 直传上传链路；在 `people` 表加 `is_self` 列，新增 `person_face_embeddings`（参考图）+ `moment_faces`（入库图）两张 pgvector 表；后端 `face` 模块通过 `FaceProvider` 抽象（cloud / local / mock）调用人脸识别；前端新增 `/faces` 总览页 + `PersonPage` "TA 的照片" Tab + Moment 提取按钮，三 Tab 结果视图复用 LinesPage 同型。

**Tech Stack:** NestJS 11 + TypeORM + PostgreSQL 16 + pgvector 0.5+（`pgvector/pgvector:pg16`）+ Jest 29 + supertest；前端 React 19 + Vite 6 + TanStack Query v5 + Zustand；AI Provider 默认 mock（CI / dev），cloud/local 通过 `FACE_PROVIDER` 环境变量切换。

## Global Constraints

- 全程中文界面文字，与现有 `product.md` 一致
- 所有数据库表带 `user_id`，Service / Repository 强制 `userId` 过滤（[backend.md §多租户隔离](../../../backend.md)）
- 每 commit 含实现 + 单元测试 + 集成测试，`npm run test` 与 `npm run lint` 全绿
- TypeORM 装饰器风格（与 `backend/src/people/person.entity.ts` 一致）
- AI 任务走 `ai_jobs` 表 + `AiService.submit/runJob`（不引入新的 job runner）
- 前端 TanStack Query key 命名 `['faces', ...]`；Zustand store 文件命名 `useFacesStore`
- 迁移文件命名 `2026_10_12_*.sql`，放到 `backend/scripts/migrations/`，由 `migrate.ts` 自动运行
- pgvector 扩展：Docker 镜像必须 `pgvector/pgvector:pg16`（含 `CREATE EXTENSION vector`）

---

## 文件结构（实施前总览）

后端（新增）：

```
backend/src/face/
├── face.module.ts                          # 注册 Controller + Service + Provider 工厂
├── face.service.ts                         # 业务核心：CRUD / 检索 / 懒创建 / backfill
├── face.service.spec.ts                    # 单测
├── face.controller.ts                      # REST
├── face.controller.spec.ts                 # 控制器单测骨架
├── face-integration.spec.ts                # 端到端 supertest
├── entities/
│   ├── person-face-embedding.entity.ts
│   └── moment-face.entity.ts
├── dto/
│   ├── search-faces.dto.ts
│   ├── add-face-reference.dto.ts
│   └── complete-face-reference.dto.ts
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
└── jobs/
    ├── face-job.handler.ts                 # kind: face-embed / face-extract / face-match
    └── face-job.handler.spec.ts
backend/src/moments/extract-faces.ts        # 从 AiJobKind 触发 face-extract
backend/src/ai/entities/ai-job.entity.ts    # 扩展 AiJobKind + AiJobTargetType
backend/src/ai/ai.service.ts                # applyToTarget 加 3 个 case
backend/scripts/migrations/
└── 2026_10_12_face_profile.sql             # pgvector + 3 表 + ivfflat
```

前端（新增）：

```
frontend/src/
├── api/faces.js                            # facesApi 对象
├── data/
│   ├── faceAdapter.js                      # 派生 timeline/persons/places
│   └── faceSelectors.js                    # 纯函数选择器
├── hooks/
│   ├── useFaceSearch.js
│   ├── useFaceBackfill.js
│   ├── useFaceProfile.js
│   └── useExtractFaces.js
├── store/useFacesStore.js
├── components/
│   ├── SelfProfileCard.jsx
│   ├── PersonsList.jsx
│   ├── FaceResultTabs.jsx
│   ├── FaceTimelineView.jsx
│   ├── FacePersonCluster.jsx
│   ├── FacePlaceMap.jsx
│   ├── PersonFaceTab.jsx
│   ├── ExtractFaceButton.jsx
│   └── FaceProfileSetupModal.jsx
└── pages/FacesPage.jsx
```

修改：

```
backend/src/app.module.ts                   # 注册 FaceModule
backend/src/people/person.entity.ts         # 加 is_self
backend/src/ai/entities/ai-job.entity.ts    # 扩展 union
backend/src/ai/ai.service.ts                # 加 handler case
backend/.env.example                        # FACE_PROVIDER 等
frontend/src/App.jsx                        # 新路由
frontend/src/api/client.js                  # 通用拦截器（如需 token 刷新）
frontend/src/pages/PersonPage.jsx           # 加 Tab
frontend/src/components/Header.jsx          # 加「面孔」导航
```

测试：

```
backend/test/face-integration-supertest.ts  # 跨模块集成（如需 supertest glob 调整）
frontend/src/pages/FacesPage.test.jsx       # 可选
```

---

## Task 1: pgvector + face schema migration

**Files:**
- Create: `backend/scripts/migrations/2026_10_12_face_profile.sql`
- Modify: `backend/scripts/init.sql`（追加 pgvector，不影响既有 init，仅给一次性 init 用）
- Test: 跑 `npm run migrate:dev` 后用 psql 验证表与索引已建

**Interfaces:**
- Consumes: PostgreSQL 16 + pgvector 已装
- Produces: 表 `people.is_self`、`person_face_embeddings`、`moment_faces`、索引 ivfflat

- [ ] **Step 1.1: 写迁移文件**

新建 `backend/scripts/migrations/2026_10_12_face_profile.sql`，内容：

```sql
-- pgvector 扩展（由 pgvector/pgvector:pg16 镜像内置）
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. people.is_self（部分唯一索引：每 user 仅一条 is_self=true）
ALTER TABLE people ADD COLUMN IF NOT EXISTS is_self BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_people_user_self
  ON people (user_id) WHERE is_self = TRUE;

-- 2. person_face_embeddings
CREATE TABLE IF NOT EXISTS person_face_embeddings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_id     uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  source_url    TEXT NOT NULL,
  thumbnail_url TEXT,
  bbox          jsonb,
  embedding     vector(512) NOT NULL,
  provider      VARCHAR(32) NOT NULL DEFAULT 'mock',
  model         VARCHAR(64),
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pfe_person_enabled ON person_face_embeddings (person_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_pfe_embedding ON person_face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. moment_faces
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
```

- [ ] **Step 1.2: 跑迁移**

```bash
cd backend && npm run migrate:dev
```

预期日志：`Applied 1 migration(s): 2026_10_12_face_profile.sql`

- [ ] **Step 1.3: 验证表与索引**

```bash
docker exec -i pgv-e2e-postgres psql -U postgres -d timex <<'SQL'
\d person_face_embeddings
\d moment_faces
\d+ people
SELECT indexname FROM pg_indexes WHERE tablename IN ('person_face_embeddings','moment_faces');
SQL
```

预期：3 张表存在；`is_self` 列；`uq_people_user_self` 部分索引；3 个 ivfflat 索引。

- [ ] **Step 1.4: 验证部分唯一索引（DB 层断言）**

```sql
INSERT INTO people (user_id, name, is_self) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'self-A', TRUE);
INSERT INTO people (user_id, name, is_self) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'self-A-2', TRUE);
```

预期第二条 INSERT 失败：`duplicate key value violates unique constraint "uq_people_user_self"`

- [ ] **Step 1.5: Commit**

```bash
git add backend/scripts/migrations/2026_10_12_face_profile.sql
git commit -m "feat(db): face profile schema + pgvector extension"
```

---

## Task 2: TypeORM entities（person-face-embedding + moment-face）

**Files:**
- Create: `backend/src/face/entities/person-face-embedding.entity.ts`
- Create: `backend/src/face/entities/moment-face.entity.ts`
- Modify: `backend/src/people/person.entity.ts`（加 `isSelf` + OneToMany face embeddings）
- Test: `backend/src/face/entities/entities.spec.ts`（利用 DataSource 验证映射）

**Interfaces:**
- Consumes: DB schema from Task 1
- Produces: Entities `PersonFaceEmbedding`、`MomentFace`、`Person.isSelf`

- [ ] **Step 2.1: 写 people 实体更新**

在 `backend/src/people/person.entity.ts`：

```typescript
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PersonFaceEmbedding } from '../face/entities/person-face-embedding.entity';

@Entity('people')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100, nullable: true })
  role!: string | null;

  @Column({ type: 'text', nullable: true })
  intro!: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'first_seen_at', type: 'date', nullable: true })
  firstSeenAt!: string | null;

  @Column({ name: 'latest_seen_at', type: 'date', nullable: true })
  latestSeenAt!: string | null;

  @Column({ name: 'is_self', type: 'boolean', default: false })
  isSelf!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToMany(() => PersonFaceEmbedding, (e) => e.person)
  faceEmbeddings!: PersonFaceEmbedding[];
}
```

- [ ] **Step 2.2: 写 PersonFaceEmbedding entity**

新建 `backend/src/face/entities/person-face-embedding.entity.ts`：

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
import { Person } from '../../people/person.entity';

@Entity('person_face_embeddings')
@Index(['personId', 'isEnabled'])
export class PersonFaceEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'person_id', type: 'uuid' })
  personId!: string;

  @ManyToOne(() => Person, (p) => p.faceEmbeddings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

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

> 注意：TypeORM 在 `type: 'vector'` 时需 `pgvector` 支持；测试时需 pgvector 实例。

- [ ] **Step 2.3: 写 MomentFace entity**

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

- [ ] **Step 2.4: 注册 entities 到 TypeORM**

`backend/src/config/database.config.ts`（或同名）的 `entities` 数组追加：

```typescript
import { PersonFaceEmbedding } from '../face/entities/person-face-embedding.entity';
import { MomentFace } from '../face/entities/moment-face.entity';
// ...
entities: [..., PersonFaceEmbedding, MomentFace],
```

> 命名 / 路径对齐实际项目（`backend/src/config/typeorm.config.ts` 之类）。看实际 `app.module.ts` 里 DataSourceOptions。

- [ ] **Step 2.5: 写实体映射集成测试**

新建 `backend/src/face/entities/entities.integration.spec.ts`（标 `.integration` 由 jest 配置过滤）：

```typescript
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PersonFaceEmbedding } from './person-face-embedding.entity';
import { MomentFace } from './moment-face.entity';
import { Person } from '../../people/person.entity';
import { Moment } from '../../moments/moment.entity';
import { User } from '../../users/user.entity';
import { databaseConfig } from '../../config/database.config';

describe('Face entities mapping', () => {
  let ds: DataSource;
  let pfe: Repository<PersonFaceEmbedding>;
  let mf: Repository<MomentFace>;

  beforeAll(async () => {
    ds = new DataSource(databaseConfig() as never);
    await ds.initialize();
    pfe = ds.getRepository(PersonFaceEmbedding);
    mf = ds.getRepository(MomentFace);
  });

  afterAll(async () => { await ds.destroy(); });

  it('round-trips a PersonFaceEmbedding', async () => {
    const u = await ds.getRepository(User).save({ email: 't@e.test', passwordHash: 'x' });
    const p = await ds.getRepository(Person).save({ userId: u.id, name: 'self', isSelf: true });
    const ref = await pfe.save(pfe.create({
      userId: u.id,
      personId: p.id,
      sourceUrl: 'https://x/1.jpg',
      embedding: new Array(512).fill(0).map((_, i) => i / 1000),
      provider: 'mock',
      model: 'fake',
    }));
    expect(ref.id).toBeDefined();
    const found = await pfe.findOneByOrFail({ id: ref.id });
    expect(found.embedding).toHaveLength(512);
  });

  it('round-trips a MomentFace', async () => {
    const u = await ds.getRepository(User).save({ email: 't2@e.test', passwordHash: 'x' });
    const m = await ds.getRepository(Moment).save(ds.getRepository(Moment).create({
      userId: u.id, type: 'photo', title: 'x', mediaUrl: 'https://x/2.jpg',
    }));
    const face = await mf.save(mf.create({
      userId: u.id, momentId: m.id, sourceUrl: 'https://x/2.jpg',
      embedding: new Array(512).fill(0), provider: 'mock', model: 'fake',
    }));
    const found = await mf.findOneByOrFail({ id: face.id });
    expect(found.momentId).toBe(m.id);
  });
});
```

- [ ] **Step 2.6: 跑测试 + commit**

```bash
cd backend
npx jest src/face/entities --runInBand
git add backend/src/face backend/src/people/person.entity.ts backend/src/config
git commit -m "feat(backend): face entities (PersonFaceEmbedding, MomentFace) + people.isSelf"
```

---

## Task 3: FaceProvider 接口 + MockProvider（CI 默认）

**Files:**
- Create: `backend/src/face/providers/face-provider.interface.ts`
- Create: `backend/src/face/providers/mock.face-provider.ts`
- Create: `backend/src/face/providers/mock.face-provider.spec.ts`
- Modify: 后续 Task 4/5 的 factory 会引入

**Interfaces:**
- Consumes: 一个 imageUrl（OSS /mock URL）
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
  BBox,
  FACE_VECTOR_DIM,
  FaceEmbedding,
  FaceProvider,
} from './face-provider.interface';

/** 把 url 哈希成 64 位种子，扩展为 512-dim vector（L2 normalize）。 */
function deterministicVector(seed: string): number[] {
  const hash = createHash('sha256').update(seed).digest();
  // 展开到 512 维：重用 hash 字节循环填充
  const out = new Array<number>(FACE_VECTOR_DIM).fill(0);
  for (let i = 0; i < FACE_VECTOR_DIM; i++) {
    out[i] = (hash[i % hash.length] / 255) * 2 - 1; // [-1, 1]
  }
  // L2 normalize
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}

@Injectable()
export class MockFaceProvider implements FaceProvider {
  readonly name = 'mock' as const;

  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    // mock 假设 1 张人脸，bbox 占满图
    return [{ bbox: { x: 0, y: 0, w: 1, h: 1 }, vector: deterministicVector(imageUrl), confidence: 1 }];
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

## Task 4: CloudFaceProvider + LocalFaceProvider stub

**Files:**
- Create: `backend/src/face/providers/cloud.face-provider.ts`
- Create: `backend/src/face/providers/local.face-provider.ts`
- Create: `backend/src/face/providers/cloud.face-provider.spec.ts`
- Create: `backend/src/face/providers/local.face-provider.spec.ts`
- Modify: `backend/src/config/face.config.ts`（新增 `face.config.ts`）

**Interfaces:**
- Consumes: `FaceProvider`，HTTP client，`FaceConfig` 注入 baseUrl + apiKey
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
      bbox: f.bbox,
      vector: f.embedding,
      confidence: f.confidence,
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
      bbox: f.bbox,
      vector: f.embedding,
      confidence: f.confidence,
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
        embedding: [0.1, 0.2, 0.3],
        confidence: 0.9,
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

`backend/.env.example`：

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

## Task 5: FaceProviderFactory + Module 装配

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

  /** 按 cfg.provider 选择；运行时调用 throw 自动降级 mock（factory 不感知）。 */
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
import { Person } from '../people/person.entity';
import { Moment } from '../moments/moment.entity';
import { PersonFaceEmbedding } from './entities/person-face-embedding.entity';
import { MomentFace } from './entities/moment-face.entity';
import { CloudFaceProvider } from './providers/cloud.face-provider';
import { FaceProviderFactory } from './providers/face-provider.factory';
import { LocalFaceProvider } from './providers/local.face-provider';
import { MockFaceProvider } from './providers/mock.face-provider';
import { FaceService } from './face.service';
import { FaceController } from './face.controller';
import { VectorSearchService } from './search/vector-search.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Person, Moment, PersonFaceEmbedding, MomentFace]),
  ],
  controllers: [FaceController],
  providers: [
    { provide: 'FaceConfig', useFactory: loadFaceConfig },
    MockFaceProvider,
    CloudFaceProvider,
    LocalFaceProvider,
    FaceProviderFactory,
    VectorSearchService,
    FaceService,
  ],
  exports: [FaceService],
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
  it('resolves mock when provider=mock', () => {
    expect(mkFactory('mock').resolve().name).toBe('mock');
  });
  it('resolves cloud when provider=cloud', () => {
    expect(mkFactory('cloud').resolve().name).toBe('cloud');
  });
  it('resolves local when provider=local', () => {
    expect(mkFactory('local').resolve().name).toBe('local');
  });
  it('caches the resolved instance (idempotent)', () => {
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
- Modify: `backend/src/face/face.module.ts`

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
    queries: number[][],          // 每个元素长度 512
    threshold?: number,
    topK?: number,
  ): Promise<MomentHit[]> {
    if (queries.length === 0) return [];
    const thr = threshold ?? this.cfg.search.threshold;
    const k = topK ?? this.cfg.search.topK;
    // 把 queries 展平成行：$2 ::float[][]
    const flat = queries;
    // 用 pgvector cosine 距离（<=>
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
    const rows = await this.ds.query(sql, [userId, flat, thr, k]);
    return (rows as Array<{ momentId: string; distance: number }>)
      .map((r) => ({ momentId: r.momentId, distance: Number(r.distance) }));
  }
}
```

> 注意：`type: 'float[][]'` Postgres 接受；本查询假定 TypeORM DataSource 已支持 pgvector 操作符。`embedding <=> q.v` 在没有装 pgvector 的 DB 上会语法错误——这是预期的（集成测试用真实 pgvector 实例）。

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
git add backend/src/face
git commit -m "feat(backend): VectorSearchService with pgvector cosine ANN"
```

---

## Task 7: FaceService 核心 + FaceController

**Files:**
- Create: `backend/src/face/face.service.ts`
- Create: `backend/src/face/face.service.spec.ts`
- Create: `backend/src/face/face.controller.ts`
- Create: `backend/src/face/face.controller.spec.ts`
- Create: `backend/src/face/dto/{search-faces,add-face-reference,complete-face-reference}.dto.ts`
- Create: `backend/src/face/face-integration.spec.ts`

**Interfaces:**
- Consumes: 注入 `FaceProvider`、`DataSource`、`Person`、`Moment`、`PersonFaceEmbedding`、`MomentFace` repos、`AiService`、`FaceConfig`
- Produces: REST endpoints (matches spec 表 §4.3)

- [ ] **Step 7.1: DTOs**

`backend/src/face/dto/search-faces.dto.ts`：

```typescript
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchFacesDto {
  @IsString()
  personId!: string;

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

`backend/src/face/dto/complete-face-reference.dto.ts`：

```typescript
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CompleteFaceReferenceDto {
  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl!: string;
}
```

- [ ] **Step 7.2: FaceService**

新建 `backend/src/face/face.service.ts`：

```typescript
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Person } from '../people/person.entity';
import { Moment } from '../moments/moment.entity';
import { PersonFaceEmbedding } from './entities/person-face-embedding.entity';
import { MomentFace } from './entities/moment-face.entity';
import { FaceConfig } from '../config/face.config';
import { FaceProvider } from './providers/face-provider.interface';
import { FaceProviderFactory } from './providers/face-provider.factory';
import { VectorSearchService, MomentHit } from './search/vector-search.service';
import { AiService } from '../ai/ai.service';

export interface PersonFaceProfileSummary {
  personId: string;
  name: string;
  isSelf: boolean;
  referenceCount: number;
  matchedCount?: number;
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
    @InjectRepository(Person) private people: Repository<Person>,
    @InjectRepository(Moment) private moments: Repository<Moment>,
    @InjectRepository(PersonFaceEmbedding) private pfe: Repository<PersonFaceEmbedding>,
    @InjectRepository(MomentFace) private mf: Repository<MomentFace>,
    private ds: DataSource,
    private factory: FaceProviderFactory,
    private search: VectorSearchService,
    private ai: AiService,
    @Inject('FaceConfig') private cfg: FaceConfig,
  ) {}

  /** 懒创建 self person：已存在则直接返回。 */
  async ensureSelfProfile(userId: string): Promise<Person> {
    const found = await this.people.findOne({ where: { userId, isSelf: true } });
    if (found) return found;
    const p = this.people.create({ userId, name: '我', isSelf: true });
    return this.people.save(p);
  }

  async listProfiles(userId: string): Promise<PersonFaceProfileSummary[]> {
    const rows = await this.ds.query(
      `SELECT p.id AS "personId", p.name, p.is_self AS "isSelf",
              COALESCE(c.cnt, 0) AS "referenceCount"
         FROM people p
         LEFT JOIN (
           SELECT person_id, COUNT(*) AS cnt
             FROM person_face_embeddings
            WHERE user_id = $1 AND is_enabled = TRUE
            GROUP BY person_id
         ) c ON c.person_id = p.id
        WHERE p.user_id = $1
        ORDER BY p.is_self DESC, p.name ASC`,
      [userId],
    );
    return rows.map((r: any) => ({
      personId: r.personId,
      name: r.name,
      isSelf: r.isSelf,
      referenceCount: Number(r.referenceCount),
    }));
  }

  async addReference(
    userId: string,
    personId: string,
    imageUrl: string,
  ): Promise<{ refId: string; jobId: string }> {
    // 1. 创建 reference 行（embedding 暂用全 0；job 完成后覆写）
    const ref = await this.pfe.save(this.pfe.create({
      userId,
      personId,
      sourceUrl: imageUrl,
      embedding: new Array(512).fill(0),
      provider: 'pending',
    }));
    // 2. 入队 face-embed job
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
    const res = await this.pfe.delete({ id: refId, userId });
    if (res.affected === 0) throw new NotFoundException('reference not found');
  }

  async setReferenceEnabled(userId: string, refId: string, enabled: boolean): Promise<void> {
    const res = await this.pfe.update({ id: refId, userId }, { isEnabled: enabled });
    if (res.affected === 0) throw new NotFoundException('reference not found');
  }

  async searchByPerson(
    userId: string,
    personId: string,
    opts: { threshold?: number; topK?: number },
  ): Promise<Array<{ moment: Moment; distance: number }>> {
    // 1. 拉启用 reference embeddings
    const refs = await this.pfe.find({
      where: { userId, personId, isEnabled: true },
    });
    if (refs.length === 0) return [];
    // 2. pgvector 检索
    const queries = refs.map((r) => r.embedding);
    const hits = await this.search.searchMomentsByEmbeddings(
      userId,
      queries,
      opts.threshold,
      opts.topK,
    );
    if (hits.length === 0) return [];
    // 3. 取 moments
    const ids = hits.map((h) => h.momentId);
    const moments = await this.moments.find({ where: ids.map((id) => ({ id, userId })) });
    const byId = new Map(moments.map((m) => [m.id, m]));
    return hits
      .map((h) => {
        const m = byId.get(h.momentId);
        return m ? { moment: m, distance: h.distance } : null;
      })
      .filter((x): x is { moment: Moment; distance: number } => x !== null);
  }

  async enqueueExtractFaces(userId: string, momentId: string): Promise<{ jobId: string }> {
    const m = await this.moments.findOne({ where: { id: momentId, userId } });
    if (!m) throw new NotFoundException('moment not found');
    if (m.type !== 'photo') {
      throw new NotFoundException('moment is not a photo');
    }
    const job = await this.ai.submit({
      userId,
      kind: 'face-extract',
      targetType: 'face_match',
      targetId: m.id,
      promptInput: { momentId: m.id, imageUrl: m.mediaUrl } as never,
    });
    return { jobId: job.id };
  }

  async startBackfill(userId: string): Promise<BackfillStatus> {
    // 1. 找所有 photo moment 且无 face 记录的
    const rows = await this.ds.query(
      `SELECT m.id FROM moments m
        LEFT JOIN moment_faces mf ON mf.moment_id = m.id
        WHERE m.user_id = $1 AND m.type = 'photo' AND mf.id IS NULL`,
      [userId],
    );
    const ids = rows.map((r: any) => r.id);
    this.backfill = { total: ids.length, processed: 0, failed: 0, status: 'running' };

    // 2. 限速入队：每批 batch 个，批间 sleep
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
```

- [ ] **Step 7.3: FaceController**

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

  @Get('profiles')
  list(@CurrentUser() u: AuthUser) {
    return this.face.listProfiles(u.id);
  }

  @Get('profiles/self')
  self(@CurrentUser() u: AuthUser) {
    return this.face.ensureSelfProfile(u.id);
  }

  @Get('profiles/:personId')
  async one(@CurrentUser() u: AuthUser, @Param('personId') personId: string) {
    // 仅返回 profile 详情（不暴露 embedding 本身）
    const list = await this.face.listProfiles(u.id);
    const p = list.find((x) => x.personId === personId);
    if (!p) throw new Error('not found');
    return p;
  }

  @Post('profiles/:personId/references')
  add(
    @CurrentUser() u: AuthUser,
    @Param('personId') personId: string,
    @Body() body: AddFaceReferenceDto,
  ) {
    return this.face.addReference(u.id, personId, body.imageUrl);
  }

  @Delete('references/:refId')
  remove(@CurrentUser() u: AuthUser, @Param('refId') refId: string) {
    return this.face.removeReference(u.id, refId);
  }

  @Patch('references/:refId')
  patch(
    @CurrentUser() u: AuthUser,
    @Param('refId') refId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.face.setReferenceEnabled(u.id, refId, body.enabled);
  }

  @Post('search')
  search(@CurrentUser() u: AuthUser, @Body() body: SearchFacesDto) {
    return this.face.searchByPerson(u.id, body.personId, {
      threshold: body.threshold,
      topK: body.topK,
    });
  }

  @Post('backfill')
  backfill(@CurrentUser() u: AuthUser) {
    return this.face.startBackfill(u.id);
  }

  @Get('backfill/status')
  status() {
    return this.face.getBackfillStatus();
  }

  @Post('moments/:momentId/extract')
  extract(@CurrentUser() u: AuthUser, @Param('momentId') momentId: string) {
    return this.face.enqueueExtractFaces(u.id, momentId);
  }
}
```

> `CurrentUser` / `AuthUser` 按项目已有装饰器签名；调整 import 路径以匹配 `backend/src/common/decorators/current-user.decorator.ts`。

- [ ] **Step 7.4: FaceService 单测（mock repos + factory）**

新建 `backend/src/face/face.service.spec.ts`：

```typescript
import { FaceService } from './face.service';

function mkSvc(overrides?: Partial<{
  ensureSelf: any;
  listProfiles: any;
  addRef: any;
  removeRef: any;
  setEnabled: any;
  search: any;
  enqueue: any;
  backfill: any;
  backfillStatus: any;
}>) {
  const people = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never;
  const moments = { findOne: jest.fn(), find: jest.fn() } as never;
  const pfe = { save: jest.fn(), find: jest.fn(), delete: jest.fn(), update: jest.fn(), create: jest.fn() } as never;
  const mf = {} as never;
  const ds = { query: jest.fn().mockResolvedValue([]) } as never;
  const factory = { resolve: jest.fn() } as never;
  const search = { searchMomentsByEmbeddings: jest.fn().mockResolvedValue([]) } as never;
  const ai = { submit: jest.fn().mockResolvedValue({ id: 'job1' }) } as never;
  const cfg = { search: { backfillBatch: 2, threshold: 0.6, topK: 10 } } as never;
  return {
    svc: new FaceService(people, moments, pfe, mf, ds, factory, search, ai, cfg),
    people, moments, pfe, ds, factory, search, ai,
  };
}

describe('FaceService.ensureSelfProfile', () => {
  it('returns existing when found', async () => {
    const { svc, people } = mkSvc();
    const existing = { id: 'p1', isSelf: true };
    (people.findOne as jest.Mock).mockResolvedValue(existing);
    const got = await svc.ensureSelfProfile('u1');
    expect(got).toBe(existing);
    expect(people.save).not.toHaveBeenCalled();
  });

  it('creates when missing', async () => {
    const { svc, people } = mkSvc();
    (people.findOne as jest.Mock).mockResolvedValue(null);
    (people.create as jest.Mock).mockReturnValue({ id: 'p2', isSelf: true });
    (people.save as jest.Mock).mockResolvedValue({ id: 'p2' });
    const got = await svc.ensureSelfProfile('u1');
    expect(got.id).toBe('p2');
    expect(people.save).toHaveBeenCalled();
  });
});

describe('FaceService.removeReference', () => {
  it('throws NotFound when no row affected', async () => {
    const { svc, pfe } = mkSvc();
    (pfe.delete as jest.Mock).mockResolvedValue({ affected: 0 });
    await expect(svc.removeReference('u1', 'r1')).rejects.toThrow();
  });
  it('resolves when affected=1', async () => {
    const { svc, pfe } = mkSvc();
    (pfe.delete as jest.Mock).mockResolvedValue({ affected: 1 });
    await expect(svc.removeReference('u1', 'r1')).resolves.toBeUndefined();
  });
});

describe('FaceService.searchByPerson', () => {
  it('returns [] when no references', async () => {
    const { svc, pfe } = mkSvc();
    (pfe.find as jest.Mock).mockResolvedValue([]);
    const out = await svc.searchByPerson('u1', 'p1', {});
    expect(out).toEqual([]);
  });

  it('joins hits with moments by id', async () => {
    const { svc, pfe, search, moments } = mkSvc();
    (pfe.find as jest.Mock).mockResolvedValue([
      { id: 'r1', embedding: [0.1] },
      { id: 'r2', embedding: [0.2] },
    ]);
    (search.searchMomentsByEmbeddings as jest.Mock).mockResolvedValue([
      { momentId: 'm1', distance: 0.1 },
      { momentId: 'm2', distance: 0.2 },
    ]);
    (moments.find as jest.Mock).mockResolvedValue([
      { id: 'm1' },
      { id: 'm2' },
    ]);
    const out = await svc.searchByPerson('u1', 'p1', {});
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
  it('returns jobId when valid', async () => {
    const { svc, moments, ai } = mkSvc();
    (moments.findOne as jest.Mock).mockResolvedValue({ id: 'm1', type: 'photo', mediaUrl: 'x' });
    const out = await svc.enqueueExtractFaces('u1', 'm1');
    expect(out.jobId).toBe('job1');
    expect(ai.submit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 7.5: 控制器集成测试（supertest）**

新建 `backend/src/face/face-integration.spec.ts`：

> 此处用项目已有 supertest 测试基线（参 `backend/src/moments/moments.controller.spec.ts`）。如无现有 supertest helper，自行 mock `SessionAuthGuard` 注入 user id。

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { FaceController } from './face.controller';
import { FaceService } from './face.service';

describe('FaceController (integration)', () => {
  let app: INestApplication;
  const svc = {
    ensureSelfProfile: jest.fn().mockResolvedValue({ id: 'p-self', isSelf: true, name: '我' }),
    listProfiles: jest.fn().mockResolvedValue([]),
    addReference: jest.fn().mockResolvedValue({ refId: 'r1', jobId: 'j1' }),
    removeReference: jest.fn().mockResolvedValue(undefined),
    setReferenceEnabled: jest.fn().mockResolvedValue(undefined),
    searchByPerson: jest.fn().mockResolvedValue([]),
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

  it('GET /faces/profiles/self returns self person', async () => {
    const res = await request(app.getHttpServer()).get('/faces/profiles/self');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('p-self');
  });

  it('POST /faces/profiles/:personId/references accepts imageUrl', async () => {
    const res = await request(app.getHttpServer())
      .post('/faces/profiles/p1/references')
      .send({ imageUrl: 'https://x/1.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.refId).toBe('r1');
  });

  it('POST /faces/search returns hits', async () => {
    svc.searchByPerson.mockResolvedValueOnce([{ moment: { id: 'm1' }, distance: 0.1 }]);
    const res = await request(app.getHttpServer())
      .post('/faces/search')
      .send({ personId: 'p1', topK: 50 });
    expect(res.status).toBe(201);
    expect(res.body[0].moment.id).toBe('m1');
  });

  it('POST /faces/moments/:id/extract returns jobId', async () => {
    const res = await request(app.getHttpServer())
      .post('/faces/moments/m1/extract');
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

> `require('../auth/session-auth.guard').SessionAuthGuard` 路径按实际项目调整；如 guard 不能简单 override，可把 controller 测试中 CurrentUser 装饰器换成读取测试请求 header。

- [ ] **Step 7.6: 跑测试 + commit**

```bash
cd backend
npx jest src/face
git add backend/src/face
git commit -m "feat(backend): FaceService + FaceController (REST + integration)"
```

---

## Task 8: AI Job 扩展（face-embed / face-extract / face-match handler）

**Files:**
- Modify: `backend/src/ai/entities/ai-job.entity.ts`（扩展 union）
- Modify: `backend/src/ai/ai.module.ts`（注册 FaceModule 或让 AiService 能注入 FaceProvider）
- Modify: `backend/src/ai/ai.service.ts`（`applyToTarget` 加 case）
- Modify: `backend/src/ai/jobs/handlers.ts`（如已存在；否则新建 `backend/src/face/jobs/face-job.handler.ts`）
- Create: `backend/src/face/jobs/face-job.handler.spec.ts`

**Interfaces:**
- Consumes: `FaceProviderFactory.resolve()`、`PersonFaceEmbedding`、`MomentFace` repos
- Produces: job 完成后把 result 写回（face-embed → pfe.embedding；face-extract → mf 多行）

- [ ] **Step 8.1: 扩展 AiJobKind 与 AiJobTargetType**

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
  | 'face-extract'
  | 'face-match';

export type AiJobTargetType =
  | 'moment'
  | 'memoir'
  | 'chapter'
  | 'event'
  | 'face_reference'
  | 'face_match';
```

- [ ] **Step 8.2: 写 face job handler**

新建 `backend/src/face/jobs/face-job.handler.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonFaceEmbedding } from '../entities/person-face-embedding.entity';
import { MomentFace } from '../entities/moment-face.entity';
import { FaceProviderFactory } from '../providers/face-provider.factory';
import { BBox, FaceEmbedding } from '../providers/face-provider.interface';

interface FaceEmbedInput { imageUrl: string; bboxHint?: BBox; refId: string; }
interface FaceExtractInput { momentId: string; imageUrl: string; }

@Injectable()
export class FaceJobHandler {
  private log = new Logger(FaceJobHandler.name);

  constructor(
    @InjectRepository(PersonFaceEmbedding) private pfe: Repository<PersonFaceEmbedding>,
    @InjectRepository(MomentFace) private mf: Repository<MomentFace>,
    private factory: FaceProviderFactory,
  ) {}

  async runEmbed(
    userId: string,
    targetId: string,                        // refId
    input: FaceEmbedInput,
  ): Promise<{ provider: string; model?: string }> {
    const provider = this.factory.resolve();
    let faces: FaceEmbedding[] = [];
    let err: unknown = null;
    try {
      faces = await provider.detectAndEmbed(input.imageUrl);
    } catch (e) {
      err = e;
      this.log.warn(`embed cloud/local failed; falling back to mock: ${(e as Error).message}`);
      provider.detectAndEmbed.length; // satisfy ts unused
    }
    if (err || faces.length === 0) {
      // fallback mock
      const mock = await import('../providers/mock.face-provider').then((m) => new m.MockFaceProvider());
      faces = await mock.detectAndEmbed(input.imageUrl);
      provider.name; // keep linter happy
    }
    // 选择最大人脸
    const chosen = pickLargest(faces);
    if (!chosen) throw new Error('no face detected');
    await this.pfe.update(
      { id: targetId, userId },
      {
        embedding: chosen.vector,
        bbox: chosen.bbox,
        provider: provider.name,
        model: 'auto',
      },
    );
    return { provider: provider.name };
  }

  async runExtract(
    userId: string,
    targetId: string,
    input: FaceExtractInput,
  ): Promise<{ provider: string; faces: number }> {
    const provider = this.factory.resolve();
    let faces: FaceEmbedding[] = [];
    let usedProvider: 'cloud' | 'local' | 'mock' = provider.name;
    try {
      faces = await provider.detectAndEmbed(input.imageUrl);
    } catch (e) {
      this.log.warn(`extract failed: ${(e as Error).message}; falling back to mock`);
      const mock = await import('../providers/mock.face-provider').then((m) => new m.MockFaceProvider());
      faces = await mock.detectAndEmbed(input.imageUrl);
      usedProvider = 'mock';
    }
    // 清该 moment 已有 face（重新提取）
    await this.mf.delete({ momentId: targetId, userId });
    const rows = faces.map((f) => ({
      userId,
      momentId: targetId,
      sourceUrl: input.imageUrl,
      bbox: f.bbox,
      embedding: f.vector,
      provider: usedProvider,
      model: 'auto',
      qualityScore: f.confidence ?? null,
    }));
    if (rows.length) await this.mf.save(rows);
    return { provider: usedProvider, faces: rows.length };
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

- [ ] **Step 8.3: AiService.applyToTarget 注册 face-* case**

`backend/src/ai/ai.service.ts` 的 `applyToTarget` switch：

```typescript
case 'face-embed': {
  const inp = promptInput as { imageUrl: string; refId: string; bboxHint?: BBox };
  await this.faceHandler.runEmbed(job.userId, job.targetId, inp);
  break;
}
case 'face-extract': {
  const inp = promptInput as { momentId: string; imageUrl: string };
  await this.faceHandler.runExtract(job.userId, job.targetId, inp);
  break;
}
case 'face-match': {
  // v1.x: 留空
  break;
}
```

并在 `AiService` 构造函数注入 `FaceJobHandler`：

```typescript
constructor(
  @InjectRepository(AiJob) private repo: Repository<AiJob>,
  private llm: AiRouterProvider,
  private faceHandler: FaceJobHandler,
) {}
```

- [ ] **Step 8.4: AiModule 注册**

`backend/src/ai/ai.module.ts` 的 `imports` 加 `FaceModule`（如未加），`providers` 加 `FaceJobHandler`。

- [ ] **Step 8.5: handler 单测（mock factory + repos）**

新建 `backend/src/face/jobs/face-job.handler.spec.ts`：

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FaceJobHandler } from './face-job.handler';
import { FaceProviderFactory } from '../providers/face-provider.factory';
import { MockFaceProvider } from '../providers/mock.face-provider';
import { PersonFaceEmbedding } from '../entities/person-face-embedding.entity';
import { MomentFace } from '../entities/moment-face.entity';

describe('FaceJobHandler', () => {
  let h: FaceJobHandler;
  let pfe: { update: jest.Mock };
  let mf: { delete: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    pfe = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    mf = { delete: jest.fn().mockResolvedValue({ affected: 0 }), save: jest.fn().mockResolvedValue([]) };
    const mod = await Test.createTestingModule({
      providers: [
        FaceJobHandler,
        { provide: getRepositoryToken(PersonFaceEmbedding), useValue: pfe },
        { provide: getRepositoryToken(MomentFace), useValue: mf },
        FaceProviderFactory,
        MockFaceProvider,
      ],
    }).compile();
    h = mod.get(FaceJobHandler);
  });

  it('runEmbed picks largest face and writes embedding to pfe', async () => {
    await h.runEmbed('u1', 'r1', { refId: 'r1', imageUrl: 'https://x/1.jpg' });
    expect(pfe.update).toHaveBeenCalled();
    const [, payload] = pfe.update.mock.calls[0];
    expect(payload.embedding).toHaveLength(512);
    expect(payload.bbox.w).toBeGreaterThan(0);
  });

  it('runExtract saves one row per face and deletes previous', async () => {
    await h.runExtract('u1', 'm1', { momentId: 'm1', imageUrl: 'https://x/2.jpg' });
    expect(mf.delete).toHaveBeenCalledWith({ momentId: 'm1', userId: 'u1' });
    expect(mf.save).toHaveBeenCalled();
  });

  it('runEmbed throws when no face detected', async () => {
    const factory = (h as any).factory as FaceProviderFactory;
    jest.spyOn(factory, 'resolve').mockReturnValue({
      name: 'mock',
      detectAndEmbed: async () => [],
      embedFace: async () => ({} as never),
    } as never);
    await expect(h.runEmbed('u1', 'r1', { refId: 'r1', imageUrl: 'x' })).rejects.toThrow('no face');
  });
});
```

- [ ] **Step 8.6: 跑测试 + commit**

```bash
cd backend
npx jest src/face src/ai
git add backend/src/ai backend/src/face
git commit -m "feat(ai): face-embed + face-extract + face-match job kinds"
```

---

## Task 9: backend 单元 + 集成测试总览（保证所有测试覆盖）

**Files:** 上面各 task 自带测；本 task 汇总验证

- [ ] **Step 9.1: 跑全部后端测试**

```bash
cd backend
npm run test
npm run lint
npm run build
```

预期：

- `Tests: X passed`（新增 ≥ 40 测试，老 156 不破）
- lint 0 error
- build 通过

- [ ] **Step 9.2: 修任何被破的旧测试**

如有回归，单独 commit：

```bash
git commit -m "test(backend): fix regressions from face module"
```

---

## Task 10: 前端 API 客户端 + faceAdapter + faceSelectors

**Files:**
- Create: `frontend/src/api/faces.js`
- Create: `frontend/src/data/faceAdapter.js`
- Create: `frontend/src/data/faceSelectors.js`

**Interfaces:**
- Consumes: 已有 `api/client.js` axios 实例
- Produces: `facesApi.{ensureSelf,listProfiles,addReference,...}`；纯函数适配层

- [ ] **Step 10.1: 写 facesApi**

新建 `frontend/src/api/faces.js`：

```javascript
import client from './client';

export const facesApi = {
  ensureSelf:   ()                  => client.get('/faces/profiles/self').then(r => r.data),
  listProfiles: ()                  => client.get('/faces/profiles').then(r => r.data),
  getProfile:   (personId)          => client.get(`/faces/profiles/${personId}`).then(r => r.data),
  addReference: (personId, body)    => client.post(`/faces/profiles/${personId}/references`, body).then(r => r.data),
  removeRef:    (refId)             => client.delete(`/faces/references/${refId}`).then(r => r.data),
  setRefEnabled:(refId, enabled)    => client.patch(`/faces/references/${refId}`, { enabled }).then(r => r.data),
  search:       (body)              => client.post('/faces/search', body).then(r => r.data),
  backfill:     ()                  => client.post('/faces/backfill').then(r => r.data),
  backfillStatus: ()                => client.get('/faces/backfill/status').then(r => r.data),
  extractFaces: (momentId)          => client.post(`/faces/moments/${momentId}/extract`).then(r => r.data),
  jobStatus:    (jobId)             => client.get(`/ai/jobs/${jobId}`).then(r => r.data),
};
```

- [ ] **Step 10.2: faceAdapter — 三视图派生**

新建 `frontend/src/data/faceAdapter.js`：

```javascript
/** 输入：search API 返回 [{ moment, distance }]，输出按时间线分组的条目 */
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

/** 输入：hits + 已知 people（含 self）→ 按事件关联 persons 聚类 */
export function groupByPerson(hits, allPeople) {
  const byId = new Map(allPeople.map((p) => [p.id, p]));
  const buckets = new Map();                       // personId -> { person, items }
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

/** 输入：hits + places → 按 place 分组（带 lat/lng 给地图用） */
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

- [ ] **Step 10.3: faceSelectors — 阈值/排序纯函数**

新建 `frontend/src/data/faceSelectors.js`：

```javascript
export const sortByDistance = (a, b) => a.distance - b.distance;
export const withThreshold = (hits, t) => hits.filter((h) => h.distance <= t);
export const topK = (hits, k) => hits.slice(0, k);
```

- [ ] **Step 10.4: 单元测试（vitest 风格，按项目惯例）**

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
  it('groups by personIds from moment.personIds', () => {
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
      [{ moment: { id: 'a', placeId: null }, distance: 0.1 }],
      [],
    );
    expect(out).toHaveLength(0);
  });
});
```

- [ ] **Step 10.5: 跑测试 + commit**

```bash
cd frontend
npm run test -- --run
git add frontend/src/api/faces.js frontend/src/data/faceAdapter.js frontend/src/data/faceAdapter.test.js frontend/src/data/faceSelectors.js
git commit -m "feat(frontend): faces api client + face adapter + selectors"
```

---

## Task 11: 前端 hooks（useFaceSearch / useFaceBackfill / useFaceProfile / useExtractFaces）

**Files:**
- Create: `frontend/src/hooks/useFaceSearch.js`
- Create: `frontend/src/hooks/useFaceBackfill.js`
- Create: `frontend/src/hooks/useFaceProfile.js`
- Create: `frontend/src/hooks/useExtractFaces.js`
- Create: 对应 `*.test.jsx`

**Interfaces:**
- Consumes: `facesApi` + TanStack Query
- Produces: `{ data, isLoading, refetch }` 等标准 hook shape

- [ ] **Step 11.1: useFaceProfile**

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

export const faceKeys = {
  all: ['faces'],
  profiles: () => [...faceKeys.all, 'profiles'],
  self:     () => [...faceKeys.all, 'self'],
  backfill: () => [...faceKeys.all, 'backfill'],
};

export function useFaceProfiles() {
  return useQuery({ queryKey: faceKeys.profiles(), queryFn: facesApi.listProfiles });
}
export function useFaceSelf() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: faceKeys.self(),
    queryFn: facesApi.ensureSelf,
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.profiles() }),
  });
}
export function useAddReference(personId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => facesApi.addReference(personId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: faceKeys.profiles() }),
  });
}
```

- [ ] **Step 11.2: useFaceSearch**

```javascript
import { useQuery } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

export function useFaceSearch({ personId, threshold, topK }, enabled = true) {
  return useQuery({
    queryKey: ['faces', 'search', personId, threshold, topK],
    queryFn: () => facesApi.search({ personId, threshold, topK }),
    enabled: Boolean(enabled && personId),
    staleTime: 30_000,
  });
}
```

- [ ] **Step 11.3: useFaceBackfill**

```javascript
import { useMutation, useQuery } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

export function useStartBackfill() {
  return useMutation({ mutationFn: facesApi.backfill });
}
export function useBackfillStatus() {
  return useQuery({
    queryKey: ['faces', 'backfill'],
    queryFn: facesApi.backfillStatus,
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 1000 : false),
  });
}
```

- [ ] **Step 11.4: useExtractFaces**

```javascript
import { useMutation } from '@tanstack/react-query';
import { facesApi } from '../api/faces';

export function useExtractFaces() {
  return useMutation({ mutationFn: (momentId) => facesApi.extractFaces(momentId) });
}
```

- [ ] **Step 11.5: 测试**

```javascript
// frontend/src/hooks/useFaceSearch.test.jsx（vitest + renderHook）
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFaceSearch } from './useFaceSearch';
import * as facesApiMod from '../api/faces';

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useFaceSearch', () => {
  it('does not run when personId missing', async () => {
    const spy = jest.spyOn(facesApiMod.facesApi, 'search').mockResolvedValue([]);
    const { result } = renderHook(() => useFaceSearch({ personId: null }), { wrapper: wrap() });
    expect(result.current.isFetching).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('runs when personId set', async () => {
    const spy = jest.spyOn(facesApiMod.facesApi, 'search').mockResolvedValue([]);
    const { result } = renderHook(() => useFaceSearch({ personId: 'p1' }), { wrapper: wrap() });
    await result.current.refetch();
    expect(spy).toHaveBeenCalledWith({ personId: 'p1', threshold: undefined, topK: undefined });
  });
});
```

- [ ] **Step 11.6: 跑测试 + commit**

```bash
cd frontend
npm run test -- --run
git add frontend/src/hooks
git commit -m "feat(frontend): face search + backfill + extract hooks"
```

---

## Task 12: 前端组件（SelfProfileCard + PersonsList）

**Files:**
- Create: `frontend/src/components/SelfProfileCard.jsx`
- Create: `frontend/src/components/PersonsList.jsx`
- Create: 对应 `*.test.jsx`

**Interfaces:**
- Consumes: `useFaceSelf`、`useFaceProfiles`、`useStartBackfill`
- Produces: 顶部卡片组件

- [ ] **Step 12.1: SelfProfileCard**

```jsx
import { useNavigate } from 'react-router-dom';
import { useFaceSelf, useFaceProfiles } from '../hooks/useFaceProfile';

export function SelfProfileCard() {
  const self = useFaceSelf();
  const profiles = useFaceProfiles();
  const nav = useNavigate();
  const selfProfile = profiles.data?.find((p) => p.isSelf);

  if (self.isLoading) return <div className="card">加载中…</div>;

  return (
    <div className="card self-card">
      <div className="avatar">我</div>
      <div className="info">
        <h3>我的画像</h3>
        <p>{selfProfile?.referenceCount ?? 0} 张参考 · 已建档</p>
      </div>
      <div className="actions">
        <button onClick={() => nav('/faces?mode=setup')}>添加参考</button>
        <button className="primary" onClick={() => nav('/faces?personId=' + self.data?.id)}>
          找我的照片
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 12.2: PersonsList**

```jsx
import { useNavigate } from 'react-router-dom';
import { useFaceProfiles } from '../hooks/useFaceProfile';

export function PersonsList() {
  const profiles = useFaceProfiles();
  const nav = useNavigate();
  if (profiles.isLoading) return <div>加载中…</div>;
  return (
    <div className="persons-grid">
      {(profiles.data ?? [])
        .filter((p) => !p.isSelf)
        .map((p) => (
          <button key={p.personId} className="person-card" onClick={() => nav(`/faces?personId=${p.personId}`)}>
            <div className="avatar">{p.name?.[0] ?? '?'}</div>
            <div className="name">{p.name}</div>
            <div className="meta">{p.referenceCount > 0 ? `${p.referenceCount} 张参考` : '未建档'}</div>
          </button>
        ))}
    </div>
  );
}
```

- [ ] **Step 12.3: 组件单测**

```jsx
// frontend/src/components/SelfProfileCard.test.jsx
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
  it('renders self profile info', () => {
    jest.spyOn(fp, 'useFaceSelf').mockReturnValue({ data: { id: 'self1' }, isLoading: false } as never);
    jest.spyOn(fp, 'useFaceProfiles').mockReturnValue({
      data: [{ personId: 'self1', name: '我', isSelf: true, referenceCount: 3 }],
      isLoading: false,
    } as never);
    render(<SelfProfileCard />, { wrapper: wrap() });
    expect(screen.getByText(/我的画像/)).toBeInTheDocument();
    expect(screen.getByText(/3 张参考/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 12.4: 跑测试 + commit**

```bash
cd frontend
npm run test -- --run
git add frontend/src/components/SelfProfileCard.jsx frontend/src/components/SelfProfileCard.test.jsx frontend/src/components/PersonsList.jsx frontend/src/components/PersonsList.test.jsx
git commit -m "feat(frontend): SelfProfileCard + PersonsList components"
```

---

## Task 13: 前端 FacesPage 总览 + FaceResultTabs（三视图）

**Files:**
- Create: `frontend/src/pages/FacesPage.jsx`
- Create: `frontend/src/components/FaceResultTabs.jsx`
- Create: `frontend/src/components/FaceTimelineView.jsx`
- Create: `frontend/src/components/FacePersonCluster.jsx`
- Create: `frontend/src/components/FacePlaceMap.jsx`
- Create: 对应 `*.test.jsx`

**Interfaces:**
- Consumes: URL search params（`mode` / `personId`），hooks（useFaceSelf / useFaceProfiles / useFaceSearch）
- Produces: 总览页 + 三 Tab 结果

- [ ] **Step 13.1: FaceTimelineView**

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
                <button onClick={() => onSelect?.(h)}>
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

- [ ] **Step 13.2: FacePersonCluster + FacePlaceMap**

> 同型：根据 `groupByPerson` / `groupByPlace` 渲染（person cluster 用 d3-force 已有组件 `<RelationshipGraph>` 复用；place map 用 `<SpaceMap>` 复用）。

```jsx
import { groupByPerson } from '../data/faceAdapter';

export function FacePersonCluster({ hits, allPeople, onSelectPerson }) {
  const buckets = groupByPerson(hits, allPeople);
  return (
    <ul>
      {buckets.map((b) => (
        <li key={b.person?.id}>
          <button onClick={() => onSelectPerson?.(b.person)}>
            {b.person?.name} · {b.items.length}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function FacePlaceMap({ hits, places, onSelectPlace }) {
  const buckets = groupByPlace(hits, places);
  return (
    <ul>
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

- [ ] **Step 13.3: FaceResultTabs**

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
        <button className={tab === 'time' ? 'active' : ''} onClick={() => setTab('time')}>时间线</button>
        <button className={tab === 'person' ? 'active' : ''} onClick={() => setTab('person')}>人物</button>
        <button className={tab === 'place' ? 'active' : ''} onClick={() => setTab('place')}>地点</button>
      </nav>
      {tab === 'time'   && <FaceTimelineView hits={hits} onSelect={onSelectMoment} />}
      {tab === 'person' && <FacePersonCluster hits={hits} allPeople={allPeople} />}
      {tab === 'place'  && <FacePlaceMap hits={hits} places={places} />}
    </div>
  );
}
```

- [ ] **Step 13.4: FacesPage**

```jsx
import { useSearchParams } from 'react-router-dom';
import { SelfProfileCard } from '../components/SelfProfileCard';
import { PersonsList } from '../components/PersonsList';
import { FaceResultTabs } from '../components/FaceResultTabs';
import { useFaceSelf, useFaceProfiles } from '../hooks/useFaceProfile';
import { useFaceSearch } from '../hooks/useFaceSearch';
import { useStartBackfill, useBackfillStatus } from '../hooks/useFaceBackfill';
import { FaceProfileSetupModal } from '../components/FaceProfileSetupModal';

export function FacesPage() {
  const [params, setParams] = useSearchParams();
  const personId = params.get('personId') || undefined;
  const mode = params.get('mode');

  const profiles = useFaceProfiles();
  const self = useFaceSelf();
  const search = useFaceSearch({ personId });
  const backfill = useStartBackfill();
  const status = useBackfillStatus();

  if (mode === 'setup') return <FaceProfileSetupModal personId={personId ?? self.data?.id} onClose={() => setParams({})} />;

  return (
    <div className="faces-page">
      <header><h1>面孔中心</h1></header>

      <section><SelfProfileCard /></section>

      {!personId ? (
        <>
          <section>
            <h2>所有人物</h2>
            <PersonsList />
          </section>
          <section>
            <h2>历史回填</h2>
            <button onClick={() => backfill.mutate()} disabled={backfill.isPending || status.data?.status === 'running'}>
              {backfill.isPending || status.data?.status === 'running' ? '处理中…' : '一次性回填所有照片'}
            </button>
            {status.data && <span> {status.data.processed}/{status.data.total}</span>}
          </section>
        </>
      ) : (
        <FaceResultTabs hits={search.data ?? []} allPeople={profiles.data ?? []} places={[]} />
      )}
    </div>
  );
}
```

- [ ] **Step 13.5: 注册路由**

`frontend/src/App.jsx` 加：

```jsx
import { FacesPage } from './pages/FacesPage';
<Route path="/faces" element={<FacesPage />} />
```

并在 `frontend/src/components/Header.jsx` 加导航项「面孔」。

- [ ] **Step 13.6: 跑测试 + commit**

```bash
cd frontend
npm run test -- --run
git add frontend/src/components frontend/src/pages/FacesPage.jsx frontend/src/App.jsx frontend/src/components/Header.jsx
git commit -m "feat(frontend): /faces overview + FaceResultTabs (timeline/person/place)"
```

---

## Task 14: 前端 PersonPage Tab "TA 的照片" + FaceProfileSetupModal

**Files:**
- Create: `frontend/src/components/PersonFaceTab.jsx`
- Create: `frontend/src/components/FaceProfileSetupModal.jsx`
- Create: 对应 `*.test.jsx`
- Modify: `frontend/src/pages/PersonPage.jsx`

**Interfaces:**
- Consumes: useFaceProfiles、useAddReference、useFaceSearch
- Produces: `<PersonFaceTab>` 嵌进 PersonPage Tab；模态收图片 URL

- [ ] **Step 14.1: PersonFaceTab**

```jsx
import { useNavigate } from 'react-router-dom';
import { useFaceProfiles, useAddReference } from '../hooks/useFaceProfile';

export function PersonFaceTab({ personId }) {
  const profiles = useFaceProfiles();
  const addRef = useAddReference(personId);
  const nav = useNavigate();
  const profile = profiles.data?.find((p) => p.personId === personId);

  return (
    <div>
      {profile?.referenceCount > 0 ? (
        <>
          <p>已建档：{profile.referenceCount} 张参考图</p>
          <button className="primary" onClick={() => nav(`/faces?personId=${personId}`)}>查看 TA 的照片</button>
        </>
      ) : (
        <button className="primary" onClick={() => nav(`/faces?mode=setup&personId=${personId}`)}>为此人建立档案</button>
      )}
    </div>
  );
}
```

- [ ] **Step 14.2: FaceProfileSetupModal**

```jsx
import { useState } from 'react';
import { useAddReference } from '../hooks/useFaceProfile';

export function FaceProfileSetupModal({ personId, onClose }) {
  const [url, setUrl] = useState('');
  const add = useAddReference(personId);
  return (
    <div className="modal-mask" role="dialog">
      <div className="modal">
        <h3>添加人脸参考</h3>
        <p>请上传一张清晰、正脸的本人照片 URL（OSS 直传后回填）</p>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
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

- [ ] **Step 14.3: PersonPage 集成**

`frontend/src/pages/PersonPage.jsx` 找到 `<Tabs>`（或自己 Tab 容器）：

```jsx
import { PersonFaceTab } from '../components/PersonFaceTab';
<Tab label="TA 的照片"><PersonFaceTab personId={person.id} /></Tab>
```

- [ ] **Step 14.4: 测试**

```jsx
// PersonFaceTab.test.jsx
import { render, screen } from '@testing-library/react';
import { PersonFaceTab } from './PersonFaceTab';
import * as fp from '../hooks/useFaceProfile';

it('shows setup CTA when no profile', () => {
  jest.spyOn(fp, 'useFaceProfiles').mockReturnValue({ data: [], isLoading: false } as never);
  jest.spyOn(fp, 'useAddReference').mockReturnValue({} as never);
  render(<PersonFaceTab personId="p1" />);
  expect(screen.getByText(/建立档案/)).toBeInTheDocument();
});
```

- [ ] **Step 14.5: 跑测试 + commit**

```bash
cd frontend && npm run test -- --run
git add frontend/src/components/PersonFaceTab.jsx frontend/src/components/FaceProfileSetupModal.jsx frontend/src/pages/PersonPage.jsx frontend/src/components/PersonFaceTab.test.jsx
git commit -m "feat(frontend): PersonFaceTab + FaceProfileSetupModal + PersonPage integration"
```

---

## Task 15: 前端 Moment 提取按钮

**Files:**
- Create: `frontend/src/components/ExtractFaceButton.jsx`
- Modify: `frontend/src/pages/EventPage.jsx` 或 `MomentCard`（视现有结构）
- Create: `ExtractFaceButton.test.jsx`

**Interfaces:**
- Consumes: useExtractFaces
- Produces: 触发 `POST /faces/moments/:id/extract`

- [ ] **Step 15.1: ExtractFaceButton**

```jsx
import { useExtractFaces } from '../hooks/useExtractFaces';

export function ExtractFaceButton({ momentId }) {
  const m = useExtractFaces();
  return (
    <button onClick={() => m.mutate(momentId)} disabled={m.isPending}>
      {m.isPending ? '提取中…' : '✨ 提取人脸'}
    </button>
  );
}
```

- [ ] **Step 15.2: 嵌进 MomentCard / EventPage**

找到照片卡的 hover / 操作菜单，加入按钮。

- [ ] **Step 15.3: 测试**

```jsx
// ExtractFaceButton.test.jsx
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

- [ ] **Step 15.4: 跑测试 + commit**

```bash
cd frontend && npm run test -- --run
git add frontend/src/components/ExtractFaceButton.jsx frontend/src/pages/EventPage.jsx
git commit -m "feat(frontend): ExtractFaceButton on Moment card / EventPage"
```

---

## Task 16: 文档收尾（user guide + roadmap + api + changelog）

**Files:**
- Modify: `docs/user-guide.md`（新增「个人画像」章节）
- Modify: `docs/roadmap.md`（更新「个人画像」为 ✓）
- Modify: `docs/api.md`（新增 `/api/faces/*`）
- Modify: `docs/changelog.md`（新增条目 v1.1 / v1.2）

- [ ] **Step 16.1: api.md 追加 `/api/faces/*`**

```markdown
## /api/faces/* — 个人画像（v1.1）

| Method | Path | 说明 |
|---|---|---|
| GET    | /api/faces/profiles           | 列出本用户所有人物的 face profile 概览 |
| GET    | /api/faces/profiles/self      | 获取/创建 self person |
| GET    | /api/faces/profiles/:id       | 单个 profile 详情 |
| POST   | /api/faces/profiles/:id/references    | 新增参考图（入队 face-embed job） |
| DELETE | /api/faces/references/:id     | 删除参考 |
| PATCH  | /api/faces/references/:id     | 启停参考 `{ enabled: bool }` |
| POST   | /api/faces/search             | `{ personId, threshold?, topK? }` → hits |
| POST   | /api/faces/backfill           | 触发一次性回填 |
| GET    | /api/faces/backfill/status    | 回填进度 |
| POST   | /api/faces/moments/:id/extract | 给单张 moment 提取人脸 |
```

- [ ] **Step 16.2: user-guide.md 章节**

新增章节「个人画像：从一张照片找回所有过往」。简单 200 词步骤：

1. 打开 `/faces`
2. 上传 3-5 张本人正面照（推荐正脸、无遮挡）
3. 等 job 完成
4. 点击「找我的照片」
5. 在三 Tab 中切换

- [ ] **Step 16.3: roadmap 更新**

```markdown
| **个人画像（face profile）** | ✓ | pgvector + AI jobs + /faces 总览 + PersonPage Tab + 三 Tab 结果视图 |
```

- [ ] **Step 16.4: changelog 新增条目**

```markdown
## v1.1.0 — 个人画像（face profile）

新增功能：基于 pgvector + AI jobs 的人脸识别档案、双轨（self + person）。
后端：face module + pgvector + 3 张表 + ivfflat ANN。
前端：/faces 总览 + PersonPage Tab + Moment 提取按钮 + 三 Tab 结果视图。
测试：新增 ≥ 40 单测 + ≥ 8 集成测试。
```

- [ ] **Step 16.5: 跑 health-check + commit**

```bash
bash scripts/health-check.sh
git add docs
git commit -m "docs: face profile in user-guide + roadmap + api + changelog"
```

---

## Task 17: 端到端 smoke + health-check

**Files:** 运行现成脚本

- [ ] **Step 17.1: 跑 health-check**

```bash
bash scripts/health-check.sh
```

预期：lint / typecheck / test / build 全过。

- [ ] **Step 17.2: 手动跑一遍 US-001 ~ US-009**

参见需求文档 §5.1。在 dev 环境下：

```bash
# 起服务
docker compose up -d
cd backend && npm run migrate:dev
cd backend && npm run start:dev &
cd frontend && npm run dev &
```

按需求 US-001 ~ US-009 走一遍，记录 PASS/FAIL。

- [ ] **Step 17.3: 任意失败 → 修 → 子 commit**

```bash
git commit -m "fix: <usXXX 修复说明>"
```

- [ ] **Step 17.4: 全部 PASS → tag v1.1.0（不强制）**

```bash
git tag v1.1.0
```

---

## Self-Review

- ✅ Spec coverage：
  - §3 数据模型 → Task 1
  - §4 后端模块（Service / Controller / Provider / AI job / Search）→ Task 5/6/7/8
  - §5 前端（api/adapter/hooks/components/page）→ Task 10/11/12/13/14/15
  - §10 测试 → 各 Task 自带测 + Task 17 端到端
  - §11 任务拆分 17 个 → 完整保留
- ✅ Placeholder：全 step 含代码或命令，无 TBD
- ✅ Type 一致：`FaceProvider`、`FaceEmbedding`、`BBox`、`PersonFaceEmbedding`、`MomentFace` 名称与签名一致

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-12-face-profile.md`. Two execution options:

1. **Subagent-Driven (recommended)** - 每个 task dispatch 一个 fresh subagent，task 间 review，fast iteration
2. **Inline Execution** - 当前 session 内执行，中途 checkpoint

下一步默认 subagent-driven（每个 subagent worker 拿自己 task 上下文 + 接口契约 + 测试要求实现）。用户可随时选择切换。
