import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async acquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
    const key = `lock:${lockKey}`;
    const existing = await this.cacheManager.get(key);

    if (existing) {
      return false;
    }

    await this.cacheManager.set(key, Date.now().toString(), ttlMs);
    return true;
  }

  async releaseLock(lockKey: string): Promise<void> {
    await this.cacheManager.del(`lock:${lockKey}`);
  }

  async withLock<T>(lockKey: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> {
    const acquired = await this.acquireLock(lockKey, ttlMs);
    if (!acquired) {
      this.logger.debug(`Lock "${lockKey}" already held, skipping execution`);
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(lockKey);
    }
  }
}
