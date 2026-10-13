import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { ScratchDump } from '../entities/scratch-dump.entity';
import { ScratchDumpItem } from '../entities/scratch-dump-item.entity';
import { AddScratchDumpItemDto } from '../dto/add-scratch-dump-item.dto';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';
import {
  ScratchDumpItemHit,
  VectorSearchService,
} from '../search/vector-search.service';
import { AiService } from '../../ai/ai.service';

export interface DumpHit {
  item: ScratchDumpItem;
  distance: number;
  sortKey: 'takenAt' | 'fileMtime' | 'uploadedAt';
  sortValue: string;
}

/** 用于 body 的 create input（也可放在 DTO，但本子模块习惯保持 service 简单） */
export interface CreateScratchDumpInput {
  name: string;
  description?: string;
}

export interface ListScratchDumpItemsOptions {
  status?: 'pending' | 'processed' | 'failed';
}

@Injectable()
export class ScratchDumpService {
  private readonly log = new Logger(ScratchDumpService.name);

  constructor(
    @InjectRepository(ScratchDump)
    private readonly sd: Repository<ScratchDump>,
    @InjectRepository(ScratchDumpItem)
    private readonly sdi: Repository<ScratchDumpItem>,
    @InjectRepository(UserFaceEmbedding)
    private readonly ufe: Repository<UserFaceEmbedding>,
    private readonly ds: DataSource,
    @Inject(forwardRef(() => AiService))
    private readonly ai: AiService,
    private readonly search: VectorSearchService,
  ) {}

  async create(
    userId: string,
    input: CreateScratchDumpInput,
  ): Promise<ScratchDump> {
    return this.sd.save(
      this.sd.create({
        userId,
        name: input.name,
        description: input.description ?? null,
        status: 'created',
      }),
    );
  }

  async list(userId: string, limit = 50): Promise<ScratchDump[]> {
    return this.sd.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
    });
  }

  async getOne(userId: string, dumpId: string): Promise<ScratchDump> {
    const d = await this.sd.findOne({ where: { id: dumpId, userId } });
    if (!d) throw new NotFoundException('dump not found');
    return d;
  }

  async remove(userId: string, dumpId: string): Promise<void> {
    const res = await this.sd.delete({ id: dumpId, userId });
    if (res.affected === 0) throw new NotFoundException('dump not found');
  }

  async addItem(
    userId: string,
    dumpId: string,
    input: AddScratchDumpItemDto,
  ): Promise<{ itemId: string; jobId: string }> {
    const d = await this.getOne(userId, dumpId);
    let item: ScratchDumpItem;
    try {
      item = await this.sdi.save(
        this.sdi.create({
          userId,
          dumpId: d.id,
          sourceUrl: input.imageUrl,
          takenAt: input.takenAt ? new Date(input.takenAt) : null,
          fileMtime: input.fileMtime ? new Date(input.fileMtime) : null,
          filename: input.filename ?? null,
          width: input.width ?? null,
          height: input.height ?? null,
        }),
      );
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === '23505') {
        throw new ConflictException('item already exists in dump');
      }
      throw e;
    }
    await this.ds.query(
      `UPDATE scratch_dumps
          SET total_items = total_items + 1, updated_at = NOW()
        WHERE id = $1 AND user_id = $2`,
      [d.id, userId],
    );
    const job = await this.ai.submit({
      userId,
      kind: 'face-extract-scratch',
      targetType: 'face_dump_item',
      targetId: item.id,
      promptInput: { dumpId: d.id, imageUrl: input.imageUrl } as never,
    });
    // 一旦入队就把 dump 置 'processing'，让前端 useDumpStatus 1s 轮询生效。
    // 只在 'created' 时翻转，避免反复 addItem 把已收尾的 dump 拉回 'processing'。
    await this.ds.query(
      `UPDATE scratch_dumps
          SET status = 'processing', updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'created'`,
      [d.id, userId],
    );
    return { itemId: item.id, jobId: job.id };
  }

  async listItems(
    userId: string,
    dumpId: string,
    opts?: ListScratchDumpItemsOptions,
  ): Promise<ScratchDumpItem[]> {
    await this.getOne(userId, dumpId);
    const where: Record<string, unknown> = { userId, dumpId };
    if (opts?.status === 'pending') where.isProcessed = false;
    if (opts?.status === 'processed') where.isProcessed = true;
    if (opts?.status === 'failed') where.error = Not(IsNull());
    return this.sdi.find({
      where,
      order: { takenAt: 'DESC', createdAt: 'DESC' },
      take: 1000,
    });
  }

  async getStatus(
    userId: string,
    dumpId: string,
  ): Promise<{
    total: number;
    done: number;
    failed: number;
    status: string;
  }> {
    const d = await this.getOne(userId, dumpId);
    return {
      total: d.totalItems,
      done: d.doneItems,
      failed: d.failedItems,
      status: d.status,
    };
  }

  /**
   * 用本用户 enabled 的 face refs 当 queries，对单个 scratch dump 做 ANN，
   * 按 (takenAt 优先 fileMtime 最后 createdAt) 降序排列，并回写 hits_count / last_search_at。
   */
  async searchDump(
    userId: string,
    dumpId: string,
    opts: { threshold?: number; topK?: number } = {},
  ): Promise<DumpHit[]> {
    await this.getOne(userId, dumpId);
    const refs = await this.ufe.find({
      where: { userId, isEnabled: true },
    });
    if (refs.length === 0) {
      await this.ds.query(
        `UPDATE scratch_dumps
            SET hits_count = 0, last_search_at = NOW()
          WHERE id = $1 AND user_id = $2`,
        [dumpId, userId],
      );
      return [];
    }
    const queries = refs.map((r) => r.embedding);
    const hits: ScratchDumpItemHit[] =
      await this.search.searchDumpItemsByEmbeddings(
        userId,
        dumpId,
        queries,
        opts.threshold,
        opts.topK,
      );
    if (hits.length === 0) {
      await this.ds.query(
        `UPDATE scratch_dumps
            SET hits_count = 0, last_search_at = NOW()
          WHERE id = $1 AND user_id = $2`,
        [dumpId, userId],
      );
      return [];
    }
    const ids = hits.map((h) => h.itemId);
    const items = await this.sdi.find({
      where: ids.map((id) => ({ id, userId })),
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    const out = hits
      .map((h): DumpHit | null => {
        const item = byId.get(h.itemId);
        if (!item) return null;
        const sortKey: DumpHit['sortKey'] = item.takenAt
          ? 'takenAt'
          : item.fileMtime
            ? 'fileMtime'
            : 'uploadedAt';
        const sortValue = (
          item.takenAt ??
          item.fileMtime ??
          item.createdAt
        ).toISOString();
        return { item, distance: h.distance, sortKey, sortValue };
      })
      .filter((x): x is DumpHit => x !== null)
      .sort((a, b) => b.sortValue.localeCompare(a.sortValue));
    await this.ds.query(
      `UPDATE scratch_dumps
          SET hits_count = $1, last_search_at = NOW()
        WHERE id = $2 AND user_id = $3`,
      [out.length, dumpId, userId],
    );
    return out;
  }
}
