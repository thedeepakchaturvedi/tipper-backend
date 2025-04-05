import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { ip, method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '';

    // Log request start
    this.logger.log(
      JSON.stringify(
        {
          type: 'REQUEST',
          timestamp: new Date().toISOString(),
          method,
          url: originalUrl,
          ip,
          userAgent,
        },
        null,
        2,
      ),
    );

    // Get response data when request completes
    response.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = response;
      const contentLength = response.get('content-length');

      this.logger.log(
        JSON.stringify(
          {
            type: 'RESPONSE',
            timestamp: new Date().toISOString(),
            method,
            url: originalUrl,
            statusCode,
            contentLength,
            duration: `${duration}ms`,
            ip,
            userAgent,
          },
          null,
          2,
        ),
      );
    });

    next();
  }
}
