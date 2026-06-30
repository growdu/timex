/**
 * LLM Provider 抽象接口
 *
 * 所有 provider 必须实现此接口。Service 层通过 LLM_PROVIDER token 注入。
 */
export interface LlmCompletionRequest {
  /** 任务类型（用于选 prompt 模板） */
  task: AiTask;
  /** 输入上下文（媒体 URL、文本、metadata 等） */
  input: LlmInput;
  /** 模型覆盖（默认用 provider 默认） */
  model?: string;
  /** 温度 0-1 */
  temperature?: number;
  /** 最大输出 token */
  maxTokens?: number;
}

export type LlmInput =
  | { kind: 'text'; text: string }
  | { kind: 'media-url'; url: string; mimeType?: string }
  | { kind: 'audio-url'; url: string; mimeType?: string }
  | { kind: 'multi'; parts: LlmInput[] };

export type AiTask =
  | 'image-tag'           // 给照片打标签
  | 'image-summary'       // 给照片写一句话描述
  | 'audio-transcribe'    // 转录音频
  | 'memoir-summary'      // 给整本回忆录写摘要
  | 'chapter-summary'     // 给章节写摘要
  | 'event-summary';      // 给事件写摘要

export interface LlmCompletionResponse {
  /** 输出文本（按任务类型可能是 JSON string / 纯文本） */
  output: string;
  /** 解析后的结构化结果（如果任务要求 JSON） */
  structured?: unknown;
  /** 实际用的模型 */
  model: string;
  /** provider 标识 */
  provider: string;
  /** 耗时 ms */
  latencyMs: number;
  /** 用量（若 provider 报告） */
  usage?: { inputTokens?: number; outputTokens?: number };
}

export abstract class LlmProvider {
  abstract readonly name: string;
  abstract readonly isAvailable: boolean;
  abstract complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}

/**
 * Provider 注册表：用 factory 注入 { ollama, mock }，
 * AiService 根据 env + 可用性动态选择具体实例。
 */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
export interface ProviderRegistry {
  ollama: LlmProvider;
  mock: LlmProvider;
}