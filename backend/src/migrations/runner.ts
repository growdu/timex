import { DataSource, QueryRunner } from 'typeorm';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 轻量 SQL 迁移运行器。
 *
 * 约定：迁移文件为 `scripts/migrations/*.sql`，按文件名排序依次执行。
 * 已应用记录在 `schema_migrations` 表（filename 主键）。
 *
 * 与 TypeORM 内置 migration 的区别：保留项目既有的「丢一个 .sql 文件」工作流，
 * 不强制 TS migration 类；适合手工编写、DBA 可读的增量 DDL。
 */
export interface SqlMigration {
  filename: string;
  sql: string;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

const MIGRATIONS_TABLE = 'schema_migrations';

/** 读取目录下所有 *.sql 迁移（按文件名升序）。目录不存在返回空数组。 */
export function loadSqlMigrations(dir: string): SqlMigration[] {
  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  return files.map((f) => ({
    filename: f,
    sql: readFileSync(join(dir, f), 'utf-8'),
  }));
}

/**
 * 在给定 queryRunner 上应用迁移。每个迁移独立事务，失败回滚并抛出。
 * 不释放 queryRunner（由调用方负责）。
 */
export async function applySqlMigrations(
  queryRunner: QueryRunner,
  migrations: SqlMigration[],
): Promise<MigrationResult> {
  await queryRunner.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
  );

  const rows = (await queryRunner.query(
    `SELECT filename FROM ${MIGRATIONS_TABLE}`,
  )) as { filename: string }[];
  const alreadyApplied = new Set(rows.map((r) => r.filename));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const m of migrations) {
    if (alreadyApplied.has(m.filename)) {
      skipped.push(m.filename);
      continue;
    }
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(m.sql);
      await queryRunner.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
        [m.filename],
      );
      await queryRunner.commitTransaction();
      applied.push(m.filename);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw new Error(
        `Migration ${m.filename} failed: ${(e as Error).message}`,
      );
    }
  }

  return { applied, skipped };
}

/** 便捷入口：创建 queryRunner、应用、释放。迁移目录默认 `process.cwd()/scripts/migrations`。 */
export async function runMigrations(
  dataSource: DataSource,
  dir?: string,
): Promise<MigrationResult> {
  const migrationsDir =
    dir ||
    process.env.MIGRATIONS_DIR ||
    join(process.cwd(), 'scripts', 'migrations');

  const migrations = loadSqlMigrations(migrationsDir);
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    return await applySqlMigrations(queryRunner, migrations);
  } finally {
    await queryRunner.release();
  }
}
