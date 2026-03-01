import { ApiProperty } from '@nestjs/swagger';
import { CartItemVariantDto, SelectedVariantDto } from './cart.variants.dto';

export class CartItemProductDto {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiProperty({ description: 'Product brand' })
  brand: string;

  @ApiProperty({ description: 'Product model' })
  model: string;

  @ApiProperty({ description: 'Base price without variants', example: 5000 })
  basePrice: number;

  @ApiProperty({ description: 'Base stock (when product has no variants)', example: 20 })
  baseStock: number;

  @ApiProperty({ description: 'Product image URLs', type: [String] })
  imgUrls: string[];

  @ApiProperty({ description: 'Indicates if the product has variants', example: true })
  hasVariants: boolean;

  @ApiProperty({ description: 'Indicates if the product is active', example: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Product category',
    nullable: true,
    example: { id: 'uuid', category_name: 'Shoes' },
  })
  category: {
    id: string;
    category_name: string;
  } | null;
}

export class CartItemResponseDto {
  @ApiProperty({ description: 'Cart item ID' })
  id: string;

  @ApiProperty({ description: 'Quantity added to cart', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Price when the item was added', example: 5200 })
  priceAtAddition: number;

  @ApiProperty({ description: 'Subtotal for this item', example: 10400 })
  subtotal: number;

  @ApiProperty({ description: 'Date when the item was added to cart' })
  addedAt: Date;

  @ApiProperty({
    description: 'Selected variants snapshot',
    type: [SelectedVariantDto],
    nullable: true,
  })
  selectedVariants: SelectedVariantDto[] | null;

  @ApiProperty({
    description: 'Available variants for the product',
    type: [CartItemVariantDto],
  })
  variants: CartItemVariantDto[];

  @ApiProperty({ description: 'Product information' })
  product: CartItemProductDto;
}
