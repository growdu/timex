import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { FaceConfig } from '../../config/face.config';
import { FACE_CONFIG } from '../../config/face.config';

export interface MomentHit {
  momentId: string;
  distance: number;
}

export interface ScratchDumpItemHit {
  itemId: string;
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
    const rows: Array<{ momentId: string; distance: string | number }> =
      await this.ds.query(sql, [userId, queries, thr, k]);
    return rows.map((r) => ({
      momentId: String(r.momentId),
      distance: Number(r.distance),
    }));
  }

  /**
   * pgvector cosine-distance ANN over `scratch_dump_items`.
   * Scoped to a single dump; each candidate row picks the best (MIN) distance
   * across the N query embeddings, filters by threshold, keeps top-K.
   */
  async searchDumpItemsByEmbeddings(
    userId: string,
    dumpId: string,
    queries: number[][],
    threshold?: number,
    topK?: number,
  ): Promise<ScratchDumpItemHit[]> {
    if (queries.length === 0) return [];
    const thr = threshold ?? this.cfg.search.threshold;
    const k = topK ?? this.cfg.search.topK;
    const sql = `
      WITH q AS (
        SELECT v, ord FROM unnest($3::float[][]) WITH ORDINALITY AS t(v, ord)
      ),
      distances AS (
        SELECT sdi.id AS item_id,
               sdi.embedding <=> q.v AS distance
          FROM scratch_dump_items sdi
          CROSS JOIN q
         WHERE sdi.user_id = $1 AND sdi.dump_id = $2 AND sdi.is_processed = TRUE
      ),
      best AS (
        SELECT item_id, MIN(distance) AS distance
          FROM distances
         GROUP BY item_id
        HAVING MIN(distance) <= $4
      )
      SELECT b.item_id::text AS "itemId", b.distance
        FROM best b
       ORDER BY b.distance ASC
       LIMIT $5;
    `;
    const rows: Array<{ itemId: string; distance: string | number }> =
      await this.ds.query(sql, [userId, dumpId, queries, thr, k]);
    return rows.map((r) => ({
      itemId: String(r.itemId),
      distance: Number(r.distance),
    }));
  }
}
