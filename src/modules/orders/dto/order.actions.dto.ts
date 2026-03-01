import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { ShippingAddressDto } from './order.shared.dto';
import { Type } from 'class-transformer';

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

export class CreateOrderFromCartDto {
  @ApiProperty({
    type: ShippingAddressDto,
    description: 'Shipping address for checkout',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({
    example: 'NEWS30',
    description: 'Codigo promocional a aplicar en el checkout',
  })
  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({
    example: 'MP-123456789',
    description: 'Tracking number (required when status is SHIPPED)',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    example: 'https://tracking.correoargentino.com.ar/...',
    description: 'URL to track the shipment',
  })
  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @ApiPropertyOptional({
    example: 'Correo Argentino',
    description: 'Shipping carrier name',
  })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({
    example: '15/02/2026',
    description: 'Estimated delivery date',
  })
  @IsOptional()
  @IsString()
  estimatedDelivery?: string;
}

export class CancelOrderDto {
  @ApiProperty({
    example: 'I made a mistake in the order',
    description: 'Reason for order cancellation',
  })
  @IsString()
  @MinLength(5)
  cancellationReason: string;
}
