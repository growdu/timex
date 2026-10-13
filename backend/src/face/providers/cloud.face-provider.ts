import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { FaceConfig } from '../../config/face.config';
import { FACE_CONFIG } from '../../config/face.config';
import { BBox, FaceEmbedding, FaceProvider } from './face-provider.interface';

interface CloudFaceResponse {
  faces: Array<{
    bbox: { x: number; y: number; w: number; h: number };
    embedding: number[];
    confidence?: number;
  }>;
}

@Injectable()
export class CloudFaceProvider implements FaceProvider {
  readonly name = 'cloud' as const;

  constructor(
    private http: HttpService,
    @Inject(FACE_CONFIG) private cfg: FaceConfig,
  ) {}

  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    const res = await firstValueFrom(
      this.http.post<CloudFaceResponse>(
        `${this.cfg.cloud.baseUrl}/v1/face/detect`,
        { image: imageUrl, return_embedding: true },
        {
          headers: { Authorization: `Bearer ${this.cfg.cloud.apiKey}` },
          timeout: this.cfg.cloud.timeoutMs,
        },
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
        `${this.cfg.cloud.baseUrl}/v1/face/embed`,
        { image: imageUrl, bbox: bboxHint },
        {
          headers: { Authorization: `Bearer ${this.cfg.cloud.apiKey}` },
          timeout: this.cfg.cloud.timeoutMs,
        },
      ),
    );
    return {
      bbox: bboxHint,
      vector: res.data.embedding,
      confidence: res.data.confidence,
    };
  }
}
