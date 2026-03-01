import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProductSnapshotDto, VariantSnapshotDto } from './order.snapshots.dto';

export class ProductInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Dell Inspiron 15' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Dell' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 699.99 })
  @IsNumber()
  currentPrice: number;

  @ApiPropertyOptional({ example: 'SKU-DELL-001' })
  @IsOptional()
  @IsString()
  sku?: string;
}

export class VariantInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'RAM' })
  @IsString()
  type: string;

  @ApiProperty({ example: '16GB DDR4' })
  @IsString()
  name: string;

  @ApiProperty({ example: 120 })
  @IsNumber()
  priceModifier: number;
}

export class OrderItemResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 699.99 })
  unitPrice: number;

  @ApiProperty({ example: 1399.98 })
  subtotal: number;

  @ApiPropertyOptional({ example: 799.99, nullable: true })
  @IsOptional()
  @IsNumber()
  originalUnitPrice?: number | null;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({ example: 'CODE', nullable: true })
  @IsOptional()
  @IsString()
  discountSource?: string | null;

  @ApiPropertyOptional({ example: 'NEWS30', nullable: true })
  @IsOptional()
  @IsString()
  discountCode?: string | null;

  @ApiProperty({ type: ProductSnapshotDto })
  productSnapshot: ProductSnapshotDto;

  @ApiPropertyOptional({ type: [VariantSnapshotDto] })
  variantsSnapshot?: VariantSnapshotDto[] | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}
