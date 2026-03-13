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

  @ApiProperty({
    example: '16GB',
    required: false,
    description: 'Filter by RAM variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  ram?: string;

  @ApiProperty({
    example: '512GB SSD',
    required: false,
    description: 'Filter by storage variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  storage?: string;

  @ApiProperty({
    example: 'Intel i7',
    required: false,
    description: 'Filter by processor variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  processor?: string;

  @ApiProperty({
    example: '8GB',
    required: false,
    description: 'Filter by VRAM variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  vram?: string;

  @ApiProperty({
    example: '15.6"',
    required: false,
    description: 'Filter by screen size variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  screen_size?: string;

  @ApiProperty({
    example: '1920x1080',
    required: false,
    description: 'Filter by resolution variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  resolution?: string;

  @ApiProperty({
    example: '144Hz',
    required: false,
    description: 'Filter by refresh rate variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  refresh_rate?: string;

  @ApiProperty({
    example: 'Bluetooth',
    required: false,
    description: 'Filter by connectivity variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  connectivity?: string;

  @ApiProperty({
    example: 'New',
    required: false,
    description: 'Filter by condition variant (partial, case-insensitive)',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @Length(1, 50)
  @IsString()
  condition?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Filter only products with available stock',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return typeof value === 'boolean' ? value : undefined;
  })
  inStock?: boolean;
}
