export type BBox = { x: number; y: number; w: number; h: number };

export interface FaceEmbedding {
  bbox: BBox | null;
  vector: number[];
  confidence?: number;
}

export const FACE_VECTOR_DIM = 512;

export interface FaceProvider {
  readonly name: 'cloud' | 'local' | 'mock';
  detectAndEmbed(imageUrl: string): Promise<FaceEmbedding[]>;
  embedFace(imageUrl: string, bboxHint: BBox): Promise<FaceEmbedding>;
}
