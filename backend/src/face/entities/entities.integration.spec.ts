import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config';
import { UserFaceEmbedding } from './user-face-embedding.entity';
import { MomentFace } from './moment-face.entity';

/**
 * Integration spec: exercise UserFaceEmbedding + MomentFace entity mapping against a real
 * Postgres (with pgvector). Each test inserts a fresh user / moment, round-trips the entity,
 * and verifies the unique constraint from the SQL migration actually fires.
 *
 * Requires the dev DB to be reachable (default `pgv-e2e-postgres` on localhost:5432,
 * see Task 1 reports). The Task 1 SQL migration must already have run so the 4 face tables
 * (with pgvector extension) exist.
 *
 * Cleanup strategy: this spec mutates the dev DB by inserting users with predictable emails
 * (t-*@e.test). It is idempotent — `beforeAll` clears any leftover rows from previous runs,
 * and `afterAll` removes whatever this run created. Both rely on `ON DELETE CASCADE` to also
 * wipe any dependent rows (moments → moment_faces; user_face_embeddings).
 */
const TEST_EMAIL_PATTERN = `'t-%@e.test'`;

describe('Face entities mapping', () => {
  let ds: DataSource;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    ds = new DataSource(databaseConfig() as never);
    await ds.initialize();
    // Wipe any leftovers from previous runs so the test is rerunnable.
    await ds.query(`DELETE FROM users WHERE email LIKE ${TEST_EMAIL_PATTERN}`);
  });

  afterAll(async () => {
    // Clean up the rows we inserted during this run (CASCADE wipes dependents).
    if (createdUserIds.length > 0) {
      await ds.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [
        createdUserIds,
      ]);
    }
    await ds.destroy();
  });

  async function makeUser(email: string): Promise<string> {
    const u = await ds.query(
      `INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(),$1,$2) RETURNING id`,
      [email, 'x'],
    );
    const id = u[0].id as string;
    createdUserIds.push(id);
    return id;
  }

  it('round-trips UserFaceEmbedding', async () => {
    const userId = await makeUser('t-roundtrip@e.test');
    const repo = ds.getRepository(UserFaceEmbedding);
    const ref = await repo.save(
      repo.create({
        userId,
        sourceUrl: 'https://x/1.jpg',
        embedding: new Array(512).fill(0).map((_, i) => i / 1000),
        provider: 'mock',
        model: 'fake',
      }),
    );
    expect(ref.id).toBeDefined();
    const found = await repo.findOneByOrFail({ id: ref.id });
    expect(found.embedding).toHaveLength(512);
  });

  it('round-trips MomentFace', async () => {
    const userId = await makeUser('t-mf@e.test');
    const m = await ds.query(
      `INSERT INTO moments (user_id, type, title, media_url) VALUES ($1,'photo','x','https://x/2.jpg') RETURNING id`,
      [userId],
    );
    const momentId = m[0].id;
    const repo = ds.getRepository(MomentFace);
    const face = await repo.save(
      repo.create({
        userId,
        momentId,
        sourceUrl: 'https://x/2.jpg',
        embedding: new Array(512).fill(0),
        provider: 'mock',
        model: 'fake',
      }),
    );
    const found = await repo.findOneByOrFail({ id: face.id });
    expect(found.momentId).toBe(momentId);
  });

  it('enforces unique (user_id, source_url) on user_face_embeddings', async () => {
    const userId = await makeUser('t-dup@e.test');
    const repo = ds.getRepository(UserFaceEmbedding);
    await repo.save(
      repo.create({
        userId,
        sourceUrl: 'https://x/dup.jpg',
        embedding: new Array(512).fill(0),
        provider: 'mock',
      }),
    );
    await expect(
      repo.save(
        repo.create({
          userId,
          sourceUrl: 'https://x/dup.jpg',
          embedding: new Array(512).fill(0),
          provider: 'mock',
        }),
      ),
    ).rejects.toThrow();
  });
});
