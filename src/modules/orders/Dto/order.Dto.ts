import {
  IsEnum,
  IsOptional,
  IsObject,
  IsString,
  IsNumber,
  ValidateNested,
  IsNotEmpty,
  Length,
  IsUUID,
  IsDateString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../interfaces/orders.interface';
import { IAddress } from '../../users/interfaces/user.interface';

export class ProductSnapshotDto {
  @ApiProperty({ example: 'Dell Inspiron 15' })
  name: string;

  @ApiProperty({ example: 'Laptop for work and study' })
  description: string;

  @ApiProperty({ example: 699.99 })
  basePrice: number;

  @ApiPropertyOptional({ example: 'Dell' })
  brand?: string;

  @ApiPropertyOptional({ example: 'Inspiron 15 3520' })
  model?: string;

  @ApiPropertyOptional({ example: 'SKU-DELL-001' })
  sku?: string;
}

export class VariantSnapshotDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'RAM' })
  type: string;

  @ApiProperty({ example: '16GB DDR4' })
  name: string;

  @ApiProperty({ example: 120 })
  priceModifier: number;

  @ApiPropertyOptional({ example: 'VARIANT-RAM-16GB' })
  sku?: string;
}

export class ShippingAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: '1234 Main St' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'United States' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateShippingAddressDto {
  @ApiProperty({ type: ShippingAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({
    example: 'Address change requested by the client',
    description: 'Reason for address change',
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}

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

  @ApiProperty({ type: ProductSnapshotDto })
  productSnapshot: ProductSnapshotDto;

  @ApiPropertyOptional({ type: [VariantSnapshotDto] })
  variantsSnapshot?: VariantSnapshotDto[] | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

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

export class UserSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+1 212-555-1234' })
  phone?: string;
}

export class ResponseOrderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'ORD-202401-0001' })
  orderNumber: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;

  @ApiProperty({ type: OrderDetailResponseDto })
  orderDetail: OrderDetailResponseDto;
}

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'credit_card',
    description: 'Payment method used',
    enum: ['credit_card', 'debit_card', 'mercadopago', 'paypal', 'cash', 'transfer'],
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({
    example: 'TRX-123456789',
    description: 'Payment processor transaction ID',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Additional payment details',
    example: {
      cardLast4: '4242',
      cardBrand: 'Visa',
      authorizationCode: 'AUTH123',
    },
  })
  @IsOptional()
  @IsObject()
  paymentDetails?: Record<string, string[]>;
}

export class PaginationResponseDto<T> {
  @ApiProperty({ type: [Object] })
  data: T[];

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      limit: 10,
      totalPages: 10,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class OrderStatsDto {
  @ApiProperty({ example: 150 })
  totalOrders: number;

  @ApiProperty({ example: 10 })
  pendingOrders: number;

  @ApiProperty({ example: 120 })
  processedOrders: number;

  @ApiProperty({ example: 254320.5 })
  totalRevenue: number;
}

export class OrderFiltersDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'ORD-2024-01-0001',
    description: 'Search by order number',
  })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({
    example: 'juan@example.com',
    description: 'Search by user email',
  })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Result limit',
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;
}

export class PaginatedOrdersDto {
  @ApiProperty({ type: [ResponseOrderDto] })
  items: ResponseOrderDto[];

  @ApiProperty({ example: 100, description: 'Total orders' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  pages: number;
}

export class CreateOrderFromCartDto {
  @ApiProperty({
    type: ShippingAddressDto,
    description: 'Shipping address for checkout',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;
}
export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PAID,
    description: 'New order status',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
