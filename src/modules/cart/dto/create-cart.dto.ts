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

export class CartItemVariantDto {
  @ApiProperty({ description: 'Variant ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Variant type', example: 'size' })
  type: string;

  @ApiProperty({ description: 'Variant name', example: 'Large' })
  name: string;

  @ApiProperty({ description: 'Price modifier applied by this variant', example: 200 })
  priceModifier: number;

  @ApiProperty({ description: 'Available stock for this variant', example: 10 })
  stock: number;

  @ApiProperty({ description: 'Indicates if the variant is available', example: true })
  isAvailable: boolean;
}

export class SelectedVariantDto {
  @ApiProperty({ description: 'Variant ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Variant type', example: 'color' })
  type: string;

  @ApiProperty({ description: 'Variant name', example: 'Red' })
  name: string;

  @ApiProperty({ description: 'Price modifier applied by this variant', example: 150 })
  priceModifier: number;
}

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
    example: { id: 'uuid', name: 'Shoes' },
  })
  category: {
    id: string;
    name: string;
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

export class CartResponseDto {
  @ApiProperty({ description: 'Cart ID' })
  id: string;

  @ApiProperty({ description: 'Total cart amount', example: 15000 })
  total: number;

  @ApiProperty({ description: 'Cart creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last cart update date' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Items inside the cart',
    type: [CartItemResponseDto],
  })
  items: CartItemResponseDto[];

  @ApiProperty({ description: 'Total number of items in the cart', example: 3 })
  itemCount: number;
}

export class StockValidationIssueDto {
  @ApiProperty({ description: 'Cart item ID' })
  itemId: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({
    description: 'Description of the stock issue',
    example: 'Insufficient stock',
  })
  issue: string;

  @ApiProperty({ description: 'Requested quantity', example: 5 })
  requested: number;

  @ApiProperty({ description: 'Available stock', example: 2 })
  available: number;
}

export class StockValidationResultDto {
  @ApiProperty({ description: 'Indicates if stock validation passed', example: false })
  valid: boolean;

  @ApiProperty({
    description: 'List of stock validation issues',
    type: [StockValidationIssueDto],
  })
  issues: StockValidationIssueDto[];
}

export class CartSummaryResponseDto {
  @ApiProperty({ description: 'Total number of items in the cart', example: 4 })
  itemCount: number;

  @ApiProperty({ description: 'Total cart amount', example: 18000 })
  total: number;

  @ApiProperty({ description: 'Indicates if the cart has items', example: true })
  hasItems: boolean;
}
