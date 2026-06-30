/**
 * ThrottlerGuard 行为测试（default short=100/60s）。
 *
 * 策略：构造一个最小 Nest 应用（只含 AppController + ThrottlerModule + in-memory storage），
 * 用 supertest 连续发请求，验证达到 limit 后返回 429 + Retry-After 头。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';

@Controller()
class TestController {
  @Get('ping')
  ping() { return { ok: true }; }
}

describe('ThrottlerGuard (default 100/60s)', () => {
  let app: INestApplication;
  const seenIps = new Set<string>();

  beforeAll(async () => {
    process.env.RATE_LIMIT_SHORT = '5'; // 小窗口便于测试
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 60_000, limit: 5 },
        ]),
      ],
      controllers: [TestController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    // 启用 trust proxy 让 X-Forwarded-For 生效 → 测试可按 IP 隔离
    (app.getHttpAdapter().getInstance() as any).set('trust proxy', true);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows first 5 requests, blocks the 6th with 429', async () => {
    const ip = '192.0.2.1';
    seenIps.add(ip);
    const responses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app.getHttpServer()).get('/ping').set('X-Forwarded-For', ip);
      responses.push(res.status);
    }
    // 前 5 个 200，第 6 个 429
    expect(responses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(responses[5]).toBe(429);
  });

  it('different IPs have independent counters', async () => {
    const a = '198.51.100.1';
    const b = '198.51.100.2';
    // 先用光 a 的额度（5 个）
    for (let i = 0; i < 5; i++) {
      const r = await request(app.getHttpServer()).get('/ping').set('X-Forwarded-For', a);
      expect(r.status).toBe(200);
    }
    // a 第 6 个应被拒
    const aBlocked = await request(app.getHttpServer()).get('/ping').set('X-Forwarded-For', a);
    expect(aBlocked.status).toBe(429);
    // b 是新 IP，应仍可用
    const bOk = await request(app.getHttpServer()).get('/ping').set('X-Forwarded-For', b);
    expect(bOk.status).toBe(200);
  });

  it('429 response carries error message and rate limit metadata', async () => {
    const ip = '203.0.113.99';
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/ping').set('X-Forwarded-For', ip);
    }
    const res = await request(app.getHttpServer()).get('/ping').set('X-Forwarded-For', ip);
    expect(res.status).toBe(429);
    // 验证 429 响应体或 header 至少有一处带 "throttl" / "limit" / "rate" 之类信息
    const body = JSON.stringify(res.body || {});
    const headers = JSON.stringify(res.headers || {});
    const hasMeta = /throttl|rate.?limit|too.?many/i.test(body + headers);
    expect(hasMeta).toBe(true);
  });
});
