import { CacheModuleOptions } from '@nestjs/cache-manager';

export const cacheConfig: CacheModuleOptions = {
  ttl: 60000, // 60 segundos por defecto
  max: 100, // Maximo 100 items en memoria
};
