import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export function buildThrottlerOptions(
  config: ConfigService,
): ThrottlerModuleOptions {
  const redisHost = config.get<string>('REDIS_HOST', 'localhost');
  const redisPort = config.get<number>('REDIS_PORT', 6379);
  const redisPassword = config.get<string>('REDIS_PASSWORD');

  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  redis.on('error', (err) => {
    // Redis 不可用时回退到内存存储（在 ThrottlerStorageRedisService 内部已兜底）
    // eslint-disable-next-line no-console
    console.warn('[throttler] redis error:', err.message);
  });

  const storage = new ThrottlerStorageRedisService(redis);

  return {
    storage,
    throttlers: [
      // 默认短窗口：60 秒 100 次（防扫描）
      { name: 'short', ttl: 60_000, limit: 100 },
      // 中等窗口：5 分钟 300 次（防突发）
      { name: 'medium', ttl: 300_000, limit: 300 },
    ],
  };
}
