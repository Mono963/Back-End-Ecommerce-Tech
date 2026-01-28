import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

/**
 * DTO base para paginación.
 * Extiende esta clase para agregar filtros específicos por módulo.
 *
 * @example
 * class ProductsSearchQueryDto extends PaginationQueryDto {
 *   @IsOptional()
 *   @IsString()
 *   brand?: string;
 * }
 */
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Número de elementos por página',
    example: 10,
    default: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiProperty({
    description: 'Número de página (1-indexed)',
    example: 1,
    default: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  /**
   * Calcula el offset para queries SQL/TypeORM.
   * Útil para queries con .skip() y .take()
   */
  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}
