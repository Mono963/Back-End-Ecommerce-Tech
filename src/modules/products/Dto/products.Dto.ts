import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Length,
  IsBoolean,
  ValidateNested,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VariantType } from '../Entities/products_variant.entity';

export class CreateVariantDto {
  @ApiProperty({ enum: VariantType, example: VariantType.STORAGE })
  @IsEnum(VariantType)
  type: VariantType;

  @ApiProperty({ example: '512GB SSD' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ example: 'High-speed NVMe SSD storage' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiProperty({ example: 200.0 })
  @IsNumber()
  priceModifier: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'MacBook Pro 14"' })
  @IsString()
  @Length(3, 80)
  name: string;

  @ApiProperty({ example: 'Powerful laptop for professionals' })
  @IsString()
  @Length(10, 500)
  description: string;

  @ApiProperty({ example: 1999.99 })
  @IsNumber()
  @Min(0.01)
  basePrice: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  baseStock: number;

  @ApiProperty({ example: 'Laptops' })
  @IsString()
  @Length(3, 50)
  categoryName: string;

  @ApiPropertyOptional({
    example: { brand: 'Apple', warranty: '1 year', weight: '1.6kg' },
  })
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'MacBook Pro 16"' })
  @IsOptional()
  @IsString()
  @Length(3, 80)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;

  @ApiPropertyOptional({ example: 2199.99 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  basePrice?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseStock?: number;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  categoryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResponseVariantDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ enum: VariantType, example: VariantType.STORAGE })
  type: VariantType;

  @ApiProperty({ example: '256GB' })
  name: string;

  @ApiProperty({ example: 'High-speed NVMe storage', required: false })
  description?: string;

  @ApiProperty({ example: 100.0 })
  priceModifier: number;

  @ApiProperty({ example: 25 })
  stock: number;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({ example: 1 })
  sortOrder: number;
}

export class ResponseProductDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  name: string;

  @ApiProperty({ example: 'Latest flagship smartphone with advanced features' })
  description: string;

  @ApiProperty({ example: 999.99 })
  basePrice: number;

  @ApiProperty({ example: 50 })
  baseStock: number;

  @ApiProperty({
    example: 1099.99,
    description: 'Precio calculado con variantes más baratas disponibles',
  })
  finalPrice: number;

  @ApiProperty({
    example: 150,
    description: 'Stock total disponible considerando todas las variantes',
  })
  totalStock: number;

  @ApiProperty({ example: 'smartphone' })
  category_name: string;

  @ApiProperty({
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  imgUrls: string[];

  @ApiProperty({
    example: { brand: 'Apple', warranty: '1 year', screenSize: '6.1"' },
    required: false,
  })
  specifications?: Record<string, any>; // ✅ Corregido de null a any

  @ApiProperty({ example: true })
  hasVariants: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({
    type: [ResponseVariantDto],
    description: 'Lista de variantes disponibles para el producto',
  })
  variants: ResponseVariantDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T14:45:00Z' })
  updatedAt: Date;
}
