# 后端结构

## 技术栈

- **NestJS 11** + Express Adapter
- **TypeORM 0.3** + PostgreSQL 16
- **Redis 6**（已就位，当前仅用 session；限流/缓存为下一轮）
- **bcryptjs** 密码哈希（cost 12）
- **@nestjs/jwt** + Passport JWT
- **class-validator** + **class-transformer** DTO 校验
- **Vitest** 单元测试

## 目录树

```
backend/
├── src/
│   ├── main.ts                 # bootstrap + 全局 pipe / interceptor
│   ├── app.module.ts           # 根模块（imports all feature modules）
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts   # @CurrentUser() 从 req.user 取 userId
│   │   │   └── public.decorator.ts         # @Public() 跳过 JWT
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts           # 全局 guard，@Public() 例外
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts    # 统一错误响应格式
│   │   └── interceptors/
│   │       └── transform.interceptor.ts    # 包装响应为 { data, meta }
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts              # /api/auth/{register,login,refresh,me}
│   │   ├── auth.service.ts                 # 密码校验、JWT 签发
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts             # Passport JWT 解析
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   │
│   ├── users/
│   │   ├── user.entity.ts
│   │   └── users.service.ts
│   │
│   ├── licenses/
│   │   ├── license.entity.ts
│   │   ├── license.service.ts
│   │   ├── license.controller.ts           # /api/license/*
│   │   └── license.enums.ts
│   │
│   ├── events/
│   │   ├── event.entity.ts
│   │   ├── event-stage.enum.ts             # student | first-job | maker | family | custom
│   │   ├── events.service.ts
│   │   ├── events.controller.ts            # /api/events/*
│   │   ├── dto/
│   │   │   ├── create-event.dto.ts
│   │   │   └── update-event.dto.ts
│   │   └── events.service.spec.ts          # 单元测试
│   │
│   ├── places/
│   │   ├── place.entity.ts                 # 带 latitude / longitude
│   │   ├── place-type.enum.ts              # city | travel | family | daily
│   │   ├── places.service.ts
│   │   └── places.controller.ts
│   │
│   ├── people/
│   │   ├── person.entity.ts                # 带 avatarUrl
│   │   ├── people.service.ts
│   │   └── people.controller.ts
│   │
│   ├── moments/
│   │   ├── moment.entity.ts                # 带 latitude / longitude / takenAt
│   │   ├── moment-type.enum.ts             # photo | video | audio | text
│   │   ├── moments.service.ts
│   │   └── moments.controller.ts
│   │
│   └── memoirs/
│       ├── memoir.entity.ts
│       ├── memoir-chapter.entity.ts
│       ├── memoir-status.enum.ts           # draft | published | archived
│       ├── memoirs.service.ts
│       ├── memoirs.controller.ts           # /api/memoirs/* + /api/public/memoirs/s/:token
│       └── dto/
│
├── scripts/
│   └── init.sql                             # 数据库初始化 + 种子数据
│
├── __mocks__/                               # Jest 风格的 uuid mock 等
├── test/
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 实体关系

```
                    ┌──────────────┐
                    │   users      │
                    │  (id PK)     │
                    └──────┬───────┘
                           │ 1:N
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐       ┌──────────┐       ┌──────────┐
   │ events  │       │ places   │       │ people   │
   └────┬────┘       └────┬─────┘       └────┬─────┘
        │ N:1             │ 1:N (event.placeId)  │ 1:N
        │ event_people    │                     │
        │  N:N (event_id, person_id)            │
        │ ◄────────────────┘                    │
        │                                      │
        ▼                                      │
   ┌─────────────┐                              │
   │ moments     │  ── 1:N (moment.eventId) ──►│
   └─────────────┘                              │
                                                │
   ┌──────────────┐                             │
   │ memoirs      │  1:N ───► memoir_chapters   │
   └──────┬───────┘             │                │
          │                     │ N:N (chapter_events)
          │                     ▼                │
          │             ┌─────────────┐          │
          │             │ events      │ ◄────────┘
          │             └─────────────┘
          │
          │ 1:N
   ┌──────▼───────┐
   │ orders       │  增值服务订单
   └──────────────┘

   ┌──────────────┐
   │ licenses     │  ── 1:N ──► devices
   └──────────────┘
```

所有业务表都有 `user_id` 外键 + ON DELETE CASCADE。

## Auth 流程

1. **注册** `POST /api/auth/register`
   - bcrypt 哈希密码（cost 12）
   - 创建 user
   - 自动创建 trial license（14 天有效期，1 设备限制）
   - 签发 accessToken (15min) + refreshToken (7d)
   - 返回 `{ user, tokens }`

2. **登录** `POST /api/auth/login`
   - 校验 email / password
   - 同样签发 tokens
   - 返回 `{ user, tokens }`

3. **后续请求** 自动在 `Authorization: Bearer <accessToken>` 头
   - `JwtAuthGuard`（全局）解析 token
   - `JwtStrategy.validate(payload)` 加载 user，挂到 `req.user`
   - Controller 用 `@CurrentUser()` decorator 取 `userId`

4. **刷新** `POST /api/auth/refresh`
   - 接收 refreshToken，返回新 accessToken + 新 refreshToken（rotate）

5. **获取当前用户** `GET /api/auth/me`
   - 返回完整 user profile（不含 password_hash）

## 多租户数据隔离（关键！）

所有业务 Service 都遵循同一个模式：

```ts
async findAll(userId: string, options: ListOptions) {
  return this.repo.find({
    where: { userId, ...(options.stage && { stage: options.stage }) },
    relations: ['place', 'people'],
    order: { date: 'DESC' },
  });
}
```

**绝对不**接受前端传入的 userId；userId 一律从 `@CurrentUser()` 派生。

## 错误响应格式

全局 `HttpExceptionFilter` 统一为：

```json
{ "statusCode": 400, "message": "validation failed", "error": "Bad Request" }
```

## 成功响应格式

全局 `TransformInterceptor` 包装为：

```json
{ "data": <payload> }
```

（部分 list 端点会加 `meta: { total, page, limit }`）

## 数据库初始化

`scripts/init.sql` 是单一 SQL 文件：

1. 启用 `uuid-ossp` 扩展
2. 声明所有 ENUM
3. 建表（含索引）
4. 插入 demo / maker / family 三个种子用户

部署流程：
- 开发：手动 `docker exec pgv-e2e-postgres psql -U postgres -d timex < scripts/init.sql`
- 生产：建议在 Dockerfile 启动时自动执行，或用 migration 工具

## 测试

- 每个 Service 都有 `*.spec.ts` 单元测试
- 用 `__mocks__/uuid.js` 注入固定 UUID 避免硬编码
- 跑 `npm test`（vitest watch）/ `npm run test` 单次
