import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsOptional, IsArray } from 'class-validator';

export class AddToCartDTO {
  @ApiProperty({
    example: 'c3f45d9a-0a44-4d8b-8b93-8f22987402f4',
    description: 'Product ID to add to cart',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the product',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: ['variant-id-1', 'variant-id-2'],
    description: 'Array of variant IDs (e.g., color, storage)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  variantIds?: string[];
}

export class UpdateCartItemDTO {
  @ApiProperty({
    example: 3,
    description: 'New quantity for the cart item. Set to 0 to remove.',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  quantity: number;
}

export class CartItemVariantDTO {
  id: string;
  type: string;
  name: string;
  priceModifier: number;
}

export class CartItemResponseDTO {
  id: string;
  quantity: number;
  priceAtAddition: number;
  subtotal: number;
  selectedVariants: CartItemVariantDTO[] | null;
  product: {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    baseStock: number;
    imgUrls: string[];
    hasVariants: boolean;
  };
}

export class CartResponseDTO {
  id: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemResponseDTO[];
  itemCount: number;
}
