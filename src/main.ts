import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API de pruebas')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`🚀 Frontend corriendo en`);
  logger.log(`📚 Swagger en `);
  logger.log(`📚 Swagger en http://localhost:3001/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Error al iniciar:', error);
  process.exit(1);
});
