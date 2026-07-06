import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 安全响应头中间件（helmet 替代 — 无需额外依赖）。
 *
 * 设置标准安全头：
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - X-XSS-Protection: 0 (现代浏览器用 CSP 代替)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - X-DNS-Prefetch-Control: off
 * - X-Download-Options: noopen
 * - Cross-Origin-Opener-Policy: same-origin
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  }
}
