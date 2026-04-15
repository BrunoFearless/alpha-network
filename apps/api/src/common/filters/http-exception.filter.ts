import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const excRes = exception.getResponse();

    const extraData = typeof excRes === 'object' ? (excRes as any) : {}
    const message = extraData.message || exception.message

    res.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message: Array.isArray(message) ? message[0] : message,
        path: req.url,
        timestamp: new Date().toISOString(),
        ...extraData,
      },
    });
  }
}
