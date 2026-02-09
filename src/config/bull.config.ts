import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const getBullConfig = (configService: ConfigService): BullModuleOptions => {
  const redisUrl = configService.get<string>('REDIS_URL');
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT');
  const password = configService.get<string>('REDIS_PASSWORD');

  const parsed = redisUrl ? new URL(redisUrl) : null;

  return {
    redis: {
      host: parsed?.hostname ?? host,
      port: parsed?.port ? Number(parsed.port) : (port ?? 6379),
      password: parsed?.password ?? password,
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  };
};
