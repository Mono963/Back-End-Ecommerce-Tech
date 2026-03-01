import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfig = async (configService: ConfigService): Promise<CacheModuleOptions> => {
  const redisUrl = configService.get<string>('REDIS_URL');
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT');
  const password = configService.get<string>('REDIS_PASSWORD');

  if (!redisUrl && !host && !port) {
    return {
      ttl: 60_000,
      max: 500,
    };
  }

  const parsed = redisUrl ? new URL(redisUrl) : null;

  return {
    ttl: 60_000,
    max: 500,
    store: await redisStore({
      socket: {
        host: parsed?.hostname ?? host ?? 'localhost',
        port: parsed?.port ? Number(parsed.port) : (port ?? 6379),
      },
      password: parsed?.password ?? password,
    }),
  };
};
