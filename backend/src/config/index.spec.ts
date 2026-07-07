import { validateProductionConfig } from './index';

describe('validateProductionConfig', () => {
  const keys = ['NODE_ENV', 'JWT_SECRET', 'DATABASE_PASSWORD', 'S3_SECRET_KEY'];
  const backup: Record<string, string | undefined> = {};

  beforeEach(() => {
    keys.forEach((k) => (backup[k] = process.env[k]));
  });

  afterEach(() => {
    keys.forEach((k) => {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    });
  });

  /** 设置一组合法的强生产配置 */
  function setStrongProdEnv(): void {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-very-strong-production-secret-32+chars-long!!';
    process.env.DATABASE_PASSWORD = 'a-real-prod-db-password';
    process.env.S3_SECRET_KEY = 'a-real-prod-s3-secret';
  }

  it('skips validation when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateProductionConfig()).not.toThrow();
  });

  it('throws when JWT_SECRET is missing', () => {
    setStrongProdEnv();
    delete process.env.JWT_SECRET;
    expect(() => validateProductionConfig()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is a known default', () => {
    setStrongProdEnv();
    process.env.JWT_SECRET = 'timex-dev-secret-key-2024-change-in-production';
    expect(() => validateProductionConfig()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is shorter than 32 chars', () => {
    setStrongProdEnv();
    process.env.JWT_SECRET = 'short';
    expect(() => validateProductionConfig()).toThrow(/JWT_SECRET/);
  });

  it('throws when DATABASE_PASSWORD is missing', () => {
    setStrongProdEnv();
    delete process.env.DATABASE_PASSWORD;
    expect(() => validateProductionConfig()).toThrow(/DATABASE_PASSWORD/);
  });

  it('throws when DATABASE_PASSWORD is the "postgres" default', () => {
    setStrongProdEnv();
    process.env.DATABASE_PASSWORD = 'postgres';
    expect(() => validateProductionConfig()).toThrow(/DATABASE_PASSWORD/);
  });

  it('throws when DATABASE_PASSWORD is the dev compose default "timex_dev_password"', () => {
    setStrongProdEnv();
    process.env.DATABASE_PASSWORD = 'timex_dev_password';
    expect(() => validateProductionConfig()).toThrow(/DATABASE_PASSWORD/);
  });

  it('throws when S3_SECRET_KEY is the "minioadmin" default', () => {
    setStrongProdEnv();
    process.env.S3_SECRET_KEY = 'minioadmin';
    expect(() => validateProductionConfig()).toThrow(/S3_SECRET_KEY/);
  });

  it('passes with strong, non-default production values', () => {
    setStrongProdEnv();
    expect(() => validateProductionConfig()).not.toThrow();
  });
});
