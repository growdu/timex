import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { FaceConfig } from '../../config/face.config';
import { FACE_CONFIG } from '../../config/face.config';

export interface MomentHit {
  momentId: string;
  distance: number;
}

/**
 * pgvector cosine-distance ANN over `moment_faces`.
 * Accepts N query embeddings; for each candidate row picks the best (MIN)
 * distance across the N queries, then filters by threshold and keeps top-K.
 */
@Injectable()
export class VectorSearchService {
  private readonly log = new Logger(VectorSearchService.name);

  constructor(
    private ds: DataSource,
    @Inject(FACE_CONFIG) private cfg: FaceConfig,
  ) {}

  async searchMomentsByEmbeddings(
    userId: string,
    queries: number[][],
    threshold?: number,
    topK?: number,
  ): Promise<MomentHit[]> {
    if (queries.length === 0) return [];
    const thr = threshold ?? this.cfg.search.threshold;
    const k = topK ?? this.cfg.search.topK;
    const sql = `
      WITH q AS (
        SELECT v, ord FROM unnest($2::float[][]) WITH ORDINALITY AS t(v, ord)
      ),
      distances AS (
        SELECT mf.moment_id,
               mf.embedding <=> q.v AS distance,
               q.ord AS query_idx
          FROM moment_faces mf
          CROSS JOIN q
         WHERE mf.user_id = $1
      ),
      best AS (
        SELECT moment_id, MIN(distance) AS distance
          FROM distances
         GROUP BY moment_id
        HAVING MIN(distance) <= $3
      )
      SELECT b.moment_id::text AS "momentId", b.distance
        FROM best b
       ORDER BY b.distance ASC
       LIMIT $4;
    `;
    const rows = await this.ds.query(sql, [userId, queries, thr, k]);
    return (rows as Array<{ momentId: string; distance: number }>)
      .map((r) => ({ momentId: r.momentId, distance: Number(r.distance) }));
  }
}
