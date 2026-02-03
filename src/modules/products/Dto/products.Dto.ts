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
import { LaptopSpecs, MouseSpecs, TechVariantType } from '../interface/products.interface';

export class CreateVariantDto {
  @ApiProperty({ enum: TechVariantType, example: TechVariantType.STORAGE })
  @IsEnum(TechVariantType)
  type: TechVariantType;

  @ApiProperty({ example: '512GB SSD NVMe' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ example: 'High-speed NVMe SSD storage' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiProperty({ example: 200.0, description: 'Price modifier (can be positive or negative)' })
  @IsNumber()
  priceModifier: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Dell Inspiron 15 3520' })
  @IsString()
  @Length(3, 200)
  name: string;

  @ApiProperty({ example: 'Laptop ideal for work and study with Intel Core i5 processor' })
  @IsString()
  @Length(10, 500)
  description: string;

  @ApiProperty({ example: 'Dell', description: 'Product brand' })
  @IsString()
  @Length(2, 50)
  brand: string;

  @ApiPropertyOptional({ example: 'Inspiron 15 3520', description: 'Specific product model' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  model?: string;

  @ApiProperty({ example: 699.99 })
  @IsNumber()
  @Min(0.01)
  basePrice: number;

  @ApiProperty({ example: 10, description: 'Base stock when no variants exist' })
  @IsNumber()
  @Min(0)
  baseStock: number;

  @ApiProperty({ example: 'notebooks', description: 'Category name' })
  @IsString()
  @Length(3, 50)
  category_name: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/product1.jpg', 'https://example.com/product2.jpg'],
    description: 'Product image URLs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imgUrls?: string[];

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Mark as featured product',
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    example: {
      screenSize: '15.6"',
      resolution: '1920x1080',
      batteryLife: '8 hours',
      warranty: '1 year',
    },
    description: 'Product technical specifications',
  })
  @IsOptional()
  specifications?: LaptopSpecs | MouseSpecs | Record<string, unknown>;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Indicates whether the product has variants',
  })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({
    type: [CreateVariantDto],
    description: 'List of product variants',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Dell Inspiron 15 3521' })
  @IsOptional()
  @IsString()
  @Length(3, 200)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated product description' })
  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;

  @ApiPropertyOptional({ example: 'Dell' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  brand?: string;

  @ApiPropertyOptional({ example: 'Inspiron 15 3521' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  model?: string;

  @ApiPropertyOptional({ example: 749.99 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  basePrice?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseStock?: number;

  @ApiPropertyOptional({ example: 'laptops' })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  category_name?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/product1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imgUrls?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  specifications?: LaptopSpecs | MouseSpecs | Record<string, unknown>;

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

  @ApiProperty({ enum: TechVariantType, example: TechVariantType.RAM })
  type: TechVariantType;

  @ApiProperty({ example: '16GB DDR4' })
  name: string;

  @ApiPropertyOptional({ example: 'High-speed DDR4 memory' })
  description?: string;

  @ApiProperty({ example: 120.0 })
  priceModifier: number;

  @ApiProperty({ example: 25 })
  stock: number;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({ example: 1 })
  sortOrder: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T14:45:00Z' })
  updatedAt: Date;
}

export class ResponseProductDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Dell Inspiron 15 3520' })
  name: string;

  @ApiProperty({ example: 'Laptop ideal for work and study' })
  description: string;

  @ApiProperty({ example: 'Dell' })
  brand: string;

  @ApiPropertyOptional({ example: 'Inspiron 15 3520' })
  model?: string;

  @ApiProperty({ example: 699.99 })
  basePrice: number;

  @ApiProperty({ example: 10 })
  baseStock: number;

  @ApiProperty({
    example: 699.99,
    description: 'Final price calculated using the cheapest available variant',
  })
  finalPrice: number;

  @ApiProperty({
    example: 150,
    description: 'Total stock available considering all variants',
  })
  totalStock: number;

  @ApiProperty({ example: 'notebooks' })
  category_name: string;

  @ApiProperty({
    type: [String],
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  imgUrls: string[];

  @ApiProperty({
    example: {
      screenSize: '15.6"',
      resolution: '1920x1080',
      batteryLife: '8 hours',
      warranty: '1 year',
    },
  })
  specifications?: LaptopSpecs | MouseSpecs | Record<string, unknown>;

  @ApiProperty({ example: true })
  hasVariants: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  featured: boolean;

  @ApiProperty({
    type: [ResponseVariantDto],
    description: 'List of available product variants',
  })
  variants: ResponseVariantDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T14:45:00Z' })
  updatedAt: Date;
}

export class AutocompleteResultDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'b7e7db43-e1a0-493a-bbc3-ba8b6da08ec6',
  })
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Running Shoes',
  })
  name: string;

  @ApiProperty({
    description: 'Product brand',
    example: 'Nike',
  })
  brand: string;

  @ApiProperty({
    description: 'Base product price without variants',
    example: 12999,
  })
  basePrice: number;

  @ApiProperty({
    description: 'Main product image URL',
    example: 'https://cdn.example.com/products/shoes.jpg',
    nullable: true,
  })
  image: string | null;

  @ApiProperty({
    description: 'Product category name',
    example: 'Footwear',
    nullable: true,
  })
  category: string | null;
}

export class HybridSearchResponseDto {
  @ApiProperty({
    description: 'Search results retrieved from the local database',
    type: [AutocompleteResultDto],
  })
  results: AutocompleteResultDto[];

  @ApiProperty({
    description: 'Search results generated by AI (optional)',
    type: [AutocompleteResultDto],
    required: false,
  })
  aiResults?: AutocompleteResultDto[];

  @ApiProperty({
    description: 'Optional AI-generated message explaining the results',
    example: 'Here are some products that match your search intent',
    required: false,
  })
  aiMessage?: string;

  @ApiProperty({
    description: 'Source of the search results',
    enum: ['local', 'hybrid'],
    example: 'hybrid',
  })
  source: 'local' | 'hybrid';
}
