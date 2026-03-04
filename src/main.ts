import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './config/logger.config';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import Redis from 'ioredis';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(loggerConfig),
  });

  const logger = new Logger('Bootstrap');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use('/api/docs', (_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    );
    next();
  });

  app.use(compression());

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const devOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
  ];
  const prodOrigins = [process.env.FRONTEND_URL, process.env.BACKEND_URL].filter(Boolean);
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : isProduction
      ? prodOrigins
      : [...devOrigins, ...prodOrigins];

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('worldassemblytechnology API')
    .setDescription('Complete API for worldassemblytechnology platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  if (redisUrl || redisHost) {
    const redis = redisUrl
      ? new Redis(redisUrl, { maxRetriesPerRequest: 1 })
      : new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: 1,
        });

    try {
      await redis.ping();
    } catch {
      logger.warn(`Redis not available on ${redisUrl ?? `${redisHost}:${redisPort}`}`);
    } finally {
      await redis.quit();
    }
  } else {
    logger.warn('Redis not configured 🔴 running without Redis');
  }

  logger.log(`Application Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
  logger.log(`Application running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error starting application:', error);
  process.exit(1);
});
