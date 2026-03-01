import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsNotEmpty, IsUUID } from 'class-validator';
import { OrderStatus } from '../../orders/enum/order.enum';
import { CartResponseDto } from '../../cart/dto/cart.response.dto';

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order number' })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus, description: 'Order status' })
  status: OrderStatus;
}

export class UserAddressResponseDto {
  @ApiProperty({ description: 'Address ID' })
  id: string;

  @ApiProperty({ description: 'Address label (home, work, etc.)' })
  label: string;

  @ApiProperty({ description: 'Street' })
  street: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State/Province' })
  province: string;

  @ApiProperty({ description: 'Postal code' })
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiProperty({ description: 'Whether this is the default address' })
  isDefault: boolean;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'Birth date' })
  birthDate: Date;

  @ApiProperty({ description: 'Phone' })
  phone: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Deleted at', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({
    description: 'User addresses',
    oneOf: [{ $ref: '#/components/schemas/UserAddressResponseDto' }, { type: 'string' }],
  })
  address: UserAddressResponseDto[] | string;

  @ApiPropertyOptional({ description: 'User orders', type: [OrderResponseDto] })
  orders?: OrderResponseDto[];

  @ApiPropertyOptional({ description: 'Wishlist item count' })
  wishlistCount?: number;

  @ApiPropertyOptional({ description: 'User cart', type: CartResponseDto })
  cart?: CartResponseDto;

  @ApiPropertyOptional({ description: 'User role' })
  role?: string;
}

export class UserResponseWithAdminDto extends UserResponseDto {
  @ApiProperty({ description: 'User role' })
  declare role: string;
}

export class UpdateRoleDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Role ID to assign to the user',
  })
  @IsNotEmpty({ message: 'Role ID is required' })
  @IsUUID('4', { message: 'Role ID must be a valid UUID' })
  roleId: string;
}
