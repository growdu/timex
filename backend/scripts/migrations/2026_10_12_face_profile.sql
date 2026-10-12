-- 个人画像 (face profile) schema 迁移
-- 引入 pgvector 扩展，新增 4 张表：user_face_embeddings / moment_faces / scratch_dumps / scratch_dump_items
-- 强约束：所有表 user_id 强隔离；moment_id 引用现有 moments；dump_id 引用 scratch_dumps
-- 索引策略：ivfflat ANN 用于向量检索；B-tree 用于通用 user / dump 查询

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
