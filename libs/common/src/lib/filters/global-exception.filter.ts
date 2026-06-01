import { Catch, HttpException, HttpStatus, Logger, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || 'system';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `[${requestId}] Exception caught on ${request.method} ${request.url}: ${
        exception instanceof Error ? exception.message : 'Unknown'
      }`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
      error: typeof message === 'string' ? { message } : message,
    });
  }
}
