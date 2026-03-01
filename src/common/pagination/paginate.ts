import { IPaginatedResult } from './IPaginatedResult';
import { Repository, FindManyOptions, ObjectLiteral } from 'typeorm';

export async function paginate<Entity extends ObjectLiteral>(
  repo: Repository<Entity>,
  { page, limit }: { page: number; limit: number },
  options: FindManyOptions<Entity> = {},
): Promise<IPaginatedResult<Entity>> {
  const [items, total] = await repo.findAndCount({
    ...options,
    skip: (page - 1) * limit,
    take: limit,
  });
  return { items, total, pages: Math.ceil(total / limit) };
}
