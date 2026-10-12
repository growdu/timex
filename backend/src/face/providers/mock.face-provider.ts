import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import {
  BBox, FACE_VECTOR_DIM, FaceEmbedding, FaceProvider,
} from './face-provider.interface';

function deterministicVector(seed: string): number[] {
  const hash = createHash('sha256').update(seed).digest();
  const out = new Array<number>(FACE_VECTOR_DIM).fill(0);
  for (let i = 0; i < FACE_VECTOR_DIM; i++) {
    out[i] = (hash[i % hash.length] / 255) * 2 - 1;
  }
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}

@Injectable()
export class MockFaceProvider implements FaceProvider {
  readonly name = 'mock' as const;

  async detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]> {
    return [{
      bbox: { x: 0, y: 0, w: 1, h: 1 },
      vector: deterministicVector(imageUrl),
      confidence: 1,
    }];
  }

  async embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding> {
    return {
      bbox: bboxHint,
      vector: deterministicVector(`${imageUrl}#${bboxHint.x},${bboxHint.y},${bboxHint.w},${bboxHint.h}`),
      confidence: 1,
    };
  }
}