import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IAddress } from '../../users/interfaces/user.interface';
import { OrderItemResponseDto } from './order.items-response.dto';

export class OrderDetailResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 1399.98 })
  subtotal: number;

  @ApiProperty({ example: 293.99 })
  tax: number;

  @ApiProperty({ example: 0 })
  shipping: number;

  @ApiProperty({ example: 1693.97 })
  total: number;

  @ApiProperty({ example: 150 })
  totalDiscount: number;

  @ApiPropertyOptional({ example: 'NEWS30' })
  promoCodeUsed?: string | null;

  @ApiPropertyOptional({
    description: 'Address snapshot at time of order (unified address structure)',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      label: 'Home',
      street: '1234 Main St',
      city: 'New York',
      province: 'NY',
      postalCode: '1001',
      country: 'United States',
      isDefault: true,
    },
  })
  shippingAddress?: IAddress;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  shippingAddressId?: string | null;

  @ApiPropertyOptional({ example: 'credit_card' })
  paymentMethod?: string | null;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}
