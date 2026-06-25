#!/bin/bash
set -e

echo "=== 时光机器 快速启动 ==="

# 确保 docker-compose 服务已启动
echo "1. 启动 Docker 服务..."
docker-compose up -d postgres redis

# 等待数据库就绪
echo "2. 等待数据库启动..."
for i in {1..30}; do
  if docker exec timex-postgres pg_isready -U timex > /dev/null 2>&1; then
    echo "   数据库已就绪"
    break
  fi
  echo "   等待数据库... ($i/30)"
  sleep 1
done

# 初始化数据库
echo "3. 初始化数据库..."
if docker exec timex-postgres test -f /docker-entrypoint-initdb.d/init.sql 2>/dev/null; then
  echo "   数据库已初始化，跳过..."
else
  docker exec -i timex-postgres psql -U timex -d timex < backend/scripts/init.sql 2>&1 || {
    echo "   数据库初始化完成或已存在"
  }
fi

# 启动后端
echo "4. 启动后端服务..."
cd backend && npm run start:dev &
BACKEND_PID=$!

# 等待后端启动
echo "   等待后端启动..."
for i in {1..30}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "   后端已就绪"
    break
  fi
  echo "   等待后端... ($i/30)"
  sleep 1
done

# 启动前端
echo "5. 启动前端服务..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== 服务已启动 ==="
echo "前端: http://localhost:5173"
echo "后端: http://localhost:3000"
echo ""
echo "测试账号: demo@timex.com / password123"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose down; exit" INT TERM
wait
