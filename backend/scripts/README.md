# 数据库初始化

## 方式一：使用 Docker Compose（推荐）

```bash
cd /work/ai/timex
docker-compose up -d postgres
```

然后等待数据库就绪后执行：

```bash
docker exec -i timex-postgres psql -U timex -d timex < scripts/init.sql
```

## 方式二：直接连接本地 PostgreSQL

```bash
psql -U postgres -d timex -f scripts/init.sql
```

## 测试账号

- 邮箱: `demo@timex.com`
- 密码: `password123`
