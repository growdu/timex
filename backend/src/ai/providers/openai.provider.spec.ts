import { ConfigService } from '@nestjs/config';
import { OpenAIProvider } from './openai.provider';

/** 最小 ConfigService：从 env map 取值，带默认值 */
function makeConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: <T = string>(key: string, defaultVal?: T): T | undefined =>
      (env[key] as T) ?? defaultVal,
  } as unknown as ConfigService;
}

function mockFetch(response: {
  ok: boolean;
  status?: number;
  body: unknown;
}): void {
  global.fetch = jest.fn(async () => {
    const r = response;
    return {
      ok: r.ok,
      status: r.status ?? 200,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    } as unknown as Response;
  });
}

describe('OpenAIProvider', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('name=openai; isAvailable reflects API key presence', () => {
    expect(
      new OpenAIProvider(makeConfig({ OPENAI_API_KEY: 'k' })).isAvailable,
    ).toBe(true);
    expect(new OpenAIProvider(makeConfig({})).isAvailable).toBe(false);
  });

  it('defaults baseUrl / model when not set', () => {
    const p = new OpenAIProvider(makeConfig({ OPENAI_API_KEY: 'k' }));
    expect(p.baseUrl).toBe('https://api.openai.com/v1');
    expect(p.model).toBe('gpt-4o-mini');
  });

  it('sends a chat completion request for text tasks and parses output/usage', async () => {
    const p = new OpenAIProvider(
      makeConfig({ OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'gpt-4o' }),
    );
    mockFetch({
      ok: true,
      body: {
        model: 'gpt-4o',
        choices: [{ message: { content: '一句话描述。' } }],
        usage: { prompt_tokens: 12, completion_tokens: 5 },
      },
    });

    const res = await p.complete({
      task: 'event-summary',
      input: { kind: 'text', text: '某事件文本' },
    });

    expect(res.output).toBe('一句话描述。');
    expect(res.provider).toBe('openai');
    expect(res.model).toBe('gpt-4o');
    expect(res.usage?.inputTokens).toBe(12);
    expect(res.usage?.outputTokens).toBe(5);

    const call = (global.fetch as unknown as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('https://api.openai.com/v1/chat/completions');
    const opts = call[1] as RequestInit;
    expect((opts.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk-test',
    );
    const body = JSON.parse(opts.body as string);
    expect(body.model).toBe('gpt-4o');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.temperature).toBe(0.4);
    expect(body.max_tokens).toBe(512);
  });

  it('passes image URL as image_url part for media-url image input', async () => {
    const p = new OpenAIProvider(makeConfig({ OPENAI_API_KEY: 'k' }));
    mockFetch({
      ok: true,
      body: { choices: [{ message: { content: 'tag1, tag2' } }] },
    });
    await p.complete({
      task: 'image-tag',
      input: {
        kind: 'media-url',
        url: 'http://x/a.jpg',
        mimeType: 'image/jpeg',
      },
    });
    const body = JSON.parse(
      (global.fetch as unknown as jest.Mock).mock.calls[0][1].body as string,
    );
    const userParts = body.messages[1].content;
    expect(
      userParts.some(
        (part: { type: string; image_url?: { url: string } }) =>
          part.type === 'image_url' && part.image_url?.url === 'http://x/a.jpg',
      ),
    ).toBe(true);
  });

  it('parses structured JSON array for image-tag', async () => {
    const p = new OpenAIProvider(makeConfig({ OPENAI_API_KEY: 'k' }));
    mockFetch({
      ok: true,
      body: { choices: [{ message: { content: '["a","b","c"]' } }] },
    });
    const res = await p.complete({
      task: 'image-tag',
      input: {
        kind: 'media-url',
        url: 'http://x/a.jpg',
        mimeType: 'image/jpeg',
      },
    });
    expect(res.structured).toEqual(['a', 'b', 'c']);
  });

  it('throws on non-ok response', async () => {
    const p = new OpenAIProvider(makeConfig({ OPENAI_API_KEY: 'k' }));
    mockFetch({ ok: false, status: 401, body: { error: 'unauthorized' } });
    await expect(
      p.complete({
        task: 'event-summary',
        input: { kind: 'text', text: 'x' },
      }),
    ).rejects.toThrow(/openai HTTP 401/);
  });

  it('throws when API key not configured', async () => {
    const p = new OpenAIProvider(makeConfig({}));
    await expect(
      p.complete({
        task: 'event-summary',
        input: { kind: 'text', text: 'x' },
      }),
    ).rejects.toThrow(/OPENAI_API_KEY not configured/);
  });

  it('respects custom OPENAI_BASE_URL (DeepSeek / Azure-compatible)', async () => {
    const p = new OpenAIProvider(
      makeConfig({
        OPENAI_API_KEY: 'k',
        OPENAI_BASE_URL: 'https://api.deepseek.com/v1',
      }),
    );
    mockFetch({
      ok: true,
      body: { choices: [{ message: { content: 'ok' } }] },
    });
    await p.complete({
      task: 'event-summary',
      input: { kind: 'text', text: 'x' },
    });
    expect((global.fetch as unknown as jest.Mock).mock.calls[0][0]).toBe(
      'https://api.deepseek.com/v1/chat/completions',
    );
  });
});
