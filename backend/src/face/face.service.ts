import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Moment } from '../moments/moment.entity';
import { UserFaceEmbedding } from './entities/user-face-embedding.entity';
import { MomentFace } from './entities/moment-face.entity';
import type { FaceConfig } from '../config/face.config';
import { FACE_CONFIG } from '../config/face.config';
import { FaceProviderFactory } from './providers/face-provider.factory';
import { BBox } from './providers/face-provider.interface';
import {
  MomentHit,
  VectorSearchService,
} from './search/vector-search.service';
import { AiService } from '../ai/ai.service';

export interface ProfileSummary {
  userId: string;
  referenceCount: number;
  enabledCount: number;
  hasProfile: boolean;
}

export interface BackfillStatus {
  total: number;
  processed: number;
  failed: number;
  status: 'idle' | 'running' | 'done';
}

@Injectable()
export class FaceService {
  private readonly log = new Logger(FaceService.name);
  private backfill: BackfillStatus = {
    total: 0,
    processed: 0,
    failed: 0,
    status: 'idle',
  };

  constructor(
    @InjectRepository(Moment)
    private readonly moments: Repository<Moment>,
    @InjectRepository(UserFaceEmbedding)
    private readonly ufe: Repository<UserFaceEmbedding>,
    @InjectRepository(MomentFace)
    private readonly mf: Repository<MomentFace>,
    private readonly ds: DataSource,
    private readonly factory: FaceProviderFactory,
    private readonly search: VectorSearchService,
    @Inject(forwardRef(() => AiService))
    private readonly ai: AiService,
    @Inject(FACE_CONFIG)
    private readonly cfg: FaceConfig,
  ) {}

  /** 取 self profile 概览（无记录返回全 0） */
  async getMyProfile(userId: string): Promise<ProfileSummary> {
    const rows = await this.ds.query(
      `SELECT COUNT(*)::int AS cnt,
              SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END)::int AS enabled
         FROM user_face_embeddings WHERE user_id = $1`,
      [userId],
    );
    const cnt = Number(rows[0]?.cnt ?? 0);
    const enabled = Number(rows[0]?.enabled ?? 0);
    return {
      userId,
      referenceCount: cnt,
      enabledCount: enabled,
      hasProfile: cnt > 0,
    };
  }

  /** 添加一张本人参考图（同 user/sourceUrl 重复 → 409） */
  async addReference(
    userId: string,
    imageUrl: string,
    _bboxHint?: BBox,
  ): Promise<{ refId: string; jobId: string }> {
    // 1. 创建 placeholder 行（embedding 全 0 占位，job 完成覆写）
    let ref: UserFaceEmbedding;
    try {
      ref = await this.ufe.save(
        this.ufe.create({
          userId,
          sourceUrl: imageUrl,
          embedding: new Array(512).fill(0),
          provider: 'pending',
        }),
      );
    } catch (e: unknown) {
      if (isUniqueViolation(e)) {
        throw new ConflictException('reference already exists');
      }
      throw e;
    }
    // 2. 入队 face-embed
    const job = await this.ai.submit({
      userId,
      kind: 'face-embed',
      targetType: 'face_reference',
      targetId: ref.id,
      promptInput: { imageUrl, refId: ref.id } as never,
    });
    return { refId: ref.id, jobId: job.id };
  }

  async removeReference(userId: string, refId: string): Promise<void> {
    const res = await this.ufe.delete({ id: refId, userId });
    if (res.affected === 0) throw new NotFoundException('reference not found');
  }

  async setReferenceEnabled(
    userId: string,
    refId: string,
    enabled: boolean,
  ): Promise<void> {
    const res = await this.ufe.update(
      { id: refId, userId },
      { isEnabled: enabled },
    );
    if (res.affected === 0) throw new NotFoundException('reference not found');
  }

  /** 单 user 检索：所有本人 face embeddings 对所有 moment_faces 做 ANN */
  async searchMine(
    userId: string,
    opts: { threshold?: number; topK?: number },
  ): Promise<Array<{ moment: Moment; distance: number }>> {
    const refs = await this.ufe.find({
      where: { userId, isEnabled: true },
    });
    if (refs.length === 0) return [];
    const queries = refs.map((r) => r.embedding);
    const hits: MomentHit[] = await this.search.searchMomentsByEmbeddings(
      userId,
      queries,
      opts.threshold,
      opts.topK,
    );
    if (hits.length === 0) return [];
    const ids = hits.map((h) => h.momentId);
    const moments = await this.moments.find({
      where: ids.map((id) => ({ id, userId })),
    });
    const byId = new Map(moments.map((m) => [m.id, m]));
    return hits
      .map((h) => {
        const m = byId.get(h.momentId);
        return m ? { moment: m, distance: h.distance } : null;
      })
      .filter(
        (x): x is { moment: Moment; distance: number } => x !== null,
      );
  }

  /** 单张 moment 入队 face-extract */
  async enqueueExtractFaces(
    userId: string,
    momentId: string,
  ): Promise<{ jobId: string }> {
    const m = await this.moments.findOne({ where: { id: momentId, userId } });
    if (!m) throw new NotFoundException('moment not found');
    if (m.type !== 'photo') {
      throw new NotFoundException('moment is not a photo');
    }
    const job = await this.ai.submit({
      userId,
      kind: 'face-extract',
      targetType: 'face_match',
      targetId: m.id,
      promptInput: { momentId: m.id, imageUrl: m.mediaUrl } as never,
    });
    return { jobId: job.id };
  }

  /** 一次性回填：本用户所有 photo 中尚未提取过 face 的 moment */
  async startBackfill(userId: string): Promise<BackfillStatus> {
    const rows = await this.ds.query(
      `SELECT m.id FROM moments m
        LEFT JOIN moment_faces mf ON mf.moment_id = m.id
        WHERE m.user_id = $1 AND m.type = 'photo' AND mf.id IS NULL`,
      [userId],
    );
    const ids = rows.map((r: { id: string }) => r.id);
    this.backfill = {
      total: ids.length,
      processed: 0,
      failed: 0,
      status: 'running',
    };

    // Defer the worker so the synchronous prefix (no-await branch when ids=0)
    // does not mutate this.backfill.status before the caller observes it.
    setImmediate(() => {
      void (async () => {
        const batch = this.cfg.search.backfillBatch;
        for (let i = 0; i < ids.length; i += batch) {
          const slice = ids.slice(i, i + batch);
          await Promise.all(
            slice.map((mid: string) =>
              this.ai
                .submit({
                  userId,
                  kind: 'face-extract',
                  targetType: 'face_match',
                  targetId: mid,
                  promptInput: { momentId: mid } as never,
                })
                .then(
                  () => {
                    this.backfill.processed++;
                  },
                  () => {
                    this.backfill.failed++;
                  },
                ),
            ),
          );
          await new Promise((r) => setTimeout(r, 1000));
        }
        this.backfill.status = 'done';
      })();
    });

    return this.backfill;
  }

  getBackfillStatus(): BackfillStatus {
    return this.backfill;
  }
}

function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  return code === '23505';
}