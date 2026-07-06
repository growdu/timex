# 部署

> 本项目使用 **GitHub Pages** 部署前端（静态 SPA），后端通常部署为 Docker 容器。

## 前端：GitHub Pages

### 触发
- Push 到 `main` 分支 → 自动触发 `.github/workflows/deploy-pages.yml`
- 手动触发：Actions → Deploy to GitHub Pages → Run workflow

### 必需配置

**Repository Variables** (Settings → Secrets and variables → Actions → Variables)：

| 变量 | 用途 | 示例 |
|---|---|---|
| `API_URL` | 后端 API 地址，注入到 `VITE_API_URL` | `https://api.timex.example.com` |

> 没设 `API_URL` 时默认 `http://localhost:3000`，部署后的页面会无法访问 API。

### 部署流程

1. CI 在 PR 上跑 lint + test + build
2. main push → 触发 Pages workflow
3. 注入 `VITE_BASE_URL=/timex/` 和 `VITE_API_URL`
4. `vite build` 生成 `frontend/dist/`
5. 复制 `index.html` → `404.html`（SPA fallback，让 React Router 路由能直接打开）
6. 上传 artifact → 部署到 GitHub Pages

### 访问

- 站点根：`https://<owner>.github.io/timex/`
- SPA 路由示例：`https://<owner>.github.io/timex/memoir`（依赖 404 fallback）

### 自定义域名（可选）

1. 把 CNAME 解析到 `<owner>.github.io`
2. 在 Settings → Pages → Custom domain 填入
3. `vite.config.js` 里 `base` 改回 `/`
4. 触发部署

## 后端：Docker

### 本地构建

```bash
cd backend
docker build -t timex-backend:dev .
docker run -p 3000:3000 --env-file .env timex-backend:dev
```

### 多阶段构建

`backend/Dockerfile` 使用 builder + runtime 两个阶段：

- `builder`：`npm ci` + `npm run build`，产出 `dist/`
- `runtime`：仅复制 `dist/` + 生产依赖，镜像小

### 生产环境（推荐）

- **平台**：Railway / Render / Fly.io / 阿里云 ACK
- **数据库**：托管 PostgreSQL（AWS RDS / 阿里云 RDS / Supabase）
- **缓存**：托管 Redis（Upstash / Redis Labs）
- **对象存储**：Aliyun OSS / AWS S3 / Cloudflare R2

环境变量：见 [setup.md](./setup.md#后端-backendenv)。生产环境务必更换 `JWT_SECRET`。

## CI/CD 流程图

```
                ┌──────────────────────┐
                │  Push / PR           │
                │  (任何分支)          │
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │  ci.yml              │
                │  ├─ backend lint+test│
                │  └─ frontend         │
                │     lint+test+build  │
                └──────────┬───────────┘
                           │ main push
                           ▼
                ┌──────────────────────┐
                │  deploy-pages.yml    │
                │  ├─ build (with env) │
                │  ├─ SPA fallback     │
                │  └─ deploy to Pages  │
                └──────────────────────┘

                ┌──────────────────────┐
                │  Push to docs/**     │
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │  deploy-docs.yml     │
                │  ├─ vitepress build  │
                │  └─ deploy           │
                └──────────────────────┘
```

## 必装的 GitHub 配置清单

- [ ] Settings → Actions → General → Workflow permissions: **Read and write permissions**（部分 workflow 需要）
- [ ] Settings → Pages → Source: **GitHub Actions**（不是 Deploy from a branch）
- [ ] Settings → Secrets and variables → Actions → Variables: 添加 `API_URL`
- [ ] （可选）Settings → Environments → github-pages：保护部署环境

## 监控

当前阶段未集成监控。下一轮计划：

- 接入 Sentry（前后端都报）
- 后端 Prometheus metrics
- GitHub Pages uptime 监控（uptime-robot 等）

## 故障排查

### Pages 部署后空白
- 打开 DevTools Network，看是否有 404 资源
- 如果所有 JS/CSS 都 404：检查 `VITE_BASE_URL` 是否正确
- 如果 `index.html` 加载但页面不渲染：检查 `VITE_API_URL`，浏览器 console 会有 CORS 或网络错误

### CI 跑失败
- 点进 Actions 看具体 job 的日志
- 常见：lint 报错（`npm run lint`）—— 本地先跑
- 常见：测试不通过 —— 本地 `npm test` 复现

### 后端 Docker 启动失败
- 看 `docker logs <container>`
- 常见：数据库连接不上 —— 检查 `DATABASE_HOST` 是否在容器内可达
- 常见：端口被占用 —— `lsof -i :3000`

---

## 生产环境检查清单

部署前逐项确认：

### 环境变量（必须）
- [ ] `NODE_ENV=production` — 触发配置校验 + 关闭 SQL 日志
- [ ] `JWT_SECRET` — **≥32 字符**，非默认值（启动时自动校验，不满足直接退出）
- [ ] `DATABASE_PASSWORD` — 非 `postgres` 默认值
- [ ] `S3_SECRET_KEY` — 非 `minioadmin` 默认值
- [ ] `CORS_ORIGINS` — 生产域名列表，逗号分隔（如 `https://growdu.github.io,https://timex.example.com`）
- [ ] `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_NAME`
- [ ] `REDIS_HOST` / `REDIS_PORT`（可选 `REDIS_PASSWORD`）
- [ ] `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_BUCKET` / `S3_PUBLIC_URL`

### 安全
- [ ] JWT secret 签发/验证一致（统一使用 `JWT_SECRET` 环境变量）
- [ ] 密码策略：≥8 字符 + 字母 + 数字（DTO 层强制）
- [ ] 所有 API 响应经过 `AllExceptionsFilter`（统一错误格式，不泄露内部细节）
- [ ] 安全响应头：X-Content-Type-Options / X-Frame-Options / Referrer-Policy
- [ ] 认证端点限流：register 5/min/IP、login 10/min/IP、refresh 20/min/IP
- [ ] 全局限流：100/min/IP（short）+ 300/5min/IP（medium）
- [ ] Docker 容器以非 root 用户运行
- [ ] `synchronize: false`（TypeORM 不自动改表结构）

### 可靠性
- [ ] 优雅关闭：`enableShutdownHooks()`（SIGTERM 时正确关闭 DB 连接）
- [ ] Docker `HEALTHCHECK` 配置
- [ ] 数据库定期备份策略
- [ ] Redis 持久化配置（如需限流跨重启保留）

### 监控
- [ ] HTTP 请求日志（method + path + status + 耗时）
- [ ] `/health` 端点监控（API + S3 可达性）
- [ ] 未捕获异常日志（AllExceptionsFilter 自动记录 5xx）

### Docker 部署命令

```bash
# 后端
cd backend
docker build -t timex-backend:prod .
docker run -d \
  --name timex-backend \
  -p 3000:3000 \
  --env-file .env.production \
  timex-backend:prod

# 前端
cd frontend
docker build -t timex-frontend:prod .
docker run -d \
  --name timex-frontend \
  -p 80:80 \
  timex-frontend:prod
```
