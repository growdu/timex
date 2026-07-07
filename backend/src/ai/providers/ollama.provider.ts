import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmProvider,
} from './llm-provider.interface';
import { TASK_PROMPTS, tryParseJson } from './prompts';

/**
 * Ollama 本地 Provider。
 *
 * 调用 http://${OLLAMA_HOST}/api/generate (text)
 *        http://${OLLAMA_HOST}/api/chat (multi-modal，含 image)
 *
 * 文档：https://github.com/ollama/ollama/blob/main/docs/api.md
 */
@Injectable()
export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  readonly model: string;
  readonly host: string;
  private log = new Logger(OllamaProvider.name);

  constructor(private config: ConfigService) {
    this.host = this.config.get<string>(
      'OLLAMA_HOST',
      'http://localhost:11434',
    );
    this.model = this.config.get<string>(
      'OLLAMA_MODEL',
      this.config.get<string>('OLLAMA_DEFAULT_MODEL', 'llama3.2'),
    );
  }

  get isAvailable(): boolean {
    // 探测在 ping() 中做；这里只表示 provider 存在
    return true;
  }

  /** 主动探测 ollama server 健康 */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.host}/api/version`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { version?: string };
      this.log.log(`ollama reachable, version=${json.version ?? 'unknown'}`);
      return true;
    } catch (e) {
      this.log.debug(`ollama ping failed: ${(e as Error).message}`);
      return false;
    }
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const t0 = Date.now();
    const { prompt, images } = this.toOllamaPrompt(req);

    const res = await fetch(`${this.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model ?? this.model,
        prompt,
        images,
        stream: false,
        options: {
          temperature: req.temperature ?? 0.4,
          num_predict: req.maxTokens ?? 512,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ollama HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      response: string;
      model: string;
      total_duration?: number;
      eval_count?: number;
      prompt_eval_count?: number;
    };

    return {
      output: json.response,
      structured: tryParseJson(json.response),
      model: json.model,
      provider: this.name,
      latencyMs: Date.now() - t0,
      usage: {
        inputTokens: json.prompt_eval_count,
        outputTokens: json.eval_count,
      },
    };
  }

  /** 把 LlmInput 转为 Ollama 的 {prompt, images[]} 格式 */
  private toOllamaPrompt(req: LlmCompletionRequest): {
    prompt: string;
    images: string[];
  } {
    const parts: string[] = [];
    const images: string[] = [];

    const taskPrompt = TASK_PROMPTS[req.task];
    parts.push(taskPrompt.system);

    switch (req.input.kind) {
      case 'text':
        parts.push(`\n\n输入：\n${req.input.text}`);
        break;
      case 'media-url':
        parts.push(`\n\n输入：\n<media url="${req.input.url}">`);
        // ollama image 输入需要 base64；这里只传 URL（多模态模型能识别 URL 时有效）
        // 实际生产建议先下载转 base64；为简化留 URL 给模型
        if (req.input.mimeType?.startsWith('image/')) {
          images.push(req.input.url);
        }
        break;
      case 'audio-url':
        parts.push(`\n\n音频 URL：${req.input.url}`);
        break;
      case 'multi':
        for (const p of req.input.parts) {
          if (p.kind === 'text') parts.push(p.text);
          if (p.kind === 'media-url' && p.mimeType?.startsWith('image/')) {
            images.push(p.url);
          }
        }
        break;
    }

    if (taskPrompt.instruction) {
      parts.push(`\n\n${taskPrompt.instruction}`);
    }

    return { prompt: parts.join('\n'), images };
  }
}
