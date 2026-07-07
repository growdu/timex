import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { databaseConfig } from './config';
import { runMigrations } from './migrations/runner';

/**
 * 独立迁移入口：`npm run migrate`（编译后）/ `npm run migrate:dev`（ts-node）。
 * 应用所有 `scripts/migrations/*.sql` 中尚未记录的迁移，然后退出。
 * 幂等：已应用的迁移跳过。适合部署时作为一次性 job 运行（多实例场景）。
 */
async function main(): Promise<void> {
  const logger = new Logger('Migrate');
  const dataSource = new DataSource(databaseConfig() as never);
  await dataSource.initialize();
  try {
    const result = await runMigrations(dataSource);
    logger.log(
      `Applied ${result.applied.length} migration(s)${result.applied.length ? ': ' + result.applied.join(', ') : ''}`,
    );
    logger.log(`Skipped ${result.skipped.length} already-applied migration(s)`);
  } finally {
    await dataSource.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
