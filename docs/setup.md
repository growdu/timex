# 快速开始

> 5 分钟把整套系统跑起来。

## 1. 启动数据库

项目根目录有 `docker-compose.yml`（开发用），它会启动 PostgreSQL 和 Redis：

```bash
docker compose up -d
```

启动后：

- PostgreSQL 暴露在 `localhost:5432`（用户 `postgres` / 密码 `postgres` / 数据库 `timex`）
- Redis 暴露在 `localhost:6379`

> 如果端口冲突，修改 `docker-compose.yml` 里的 `ports` 段，同时同步修改 `backend/.env`。

## 2. 初始化数据库

```bash
docker exec -i pgv-e2e-postgres psql -U postgres -d timex < backend/scripts/init.sql
```

这一步会：

- 启用 `uuid-ossp` 扩展
- 建表（users / events / places / people / moments / memoirs / chapters / licenses / devices / orders）
- 插入 3 个种子用户（demo / maker / family）以及他们的示例数据

## 3. 启动后端

```bash
cd backend
npm install
npm run start:dev
```

后端默认监听 `http://localhost:3000`，API 前缀 `/api`。

健康检查：
```bash
curl http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" \
  -d '{"email":"demo@timex.com","password":"demo123"}'
```

## 4. 启动前端

新开一个终端：

```bash
cd frontend
npm install
npm run dev
```

前端默认在 `http://localhost:5173`。

打开浏览器访问，会自动跳到 `/login`，可以用任一种子账号登录：

| 邮箱 | 密码 | 角色 |
|---|---|---|
| `demo@timex.com` | `demo123` | 时光记录者（创业 / 旅行 / 家庭）|
| `maker@timex.test` | `timex2026` | 周屿（城市迁移型创作者）|
| `family@timex.test` | `timex2026` | 沈棠（家庭档案整理者）|

## 5. （可选）运行测试

后端：
```bash
cd backend
npm test
```

前端：
```bash
cd frontend
npm run test:run
```

## 环境变量

### 后端 `backend/.env`

| 变量 | 默认 | 说明 |
|---|---|---|
| `DATABASE_HOST` | `localhost` | PostgreSQL 主机 |
| `DATABASE_PORT` | `5432` |  |
| `DATABASE_USER` | `postgres` |  |
| `DATABASE_PASSWORD` | `postgres` |  |
| `DATABASE_NAME` | `timex` |  |
| `REDIS_HOST` | `localhost` | Redis 主机 |
| `REDIS_PORT` | `6379` |  |
| `JWT_SECRET` | `timex-dev-secret-key-...` | 生产环境务必更换 |
| `JWT_EXPIRES_IN` | `15m` | access token 有效期 |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | refresh token 有效期 |
| `LICENSE_TOKEN_EXPIRES_IN` | `24h` |  |
| `OSS_*` | placeholder | Aliyun OSS（开发期不用） |
| `AI_API_KEY` | placeholder |  |
| `TRIAL_DAYS` | `14` | 试用时长 |

### 前端

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | 后端 API 地址 |
| `VITE_BASE_URL` | `/` | 子路径前缀（GitHub Pages 用 `/timex/`） |

## 常见问题

### Q: 登录报 `401 Unauthorized`
- 检查 `backend/.env` 里的 `JWT_SECRET` 是否一致
- 浏览器 DevTools 看 localStorage 里的 `timex_access_token` 是否存在
- 15 分钟过期，重新登录即可

### Q: 登录后页面空白 / 控制台报 CORS
- 后端没启动，或 `VITE_API_URL` 配错
- 检查后端是否监听 `0.0.0.0:3000`（不是 `127.0.0.1`）

### Q: `init.sql` 执行报 `role "postgres" does not exist`
- 当前激活的容器不是 `pgv-e2e-postgres`
- 用 `docker ps` 看哪个容器在跑 `0.0.0.0:5432->5432/tcp`

### Q: 前端 `npm run dev` 报 `Cannot find module 'react-leaflet'`
- 漏装依赖：`cd frontend && npm install`

### Q: GitHub Pages 部署后页面 404
- `vite.config.js` 的 `base` 没设对
- 确认 `.github/workflows/deploy-pages.yml` 注入了 `VITE_BASE_URL`

## 完整启动命令汇总

```bash
# 一次性
docker compose up -d
docker exec -i pgv-e2e-postgres psql -U postgres -d timex < backend/scripts/init.sql

# 两个终端
cd backend && npm install && npm run start:dev   # 终端 1
cd frontend && npm install && npm run dev        # 终端 2
```
