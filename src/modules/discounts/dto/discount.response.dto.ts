import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../enums/discount.enums';

export class ProductDiscountResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType: DiscountType;

  @ApiProperty({ example: 30 })
  value: number;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z', nullable: true })
  startDate: Date | null;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z', nullable: true })
  endDate: Date | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  product_id: string;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class PromoCodeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'NEWS30' })
  code: string;

  @ApiPropertyOptional({ example: 'Descuento newsletter Marzo 2026', nullable: true })
  description: string | null;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType: DiscountType;

  @ApiProperty({ example: 30 })
  value: number;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z', nullable: true })
  startDate: Date | null;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z', nullable: true })
  endDate: Date | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 100, nullable: true })
  maxUses: number | null;

  @ApiProperty({ example: 0 })
  currentUses: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  maxUsesPerUser: number | null;

  @ApiPropertyOptional({ example: 50, nullable: true })
  minOrderAmount: number | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  applicableProductIds: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  applicableCategoryIds: string[] | null;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class PromoCodeUsageResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  promo_code_id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  user_id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  order_id: string;

  @ApiProperty({ example: 150.5 })
  discountAmount: number;

  @ApiProperty({ example: '2026-03-15T14:30:00.000Z' })
  usedAt: Date;
}

export class ValidatePromoCodeValidResponseDto {
  @ApiProperty({ example: true })
  valid: true;

  @ApiProperty({ example: 'NEWS30' })
  code: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  discountType: DiscountType;

  @ApiProperty({ example: 30 })
  value: number;

  @ApiPropertyOptional({ example: 'Descuento newsletter', nullable: true })
  description: string | null;
}

export class ValidatePromoCodeInvalidResponseDto {
  @ApiProperty({ example: false })
  valid: false;

  @ApiProperty({ type: [String], example: ['Codigo promocional no encontrado'] })
  errors: string[];
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operacion realizada exitosamente' })
  message: string;
}
