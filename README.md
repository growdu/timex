# 时光机器 - 个人成长记录系统

一款面向个人成长记录与人生回忆沉淀的多模态时间档案产品。
**6 条线** 维度导航：时间 · 空间 · 感情 · 事业 · 亲情 · 朋友。

[![CI](https://github.com/OWNER/timex/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/timex/actions/workflows/ci.yml)
[![Docs](https://github.com/OWNER/timex/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/OWNER/timex/actions/workflows/deploy-docs.yml)
[![Pages](https://github.com/OWNER/timex/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/OWNER/timex/actions/workflows/deploy-pages.yml)

## 文档

- 📖 [docs/README.md](./docs/README.md) — 文档总入口
- 🏗 [docs/architecture.md](./docs/architecture.md) — 整体架构
- 🎨 [docs/frontend.md](./docs/frontend.md) — 前端结构
- ⚙️ [docs/backend.md](./docs/backend.md) — 后端结构
- 🔌 [docs/api.md](./docs/api.md) — API 参考
- 🚀 [docs/setup.md](./docs/setup.md) — 本地开发
- ☁️ [docs/deployment.md](./docs/deployment.md) — 部署指南
- 🗺 [docs/roadmap.md](./docs/roadmap.md) — 路线图
- 📝 [docs/changelog.md](./docs/changelog.md) — 变更日志
- 🩺 [docs/health-check.md](./docs/health-check.md) — 代码健康检查

## 🚀 快速开始

### 1. 启动数据库服务

```bash
docker compose up -d
```

这将启动 PostgreSQL 和 Redis 服务。

### 2. 初始化数据库 schema 与种子数据

```bash
docker exec -i pgv-e2e-postgres psql -U postgres -d timex < backend/scripts/init.sql
```

### 3. 启动后端

```bash
cd backend
npm install
npm run start:dev
```

后端服务将运行在 `http://localhost:3000`，API 前缀 `/api`。

### 4. 启动前端（开发模式）

```bash
cd frontend
npm install
npm run dev
```

前端服务将运行在 `http://localhost:5173`。打开后会自动跳到 `/login`。

### 5. 用种子账号登录

| 邮箱 | 密码 | 场景 |
|---|---|---|
| `demo@timex.com` | `demo123` | 时光记录者（创业 / 旅行 / 家庭） |
| `maker@timex.test` | `timex2026` | 周屿（城市迁移型创作者） |
| `family@timex.test` | `timex2026` | 沈棠（家庭档案整理者） |

也可以走 `/register` 自由注册，注册即获 14 天试用。

## 📁 项目结构

```
timex/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── auth/            # 认证模块（JWT + bcrypt）
│   │   ├── license/         # License / 设备管理
│   │   ├── events/          # 事件模块
│   │   ├── moments/         # 瞬间 / 素材
│   │   ├── people/          # 人物
│   │   ├── places/          # 地点
│   │   └── memoirs/         # 回忆录 + 章节
│   └── scripts/init.sql     # 数据库初始化
│
├── frontend/                # React + Vite 前端
│   ├── src/
│   │   ├── api/             # API 客户端
│   │   ├── components/      # 通用组件（SpaceMap / RelationshipGraph / RichTimeline / LineCard）
│   │   ├── data/            # API 适配层
│   │   │   ├── apiAdapter.js   # 派生 / 统计 / 6 条线聚合
│   │   │   ├── lines.js        # 6 条线元数据
│   │   │   └── lineMatchers.js # 关系线角色关键词正则
│   │   ├── pages/           # 页面（含 LinesPage 6 条线 hub）
│   │   └── store/           # Zustand 状态
│   └── vite.config.js
│
├── docs/                    # 开发者文档
│   ├── README.md
│   ├── architecture.md
│   ├── frontend.md
│   ├── backend.md
│   ├── api.md
│   ├── setup.md
│   ├── deployment.md
│   ├── roadmap.md
│   └── changelog.md
│
├── .github/workflows/       # CI / CD
│   ├── ci.yml               #   PR / push：lint + test + build + health-check
│   ├── deploy-pages.yml     #   main：构建并发布前端到 GitHub Pages
│   └── deploy-docs.yml      #   docs/ 改动：构建并发布文档站点

└── scripts/health-check.sh  # 聚合体检脚本（lint + typecheck + test + build）
│
└── docker-compose.yml       # 本地 PostgreSQL + Redis
```

## 💡 商业模式

| 类型 | 说明 |
|------|------|
| **License 买断** | Lifetime 一次性买断（¥399-599），Annual 年费（¥99/年） |
| **增值服务** | 打印相册、定制印刷、高级模板、AI 增强包 |
| **试用机制** | 14 天全功能 Trial |

## 🔑 核心 API

- `POST /api/auth/register` — 注册（自动 14 天试用）
- `POST /api/auth/login` — 登录，返回 access + refresh token
- `GET /api/auth/me` — 当前用户信息
- `POST /api/license/activate` — 激活 License
- `GET /api/license` — License + 设备列表
- `GET /api/events` / `/api/events/timeline` — 事件列表 / 时间线
- `GET /api/people` / `GET /api/places` / `GET /api/moments` / `GET /api/memoirs`

完整接口见 [docs/api.md](./docs/api.md)。

## 🛠 技术栈

**后端**：NestJS 11 + TypeORM + PostgreSQL 16 + Redis
**前端**：React 18 + Vite 6 + React Router 6 + TanStack Query v5 + Zustand
**可视化**：Leaflet / react-leaflet（地图）、d3-force（关系图）
**存储**：阿里云 OSS（生产环境）

## 🌐 环境变量

### 前端（`frontend/.env`）

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | 后端 API 地址 |
| `VITE_BASE_URL` | `/` | 子路径前缀（GitHub Pages 项目页用 `/timex/`） |

### 后端（`backend/.env`）

参考 [docs/setup.md](./docs/setup.md#后端-backendenv) 与 `backend/.env.example`。生产环境务必更换 `JWT_SECRET`。

## 🚢 部署

### 前端：GitHub Pages

- 推 `main` → 自动构建并发布到 `https://<owner>.github.io/timex/`
- 需在 **Settings → Secrets and variables → Actions → Variables** 添加 `API_URL`，否则页面无法访问后端
- SPA 路由直接打开可用（构建时复制 `index.html` 为 `404.html`）
- 详细配置见 [docs/deployment.md](./docs/deployment.md)

### 后端：Docker

```bash
cd backend
docker build -t timex-backend:dev .
docker run -p 3000:3000 --env-file .env timex-backend:dev
```

生产推荐：Railway / Render / Fly.io / 阿里云 ACK，搭配托管 PostgreSQL + Redis + OSS。
