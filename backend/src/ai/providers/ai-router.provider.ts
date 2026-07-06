import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmProvider,
} from './llm-provider.interface';
import { MockProvider } from './mock.provider';
import { OllamaProvider } from './ollama.provider';

/**
 * Provider 路由器：根据 env 决定用 Ollama 还是 Mock。
 *
 * 优先级：
 *   1. OLLAMA_HOST 设了且 health 通过 → ollama
 *   2. 否则 → mock（保证 dev / CI 不挂）
 *
 * AI_PROVIDER=ollama|mock|auto 显式覆盖（默认 auto）
 */
@Injectable()
export class AiRouterProvider implements LlmProvider, OnModuleInit {
  readonly name = 'router';
  private log = new Logger(AiRouterProvider.name);
  private activeProvider!: LlmProvider;
  private fallbackProvider: LlmProvider;
  private mode: 'ollama' | 'mock' | 'auto';

  constructor(
    private config: ConfigService,
    private ollama: OllamaProvider,
    private mock: MockProvider,
  ) {
    this.mode =
      (config.get<string>('AI_PROVIDER', 'auto') as
        | 'ollama'
        | 'mock'
        | 'auto') || 'auto';
    this.fallbackProvider = mock; // mock 永远作兜底
  }

  async onModuleInit() {
    if (this.mode === 'mock') {
      this.activeProvider = this.mock;
      this.log.log('AI provider mode=mock (forced)');
      return;
    }
    // auto 或 ollama：探测 Ollama
    const available = await this.ollama.ping();
    if (available) {
      this.activeProvider = this.ollama;
      this.log.log(
        `AI provider mode=auto, selected=ollama (${this.ollama.model})`,
      );
    } else {
      this.activeProvider = this.mock;
      if (this.mode === 'ollama') {
        this.log.warn(
          'AI provider mode=ollama forced but ollama not reachable, falling back to mock',
        );
      } else {
        this.log.warn(
          'AI provider mode=auto, ollama not reachable, using mock',
        );
      }
    }
  }

  get isAvailable(): boolean {
    return !!this.activeProvider;
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    try {
      const res = await this.activeProvider.complete(req);
      return res;
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

// 注意：OllamaProvider import 在文件上方，避免循环
// import { OllamaProvider } from './ollama.provider';
