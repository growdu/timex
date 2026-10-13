/**
 * ScratchDumpController supertest 集成 — 验证 /faces/dumps/* 路由 + payload 透传。
 * ScratchDumpService 全部 mock，验证 controller 不做额外业务逻辑；JWT guard 用中间件 stub。
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ScratchDumpController } from './scratch-dump.controller';
import { ScratchDumpService } from './scratch-dump.service';

describe('ScratchDumpController (integration)', () => {
  let app: INestApplication;
  const svc = {
    create: jest.fn().mockImplementation((_u, body) => ({
      id: 'd1',
      userId: 'u1',
      name: body.name,
      status: 'created',
      totalItems: 0,
      doneItems: 0,
      failedItems: 0,
      hitsCount: 0,
      lastSearchAt: null,
    })),
    list: jest.fn().mockResolvedValue([{ id: 'd1', name: 'trip' }]),
    getOne: jest
      .fn()
      .mockResolvedValue({ id: 'd1', name: 'trip', status: 'created' }),
    remove: jest.fn().mockResolvedValue(undefined),
    addItem: jest
      .fn()
      .mockResolvedValue({ itemId: 'i1', jobId: 'j1' }),
    listItems: jest.fn().mockResolvedValue([{ id: 'i1' }]),
    getStatus: jest
      .fn()
      .mockResolvedValue({ total: 0, done: 0, failed: 0, status: 'created' }),
    searchDump: jest
      .fn()
      .mockResolvedValue([{ item: { id: 'i1' }, distance: 0.1, sortKey: 'takenAt', sortValue: 'x' }]),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ScratchDumpController],
      providers: [{ provide: ScratchDumpService, useValue: svc }],
    }).compile();
    app = mod.createNestApplication();
    // 用中间件 stub JWT 守卫：直接写 req.user = { id: 'u1' }
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { id: 'u1' };
      next();
    });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('POST /faces/dumps creates a dump and forwards {name, description}', async () => {
    const res = await request(app.getHttpServer())
      .post('/faces/dumps')
      .send({ name: 'trip', description: 'summer' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('d1');
    expect(svc.create).toHaveBeenCalledWith('u1', {
      name: 'trip',
      description: 'summer',
    });
  });

  it('GET /faces/dumps lists dumps with default limit=50', async () => {
    const res = await request(app.getHttpServer()).get('/faces/dumps');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(svc.list).toHaveBeenCalledWith('u1', 50);
  });

  it('GET /faces/dumps?limit=10 parses the limit query', async () => {
    await request(app.getHttpServer()).get('/faces/dumps?limit=10');
    expect(svc.list).toHaveBeenCalledWith('u1', 10);
  });

  it('GET /faces/dumps/:id returns one dump', async () => {
    const res = await request(app.getHttpServer()).get('/faces/dumps/d1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('d1');
    expect(svc.getOne).toHaveBeenCalledWith('u1', 'd1');
  });

  it('DELETE /faces/dumps/:id removes the dump', async () => {
    const res = await request(app.getHttpServer()).delete('/faces/dumps/d1');
    expect(res.status).toBe(200);
    expect(svc.remove).toHaveBeenCalledWith('u1', 'd1');
  });

  it('POST /faces/dumps/:id/photos enqueues a face-extract-scratch job', async () => {
    const res = await request(app.getHttpServer())
      .post('/faces/dumps/d1/photos')
      .send({ imageUrl: 'https://x/1.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.itemId).toBe('i1');
    expect(res.body.jobId).toBe('j1');
    expect(svc.addItem).toHaveBeenCalledWith('u1', 'd1', {
      imageUrl: 'https://x/1.jpg',
    });
  });

  it('GET /faces/dumps/:id/items accepts ?status=processed', async () => {
    const res = await request(app.getHttpServer()).get(
      '/faces/dumps/d1/items?status=processed',
    );
    expect(res.status).toBe(200);
    expect(svc.listItems).toHaveBeenCalledWith('u1', 'd1', {
      status: 'processed',
    });
  });

  it('GET /faces/dumps/:id/status returns progress counters', async () => {
    const res = await request(app.getHttpServer()).get(
      '/faces/dumps/d1/status',
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('created');
    expect(svc.getStatus).toHaveBeenCalledWith('u1', 'd1');
  });

  it('POST /faces/dumps/:id/search returns ranked hits', async () => {
    const res = await request(app.getHttpServer())
      .post('/faces/dumps/d1/search')
      .send({ threshold: 0.5, topK: 50 });
    expect(res.status).toBe(201);
    expect(res.body[0].item.id).toBe('i1');
    expect(res.body[0].distance).toBe(0.1);
    expect(svc.searchDump).toHaveBeenCalledWith('u1', 'd1', {
      threshold: 0.5,
      topK: 50,
    });
  });
});
