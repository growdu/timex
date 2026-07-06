# scripts/

## ai-smoke.mjs — AI 模块端到端冒烟测试

两层验证：

**unit (default, ~1ms)** — 不依赖运行中的服务，验证 DTO/字段/契约。
  ```
  npm run smoke:ai
  ```

**live (~700ms)** — 注册用户 → 创建 event → 提交 AI summary → 轮询直到 succeeded → 验证 summary 写回 event。
  需要后端在 :3000 跑（AI 模块默认 auto → ollama 不通则降级 mock）。
  ```
  npm run smoke:ai:live
  ```

期望 12/12 通过。Live 测试需要数据库表 `ai_jobs` 已创建（见 `backend/scripts/migrations/2026_06_30_ai_jobs.sql`）。

### 覆盖路径
| 测试                       | 端点                                                    | 期望       |
| -------------------------- | ------------------------------------------------------- | ---------- |
| GET /health                | `/health`                                               | 200 ok     |
| POST /api/auth/register    | 创建用户，拿 JWT                                         | 201 + tokens.accessToken |
| POST /api/events           | 创建 event                                              | 201 + id   |
| POST /api/ai/events/:id/summary | 提交摘要任务                                       | 202 + job id |
| GET /api/ai/jobs/:id       | 轮询直到 status=succeeded                               | 200, provider=mock, output 非空 |
| GET /api/events/:id        | 验证 summary 写回                                       | summary 非空 |
| GET /api/ai/jobs           | 列任务，最新在首位                                       | 200 数组    |
| 错误 token                 | GET /api/ai/jobs                                        | 401        |
| 不存在的 job               | GET /api/ai/jobs/:fakeId                                | 404        |
| retry 端点                  | (未实现，skip)                                           | n/a        |

### Provider 模式
`AI_PROVIDER` 环境变量（默认 `auto`）：
- `auto` — 启动时 ping ollama，失败降级 mock（推荐 dev）
- `mock` — 强制 mock
- `ollama` — 必须可用
- `openai` — 需要 OPENAI_API_KEY

mock 模式下摘要生成是预设的「那年夏天的海边聚会，三十多人…」字符串，~200ms。