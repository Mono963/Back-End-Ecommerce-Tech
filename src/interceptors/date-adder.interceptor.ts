import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class DateAdderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> | Promise<Observable<unknown>> {
    const logger = new Logger('DateAdderInterceptor');
    const now = new Date();
    logger.log(now);
    const formatDate = now.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const request = context.switchToHttp().getRequest<Request>();
    request.now = formatDate;
    return next.handle();
  }
}
