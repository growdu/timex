-- 时光机器数据库初始化脚本
-- PostgreSQL 16+

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 枚举类型
CREATE TYPE plan_type AS ENUM ('lifetime', 'annual', 'trial');
CREATE TYPE license_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE event_stage AS ENUM ('student', 'first-job', 'maker', 'family', 'custom');
CREATE TYPE moment_type AS ENUM ('photo', 'video', 'audio', 'text');
CREATE TYPE place_type AS ENUM ('city', 'travel', 'family', 'daily');
CREATE TYPE memoir_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE product_type AS ENUM ('license', 'photo_album', 'custom_print', 'template', 'data_export', 'ai_package');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'refunded', 'cancelled');

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  avatar_url TEXT,
  is_trial_active BOOLEAN DEFAULT TRUE,
  trial_expires_at TIMESTAMP,
  is_email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- License授权表
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_key VARCHAR(255) UNIQUE NOT NULL,
  plan_type plan_type NOT NULL,
  status license_status DEFAULT 'active',
  device_limit INTEGER DEFAULT 3,
  purchased_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设备表
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  device_name VARCHAR(100) NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 事件表
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  location VARCHAR(255),
  place_id UUID,
  stage event_stage,
  summary TEXT,
  long_text TEXT,
  cover_url TEXT,
  weight INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 人物表
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100),
  intro TEXT,
  avatar_url TEXT,
  first_seen_at DATE,
  latest_seen_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 地点表
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type place_type,
  summary TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  first_seen_at DATE,
  latest_seen_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 瞬间/素材表
CREATE TABLE moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type moment_type NOT NULL,
  title VARCHAR(255),
  content TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  longitude DECIMAL(10, 7),
  latitude DECIMAL(10, 7),
  taken_at TIMESTAMP,
  ai_tags JSONB,
  ai_summary TEXT,
  transcript TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回忆录表
CREATE TABLE memoirs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  blurb TEXT,
  status memoir_status DEFAULT 'draft',
  cover_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回忆录章节表
CREATE TABLE memoir_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memoir_id UUID NOT NULL REFERENCES memoirs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  cover_url TEXT,
  status memoir_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_no VARCHAR(100) UNIQUE NOT NULL,
  product_type product_type NOT NULL,
  product_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CNY',
  status order_status DEFAULT 'pending',
  paid_at TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 事件-人物关联表
CREATE TABLE event_people (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, person_id)
);

-- 章节-事件关联表
CREATE TABLE chapter_events (
  chapter_id UUID REFERENCES memoir_chapters(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  PRIMARY KEY (chapter_id, event_id)
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_license_id ON devices(license_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_events_place_id ON events(place_id);
CREATE INDEX idx_moments_user_id ON moments(user_id);
CREATE INDEX idx_moments_event_id ON moments(event_id);
CREATE INDEX idx_moments_type ON moments(type);
CREATE INDEX idx_people_user_id ON people(user_id);
CREATE INDEX idx_places_user_id ON places(user_id);
CREATE INDEX idx_memoirs_user_id ON memoirs(user_id);
CREATE INDEX idx_memoirs_share_token ON memoirs(share_token);
CREATE INDEX idx_memoir_chapters_memoir_id ON memoir_chapters(memoir_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_no ON orders(order_no);

-- 插入测试数据
INSERT INTO users (id, email, password_hash, nickname, is_trial_active, trial_expires_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'demo@timex.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA8xOqSfI7K', -- password: password123
  '时光记录者',
  TRUE,
  CURRENT_TIMESTAMP + INTERVAL '14 days'
);

-- 插入测试License
INSERT INTO licenses (user_id, license_key, plan_type, status, device_limit, expires_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'TRIAL-DEMO12345678',
  'trial',
  'active',
  1,
  CURRENT_TIMESTAMP + INTERVAL '14 days'
);

-- 插入测试设备
INSERT INTO devices (user_id, license_id, device_name, device_fingerprint)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  (SELECT id FROM licenses WHERE license_key = 'TRIAL-DEMO12345678'),
  'Chrome Browser (Demo)',
  'demo-fingerprint-001'
);

-- 插入测试地点
INSERT INTO places (id, user_id, name, type, summary, latitude, longitude, first_seen_at, latest_seen_at)
VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '北京中关村', 'city', '中国硅谷', 39.98, 116.31, '2024-01-01', '2024-12-31'),
  ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '拉萨布达拉宫', 'travel', '世界屋脊的明珠', 29.65, 91.12, '2024-03-01', '2024-03-31'),
  ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '北京协和医院', 'daily', '著名三甲医院', 39.91, 116.42, '2024-01-01', '2024-12-31');

-- 插入测试人物
INSERT INTO people (id, user_id, name, role, intro, first_seen_at, latest_seen_at)
VALUES
  ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '张三', '联合创始人', '技术大牛，负责产品研发', '2024-01-01', '2024-12-31'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '女儿小雨', '家人', '2024年6月出生', '2024-06-01', '2024-12-31'),
  ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '李四', '大学同学', '10年老友', '2024-01-01', '2024-12-31'),
  ('c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '王芳', '恋人', '认识两年，相互扶持', '2024-02-01', '2024-12-31'),
  ('c5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '赵明', '同事', '前公司的设计同事', '2024-01-01', '2024-12-31');

-- 插入测试事件
INSERT INTO events (id, user_id, title, date, location, place_id, stage, summary, long_text, weight)
VALUES
  ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '第一次创业会议', '2024-01-15', '北京中关村', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'maker', '和团队讨论了产品方向和商业模式', '今天和几位联合创始人进行了第一次正式的产品讨论，确定了以个人成长记录为核心的产品方向。', 10),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '西藏自驾之旅', '2024-03-20', '西藏拉萨', 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'maker', '从成都出发，一路向西，直达拉萨', '自驾游从成都出发，沿着318国道一路向西，穿越二郎山、折多山、高尔寺山、剪子弯山、卡子拉山，终于抵达拉萨。', 8),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '女儿出生', '2024-06-01', '北京协和医院', 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'family', '小公主来到这个世界，7斤2两，母女平安', '女儿小雨在协和医院出生，体重7斤2两，哭声嘹亮。', 100),
  ('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '情人节晚餐', '2024-02-14', '北京中关村', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'custom', '和王芳在中关村的一家小餐厅吃了情人节晚餐', '第一次过真正意义上的情人节，王芳点了牛排，我点了意面，聊了很多关于未来。', 15),
  ('d5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '团队季度复盘', '2024-05-20', '北京中关村', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'first-job', '和赵明一起做 Q1 的产品复盘', '和赵明一起把 Q1 的关键指标过了一遍，调整了设计协作流程。', 8);

-- 插入事件-人物关联
INSERT INTO event_people (event_id, person_id)
VALUES
  ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('d5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- 插入测试瞬间
INSERT INTO moments (id, user_id, event_id, type, title, content, taken_at)
VALUES
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'photo', '会议室白板', '产品方向讨论中', '2024-01-15 10:00:00'),
  ('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'video', '青藏高原风景', '自驾途中的风景', '2024-03-20 15:30:00'),
  ('e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'photo', '小雨出生的第一张照片', '珍贵时刻', '2024-06-01 09:30:00');

-- 插入测试回忆录
INSERT INTO memoirs (id, user_id, title, blurb, status, is_public)
VALUES
  ('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '我的2024', '2024年是一个特殊的年份，创业启动、小雨出生...', 'draft', FALSE);

-- 插入回忆录章节
INSERT INTO memoir_chapters (id, memoir_id, title, content, sort_order, status)
VALUES
  ('5a1eebc9-9c0b-4ef8-bb6d-6bb9bd380a11', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '创业的起点', '2024年1月，我们决定踏上创业这条路。在中关村的那间咖啡馆里，几个联合创始人围坐在一起，讨论着产品方向和商业模式。每个人眼中都有光。', 0, 'published'),
  ('5a2eebc9-9c0b-4ef8-bb6d-6bb9bd380a11', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '西藏之旅', '3月份的自驾游，从成都一路向西，穿过二郎山、折多山、高尔寺山、剪子弯山、卡子拉山，最终抵达拉萨。318国道的每一道弯都让人终生难忘。', 1, 'draft'),
  ('5a3eebc9-9c0b-4ef8-bb6d-6bb9bd380a11', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '小雨的诞生', '6月1日，女儿小雨在协和医院出生。7斤2两，哭声嘹亮。母女平安。那一刻我意识到，创业是为了给她一个更好的世界。', 2, 'draft');

-- 插入章节-事件关联
INSERT INTO chapter_events (chapter_id, event_id)
VALUES
  ('5a1eebc9-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('5a2eebc9-9c0b-4ef8-bb6d-6bb9bd380a11', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('5a3eebc9-9c0b-4ef8-bb6d-6bb9bd380a11', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- 授予权限（如果需要）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO timex;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO timex;

COMMENT ON TABLE users IS '用户账号表';
COMMENT ON TABLE licenses IS 'License授权表';
COMMENT ON TABLE devices IS '设备管理表';
COMMENT ON TABLE events IS '事件表';
COMMENT ON TABLE people IS '人物表';
COMMENT ON TABLE places IS '地点表';
COMMENT ON TABLE moments IS '瞬间/素材表';
COMMENT ON TABLE memoirs IS '回忆录表';
COMMENT ON TABLE memoir_chapters IS '回忆录章节表';
COMMENT ON TABLE orders IS '增值服务订单表';
