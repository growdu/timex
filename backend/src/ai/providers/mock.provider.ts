import { Injectable } from '@nestjs/common';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmProvider,
} from './llm-provider.interface';

/**
 * Mock Provider — 用于 dev / CI / 无 LLM 环境的兜底。
 *
 * 确定性输出：
 *   - image-tag      → 6 个标签（基于输入 hash）
 *   - image-summary  → 一句话描述
 *   - audio-transcribe → 一段示例转录
 *   - memoir-summary → 3-5 句样板
 *   - chapter-summary → 段落
 *   - event-summary  → 单句
 *
 * 故意包含一点随机性（用 input hash 作种子），让多次调用看起来不一样。
 */
@Injectable()
export class MockProvider implements LlmProvider {
  readonly name = 'mock';

  get isAvailable(): boolean {
    return true;
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const t0 = Date.now();
    const text = (() => {
      const inputText = extractText(req.input);
      const seed = simpleHash(inputText + req.task);
      switch (req.task) {
        case 'image-tag':
          return MOCK_TAGS(seed).join(', ');
        case 'image-summary':
          return MOCK_IMAGE_SUMMARIES[seed % MOCK_IMAGE_SUMMARIES.length];
        case 'audio-transcribe':
          return MOCK_TRANSCRIPTS[seed % MOCK_TRANSCRIPTS.length];
        case 'memoir-summary':
          return MOCK_MEMOIR_SUMMARIES[seed % MOCK_MEMOIR_SUMMARIES.length];
        case 'chapter-summary':
          return MOCK_CHAPTER_SUMMARIES[seed % MOCK_CHAPTER_SUMMARIES.length];
        case 'event-summary':
          return MOCK_EVENT_SUMMARIES[seed % MOCK_EVENT_SUMMARIES.length];
        default:
          return '[mock] unknown task';
      }
    })();

    // 模拟一点延迟，让前端 spinner 看得见
    await sleep(50 + Math.random() * 200);

    return {
      output: text,
      structured: req.task === 'image-tag'
        ? text.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
      model: 'mock-1',
      provider: this.name,
      latencyMs: Date.now() - t0,
      usage: { inputTokens: extractText(req.input).length, outputTokens: text.length },
    };
  }
}

function extractText(input: LlmCompletionRequest['input']): string {
  switch (input.kind) {
    case 'text':
      return input.text;
    case 'media-url':
      return input.url;
    case 'audio-url':
      return input.url;
    case 'multi':
      return input.parts.map(extractText).join(' ');
  }
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- 静态语料 ----
const TAG_POOL = [
  '家庭', '旅行', '童年', '海边', '生日', '节日', '聚会', '学校', '工作', '朋友',
  '宠物', '美食', '城市', '乡村', '四季', '春日', '夏日', '秋日', '冬日', '黄昏',
  '清晨', '微笑', '拥抱', '公园', '山野', '老屋', '火车站', '婚礼', '毕业', '归来',
  '老友', '新芽', '绿叶', '晚霞', '星光', '厨房', '餐桌', '雪景', '雨中', '晴天',
];
const MOCK_TAGS = (seed: number): string[] => {
  const n = 6;
  const out = new Set<string>();
  let s = seed;
  while (out.size < n) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.add(TAG_POOL[s % TAG_POOL.length]);
  }
  return Array.from(out);
};

const MOCK_IMAGE_SUMMARIES = [
  '阳光下，一张温暖的合影。',
  '厨房里飘出的香味，让这个下午变得柔软。',
  '黄昏的海边，风里带着笑声。',
  '老相册里翻出的一页，泛黄却清晰。',
  '第一次骑车的那个夏天，膝盖还在疼。',
  '朋友聚会后的合影，笑容都很真。',
];

const MOCK_TRANSCRIPTS = [
  '那是我第一次离开家的那个早上，妈在门口塞给我两个热鸡蛋。',
  '我记得那天火车晚点，我们在候车室里打牌打到天亮。',
  '她说，以后每年这一天，我们都来这里坐一坐。',
  '镜头没有拍到的是，桌子下面那只安静趴着的猫。',
];

const MOCK_MEMOIR_SUMMARIES = [
  '这本回忆录从童年的小城写起，串起求学、离家、成家与归来。\n最让人印象深的是那些普通的下午——它们被细心地记录下来，成为日后最珍贵的锚点。\n家人始终在场，朋友来了又去，而故乡是那条隐约的线索，把所有章节轻轻系在一起。',
  '作者用克制的笔触，回顾了几十年间几次重要的迁徙。\n每一段离开都伴随着新的开始，而每一次归来都带回了新的理解。\n贯穿全书的，是与母亲之间那段从未说出口、却始终存在的对话。',
  '这本回忆录像一封写给旧友的长信。\n它把零散的记忆织成一张网：节日、车站、餐桌、雨声、笑声。\n读完之后，读者会想给家里打个电话。',
];

const MOCK_CHAPTER_SUMMARIES = [
  '本章从一次深夜的电话开始，引出主角与父亲之间多年的沉默。\n回忆与当下交织，最后在一个未说完的句子里结束。',
  '本章聚焦于主角大学时期的友谊圈。\n几个人物的命运在毕业那晚发生了分岔，本章以其中一个突然的告别收尾。',
];

const MOCK_EVENT_SUMMARIES = [
  '那年夏天的海边聚会，三十多人，最后只剩主角和主人坐在台阶上聊到天亮。',
  '春节回家，母亲在厨房忙了一下午，年夜饭摆了八道菜。',
  '毕业典礼后全班拍了张合影，后来大家各奔东西。',
];