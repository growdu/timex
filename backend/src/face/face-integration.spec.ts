/**
 * FaceController supertest 集成 — 验证路由 + 状态码 + payload 透传。
 * 通过 mock FaceService 验证 controller 不做额外逻辑；JWT guard 被 stub 掉。
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FaceController } from './face.controller';
import { FaceService } from './face.service';

describe('FaceController (integration)', () => {
  let app: INestApplication;
  const svc = {
    getMyProfile: jest.fn().mockResolvedValue({
      userId: 'u1',
      referenceCount: 0,
      enabledCount: 0,
      hasProfile: false,
    }),
    addReference: jest.fn().mockResolvedValue({ refId: 'r1', jobId: 'j1' }),
    removeReference: jest.fn().mockResolvedValue(undefined),
    setReferenceEnabled: jest.fn().mockResolvedValue(undefined),
    searchMine: jest.fn().mockResolvedValue([]),
    enqueueExtractFaces: jest.fn().mockResolvedValue({ jobId: 'j2' }),
    startBackfill: jest.fn().mockResolvedValue({
      total: 0,
      processed: 0,
      failed: 0,
      status: 'running',
    }),
    getBackfillStatus: jest.fn().mockReturnValue({
      total: 0,
      processed: 0,
      failed: 0,
      status: 'idle',
    }),
  };

  // 用一个永不抛错的中间件把 request.user 设为 { id: 'u1' }，模拟 JWT 守卫效果
  class _FakeAuth {
    use(_req: any, _res: any, next: () => void) {
      return next();
    }
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [FaceController],
      providers: [{ provide: FaceService, useValue: svc }],
    }).compile();
    app = mod.createNestApplication();
    // 直接挂一个 stub 中间件：写入 req.user = { id: 'u1' }
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { id: 'u1' };
      next();
    });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /faces/me returns self profile', async () => {
    const res = await request(app.getHttpServer()).get('/faces/me');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
  });

  it('POST /faces/me/references accepts imageUrl', async () => {
    const res = await request(app.getHttpServer())
      .post('/faces/me/references')
      .send({ imageUrl: 'https://x/1.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.refId).toBe('r1');
    expect(svc.addReference).toHaveBeenCalledWith(
      'u1',
      'https://x/1.jpg',
      undefined,
    );
  });

  it('DELETE /faces/me/references/:refId calls service', async () => {
    const res = await request(app.getHttpServer()).delete(
      '/faces/me/references/r1',
    );
    expect(res.status).toBe(200);
    expect(svc.removeReference).toHaveBeenCalledWith('u1', 'r1');
  });

  it('PATCH /faces/me/references/:refId updates enabled flag', async () => {
    const res = await request(app.getHttpServer())
      .patch('/faces/me/references/r1')
      .send({ enabled: false });
    expect(res.status).toBe(200);
    expect(svc.setReferenceEnabled).toHaveBeenCalledWith('u1', 'r1', false);
  });

  it('POST /faces/search returns hits', async () => {
    svc.searchMine.mockResolvedValueOnce([
      { moment: { id: 'm1' }, distance: 0.1 },
    ]);
    const res = await request(app.getHttpServer())
      .post('/faces/search')
      .send({ topK: 50 });
    expect(res.status).toBe(201);
    expect(res.body[0].moment.id).toBe('m1');
  });

  it('POST /faces/moments/:momentId/extract returns jobId', async () => {
    const res = await request(app.getHttpServer()).post(
      '/faces/moments/m1/extract',
    );
    expect(res.status).toBe(201);
    expect(res.body.jobId).toBe('j2');
  });

  it('POST /faces/backfill returns initial status', async () => {
    const res = await request(app.getHttpServer()).post('/faces/backfill');
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('running');
  });

  it('GET /faces/backfill/status returns idle by default', async () => {
    const res = await request(app.getHttpServer()).get(
      '/faces/backfill/status',
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('idle');
  });
});
