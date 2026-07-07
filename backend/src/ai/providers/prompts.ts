import { AiTask } from './llm-provider.interface';

/**
 * 各任务的 system prompt + 输出指令。
 * 所有 provider 共用，保证不同后端输出风格一致。
 */
export const TASK_PROMPTS: Record<
  AiTask,
  { system: string; instruction: string }
> = {
  'image-tag': {
    system:
      '你是一个为照片打语义标签的助手。请输出 5-10 个简短的英文或中文标签，逗号分隔，不要解释。',
    instruction: '输出格式：tag1, tag2, tag3, ...',
  },
  'image-summary': {
    system:
      '你是一个为照片写一句话描述的助手。一句话，不超过 30 字，温馨、具体。',
    instruction: '直接输出描述，不要引号。',
  },
  'audio-transcribe': {
    system: '你是一个语音转录助手。',
    instruction: '输出转录文本，不要标点优化，不要时间戳。',
  },
  'memoir-summary': {
    system:
      '你是一个回忆录编辑助手。请基于给定内容写出 3-5 句话的整体摘要，捕捉主要事件与情感脉络。',
    instruction: '直接输出摘要文本，不要标题。',
  },
  'chapter-summary': {
    system: '你是一个章节摘要助手。100-200 字以内，捕捉核心叙事。',
    instruction: '直接输出摘要文本。',
  },
  'event-summary': {
    system:
      '你是一个事件摘要助手。一句话描述事件的时间、地点、人物、关键动作。',
    instruction: '直接输出。',
  },
};

/** 尝试解析 JSON；非 JSON（或非数组/对象开头）返回 undefined。 */
export function tryParseJson(s: string): unknown {
  const trimmed = s.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}
