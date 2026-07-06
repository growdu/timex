# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime ----
FROM nginx:alpine

# nginx SPA 配置：路由 fallback + gzip + 静态资源缓存
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # gzip 压缩
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # SPA 路由 fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源长缓存（带 hash 的文件名）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html 不缓存（确保用户拿到最新版本）
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
NGINX

COPY --from=builder /app/dist /usr/share/nginx/html
# SPA 404 fallback
RUN cp /usr/share/nginx/html/index.html /usr/share/nginx/html/404.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
