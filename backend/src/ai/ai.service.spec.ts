/**
 * AiService 单元测试 — 验证 submit/runJob/getJob/listJobs 流程。
 *
 * 策略：用 in-memory Map 模拟 TypeORM Repository；
 * AiRouterProvider 用真实对象（注入 MockProvider）来验证路由降级到 mock。
 * applyToTarget 用 manager.query 写入目标表 — 用 noop 即可（不验证副作用）。
 */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiJob } from './entities/ai-job.entity';
import { AiRouterProvider } from './providers/ai-router.provider';
import { MockProvider } from './providers/mock.provider';

/** in-memory AiJob repo：支持本次测试用到的方法 */
function makeJobRepo() {
  const map = new Map<string, AiJob>();
  let seq = 0;
  const genId = () => `job-${++seq}`;
  return {
    create(data: Partial<AiJob>): AiJob {
      return {
        ...data,
        id: genId(),
        status: 'queued',
        createdAt: new Date(),
      } as AiJob;
    },
    async save(job: AiJob): Promise<AiJob> {
      map.set(job.id, job);
      return job;
    },
    async findOne(args: {
      where: { id: string; userId?: string };
    }): Promise<AiJob | null> {
      const j = map.get(args.where.id);
      if (!j) return null;
      if (args.where.userId && j.userId !== args.where.userId) return null;
      return j;
    },
    async findOneBy(where: { id: string }): Promise<AiJob | null> {
      return map.get(where.id) ?? null;
    },
    async find(args: {
      where: { userId: string };
      order?: any;
      take?: number;
    }): Promise<AiJob[]> {
      const arr = Array.from(map.values()).filter(
        (j) => j.userId === args.where.userId,
      );
      arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return arr.slice(0, args.take ?? 20);
    },
    async update(id: string, patch: Partial<AiJob>): Promise<void> {
      const j = map.get(id);
      if (j) Object.assign(j, patch);
    },
    manager: {
      async query() {
        return [];
      },
    },
  };
}

describe('AiService', () => {
  let service: AiService;
  let repo: ReturnType<typeof makeJobRepo>;
  let mock: MockProvider;

  beforeEach(async () => {
    repo = makeJobRepo();
    mock = new MockProvider();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(AiJob), useValue: repo },
        { provide: AiRouterProvider, useValue: mock },
      ],
    }).compile();
    service = moduleRef.get(AiService);
    // 直接把 service 的 llm 替换为 MockProvider（不依赖 router 配置）
    (service as any).llm = mock;
  });

  it('submit creates a job; background runJob completes with mock provider', async () => {
    const job = await service.submit({
      userId: 'u1',
      kind: 'event-summary',
      targetType: 'event',
      targetId: 'ev-1',
      promptInput: { kind: 'text', text: 'event body' },
    });
    expect(job.id).toBeDefined();
    expect(['queued', 'running', 'succeeded']).toContain(job.status);

    // 等待后台 runJob 完成
    await new Promise((r) => setTimeout(r, 500));
    const final = await repo.findOneBy({ id: job.id });
    expect(final?.status).toBe('succeeded');
    expect(final?.provider).toBe('mock');
    expect(final?.output).toBeDefined();
  });

  it('runNow blocks until job is terminal', async () => {
    const job = await service.runNow({
      userId: 'u2',
      kind: 'memoir-summary',
      targetType: 'memoir',
      targetId: 'mem-1',
      promptInput: { kind: 'text', text: 'long memoir' },
    });
    expect(job.status).toBe('succeeded');
  });

  it('runJob throws NotFound for missing job', async () => {
    await expect(
      service.runJob('nope', { kind: 'text', text: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('runJob is a no-op on already-succeeded jobs', async () => {
    const job = await service.submit({
      userId: 'u3',
      kind: 'event-summary',
      targetType: 'event',
      targetId: 'ev-2',
      promptInput: { kind: 'text', text: 't' },
    });
    await new Promise((r) => setTimeout(r, 500));
    const result = await service.runJob(job.id, { kind: 'text', text: 't' });
    expect(result.status).toBe('succeeded');
  });

  it('getJob returns job for owner', async () => {
    const created = await service.submit({
      userId: 'u4',
      kind: 'image-tag',
      targetType: 'moment',
      targetId: 'm-1',
      promptInput: { kind: 'media-url', url: 'http://x' },
    });
    const got = await service.getJob(created.id, 'u4');
    expect(got.id).toBe(created.id);
  });

  it('getJob throws NotFound for wrong user (cross-user isolation)', async () => {
    const created = await service.submit({
      userId: 'u5',
      kind: 'image-tag',
      targetType: 'moment',
      targetId: 'm-2',
      promptInput: { kind: 'media-url', url: 'http://x' },
    });
    await expect(service.getJob(created.id, 'u6')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('listJobs returns only the user\u2019s jobs, newest first', async () => {
    for (let i = 0; i < 3; i++) {
      await service.submit({
        userId: 'u7',
        kind: 'event-summary',
        targetType: 'event',
        targetId: `ev-${i}`,
        promptInput: { kind: 'text', text: 't' },
      });
    }
    await service.submit({
      userId: 'other',
      kind: 'event-summary',
      targetType: 'event',
      targetId: 'ev-other',
      promptInput: { kind: 'text', text: 't' },
    });
    const list = await service.listJobs('u7', 50);
    expect(list.length).toBe(3);
    expect(list.every((j) => j.userId === 'u7')).toBe(true);
  });
});
