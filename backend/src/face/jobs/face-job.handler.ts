import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFaceEmbedding } from '../entities/user-face-embedding.entity';
import { MomentFace } from '../entities/moment-face.entity';
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

@Injectable()
export class FaceJobHandler {
  private readonly log = new Logger(FaceJobHandler.name);

  constructor(
    @InjectRepository(UserFaceEmbedding)
    private readonly ufe: Repository<UserFaceEmbedding>,
    @InjectRepository(MomentFace)
    private readonly mf: Repository<MomentFace>,
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