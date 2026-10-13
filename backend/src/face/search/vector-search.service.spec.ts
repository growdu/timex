import { VectorSearchService } from './vector-search.service';

describe('VectorSearchService', () => {
  const cfg = { search: { threshold: 0.6, topK: 200, backfillBatch: 10 } } as never;

  it('returns [] when no queries', async () => {
    const ds = { query: jest.fn() } as unknown as { query: jest.Mock };
    const svc = new VectorSearchService(ds as never, cfg);
    expect(await svc.searchMomentsByEmbeddings('u1', [])).toEqual([]);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('passes userId, queries, threshold, topK to query', async () => {
    const ds = { query: jest.fn().mockResolvedValue([]) } as unknown as { query: jest.Mock };
    const svc = new VectorSearchService(ds as never, cfg);
    const q = [new Array(512).fill(0.1)];
    await svc.searchMomentsByEmbeddings('u1', q, 0.5, 10);
    expect(ds.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (ds.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('moment_faces');
    expect(params[0]).toBe('u1');
    expect(params[1]).toBe(q);
    expect(params[2]).toBe(0.5);
    expect(params[3]).toBe(10);
  });

  it('uses defaults from config when not passed', async () => {
    const ds = { query: jest.fn().mockResolvedValue([]) } as unknown as { query: jest.Mock };
    const svc = new VectorSearchService(ds as never, cfg);
    await svc.searchMomentsByEmbeddings('u1', [new Array(512).fill(0)]);
    const [, params] = (ds.query as jest.Mock).mock.calls[0];
    expect(params[2]).toBe(0.6);
    expect(params[3]).toBe(200);
  });

  it('maps DB rows to momentHit[]', async () => {
    const rows = [
      { momentId: 'm1', distance: '0.1' },
      { momentId: 'm2', distance: '0.2' },
    ];
    const ds = { query: jest.fn().mockResolvedValue(rows) } as unknown as { query: jest.Mock };
    const svc = new VectorSearchService(ds as never, cfg);
    const out = await svc.searchMomentsByEmbeddings('u1', [new Array(512).fill(0)]);
    expect(out).toEqual([
      { momentId: 'm1', distance: 0.1 },
      { momentId: 'm2', distance: 0.2 },
    ]);
  });
});

describe('VectorSearchService.searchDumpItemsByEmbeddings', () => {
  const cfg = { search: { threshold: 0.6, topK: 200, backfillBatch: 10 } } as never;

  it('returns [] when no queries', async () => {
    const ds = { query: jest.fn() } as unknown as { query: jest.Mock };
    const svc = new VectorSearchService(ds as never, cfg);
    expect(await svc.searchDumpItemsByEmbeddings('u1', 'd1', [])).toEqual([]);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('passes userId/dumpId/queries/threshold/topK to query', async () => {
    const ds = { query: jest.fn().mockResolvedValue([]) } as unknown as { query: jest.Mock };
    const svc = new VectorSearchService(ds as never, cfg);
    const q = [new Array(512).fill(0.1)];
    await svc.searchDumpItemsByEmbeddings('u1', 'd1', q, 0.5, 100);
    expect(ds.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (ds.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('scratch_dump_items');
    expect(params[0]).toBe('u1');
    expect(params[1]).toBe('d1');
    expect(params[2]).toBe(q);
    expect(params[3]).toBe(0.5);
    expect(params[4]).toBe(100);
  });

  it('maps DB rows to scratchDumpItemHit[] with numeric distance', async () => {
    const rows = [
      { itemId: 'i1', distance: '0.1' },
      { itemId: 'i2', distance: '0.2' },
    ];
    const ds = { query: jest.fn().mockResolvedValue(rows) } as unknown as { query: jest.Mock };
    const svc = new VectorSearchService(ds as never, cfg);
    const out = await svc.searchDumpItemsByEmbeddings('u1', 'd1', [new Array(512).fill(0)]);
    expect(out).toEqual([
      { itemId: 'i1', distance: 0.1 },
      { itemId: 'i2', distance: 0.2 },
    ]);
  });
});
