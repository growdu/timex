import { applySqlMigrations, loadSqlMigrations, SqlMigration } from './runner';

/** 构造一个记录所有查询的 mock queryRunner；可注入「已应用」集合与失败触发器。 */
function makeMockRunner(
  opts: { preApplied?: string[]; failOnSqlContaining?: string } = {},
) {
  const { preApplied = [], failOnSqlContaining } = opts;
  const applied = new Set(preApplied);
  const calls: { sql: string; params?: unknown[] }[] = [];

  const queryRunner = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (failOnSqlContaining && sql.includes(failOnSqlContaining)) {
        throw new Error('simulated migration failure');
      }
      if (sql.startsWith('SELECT filename FROM schema_migrations')) {
        return [...applied].map((filename) => ({ filename }));
      }
      if (sql.startsWith('INSERT INTO schema_migrations')) {
        applied.add(params![0] as string);
        return [];
      }
      return [];
    }),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
    connect: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
  } as unknown as import('typeorm').QueryRunner;

  return { queryRunner, calls, applied };
}

const M1: SqlMigration = {
  filename: '2026_01_01_a.sql',
  sql: 'CREATE TABLE a ();',
};
const M2: SqlMigration = {
  filename: '2026_02_01_b.sql',
  sql: 'CREATE TABLE b ();',
};

describe('SQL migration runner', () => {
  it('creates the schema_migrations tracking table', async () => {
    const { queryRunner, calls } = makeMockRunner();
    await applySqlMigrations(queryRunner, []);
    expect(
      calls.some((c) =>
        c.sql.startsWith('CREATE TABLE IF NOT EXISTS schema_migrations'),
      ),
    ).toBe(true);
  });

  it('applies all migrations when none are recorded', async () => {
    const { queryRunner, calls } = makeMockRunner();
    const result = await applySqlMigrations(queryRunner, [M1, M2]);
    expect(result.applied).toEqual(['2026_01_01_a.sql', '2026_02_01_b.sql']);
    expect(result.skipped).toEqual([]);
    // each migration ran in its own transaction
    expect(queryRunner.startTransaction).toHaveBeenCalledTimes(2);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(2);
    // records inserted
    const inserts = calls.filter((c) =>
      c.sql.startsWith('INSERT INTO schema_migrations'),
    );
    expect(inserts.map((c) => c.params![0])).toEqual([
      M1.filename,
      M2.filename,
    ]);
  });

  it('skips already-applied migrations and does not re-run them', async () => {
    const { queryRunner, calls } = makeMockRunner({
      preApplied: [M1.filename],
    });
    const result = await applySqlMigrations(queryRunner, [M1, M2]);
    expect(result.applied).toEqual([M2.filename]);
    expect(result.skipped).toEqual([M1.filename]);
    // M1's DDL must not be executed
    expect(calls.some((c) => c.sql === M1.sql)).toBe(false);
    expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back and rethrows on migration failure', async () => {
    const { queryRunner } = makeMockRunner({
      failOnSqlContaining: 'CREATE TABLE b',
    });
    await expect(applySqlMigrations(queryRunner, [M1, M2])).rejects.toThrow(
      /2026_02_01_b\.sql failed/,
    );
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    // M1 committed before M2 failed
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('loadSqlMigrations returns empty array for missing directory', () => {
    expect(loadSqlMigrations('/nonexistent/path/xyz')).toEqual([]);
  });

  it('loadSqlMigrations reads and sorts .sql files from the real migrations dir', () => {
    const migrations = loadSqlMigrations('scripts/migrations');
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations.every((m) => m.filename.endsWith('.sql'))).toBe(true);
    // sorted ascending by filename
    const names = migrations.map((m) => m.filename);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
    // includes the known ai_jobs migration
    expect(names).toContain('2026_06_30_ai_jobs.sql');
    // sql content actually loaded
    expect(migrations[0].sql).toMatch(/CREATE TABLE/i);
  });
});
