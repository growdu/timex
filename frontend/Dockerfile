# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 前端 API 基址（构建时注入 import.meta.env.VITE_API_URL）：
# - 单机 / compose 全栈：相对 /api（经 nginx 反代到 backend）
# - 独立 API 域名：https://api.example.com/api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Runtime ----
FROM nginx:alpine

# nginx 配置：SPA fallback + gzip + 静态缓存 + /api 反代（与 frontend/nginx.conf 同源）
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
# SPA 404 fallback
RUN cp /usr/share/nginx/html/index.html /usr/share/nginx/html/404.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
