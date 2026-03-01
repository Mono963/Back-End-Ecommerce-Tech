import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductSnapshotDto {
  @ApiProperty({ example: 'Dell Inspiron 15' })
  name: string;

  @ApiProperty({ example: 'Laptop for work and study' })
  description: string;

  @ApiProperty({ example: 699.99 })
  basePrice: number;

  @ApiPropertyOptional({ example: 'Dell' })
  brand?: string;

  @ApiPropertyOptional({ example: 'Inspiron 15 3520' })
  model?: string;

  @ApiPropertyOptional({ example: 'SKU-DELL-001' })
  sku?: string;
}

export class VariantSnapshotDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'RAM' })
  type: string;

  @ApiProperty({ example: '16GB DDR4' })
  name: string;

  @ApiProperty({ example: 120 })
  priceModifier: number;

  @ApiPropertyOptional({ example: 'VARIANT-RAM-16GB' })
  sku?: string;
}
