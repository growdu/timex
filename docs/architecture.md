# 系统架构

## 总览

时光机器采用**前后端分离 + 多租户数据隔离**的架构：

- **前端** —— React 19 + Vite 6 的 SPA，部署在 GitHub Pages
- **后端** —— NestJS 11 + TypeORM，部署为 Docker 容器，提供 REST API
- **数据库** —— PostgreSQL 16 + Redis 6
- **存储** —— Aliyun OSS（图片/视频/音频等素材），开发期可降级为本地路径

```
┌─────────────────┐    HTTPS    ┌──────────────────┐
│  浏览器 / SPA   │ ──────────► │  NestJS REST API │
│  (GitHub Pages) │ ◄────────── │  (Docker)        │
└─────────────────┘   JSON+JWT  └────────┬─────────┘
                                          │
                            ┌─────────────┴─────────────┐
                            ▼                           ▼
                    ┌──────────────┐            ┌──────────────┐
                    │ PostgreSQL  │            │    Redis     │
                    │  (主数据)    │            │ (缓存/限流)  │
                    └──────────────┘            └──────────────┘
```

## 模块划分

### 后端（`backend/src/`）

| 目录 | 职责 |
|---|---|
| `auth/` | 注册、登录、JWT 签发 / 校验、当前用户查询 |
| `users/` | 用户实体（鉴权流程中使用，API 大部分场景只通过 userId 引用） |
| `licenses/` | License 授权、试用、设备管理 |
| `events/` | 事件主表 + 时间线查询 |
| `places/` | 地点（带经纬度） |
| `people/` | 人物档案（带头像） |
| `moments/` | 素材（照片/视频/音频/文字，可独立于 event 存在） |
| `memoirs/` | 回忆录 + 章节 + 分享 Token |
| `common/` | 跨模块工具（Guard、Decorator、Filter、Interceptor） |

### 前端（`frontend/src/`）

| 目录 | 职责 |
|---|---|
| `api/` | REST 客户端（`api/client.js` axios 实例 + 各资源模块） |
| `components/` | 共享 UI 组件（布局、卡片、地图、关系图等） |
| `pages/` | 路由级页面（与 `App.jsx` 中的 `<Route>` 一一对应） |
| `store/` | Zustand 全局状态（UI 筛选、当前选中事件/人物/地点） |
| `data/` | `apiAdapter.js` 把后端原始数据 + 本地 mock 组合成前端派生结构 |
| `mock/` | 开发期 fallback 数据 |
| `styles.css` | 全局样式 + 设计 token |

## 数据流：一次典型请求

1. 用户在 React 组件触发操作（例如点击"新建事件"）
2. 组件调用 `useMutation` / `useQuery`（TanStack Query）
3. TanStack Query 调用 `eventsApi.create(data)`（在 `api/events.js`）
4. axios 拦截器自动添加 `Authorization: Bearer <accessToken>` 头
5. 请求到达 NestJS Controller → Service → TypeORM Repository
6. Service 中 `userId` 强制从 JWT 派生（`@CurrentUser()` decorator），保证多租户隔离
7. 响应经 Interceptor 统一格式化后返回前端
8. TanStack Query 失效相关查询 → 组件重渲染

## 多租户隔离

所有业务表（events、places、people、moments、memoirs、licenses、devices）都有 `user_id` 外键到 `users.id`。Service 层全部走 `find({ where: { userId } })` 模式，绝不暴露 userId 给前端。详见 [backend.md](./backend.md)。

## 6 条线派生逻辑

记忆系统的核心分类维度是 **6 条相互独立的线**：

| 线 | 派生规则 |
|---|---|
| 时间线 `time` | 全部事件（按 date 排序） |
| 空间线 `space` | 有 `placeId` 的事件（按 place 分组） |
| 感情线 `emotion` | 关联 person 的 `role` 命中 `丈夫|妻子|恋人|伴侣|对象|情侣|爱人|前任|spouse|partner|lover|husband|wife` |
| 事业线 `career` | 关联 person 的 `role` 命中 `同事|合伙|投资|导师|老板|CTO|CEO|经理|cofounder|investor|mentor|...`；**或** `event.stage in [first-job, maker, student]` |
| 亲情线 `family` | 关联 person 的 `role` 命中 `家人|父母|父亲|母亲|女儿|儿子|哥|姐|妹|弟|family|father|mother|...`；**或** `event.stage == family` |
| 朋友线 `friends` | 关联 person 的 `role` 命中 `朋友|同学|舍友|校友|发小|friend|classmate|roommate` |

所有 6 条线在**前端 apiAdapter 层派生**（`frontend/src/data/lineMatchers.js` + `lines.js`），**不修改数据库**，**不修改 API**。一次事件可同时属于多条线（如生日聚会可同时是亲情线和朋友线）。详见 `frontend/src/data/apiAdapter.js#createApiAdapter().getEventsByLine / getLineStats / getAllLines`。

## 关键技术选型理由

| 选择 | 理由 |
|---|---|
| NestJS | 模块化结构清晰、TypeScript 一等公民、依赖注入适合中型项目 |
| TypeORM | 与 NestJS 集成成熟，Entity 写法贴近 SQL，便于复杂查询 |
| PostgreSQL | 严格事务、JSONB（用于 AI 标签、metadata） |
| Redis | 限流 / 黑名单 / 缓存 未来扩展位 |
| Vite | 启动快、HMR 稳定、production build 小 |
| TanStack Query | 缓存 / 失效 / 加载状态开箱即用 |
| Zustand | 极简的状态管理，足够 UI 筛选场景 |
| React Router v6 | SPA 路由，配合 GitHub Pages 404 fallback |
| bcryptjs | 纯 JS 实现，无需 native 编译，部署友好 |
| JWT (15min) + Refresh (7d) | 短 access + 长 refresh 的现代实践 |

## 已知架构债 / 待优化

- 没有 rate limit（Redis 已就位但未启用）
- 没有 WebSocket，所有数据走 HTTP 拉取
- 没有对象存储真实集成（OSS 占位环境变量）
- 没有 CDN
- 没有 i18n（界面文字硬编码中文）

详见 [roadmap.md](./roadmap.md)。
