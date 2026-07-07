# AI 集成文档（timex 后端）

timex 后端内置 AI 模块，为照片打标签 / 写描述、转录音频、给回忆录章节写摘要等。
所有 AI 调用走「异步任务」模式：POST 立即返回 job，前端轮询 GET /ai/jobs/:id。

## 1. 能力矩阵

| Task            | 输入                  | 输出                           | 写入目标        |
|-----------------|-----------------------|--------------------------------|-----------------|
| `image-tag`     | `media-url`           | `output: "tag1,tag2,..."`, `structured: string[]` | `moments.ai_tags` |
| `image-sum`     | `media-url`           | `output: "一句话描述"`          | `moments.ai_summary` |
| `audio-tr`      | `audio-url`           | `output: "转录文本"`            | `moments.transcript` |
| `memoir-sum`    | `text` (整本)         | `output: "3-5 段摘要"`          | `memoirs.blurb` |
| `chapter-sum`   | `text` (一章)         | `output: "段落摘要"`            | `memoir_chapters.content` |
| `event-sum`     | `text` (单事件)       | `output: "单句摘要"`            | `events.summary` |

> 字段名说明：`image-sum` = `image-summary`、`audio-tr` = `audio-transcribe`（路由内部短名）；其余同 [接口文档](#3-接口)。

## 2. Provider 路由

后端支持三种 LLM Provider，AiRouterProvider 启动时按 `AI_PROVIDER` 选一：

1. `AI_PROVIDER=openai` → 强制 `OpenAIProvider`（未配 `OPENAI_API_KEY` 时 warn 并降级 mock）
2. `AI_PROVIDER=ollama` → 强制 `OllamaProvider`（连不上时 warn 并降级 mock）
3. `AI_PROVIDER=mock` → 强制 `MockProvider`（确定性输出，适合 CI / dev）
4. `AI_PROVIDER=auto`（默认）→ **云优先**：配了 `OPENAI_API_KEY` 用 OpenAI；否则探测 Ollama；否则 mock
5. **任何模式下 mock 都是兜底**；运行时 provider 抛错也降级 mock（响应 `provider` 字段标 `+fallback`）

> `OpenAIProvider` 走标准 Chat Completions API（`${OPENAI_BASE_URL}/chat/completions`），
> 兼容 OpenAI 官方、Azure OpenAI、DeepSeek、Moonshot/Kimi、vLLM、LM Studio 等——只需改
> `OPENAI_BASE_URL` + `OPENAI_API_KEY`。图片任务用视觉模型 `image_url` 多模态格式；音频转录
> （Whisper 专用 `/audio/transcriptions`，需下载文件）暂以 URL 文本上下文传入。

```bash
AI_PROVIDER=auto                                # openai | ollama | mock | auto
OPENAI_API_KEY=sk-...                           # OpenAI 兼容服务的 key（留空则跳过 openai）
OPENAI_BASE_URL=https://api.openai.com/v1       # 改这里切换 DeepSeek / Azure / vLLM 等
OPENAI_MODEL=gpt-4o-mini                        # 视觉任务建议多模态模型（gpt-4o-mini / gpt-4o）
OLLAMA_HOST=http://localhost:11434              # Ollama 服务地址
OLLAMA_MODEL=llama3.2                           # Ollama 使用的模型
```

## 3. 接口

所有 AI 端点位于 `/ai` 前缀，需要 Bearer token（复用 SessionAuthGuard）。

### 提交任务

| 方法 | 路径                              | 说明 |
|------|-----------------------------------|------|
| POST | `/ai/moments/:id/tag`             | 照片打标签 |
| POST | `/ai/moments/:id/summary`         | 照片一句话描述 |
| POST | `/ai/moments/:id/transcribe`      | 音频转录 |
| POST | `/ai/memoirs/:id/summary`         | 整本回忆录摘要 |
| POST | `/ai/memoirs/:id/chapters/:cid/summary` | 章节摘要 |
| POST | `/ai/events/:id/summary`          | 事件摘要 |

请求体：可空 `{}`（多数 kind 只需 targetId）。响应：`{ id, kind, status: "queued" }`。

### 查询任务

| 方法 | 路径                  | 说明 |
|------|-----------------------|------|
| GET  | `/ai/jobs/:id`        | 查单个任务（鉴权：仅本用户） |
| GET  | `/ai/jobs?limit=20`   | 查本用户最近 N 个任务（默认 20，最大 100） |
| POST | `/ai/jobs/:id/retry`  | 重新跑一次（生成新 job，旧 job 保留） |

Job 状态机：`queued → running → succeeded | failed`。
Job 对象字段：
```
{
  id, userId, kind, targetType, targetId,
  status, provider, model, output, structured, error,
  latencyMs, createdAt
}
```

## 4. 异步任务的生命周期

```
POST /ai/events/:id/summary
   └─→ AiService.submit()      // status=queued, save()
        └─→ void runJob()      // 后台执行，不阻塞响应
             ├─ status=running
             ├─ llm.complete() // Ollama 或 Mock
             ├─ status=succeeded, 写回 target (event.summary)
             └─ 失败 → status=failed, error=...
```

前端不用自己写 worker：拿 `id` 后轮询 `/ai/jobs/:id` 即可。

## 5. 前端集成示例

```jsx
import { useAiJob } from '../hooks/useAiJob';
import { AiActionButton } from '../components/AiActionButton';

// 列表页：每个事件一个"AI 摘要"按钮
{events.map(ev => (
  <AiActionButton
    kind="event-summary"
    args={{ eventId: ev.id, text: ev.description }}
    label="AI 摘要"
    onSettled={(job) => {
      if (job.status === 'succeeded') refetch();
    }}
  />
))}
```

`useAiJob` 内部 1s 轮询一次，最多 30 次（30s 兜底超时）。

## 6. 测试

```bash
cd backend
npx jest src/ai                    # 16 测试：MockProvider 9 + AiService 7
npx jest                            # 全部 204 测试
```

Mock provider 特性：基于 input hash 的伪随机、50-250ms 模拟延迟、确定性输出（同 input 一定同 output）。

## 7. 上 Ollama 的步骤

1. 装 Ollama：`curl -fsSL https://ollama.ai/install.sh | sh`
2. 拉模型：`ollama pull llama3.2`（或 `qwen2.5:7b` 等）
3. 启动服务：`ollama serve`（默认 :11434）
4. 配环境变量：`OLLAMA_HOST=http://localhost:11434 OLLAMA_MODEL=llama3.2 AI_PROVIDER=auto`
5. 启 backend：`pnpm start:dev`（启动日志会打印 `AI provider mode=auto, selected=ollama`）

如果 Ollama 是 Docker 起的，host 用 `host.docker.internal`（dev）或 `ollama`（compose 网络内）。
