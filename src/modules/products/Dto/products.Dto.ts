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

  @ApiProperty({ example: 200.0, description: 'Modificador de precio (puede ser positivo o negativo)' })
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

  @ApiProperty({ example: 'Notebook ideal para trabajo y estudio con procesador Intel Core i5' })
  @IsString()
  @Length(10, 500)
  description: string;

  @ApiProperty({ example: 'Dell', description: 'Marca del producto' })
  @IsString()
  @Length(2, 50)
  brand: string;

  @ApiPropertyOptional({ example: 'Inspiron 15 3520', description: 'Modelo específico del producto' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  model?: string;

  @ApiProperty({ example: 699.99 })
  @IsNumber()
  @Min(0.01)
  basePrice: number;

  @ApiProperty({ example: 10, description: 'Stock base cuando no hay variantes' })
  @IsNumber()
  @Min(0)
  baseStock: number;

  @ApiProperty({ example: 'notebooks', description: 'Nombre de la categoría' })
  @IsString()
  @Length(3, 50)
  categoryName: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/product1.jpg', 'https://example.com/product2.jpg'],
    description: 'URLs de imágenes del producto',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imgUrls?: string[];

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Marcar como producto destacado',
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    example: {
      screenSize: '15.6"',
      resolution: '1920x1080',
      batteryLife: '8 horas',
      warranty: '1 año',
    },
    description: 'Especificaciones técnicas del producto',
  })
  @IsOptional()
  specifications?: LaptopSpecs | MouseSpecs | Record<string, unknown>;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Indica si el producto tiene variantes',
  })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({
    type: [CreateVariantDto],
    description: 'Lista de variantes del producto',
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

  @ApiPropertyOptional({ example: 'Descripción actualizada del producto' })
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
  categoryName?: string;

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

  @ApiProperty({ example: 'Notebook ideal para trabajo y estudio' })
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
    description: 'Precio final calculado con la variante más barata disponible',
  })
  finalPrice: number;

  @ApiProperty({
    example: 150,
    description: 'Stock total disponible considerando todas las variantes',
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
      batteryLife: '8 horas',
      warranty: '1 año',
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
    description: 'Lista de variantes disponibles para el producto',
  })
  variants: ResponseVariantDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T14:45:00Z' })
  updatedAt: Date;
}
