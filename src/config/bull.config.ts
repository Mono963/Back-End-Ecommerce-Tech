import { BullModuleOptions } from '@nestjs/bull';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD;

const redisConfig = redisUrl
  ? (() => {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password || undefined,
      };
    })()
  : {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
    };

export const bullConfig: BullModuleOptions = {
  redis: redisConfig,
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
