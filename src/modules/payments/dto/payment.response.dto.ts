import { ApiProperty, OmitType } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment UUID', example: 'b7e7db43-e1a0-493a-bbc3-ba8b6da08ec6' })
  id: string;

  @ApiProperty({ description: 'MercadoPago payment ID', example: '1234567890' })
  paymentId: string;

  @ApiProperty({ description: 'Payment status', example: 'approved' })
  status: string;

  @ApiProperty({ description: 'Detailed payment status', example: 'accredited' })
  statusDetail: string;

  @ApiProperty({ description: 'Total amount paid', example: 1500.0 })
  amount: number;

  @ApiProperty({ description: 'Currency identifier', example: 'ARS' })
  currencyId: string;

  @ApiProperty({ description: 'Payment type', example: 'credit_card' })
  paymentTypeId: string;

  @ApiProperty({ description: 'Payment method', example: 'visa' })
  paymentMethodId: string;

  @ApiProperty({
    description: 'Date when the payment was approved',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  dateApproved: Date | null;

  @ApiProperty({ description: 'Associated order ID' })
  orderId: string;

  @ApiProperty({ description: 'Associated user ID' })
  userId: string;

  @ApiProperty({ description: 'Payment creation timestamp' })
  createdAt: Date;
}

export class MyPaymentResponseDto extends OmitType(PaymentResponseDto, ['userId', 'orderId'] as const) {}
