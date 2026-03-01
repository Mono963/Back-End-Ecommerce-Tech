import { ApiProperty } from '@nestjs/swagger';
import { CartItemResponseDto } from './cart.product.dto';

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

export class CartSummaryResponseDto {
  @ApiProperty({ description: 'Total number of items in the cart', example: 4 })
  itemCount: number;

  @ApiProperty({ description: 'Total cart amount', example: 18000 })
  total: number;

  @ApiProperty({ description: 'Indicates if the cart has items', example: true })
  hasItems: boolean;
}
