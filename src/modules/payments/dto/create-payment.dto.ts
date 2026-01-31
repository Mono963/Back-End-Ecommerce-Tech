import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreatePreferenceDto {
  @ApiProperty({
    description: 'Order ID to process the payment for',
    example: 'b7e7db43-e1a0-493a-bbc3-ba8b6da08ec6',
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Optional message provided by the user',
    example: 'Keep up the great work!',
    required: false,
  })
  @IsOptional()
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Currency code used for the payment',
    example: 'ARS',
    default: 'ARS',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

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

export class PreferenceResponseDto {
  @ApiProperty({ description: 'Generated MercadoPago preference ID' })
  preferenceId: string;

  @ApiProperty({ description: 'Checkout init point URL' })
  initPoint: string;

  @ApiProperty({ description: 'Sandbox checkout init point URL' })
  sandboxInitPoint: string;
}

class WebhookDataDto {
  @ApiProperty({
    description: 'Resource ID related to the webhook event (usually payment ID)',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class WebhookNotificationDto {
  @ApiProperty({
    description: 'Webhook notification ID',
    example: 987654321,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Type of webhook event',
    example: 'payment',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Payload data sent by MercadoPago',
    type: WebhookDataDto,
  })
  @ValidateNested()
  @Type(() => WebhookDataDto)
  data: WebhookDataDto;

  @ApiProperty({
    description: 'Indicates whether the event was triggered in live mode',
    example: true,
    required: false,
  })
  @IsOptional()
  live_mode?: boolean;

  @ApiProperty({
    description: 'Date when the webhook event was created',
    example: '2023-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  date_created?: string;

  @ApiProperty({
    description: 'MercadoPago application ID',
    example: 123456,
    required: false,
  })
  @IsOptional()
  application_id?: number;

  @ApiProperty({
    description: 'MercadoPago user ID',
    example: '123456789',
    required: false,
  })
  @IsOptional()
  user_id?: string;

  @ApiProperty({
    description: 'Webhook version number',
    example: 1,
    required: false,
  })
  @IsOptional()
  version?: number;

  @ApiProperty({
    description: 'API version used by MercadoPago',
    example: 'v1',
    required: false,
  })
  @IsOptional()
  api_version?: string;

  @ApiProperty({
    description: 'Action performed that triggered the webhook',
    example: 'payment.updated',
    required: false,
  })
  @IsOptional()
  action?: string;
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
