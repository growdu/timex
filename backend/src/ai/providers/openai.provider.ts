import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmProvider,
} from './llm-provider.interface';
import { TASK_PROMPTS, tryParseJson } from './prompts';

/**
 * OpenAI 兼容 Provider。
 *
 * 调用 `${OPENAI_BASE_URL}/chat/completions`（OpenAI Chat Completions API）。
 * 兼容任何提供该接口的服务：OpenAI 官方、Azure OpenAI（部署 endpoint）、
 * DeepSeek、Moonshot/Kimi、vLLM、LM Studio 等——只需改 OPENAI_BASE_URL + OPENAI_API_KEY。
 *
 * - 文本任务：纯文本消息。
 * - 图片任务（image-tag / image-summary）：用视觉模型的多模态 image_url 格式传图片 URL。
 * - 音频任务：OpenAI 转录需 /audio/transcriptions（要下载文件），这里把 URL 作为文本上下文
 *   交给模型（与 Ollama provider 行为一致）；如需真实转录请用 Whisper 专用流程。
 */
export interface OpenAIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface OpenAIChatMessage {
  role: 'system' | 'user';
  content: string | OpenAIContentPart[];
}

@Injectable()
export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';
  readonly model: string;
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  private log = new Logger(OpenAIProvider.name);

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.baseUrl = this.config.get<string>(
      'OPENAI_BASE_URL',
      'https://api.openai.com/v1',
    );
    this.model = this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  /** 配了 API key 即视为可用（不发探测请求，省额度）。 */
  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const t0 = Date.now();
    const taskPrompt = TASK_PROMPTS[req.task];
    const messages = this.toMessages(
      req,
      taskPrompt.system,
      taskPrompt.instruction,
    );

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model ?? this.model,
        messages,
        temperature: req.temperature ?? 0.4,
        max_tokens: req.maxTokens ?? 512,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`openai HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const output = json.choices?.[0]?.message?.content ?? '';
    this.log.debug(
      `openai ${req.task} done (${this.model}, ${Date.now() - t0}ms)`,
    );

    return {
      output,
      structured: tryParseJson(output),
      model: json.model ?? this.model,
      provider: this.name,
      latencyMs: Date.now() - t0,
      usage: {
        inputTokens: json.usage?.prompt_tokens,
        outputTokens: json.usage?.completion_tokens,
      },
    };
  }

  /** 把 LlmInput 转为 OpenAI chat messages（system + user，user 含多模态 parts）。 */
  private toMessages(
    req: LlmCompletionRequest,
    system: string,
    instruction: string,
  ): OpenAIChatMessage[] {
    const parts: OpenAIContentPart[] = [];

    switch (req.input.kind) {
      case 'text':
        parts.push({ type: 'text', text: req.input.text });
        break;
      case 'media-url':
        if (req.input.mimeType?.startsWith('image/')) {
          parts.push({ type: 'image_url', image_url: { url: req.input.url } });
        }
        parts.push({ type: 'text', text: `<media url="${req.input.url}">` });
        break;
      case 'audio-url':
        parts.push({ type: 'text', text: `音频 URL：${req.input.url}` });
        break;
      case 'multi':
        for (const p of req.input.parts) {
          if (p.kind === 'text') parts.push({ type: 'text', text: p.text });
          if (p.kind === 'media-url' && p.mimeType?.startsWith('image/')) {
            parts.push({ type: 'image_url', image_url: { url: p.url } });
          }
          if (p.kind === 'audio-url') {
            parts.push({ type: 'text', text: `音频 URL：${p.url}` });
          }
        }
        break;
    }

    parts.push({ type: 'text', text: instruction });

    return [
      { role: 'system', content: system },
      { role: 'user', content: parts },
    ];
  }
}
