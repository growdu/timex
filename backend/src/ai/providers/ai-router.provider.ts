import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmProvider,
} from './llm-provider.interface';
import { MockProvider } from './mock.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAIProvider } from './openai.provider';

type AiMode = 'ollama' | 'openai' | 'mock' | 'auto';

/**
 * Provider 路由器：根据 env 决定用 OpenAI / Ollama / Mock。
 *
 * AI_PROVIDER=openai|ollama|mock|auto（默认 auto）
 *   - auto 优先级：OpenAI（配了 OPENAI_API_KEY）> Ollama（可连通）> mock
 *   - 任何模式下 mock 都是兜底；active provider 运行时抛错也降级到 mock
 */
@Injectable()
export class AiRouterProvider implements LlmProvider, OnModuleInit {
  readonly name = 'router';
  private log = new Logger(AiRouterProvider.name);
  private activeProvider!: LlmProvider;
  private fallbackProvider: LlmProvider;
  private mode: AiMode;

  constructor(
    private config: ConfigService,
    private ollama: OllamaProvider,
    private openai: OpenAIProvider,
    private mock: MockProvider,
  ) {
    this.mode =
      (this.config.get<string>('AI_PROVIDER', 'auto') as AiMode) || 'auto';
    this.fallbackProvider = mock; // mock 永远作兜底
  }

  async onModuleInit() {
    if (this.mode === 'mock') {
      this.activeProvider = this.mock;
      this.log.log('AI provider mode=mock (forced)');
      return;
    }

    if (this.mode === 'openai') {
      if (this.openai.isAvailable) {
        this.activeProvider = this.openai;
        this.log.log(
          `AI provider mode=openai, selected=openai (${this.openai.model})`,
        );
      } else {
        this.activeProvider = this.mock;
        this.log.warn(
          'AI provider mode=openai forced but OPENAI_API_KEY not set, falling back to mock',
        );
      }
      return;
    }

    if (this.mode === 'ollama') {
      const ok = await this.ollama.ping();
      if (ok) {
        this.activeProvider = this.ollama;
        this.log.log(
          `AI provider mode=ollama, selected=ollama (${this.ollama.model})`,
        );
      } else {
        this.activeProvider = this.mock;
        this.log.warn(
          'AI provider mode=ollama forced but ollama not reachable, falling back to mock',
        );
      }
      return;
    }

    // auto（默认）：云优先 > 本地 > mock
    if (this.openai.isAvailable) {
      this.activeProvider = this.openai;
      this.log.log(
        `AI provider mode=auto, selected=openai (${this.openai.model})`,
      );
      return;
    }
    const ollamaOk = await this.ollama.ping();
    if (ollamaOk) {
      this.activeProvider = this.ollama;
      this.log.log(
        `AI provider mode=auto, selected=ollama (${this.ollama.model})`,
      );
    } else {
      this.activeProvider = this.mock;
      this.log.warn(
        'AI provider mode=auto, openai key not set & ollama not reachable, using mock',
      );
    }
  }

  get isAvailable(): boolean {
    return !!this.activeProvider;
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    try {
      return await this.activeProvider.complete(req);
    } catch (err) {
      this.log.error(
        `Provider ${this.activeProvider.name} failed (${(err as Error).message}), falling back to mock`,
      );
      const res = await this.fallbackProvider.complete(req);
      // 标记这是 fallback
      return { ...res, provider: `${res.provider}+fallback` };
    }
  }
}
