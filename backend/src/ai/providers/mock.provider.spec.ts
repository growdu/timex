/**
 * MockProvider 单元测试 — 验证 6 种 task 的输出形状、structured 字段、provider 名称。
 */
import { MockProvider } from './mock.provider';
import { LlmCompletionRequest } from './llm-provider.interface';

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  it('exposes name="mock" and isAvailable=true', () => {
    expect(provider.name).toBe('mock');
    expect(provider.isAvailable).toBe(true);
  });

  it('image-tag returns structured tag list and output', async () => {
    const req: LlmCompletionRequest = {
      task: 'image-tag',
      input: { kind: 'media-url', url: 'http://x/a.jpg' },
    };
    const r = await provider.complete(req);
    expect(r.provider).toBe('mock');
    expect(r.model).toBe('mock-1');
    expect(r.output).toMatch(/[,、]/); // comma or Chinese comma separated
    expect(Array.isArray(r.structured)).toBe(true);
    expect((r.structured as string[]).length).toBeGreaterThanOrEqual(3);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('image-summary returns descriptive text', async () => {
    const r = await provider.complete({
      task: 'image-summary',
      input: { kind: 'media-url', url: 'http://x/b.jpg' },
    });
    expect(r.output.length).toBeGreaterThan(0);
    expect(r.structured).toBeUndefined();
  });

  it('audio-transcribe returns transcript text', async () => {
    const r = await provider.complete({
      task: 'audio-transcribe',
      input: { kind: 'audio-url', url: 'http://x/c.mp3' },
    });
    expect(r.output.length).toBeGreaterThan(0);
  });

  it('memoir-summary returns multi-sentence text', async () => {
    const r = await provider.complete({
      task: 'memoir-summary',
      input: { kind: 'text', text: 'long memoir text' },
    });
    expect(r.output.length).toBeGreaterThan(20);
  });

  it('chapter-summary returns paragraph', async () => {
    const r = await provider.complete({
      task: 'chapter-summary',
      input: { kind: 'text', text: 'long chapter text' },
    });
    expect(r.output.length).toBeGreaterThan(10);
  });

  it('event-summary returns single-sentence summary', async () => {
    const r = await provider.complete({
      task: 'event-summary',
      input: { kind: 'text', text: 'a memory' },
    });
    expect(r.output.length).toBeGreaterThan(0);
  });

  it('deterministic given same input (seeded by input hash)', async () => {
    const req: LlmCompletionRequest = {
      task: 'event-summary',
      input: { kind: 'text', text: 'deterministic-input' },
    };
    const a = await provider.complete(req);
    const b = await provider.complete(req);
    expect(a.output).toBe(b.output);
  });

  it('reports input/output token usage', async () => {
    const r = await provider.complete({
      task: 'image-tag',
      input: { kind: 'media-url', url: 'http://x/d.jpg' },
    });
    expect(r.usage?.outputTokens).toBeGreaterThan(0);
  });
});
