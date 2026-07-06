import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * HTTP 请求日志中间件 — 记录每个请求的方法、路径、状态码、耗时。
 *
 * 生产环境不记录请求体（可能含敏感信息）。
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const level =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger[level](
        `${method} ${originalUrl} ${statusCode} ${duration}ms`,
      );
    });

    next();
  }
}
