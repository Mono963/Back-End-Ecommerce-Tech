import { IsNumber, IsOptional, IsString, IsBoolean, Length, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto';

export class ProductsSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'Dell Inspiron',
    required: false,
    description: 'Buscar por nombre del producto',
    minLength: 3,
    maxLength: 80,
  })
  @IsOptional()
  @Length(3, 80)
  @IsString()
  name?: string;

  @ApiProperty({
    example: 1000,
    required: false,
    description: 'Buscar productos en rango de precio (±10%)',
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  basePrice?: number;

  @ApiProperty({
    example: 100,
    required: false,
    description: 'Precio mínimo para filtrar productos',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @ApiProperty({
    example: 2000,
    required: false,
    description: 'Precio máximo para filtrar productos',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    example: 'Dell',
    required: false,
    description: 'Filtrar por marca del producto',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @Length(2, 50)
  @IsString()
  brand?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    description: 'Filtrar por ID de categoría (UUID)',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    example: 'Negro',
    required: false,
    description: 'Filtrar por color de variante del producto',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @Length(2, 50)
  @IsString()
  color?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Filtrar solo productos destacados',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return typeof value === 'boolean' ? value : undefined;
  })
  featured?: boolean;
}
