import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request: Request = ctx.getRequest();

    if (!request.url.includes('/auth/google')) {
      throw exception;
    }

    this.logger.error('Google OAuth Error:', exception);

    const frontendUrl = this.configService.get<string>('GoogleOAuth.frontendUrl');
    const errorMessage = exception instanceof HttpException ? exception.message : 'Authentication Error';

    response.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`);
  }
}
