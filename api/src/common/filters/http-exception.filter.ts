import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Uniform error shape for every failure:
 * { statusCode, error, message, path, timestamp }
 * `message` is a string (single error) or string[] (validation list).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let fieldErrors: Record<string, string> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        error = (b.error as string) ?? error;
        fieldErrors = b.fieldErrors as Record<string, string> | undefined;
      }
      // Derive a sensible `error` label when not supplied by the exception.
      if (error === 'Internal Server Error') {
        error = exception.name.replace(/Exception$/, '');
      }
    } else {
      this.logger.error(exception);
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
