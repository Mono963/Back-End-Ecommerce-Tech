import { ApiProperty } from '@nestjs/swagger';

export class PaymentStatusDto {
  @ApiProperty({ description: 'MercadoPago payment ID', example: 123456789 })
  id: string | number;

  @ApiProperty({ description: 'Current payment status', example: 'approved' })
  status: string;

  @ApiProperty({
    description: 'Detailed payment status information',
    example: 'accredited',
  })
  status_detail: string;

  @ApiProperty({ description: 'Transaction amount paid', example: 100.0 })
  transaction_amount: number;

  @ApiProperty({ description: 'Currency identifier', example: 'ARS' })
  currency_id: string;

  @ApiProperty({
    description: 'Date when the payment was approved',
    example: '2023-01-01T00:00:00Z',
  })
  date_approved: string;
}

export class PaymentCompletedDto {
  @ApiProperty({ description: 'Internal payment UUID' })
  id: string;

  @ApiProperty({
    description: 'MercadoPago payment ID',
    example: '1234567890',
  })
  payment_id: string;

  @ApiProperty({ description: 'User ID associated with the payment' })
  user_id: string;

  @ApiProperty({ description: 'Order ID associated with the payment' })
  order_id: string;

  @ApiProperty({ description: 'Payment status', example: 'approved' })
  status: string;

  @ApiProperty({
    description: 'Detailed payment status',
    example: 'accredited',
  })
  status_detail: string;

  @ApiProperty({ description: 'Total amount paid', example: 100.0 })
  amount: number;

  @ApiProperty({ description: 'Currency identifier', example: 'ARS' })
  currency_id: string;

  @ApiProperty({ description: 'Payment type', example: 'credit_card' })
  payment_type_id: string;

  @ApiProperty({ description: 'Payment method used', example: 'visa' })
  payment_method_id: string;

  @ApiProperty({
    description: 'Date when the payment was approved',
    example: '2023-01-01T00:00:00Z',
  })
  date_approved: Date;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;
}
