import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 全局异常过滤器 — 统一 API 错误响应格式。
 *
 * 响应体：
 * {
 *   statusCode: number,
 *   message: string | string[],
 *   error: string,           // HTTP 状态描述
 *   path: string,            // 请求路径
 *   timestamp: string,       // ISO 时间
 * }
 *
 * 未捕获的非 HTTP 异常返回 500 + 通用消息（不泄露内部错误细节）。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error = '';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string | string[]) || exception.message;
        error = (r.error as string) || exception.name;
      } else {
        message = exception.message;
      }
      if (!error) error = HttpStatus[status] || 'Error';
    } else {
      // 未捕获异常 → 500，不泄露内部细节
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      const errMsg =
        exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `Unhandled exception: ${errMsg}`,
        stack,
        request.method + ' ' + request.url,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
