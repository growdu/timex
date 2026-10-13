import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';
import { MomentFace } from '../entities/moment-face.entity';
import { ScratchDump } from '../entities/scratch-dump.entity';
import { ScratchDumpItem } from '../entities/scratch-dump-item.entity';
import { FaceProviderFactory } from '../providers/face-provider.factory';
import {
  BBox,
  FaceEmbedding,
  FaceProvider,
} from '../providers/face-provider.interface';
import { MockFaceProvider } from '../providers/mock.face-provider';

export interface FaceEmbedInput {
  imageUrl: string;
  refId: string;
  bboxHint?: BBox;
}

export interface FaceExtractInput {
  momentId: string;
  imageUrl: string;
}

export interface FaceExtractScratchInput {
  dumpId: string;
  imageUrl: string;
}

@Injectable()
export class FaceJobHandler {
  private readonly log = new Logger(FaceJobHandler.name);

  constructor(
    @InjectRepository(UserFaceEmbedding)
    private readonly ufe: Repository<UserFaceEmbedding>,
    @InjectRepository(MomentFace)
    private readonly mf: Repository<MomentFace>,
    @InjectRepository(ScratchDump)
    private readonly sd: Repository<ScratchDump>,
    @InjectRepository(ScratchDumpItem)
    private readonly sdi: Repository<ScratchDumpItem>,
    private readonly factory: FaceProviderFactory,
  ) {}

  /** 单张参考图 → embed & 写回 UserFaceEmbedding */
  async runEmbed(
    userId: string,
    targetId: string,
    input: FaceEmbedInput,
  ): Promise<{ provider: string }> {
    const { provider, faces } = await this.detectOrFallback(input.imageUrl);
    const chosen = pickLargest(faces);
    if (!chosen) throw new Error('no face detected');
    await this.ufe.update(
      { id: targetId, userId },
      {
        embedding: chosen.vector,
        bbox: chosen.bbox,
        provider,
        model: 'auto',
      },
    );
    return { provider };
  }

  /** 单张 moment → extract faces & 覆盖 moment_faces */
  async runExtract(
    userId: string,
    targetId: string,
    input: FaceExtractInput,
  ): Promise<{ provider: string; faces: number }> {
    const { provider, faces } = await this.detectOrFallback(input.imageUrl);
    await this.mf.delete({ momentId: targetId, userId });
    const rows = faces.map((f) => ({
      userId,
      momentId: targetId,
      sourceUrl: input.imageUrl,
      bbox: f.bbox,
      embedding: f.vector,
      provider,
      model: 'auto',
      qualityScore: f.confidence ?? null,
    }));
    if (rows.length) await this.mf.save(rows);
    return { provider, faces: rows.length };
  }

  /**
   * scratch dump 单张照片 → 提取最大人脸 embedding，写回 scratch_dump_items，
   * 并在 dump 上递增 done_items / failed_items。失败回退到 mock，与 runEmbed / runExtract 同款。
   */
  async runExtractScratch(
    userId: string,
    targetId: string,
    input: FaceExtractScratchInput,
  ): Promise<{ provider: string; faces: number; durationMs: number }> {
    const startedAt = Date.now();
    const primary = this.factory.resolve();
    let faces: FaceEmbedding[] = [];
    let providerName: 'cloud' | 'local' | 'mock' = primary.name;
    try {
      faces = await primary.detectAndEmbed(input.imageUrl);
    } catch (e) {
      this.log.warn(
        `scratch extract failed; fallback to mock: ${(e as Error).message}`,
      );
      const mock = new MockFaceProvider();
      faces = await mock.detectAndEmbed(input.imageUrl);
      providerName = 'mock';
    }
    const chosen = pickLargest(faces);
    await this.sdi.update(
      { id: targetId, userId },
      {
        embedding: chosen ? chosen.vector : null,
        bbox: chosen?.bbox ?? null,
        provider: providerName,
        model: 'auto',
        qualityScore: chosen?.confidence ?? null,
        isProcessed: chosen !== null,
        error: chosen ? null : 'no_face_detected',
      },
    );
    if (chosen) {
      await this.sdInc(input.dumpId, userId);
    } else {
      await this.sdFail(input.dumpId, userId);
    }
    await this.sdFinishIfDone(input.dumpId, userId);
    return {
      provider: providerName,
      faces: chosen ? 1 : 0,
      durationMs: Date.now() - startedAt,
    };
  }

  private async sdInc(dumpId: string, userId: string): Promise<void> {
    await this.sd.increment({ id: dumpId, userId }, 'doneItems', 1);
  }

  private async sdFail(dumpId: string, userId: string): Promise<void> {
    await this.sd.increment({ id: dumpId, userId }, 'failedItems', 1);
  }

  /**
   * 当 dump 下所有 items 都跑完（is_processed=true）时，把 dump.status 收尾为 'done' 或 'failed'。
   * 任意失败 → 'failed'，全成功 → 'done'。只在 'processing' 时翻转，避免 done/failed 被倒回 processing。
   *
   * 用 `COUNT(*) FILTER (WHERE is_processed = false)` 单次往返判断；race-safe：每次写完即检查，
   * 多个 job 全部完成时只有最后一个 UPDATE 会真正翻 status。
   */
  private async sdFinishIfDone(dumpId: string, userId: string): Promise<void> {
    const rows: Array<{ remaining: string | number }> = await this.sdi.query(
      `SELECT COUNT(*) FILTER (WHERE is_processed = false) AS remaining
         FROM scratch_dump_items
        WHERE dump_id = $1 AND user_id = $2`,
      [dumpId, userId],
    );
    const remaining = Number(rows[0]?.remaining ?? 0);
    if (remaining !== 0) return;
    await this.sd.query(
      `UPDATE scratch_dumps
          SET status = CASE WHEN failed_items > 0 THEN 'failed' ELSE 'done' END,
              updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'processing'`,
      [dumpId, userId],
    );
  }

  /**
   * 解析 provider；若 primary 抛错则降级到 MockFaceProvider。
   * 统一返回 { provider: 'cloud'|'local'|'mock', faces }。
   */
  private async detectOrFallback(
    imageUrl: string,
  ): Promise<{ provider: string; faces: FaceEmbedding[] }> {
    const primary: FaceProvider = this.factory.resolve();
    try {
      const faces = await primary.detectAndEmbed(imageUrl);
      return { provider: primary.name, faces };
    } catch (e) {
      this.log.warn(
        `primary detect failed, falling back to mock: ${(e as Error).message}`,
      );
      const mock = new MockFaceProvider();
      const faces = await mock.detectAndEmbed(imageUrl);
      return { provider: mock.name, faces };
    }
  }
}

function pickLargest(faces: FaceEmbedding[]): FaceEmbedding | null {
  if (!faces.length) return null;
  return faces.reduce((best, cur) => {
    const a = cur.bbox ? cur.bbox.w * cur.bbox.h : 0;
    const b = best.bbox ? best.bbox.w * best.bbox.h : 0;
    return a > b ? cur : best;
  });
}
