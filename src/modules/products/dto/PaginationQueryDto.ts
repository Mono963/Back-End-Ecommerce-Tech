import { IsNumber, IsOptional, IsString, IsBoolean, IsUUID, Length, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/pagination';

export class ProductsSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'Dell Inspiron',
    required: false,
    description: 'Search by product name',
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
    description: 'Search products by price range (±10%)',
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
    description: 'Minimum price to filter products',
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
    description: 'Maximum price to filter products',
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
    description: 'Filter by product brand',
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
    description: 'Filter by category ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: 'Black',
    required: false,
    description: 'Filter by product variant color',
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
    description: 'Filter only featured products',
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
