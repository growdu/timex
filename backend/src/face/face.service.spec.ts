/**
 * FaceService 单元测试 — 用纯 mock 验证关键逻辑分支：
 *   - getMyProfile 计数
 *   - addReference 重复检测 + 入队 face-embed
 *   - removeReference / setReferenceEnabled NotFound 处理
 *   - searchMine 空 refs / join hits with moments
 *   - enqueueExtractFaces 校验 moment 类型
 */
import { FaceService } from './face.service';

function mkSvc() {
  const moments = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const ufe = {
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };
  const mf = {} as never;
  const ds = { query: jest.fn().mockResolvedValue([]) };
  const factory = { resolve: jest.fn() };
  const search = {
    searchMomentsByEmbeddings: jest.fn().mockResolvedValue([]),
  };
  const ai = { submit: jest.fn().mockResolvedValue({ id: 'job1' }) };
  const cfg = {
    search: { backfillBatch: 2, threshold: 0.6, topK: 10 },
  } as never;
  return {
    svc: new FaceService(
      moments as never,
      ufe as never,
      mf,
      ds as never,
      factory as never,
      search as never,
      ai as never,
      cfg,
    ),
    moments,
    ufe,
    mf,
    ds,
    factory,
    search,
    ai,
    cfg,
  };
}

describe('FaceService.getMyProfile', () => {
  it('returns zero counts when no rows', async () => {
    const { svc, ds } = mkSvc();
    ds.query.mockResolvedValueOnce([{ cnt: 0, enabled: 0 }]);
    const out = await svc.getMyProfile('u1');
    expect(out).toEqual({
      userId: 'u1',
      referenceCount: 0,
      enabledCount: 0,
      hasProfile: false,
    });
  });

  it('counts enabled and disabled references separately', async () => {
    const { svc, ds } = mkSvc();
    ds.query.mockResolvedValueOnce([{ cnt: 5, enabled: 3 }]);
    const out = await svc.getMyProfile('u1');
    expect(out.referenceCount).toBe(5);
    expect(out.enabledCount).toBe(3);
    expect(out.hasProfile).toBe(true);
  });
});

describe('FaceService.addReference', () => {
  it('throws ConflictException on duplicate (PG 23505)', async () => {
    const { svc, ufe } = mkSvc();
    ufe.create.mockReturnValue({});
    ufe.save.mockRejectedValue({ code: '23505' });
    await expect(svc.addReference('u1', 'https://x/dup.jpg')).rejects.toThrow();
  });

  it('succeeds and enqueues face-embed job', async () => {
    const { svc, ufe, ai } = mkSvc();
    ufe.create.mockReturnValue({ id: 'r1' });
    ufe.save.mockResolvedValue({ id: 'r1' });
    const out = await svc.addReference('u1', 'https://x/2.jpg');
    expect(out.refId).toBe('r1');
    expect(out.jobId).toBe('job1');
    expect(ai.submit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'face-embed' }),
    );
  });
});

describe('FaceService.removeReference', () => {
  it('throws NotFound when affected=0', async () => {
    const { svc, ufe } = mkSvc();
    ufe.delete.mockResolvedValue({ affected: 0 });
    await expect(svc.removeReference('u1', 'r1')).rejects.toThrow();
  });
  it('resolves when affected=1', async () => {
    const { svc, ufe } = mkSvc();
    ufe.delete.mockResolvedValue({ affected: 1 });
    await expect(svc.removeReference('u1', 'r1')).resolves.toBeUndefined();
  });
});

describe('FaceService.setReferenceEnabled', () => {
  it('throws NotFound when affected=0', async () => {
    const { svc, ufe } = mkSvc();
    ufe.update.mockResolvedValue({ affected: 0 });
    await expect(svc.setReferenceEnabled('u1', 'r1', false)).rejects.toThrow();
  });
  it('updates row when exists', async () => {
    const { svc, ufe } = mkSvc();
    ufe.update.mockResolvedValue({ affected: 1 });
    await expect(
      svc.setReferenceEnabled('u1', 'r1', false),
    ).resolves.toBeUndefined();
    expect(ufe.update).toHaveBeenCalledWith(
      { id: 'r1', userId: 'u1' },
      { isEnabled: false },
    );
  });
});

describe('FaceService.searchMine', () => {
  it('returns [] when no references', async () => {
    const { svc, ufe } = mkSvc();
    ufe.find.mockResolvedValue([]);
    const out = await svc.searchMine('u1', {});
    expect(out).toEqual([]);
  });

  it('returns [] when search yields no hits', async () => {
    const { svc, ufe, search } = mkSvc();
    ufe.find.mockResolvedValue([{ id: 'r1', embedding: [0.1] }]);
    search.searchMomentsByEmbeddings.mockResolvedValue([]);
    const out = await svc.searchMine('u1', {});
    expect(out).toEqual([]);
  });

  it('joins hits with moments by id', async () => {
    const { svc, ufe, search, moments } = mkSvc();
    ufe.find.mockResolvedValue([
      { id: 'r1', embedding: [0.1] },
      { id: 'r2', embedding: [0.2] },
    ]);
    search.searchMomentsByEmbeddings.mockResolvedValue([
      { momentId: 'm1', distance: 0.1 },
      { momentId: 'm2', distance: 0.2 },
    ]);
    moments.find.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
    const out = await svc.searchMine('u1', {});
    expect(out).toHaveLength(2);
    expect(out[0].moment.id).toBe('m1');
    expect(out[0].distance).toBe(0.1);
    expect(out[1].moment.id).toBe('m2');
  });

  it('drops hits whose moments no longer exist', async () => {
    const { svc, ufe, search, moments } = mkSvc();
    ufe.find.mockResolvedValue([{ id: 'r1', embedding: [0.1] }]);
    search.searchMomentsByEmbeddings.mockResolvedValue([
      { momentId: 'm1', distance: 0.1 },
      { momentId: 'missing', distance: 0.2 },
    ]);
    moments.find.mockResolvedValue([{ id: 'm1' }]);
    const out = await svc.searchMine('u1', {});
    expect(out).toHaveLength(1);
    expect(out[0].moment.id).toBe('m1');
  });
});

describe('FaceService.enqueueExtractFaces', () => {
  it('throws when moment not found', async () => {
    const { svc, moments } = mkSvc();
    moments.findOne.mockResolvedValue(null);
    await expect(svc.enqueueExtractFaces('u1', 'm1')).rejects.toThrow();
  });
  it('throws when not a photo moment', async () => {
    const { svc, moments } = mkSvc();
    moments.findOne.mockResolvedValue({ id: 'm1', type: 'video' });
    await expect(svc.enqueueExtractFaces('u1', 'm1')).rejects.toThrow();
  });
  it('returns jobId when valid photo', async () => {
    const { svc, moments, ai } = mkSvc();
    moments.findOne.mockResolvedValue({
      id: 'm1',
      type: 'photo',
      mediaUrl: 'https://x/m.jpg',
    });
    const out = await svc.enqueueExtractFaces('u1', 'm1');
    expect(out.jobId).toBe('job1');
    expect(ai.submit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'face-extract' }),
    );
  });
});

describe('FaceService.startBackfill / getBackfillStatus', () => {
  it('returns running status with empty queue when no missing faces', async () => {
    const { svc, ds } = mkSvc();
    ds.query.mockResolvedValueOnce([]);
    const out = await svc.startBackfill('u1');
    expect(out.status).toBe('running');
    expect(out.total).toBe(0);
    expect(svc.getBackfillStatus()).toEqual(out);
  });

  it('reports total count from DB query', async () => {
    const { svc, ds } = mkSvc();
    ds.query.mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]);
    const out = await svc.startBackfill('u1');
    expect(out.total).toBe(3);
    expect(out.status).toBe('running');
  });
});
