import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LaptopSpecs, MouseSpecs } from '../interface/products.interface';
import { ResponseVariantDto } from './product.variant.dto';

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
    example: 489.99,
    description: 'Final price after discount (or same as originalPrice if no discount)',
  })
  finalPrice: number;

  @ApiProperty({
    example: 699.99,
    description: 'Price before discount (basePrice + cheapest variant)',
  })
  originalPrice: number;

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

  @ApiProperty({ example: false, description: 'Whether this product has an active discount' })
  hasActiveDiscount: boolean;

  @ApiProperty({ example: 210, description: 'Discount amount in currency' })
  discountAmount: number;

  @ApiPropertyOptional({ example: 30, description: 'Discount percentage (null if fixed)' })
  discountPercentage: number | null;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z', description: 'When the discount expires' })
  discountEndDate: Date | null;

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
