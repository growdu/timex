export const FACE_CONFIG = 'FACE_CONFIG';

export interface FaceConfig {
  provider: 'cloud' | 'local' | 'mock';
  cloud: { baseUrl: string; apiKey: string; timeoutMs: number };
  local: { baseUrl: string; timeoutMs: number };
  search: { threshold: number; topK: number; backfillBatch: number };
}

export function loadFaceConfig(): FaceConfig {
  return {
    provider: (process.env.FACE_PROVIDER ?? 'mock') as FaceConfig['provider'],
    cloud: {
      baseUrl: process.env.FACE_CLOUD_BASE_URL ?? '',
      apiKey: process.env.FACE_CLOUD_API_KEY ?? '',
      timeoutMs: Number(process.env.FACE_CLOUD_TIMEOUT_MS ?? 5000),
    },
    local: {
      baseUrl: process.env.FACE_LOCAL_BASE_URL ?? 'http://localhost:8000',
      timeoutMs: Number(process.env.FACE_LOCAL_TIMEOUT_MS ?? 30000),
    },
    search: {
      threshold: Number(process.env.FACE_SEARCH_THRESHOLD ?? 0.6),
      topK: Number(process.env.FACE_SEARCH_TOPK ?? 200),
      backfillBatch: Number(process.env.FACE_BACKFILL_BATCH ?? 10),
    },
  };
}
