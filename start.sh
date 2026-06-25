#!/bin/bash
set -e

echo "=== 时光机器 快速启动 ==="

# 启动数据库
echo "1. 启动 Docker 服务..."
docker-compose up -d postgres redis

# 等待数据库就绪
echo "2. 等待数据库启动..."
sleep 5

# 初始化数据库
echo "3. 初始化数据库..."
docker exec -i timex-postgres psql -U timex -d timex < backend/scripts/init.sql 2>/dev/null || echo "数据库已初始化"

# 启动后端
echo "4. 启动后端服务..."
cd backend && npm run start:dev &
BACKEND_PID=$!

# 等待后端启动
sleep 5

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
