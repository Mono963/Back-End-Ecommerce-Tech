import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsNotEmpty, IsUUID } from 'class-validator';
import { OrderStatus } from '../../orders/interfaces/orders.interface';

export class OrderResponseDto {
  @ApiProperty({ description: 'ID de la orden' })
  id: string;

  @ApiProperty({ description: 'Número de orden' })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus, description: 'Estado de la orden' })
  status: OrderStatus;
}

export class UserAddressResponseDto {
  @ApiProperty({ description: 'ID de la dirección' })
  id: string;

  @ApiProperty({ description: 'Etiqueta de la dirección (casa, trabajo, etc.)' })
  label: string;

  @ApiProperty({ description: 'Calle' })
  street: string;

  @ApiProperty({ description: 'Ciudad' })
  city: string;

  @ApiProperty({ description: 'Provincia' })
  province: string;

  @ApiProperty({ description: 'Código postal' })
  postalCode: string;

  @ApiProperty({ description: 'País' })
  country: string;

  @ApiProperty({ description: 'Si es la dirección por defecto' })
  isDefault: boolean;
}

export class CartResponseDto {
  @ApiProperty({ description: 'ID del carrito' })
  id: string;

  @ApiProperty({ description: 'Total del carrito' })
  total: number;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: Date;

  @ApiProperty({ description: 'Items del carrito', type: [Object] })
  items: unknown[];
}

export class UserResponseDto {
  @ApiProperty({ description: 'ID del usuario' })
  id: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  name: string;

  @ApiProperty({ description: 'Email del usuario' })
  email: string;

  @ApiProperty({ description: 'Fecha de nacimiento' })
  birthDate: Date;

  @ApiProperty({ description: 'Teléfono' })
  phone: string;

  @ApiProperty({
    description: 'Dirección del usuario',
    oneOf: [{ $ref: '#/components/schemas/UserAddressResponseDto' }, { type: 'string' }],
  })
  address: UserAddressResponseDto | string;

  @ApiProperty({ description: 'Nombre de usuario' })
  username: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Fecha de eliminación', nullable: true })
  deletedAt: Date | null;

  @ApiPropertyOptional({ description: 'Órdenes del usuario', type: [OrderResponseDto] })
  orders?: OrderResponseDto[];

  @ApiPropertyOptional({ description: 'Cantidad de items en wishlist' })
  wishlistCount?: number;

  @ApiPropertyOptional({ description: 'Carrito del usuario', type: CartResponseDto })
  cart?: CartResponseDto;

  @ApiPropertyOptional({ description: 'Rol del usuario' })
  role?: string;
}

export class UserResponseWithAdminDto extends UserResponseDto {
  @ApiProperty({ description: 'Rol del usuario' })
  declare role: string;

  @ApiProperty({ description: 'Contraseña hasheada (solo admin)' })
  password: string;
}

export class UpdateRoleDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID del rol a asignar al usuario',
  })
  @IsNotEmpty({ message: 'El ID del rol es requerido' })
  @IsUUID('4', { message: 'El ID del rol debe ser un UUID válido' })
  roleId: string;
}
