import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CartDiscountPreviewRequestDto {
  @ApiPropertyOptional({
    description: 'Codigo promocional a previsualizar',
    example: 'NEWS30',
  })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  promoCode?: string;
}

export class CartDiscountPreviewItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 100 })
  originalUnitPrice: number;

  @ApiProperty({ example: 10 })
  discountAmount: number;

  @ApiPropertyOptional({ example: 'CODE', nullable: true })
  discountSource: string | null;

  @ApiPropertyOptional({ example: 'NEWS30', nullable: true })
  discountCode: string | null;

  @ApiProperty({ example: 90 })
  finalUnitPrice: number;

  @ApiProperty({ example: 180 })
  subtotal: number;
}

export class CartDiscountPreviewResponseDto {
  @ApiProperty({ example: 200 })
  subtotalOriginal: number;

  @ApiProperty({ example: 180 })
  subtotalWithDiscount: number;

  @ApiProperty({ example: 20 })
  totalDiscount: number;

  @ApiProperty({ example: 37.8 })
  tax: number;

  @ApiProperty({ example: 10 })
  shipping: number;

  @ApiProperty({ example: 227.8 })
  total: number;

  @ApiProperty({ example: true })
  promoValid: boolean;

  @ApiProperty({ type: [String], example: [] })
  promoErrors: string[];

  @ApiProperty({ type: [CartDiscountPreviewItemDto] })
  items: CartDiscountPreviewItemDto[];
}
