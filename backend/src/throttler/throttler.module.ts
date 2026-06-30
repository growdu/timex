import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { buildThrottlerOptions } from './throttler.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildThrottlerOptions,
    }),
  ],
  providers: [
    // 全局默认 guard：所有路由都受默认 throttle 限制
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [ThrottlerModule],
})
export class AppThrottlerModule {}