# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine

# 安全：非 root 用户运行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
# SQL 迁移文件（供 RUN_MIGRATIONS_ON_BOOT / `node dist/migrate.js` 读取）
COPY --from=builder /app/scripts/migrations ./scripts/migrations

# 健康检查（间隔 30s，超时 3s，启动等待 10s）
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
