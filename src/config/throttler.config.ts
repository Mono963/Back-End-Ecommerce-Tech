import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = [
  {
    ttl: 60000, // 1 minuto
    limit: 10, // 10 requests por minuto (global)
  },
];
