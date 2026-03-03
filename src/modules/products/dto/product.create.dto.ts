import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { LaptopSpecs, MouseSpecs } from '../interface/products.interface';
import { CreateVariantDto } from './product.variant.dto';
import { Type } from 'class-transformer';

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

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
