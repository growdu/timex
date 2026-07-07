export * from './database.config';
export * from './jwt.config';
export * from './redis.config';

/**
 * 生产环境配置校验：关键 secret 不能是默认值。
 * 开发环境跳过（方便本地启动）。
 */
export function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const defaults = [
    'default-secret-change-me',
    'timex-dev-secret-key-2024-change-in-production',
  ];
  const secret = process.env.JWT_SECRET;
  if (!secret || defaults.includes(secret) || secret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET must be set to a strong value (>=32 chars) in production. ' +
        'Current value is missing, default, or too short.',
    );
  }

  const dbPass = process.env.DATABASE_PASSWORD;
  // 拒绝已知开发默认值：'postgres'（config 默认）与 'timex_dev_password'（compose / .env.example 默认）
  if (!dbPass || dbPass === 'postgres' || dbPass === 'timex_dev_password') {
    throw new Error(
      'FATAL: DATABASE_PASSWORD must be set to a non-default value in production.',
    );
  }

  const s3Secret = process.env.S3_SECRET_KEY;
  if (!s3Secret || s3Secret === 'minioadmin') {
    throw new Error(
      'FATAL: S3_SECRET_KEY must be set to a non-default value in production.',
    );
  }
}
