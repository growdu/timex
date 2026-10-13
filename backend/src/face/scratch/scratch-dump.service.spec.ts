/**
 * ScratchDumpService 单元测试 — 验证 create / addItem / searchDump / getOne 行为。
 *
 * 策略：Repository / DataSource 用 in-memory stub；VectorSearchService 与 AiService 用 jest mock。
 * 不验证 SQL 细节，只验证 service 的控制流（计数、status 过滤、排序键派生、错误透传）。
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScratchDumpService } from './scratch-dump.service';
import { AddScratchDumpItemDto } from '../dto/add-scratch-dump-item.dto';
import { ScratchDump } from '../entities/scratch-dump.entity';
import { ScratchDumpItem } from '../entities/scratch-dump-item.entity';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';

function matchRow<T>(row: T, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, val]) => {
    const cell = (row as Record<string, unknown>)[k];
    // Support TypeORM FindOperator Not(IsNull()) — { _type: 'not', _value: { _type: 'isNull' } }
    if (
      val &&
      typeof val === 'object' &&
      (val as { _type?: string })._type === 'not' &&
      (val as { _value?: { _type?: string } })._value?._type === 'isNull'
    ) {
      return cell !== null && cell !== undefined;
    }
    return cell === val;
  });
}

function makeRepo<T extends { id: string }>() {
  const map = new Map<string, T>();
  let seq = 0;
  const gen = () => `id-${++seq}`;
  return {
    create: jest.fn((data: Partial<T>): T => {
      return { id: gen(), ...data } as T;
    }),
    async save(entity: T): Promise<T> {
      map.set(entity.id, entity);
      return entity;
    },
    async findOne(args: { where: Partial<T> }): Promise<T | null> {
      for (const v of map.values()) {
        if (matchRow(v, args.where as Record<string, unknown>)) return v;
      }
      return null;
    },
    async find(args: {
      where: Partial<T> | Array<Partial<T>>;
      order?: Record<string, 'ASC' | 'DESC' | 'DESC NULLS LAST'>;
      take?: number;
    }): Promise<T[]> {
      const { where, order, take } = args;
      const wheres: Array<Record<string, unknown>> = Array.isArray(where)
        ? where
        : [where];
      const arr = Array.from(map.values()).filter((v) =>
        wheres.some((w) => matchRow(v, w)),
      );
      if (order) {
        const [[k, dir]] = Object.entries(order);
        arr.sort((a, b) => {
          const av = (a as Record<string, unknown>)[k] as Date;
          const bv = (b as Record<string, unknown>)[k] as Date;
          const cmp =
            av instanceof Date && bv instanceof Date
              ? av.getTime() - bv.getTime()
              : 0;
          return dir === 'DESC' ? -cmp : cmp;
        });
      }
      return typeof take === 'number' ? arr.slice(0, take) : arr;
    },
    async delete(args: {
      id: string;
      userId: string;
    }): Promise<{ affected: number }> {
      const v = map.get(args.id);
      if (v && (v as Record<string, unknown>).userId === args.userId) {
        map.delete(args.id);
        return { affected: 1 };
      }
      return { affected: 0 };
    },
    _map: map,
  };
}

describe('ScratchDumpService', () => {
  let svc: ScratchDumpService;
  let sd: ReturnType<typeof makeRepo<ScratchDump>>;
  let sdi: ReturnType<typeof makeRepo<ScratchDumpItem>>;
  let ufe: ReturnType<typeof makeRepo<UserFaceEmbedding>>;
  let ds: { query: jest.Mock };
  let ai: { submit: jest.Mock };
  let search: { searchDumpItemsByEmbeddings: jest.Mock };

  beforeEach(() => {
    sd = makeRepo<ScratchDump>();
    sdi = makeRepo<ScratchDumpItem>();
    ufe = makeRepo<UserFaceEmbedding>();
    ds = { query: jest.fn().mockResolvedValue(undefined) };
    ai = {
      submit: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    search = {
      searchDumpItemsByEmbeddings: jest.fn().mockResolvedValue([]),
    };
    svc = new ScratchDumpService(
      sd as never,
      sdi as never,
      ufe as never,
      ds as never,
      ai as never,
      search as never,
    );
  });

  describe('create', () => {
    it('persists a dump with status=created and returns it', async () => {
      const d = await svc.create('u1', { name: 'trip' });
      expect(d.id).toBeDefined();
      expect(d.userId).toBe('u1');
      expect(d.name).toBe('trip');
      expect(d.status).toBe('created');
    });

    it('list returns dumps newest first, capped at 200', async () => {
      for (let i = 0; i < 3; i++) {
        await svc.create('u1', { name: `d${i}` });
      }
      const arr = await svc.list('u1');
      expect(arr).toHaveLength(3);
    });

    it('list caps limit at 200', async () => {
      for (let i = 0; i < 5; i++) {
        await svc.create('u1', { name: `d${i}` });
      }
      const arr = await svc.list('u1', 9999);
      expect(arr.length).toBeLessThanOrEqual(200);
    });

    it('getOne throws NotFound when dump missing or wrong user', async () => {
      await svc.create('u1', { name: 'mine' });
      await expect(svc.getOne('u1', 'nope')).rejects.toThrow(NotFoundException);
      const d = await svc.create('u2', { name: 'theirs' });
      await expect(svc.getOne('u1', d.id)).rejects.toThrow(NotFoundException);
    });

    it('remove returns void when dump exists; NotFound when not', async () => {
      const d = await svc.create('u1', { name: 'rm' });
      await expect(svc.remove('u1', d.id)).resolves.toBeUndefined();
      await expect(svc.remove('u1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItem', () => {
    it('creates an item, increments total_items, and enqueues face-extract-scratch', async () => {
      const d = await svc.create('u1', { name: 'batch' });
      const dto: AddScratchDumpItemDto = { imageUrl: 'https://x/1.jpg' };
      const out = await svc.addItem('u1', d.id, dto);
      expect(out.itemId).toBeDefined();
      expect(out.jobId).toBe('job-1');
      expect(ai.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          kind: 'face-extract-scratch',
          targetType: 'face_dump_item',
        }),
      );
      // total_items 递增 SQL 被触发（占位）
      expect(ds.query).toHaveBeenCalled();
    });

    it('flips dump status from created to processing after enqueueing', async () => {
      const d = await svc.create('u1', { name: 'd' });
      await svc.addItem('u1', d.id, { imageUrl: 'https://x/1.jpg' });
      // 最后一次 ds.query 调用应该是 status='processing' 的 UPDATE
      const lastCall = ds.query.mock.calls.at(-1)!;
      const [sql, params] = lastCall;
      expect(sql).toMatch(/status\s*=\s*'processing'/);
      expect(sql).toMatch(/status\s*=\s*'created'/); // 只在 created 时翻转
      expect(params).toEqual([d.id, 'u1']);
    });

    it('throws ConflictException when the (dump, sourceUrl) unique constraint fires', async () => {
      const d = await svc.create('u1', { name: 'd' });
      sdi.save = jest
        .fn()
        .mockRejectedValueOnce({ code: '23505' })
        .mockResolvedValueOnce({ id: 'i2' });
      svc = new ScratchDumpService(
        sd as never,
        sdi as never,
        ufe as never,
        ds as never,
        ai as never,
        search as never,
      );
      await expect(
        svc.addItem('u1', d.id, { imageUrl: 'https://x/1.jpg' }),
      ).rejects.toThrow(ConflictException);
    });

    it('passes through non-23505 errors unchanged', async () => {
      const d = await svc.create('u1', { name: 'd' });
      const err = Object.assign(new Error('disk full'), { code: 'XX001' });
      sdi.save = jest.fn().mockRejectedValueOnce(err);
      svc = new ScratchDumpService(
        sd as never,
        sdi as never,
        ufe as never,
        ds as never,
        ai as never,
        search as never,
      );
      await expect(
        svc.addItem('u1', d.id, { imageUrl: 'https://x/1.jpg' }),
      ).rejects.toThrow('disk full');
    });

    it('parses takenAt/fileMtime/width/height from DTO when provided', async () => {
      const d = await svc.create('u1', { name: 'd' });
      const dto: AddScratchDumpItemDto = {
        imageUrl: 'https://x/2.jpg',
        takenAt: '2024-05-01T10:00:00.000Z',
        fileMtime: '2024-05-02T11:00:00.000Z',
        filename: 'a.jpg',
        width: 800,
        height: 600,
      };
      await svc.addItem('u1', d.id, dto);
      // 走的是 this.sdi.create → save 链路；最后一次 create 调用就是这次
      const lastCreateCallArgs = (sdi.create as jest.Mock).mock.calls.at(
        -1,
      )![0];
      expect(lastCreateCallArgs.sourceUrl).toBe('https://x/2.jpg');
      expect(lastCreateCallArgs.takenAt).toBeInstanceOf(Date);
      expect(lastCreateCallArgs.fileMtime).toBeInstanceOf(Date);
      expect(lastCreateCallArgs.filename).toBe('a.jpg');
      expect(lastCreateCallArgs.width).toBe(800);
      expect(lastCreateCallArgs.height).toBe(600);
    });
  });

  describe('listItems', () => {
    it('filters by status (pending/processed/failed)', async () => {
      const d = await svc.create('u1', { name: 'd' });
      // 三条数据，分别命中三种 status：
      // a: processed, no error
      // b: pending, no error
      // c: processed but has error (语义上是一次"提取到脸但事后被标错"的边角，本测试关注过滤能命中）
      sdi._map.set('a', {
        id: 'a',
        userId: 'u1',
        dumpId: d.id,
        isProcessed: true,
        error: null,
        createdAt: new Date(),
      } as never);
      sdi._map.set('b', {
        id: 'b',
        userId: 'u1',
        dumpId: d.id,
        isProcessed: false,
        error: null,
        createdAt: new Date(),
      } as never);
      sdi._map.set('c', {
        id: 'c',
        userId: 'u1',
        dumpId: d.id,
        isProcessed: true,
        error: 'no_face_detected',
        createdAt: new Date(),
      } as never);

      const processed = await svc.listItems('u1', d.id, {
        status: 'processed',
      });
      // pending 过滤 = isProcessed=false
      expect(
        (await svc.listItems('u1', d.id, { status: 'pending' })).map(
          (i) => i.id,
        ),
      ).toEqual(['b']);
      // failed 过滤 = error IS NOT NULL
      expect(
        (await svc.listItems('u1', d.id, { status: 'failed' })).map(
          (i) => i.id,
        ),
      ).toEqual(['c']);
      // processed = isProcessed=true
      expect(processed.map((i) => i.id).sort()).toEqual(['a', 'c']);
    });
  });

  describe('searchDump', () => {
    it('returns [] and updates hits_count=0 when no enabled refs', async () => {
      const d = await svc.create('u1', { name: 'd' });
      const out = await svc.searchDump('u1', d.id);
      expect(out).toEqual([]);
      expect(search.searchDumpItemsByEmbeddings).not.toHaveBeenCalled();
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('hits_count = 0'),
        expect.arrayContaining([d.id, 'u1']),
      );
    });

    it('joins hits → items, derives sortKey, sorts DESC by sortValue, updates hits_count', async () => {
      const d = await svc.create('u1', { name: 'd' });
      // 一个 enabled ref
      ufe._map.set('ref1', {
        id: 'ref1',
        userId: 'u1',
        isEnabled: true,
        embedding: [0.1, 0.2],
      } as never);
      // 两个 hit 命中（takenAt 早的 vs fileMtime 新的）
      search.searchDumpItemsByEmbeddings.mockResolvedValueOnce([
        { itemId: 'old', distance: 0.1 },
        { itemId: 'new', distance: 0.2 },
      ]);
      sdi._map.set('old', {
        id: 'old',
        userId: 'u1',
        dumpId: d.id,
        takenAt: new Date('2024-01-01T00:00:00Z'),
        fileMtime: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        sourceUrl: 'x',
        provider: 'mock',
        model: null,
        bbox: null,
        embedding: null,
        qualityScore: null,
        isProcessed: true,
        error: null,
        filename: null,
        width: null,
        height: null,
        fileSize: null,
        thumbnailUrl: null,
      });
      sdi._map.set('new', {
        id: 'new',
        userId: 'u1',
        dumpId: d.id,
        takenAt: null,
        fileMtime: new Date('2024-06-01T00:00:00Z'),
        createdAt: new Date('2024-06-01T00:00:00Z'),
        sourceUrl: 'y',
        provider: 'mock',
        model: null,
        bbox: null,
        embedding: null,
        qualityScore: null,
        isProcessed: true,
        error: null,
        filename: null,
        width: null,
        height: null,
        fileSize: null,
        thumbnailUrl: null,
      });
      const out = await svc.searchDump('u1', d.id);
      // 按 sortValue 降序：new (2024-06) 排在 old (2024-01) 之前
      expect(out.map((h) => h.item.id)).toEqual(['new', 'old']);
      expect(out[0].sortKey).toBe('fileMtime');
      expect(out[1].sortKey).toBe('takenAt');
      // hits_count 回写为 2
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('hits_count = $1'),
        expect.arrayContaining([2, d.id, 'u1']),
      );
    });

    it('skips hit whose item row is missing (stale id) and updates hits_count = remaining', async () => {
      const d = await svc.create('u1', { name: 'd' });
      ufe._map.set('ref1', {
        id: 'ref1',
        userId: 'u1',
        isEnabled: true,
        embedding: [0.1, 0.2],
      } as never);
      search.searchDumpItemsByEmbeddings.mockResolvedValueOnce([
        { itemId: 'missing', distance: 0.1 },
        { itemId: 'present', distance: 0.2 },
      ]);
      sdi._map.set('present', {
        id: 'present',
        userId: 'u1',
        dumpId: d.id,
        takenAt: new Date('2024-03-01T00:00:00Z'),
        fileMtime: null,
        createdAt: new Date('2024-03-01T00:00:00Z'),
        sourceUrl: 'p',
        provider: 'mock',
        model: null,
        bbox: null,
        embedding: null,
        qualityScore: null,
        isProcessed: true,
        error: null,
        filename: null,
        width: null,
        height: null,
        fileSize: null,
        thumbnailUrl: null,
      });
      const out = await svc.searchDump('u1', d.id);
      expect(out).toHaveLength(1);
      expect(out[0].item.id).toBe('present');
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('hits_count = $1'),
        expect.arrayContaining([1, d.id, 'u1']),
      );
    });
  });

  describe('getStatus', () => {
    it('returns {total, done, failed, status} from the dump row', async () => {
      const d = await svc.create('u1', { name: 'd' });
      // 模拟 entity 自带 totalItems/doneItems/failedItems
      const stored = sd._map.get(d.id) as unknown as Record<string, unknown>;
      stored.totalItems = 0;
      stored.doneItems = 0;
      stored.failedItems = 0;
      const st = await svc.getStatus('u1', d.id);
      expect(st).toEqual({
        total: 0,
        done: 0,
        failed: 0,
        status: 'created',
      });
    });
  });
});
