import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { FaceConfig } from '../../config/face.config';
import { FACE_CONFIG } from '../../config/face.config';
import { BBox, FaceEmbedding, FaceProvider } from './face-provider.interface';

interface LocalDetectResponse {
  faces: Array<{
    bbox: { x: number; y: number; w: number; h: number };
    embedding: number[];
    confidence?: number;
  }>;
}

@Injectable()
export class LocalFaceProvider implements FaceProvider {
  readonly name = 'local' as const;

  constructor(
    private http: HttpService,
    @Inject(FACE_CONFIG) private cfg: FaceConfig,
  ) {}

  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    const res = await firstValueFrom(
      this.http.post<LocalDetectResponse>(
        `${this.cfg.local.baseUrl}/detect`,
        { image_url: imageUrl },
        { timeout: this.cfg.local.timeoutMs },
      ),
    );
    return res.data.faces.map((f) => ({
      bbox: f.bbox,
      vector: f.embedding,
      confidence: f.confidence,
    }));
  }

  async embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding> {
    const res = await firstValueFrom(
      this.http.post<{ embedding: number[]; confidence?: number }>(
        `${this.cfg.local.baseUrl}/embed`,
        { image_url: imageUrl, bbox: bboxHint },
        { timeout: this.cfg.local.timeoutMs },
      ),
    );
    return {
      bbox: bboxHint,
      vector: res.data.embedding,
      confidence: res.data.confidence,
    };
  }
}
