import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfig = async (configService: ConfigService): Promise<CacheModuleOptions> => {
  const redisUrl = configService.get<string>('REDIS_URL');
  const host = configService.get<string>('REDIS_HOST') || 'localhost';
  const port = configService.get<number>('REDIS_PORT') || 6379;
  const password = configService.get<string>('REDIS_PASSWORD');

  const parsed = redisUrl ? new URL(redisUrl) : null;
  const redisHost = parsed?.hostname ?? host;
  const redisPort = parsed?.port ? parseInt(parsed.port, 10) : port;
  const redisPassword = parsed?.password || password;

  return {
    ttl: 60000,
    max: 100,
    store: await redisStore({
      socket: { host: redisHost, port: redisPort },
      password: redisPassword,
    }),
  };
};
