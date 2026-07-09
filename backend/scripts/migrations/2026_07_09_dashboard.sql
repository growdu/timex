-- 仪表盘配置表 - 用户自定义大屏模块布局
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config      jsonb NOT NULL DEFAULT '{"widgets":[]}'::jsonb,
  updated_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user ON dashboard_configs (user_id);
