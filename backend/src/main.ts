import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateProductionConfig } from './config';

async function bootstrap() {
  // 生产环境配置校验：关键 secret 不能是默认值
  validateProductionConfig();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // CORS — 通过 CORS_ORIGINS 环境变量配置允许的源
  const corsOriginsEnv = process.env.CORS_ORIGINS || '';
  const extraOrigins = corsOriginsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, ok?: boolean) => void,
    ) => {
      // 无 origin 的请求（移动端、curl）放行
      if (!origin) return callback(null, true);

      // 本地开发网段
      const isLocalDev =
        /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$/.test(
          origin,
        );

      if (extraOrigins.includes(origin) || isLocalDev) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 全局异常过滤器 — 统一错误响应格式
  app.useGlobalFilters(new AllExceptionsFilter());

  // 优雅关闭：Docker / K8s 发 SIGTERM 时正确清理资源
  app.enableShutdownHooks();

  const host = process.env.HOST ?? '0.0.0.0';
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, host);
  logger.log(`Application running on http://${host}:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

void bootstrap();
