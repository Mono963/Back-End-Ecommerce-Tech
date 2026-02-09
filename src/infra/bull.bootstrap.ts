import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { getBullConfig } from '../config/bull.config';
import { DynamicModule } from '@nestjs/common';

export function getBullImports(): DynamicModule[] {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    console.warn('Bull disabled 🟡 Redis not configured');
    return [];
  }

  return [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getBullConfig,
    }),
  ];
}
