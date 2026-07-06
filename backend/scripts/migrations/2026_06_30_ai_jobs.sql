-- AI 模块表结构 — 2026-06-30
-- 与 backend/src/ai/entities/ai-job.entity.ts 一致
-- 缺失此表会导致 /api/ai/* 全部 500

CREATE TABLE IF NOT EXISTS ai_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     varchar NOT NULL,
  kind        varchar NOT NULL,
  target_type varchar NOT NULL,
  target_id   varchar NOT NULL,
  status      varchar NOT NULL DEFAULT 'queued',
  provider    varchar NULL,
  model       varchar NULL,
  output      text NULL,
  structured  jsonb NULL,
  error       text NULL,
  latency_ms  int NULL,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_status ON ai_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_target ON ai_jobs (user_id, target_type, target_id);
