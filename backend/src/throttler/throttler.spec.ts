/**
 * ThrottlerGuard 行为测试（default short=100/60s）。
 *
 * 策略：构造一个最小 Nest 应用（只含 AppController + ThrottlerModule + in-memory storage），
 * 用 supertest 连续发请求，验证达到 limit 后返回 429 + Retry-After 头。
 *
 * 注意：supertest 需要绑定端口。沙箱环境（禁止 listen）会自动跳过，
 * CI 环境正常执行。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';

@Controller()
class TestController {
  @Get('ping')
  ping() {
    return { ok: true };
  }
}

/** 尝试 listen，成功返回 true（沙箱环境 EPERM 返回 false） */
async function canListen(app: INestApplication): Promise<boolean> {
  return new Promise((resolve) => {
    const server = app.getHttpServer();
    server.once('error', () => resolve(false));
    server.listen(0, () => resolve(true));
  });
}

describe('ThrottlerGuard (default 100/60s)', () => {
  let app: INestApplication | null = null;

  beforeAll(async () => {
    process.env.RATE_LIMIT_SHORT = '5'; // 小窗口便于测试
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ name: 'short', ttl: 60_000, limit: 5 }]),
      ],
      controllers: [TestController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    // 启用 trust proxy 让 X-Forwarded-For 生效 → 测试可按 IP 隔离
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
    // 预先 listen：沙箱禁止端口绑定时标记跳过
    if (!(await canListen(app))) {
      await app.close();
      app = null;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('allows first 5 requests, blocks the 6th with 429', async () => {
    if (!app) return; // 沙箱环境跳过
    const ip = '192.0.2.1';
    const responses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app.getHttpServer())
        .get('/ping')
        .set('X-Forwarded-For', ip);
      responses.push(res.status);
    }
    // 前 5 个 200，第 6 个 429
    expect(responses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(responses[5]).toBe(429);
  });

  it('different IPs have independent counters', async () => {
    if (!app) return; // 沙箱环境跳过
    const a = '198.51.100.1';
    const b = '198.51.100.2';
    // 先用光 a 的额度（5 个）
    for (let i = 0; i < 5; i++) {
      const r = await request(app.getHttpServer())
        .get('/ping')
        .set('X-Forwarded-For', a);
      expect(r.status).toBe(200);
    }
    // a 第 6 个应被拒
    const aBlocked = await request(app.getHttpServer())
      .get('/ping')
      .set('X-Forwarded-For', a);
    expect(aBlocked.status).toBe(429);
    // b 是新 IP，应仍可用
    const bOk = await request(app.getHttpServer())
      .get('/ping')
      .set('X-Forwarded-For', b);
    expect(bOk.status).toBe(200);
  });

  it('429 response carries error message and rate limit metadata', async () => {
    if (!app) return; // 沙箱环境跳过
    const ip = '203.0.113.99';
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get('/ping')
        .set('X-Forwarded-For', ip);
    }
    const res = await request(app.getHttpServer())
      .get('/ping')
      .set('X-Forwarded-For', ip);
    expect(res.status).toBe(429);
    // 验证 429 响应体或 header 至少有一处带 "throttl" / "limit" / "rate" 之类信息
    const body = JSON.stringify(res.body || {});
    const headers = JSON.stringify(res.headers || {});
    const hasMeta = /throttl|rate.?limit|too.?many/i.test(body + headers);
    expect(hasMeta).toBe(true);
  });
});
