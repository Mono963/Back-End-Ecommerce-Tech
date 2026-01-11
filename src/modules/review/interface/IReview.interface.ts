import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum Rating {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

export interface ReviewDto {
  rating: Rating;
  message: string;
  productId: string;
}

export interface ReviewResponse {
  id: string;
  rating: Rating;
  message: string;
  createdAt: Date;
}

export class ReviewFiltersDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Página',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Límite de resultados',
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: Rating,
    description: 'Filtrar por calificación',
    example: 5,
  })
  @IsOptional()
  @IsEnum(Rating)
  @Type(() => Number)
  rating?: Rating;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filtrar por ID de producto',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    example: 'Juan',
    description: 'Buscar por nombre de usuario',
  })
  @IsOptional()
  @IsString()
  userName?: string;
}

export class PaginatedReviewsDto {
  @ApiProperty({ type: [Object] })
  items: ReviewResponse[];

  @ApiProperty({ example: 100, description: 'Total de reviews' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total de páginas' })
  pages: number;
}
