import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreatePreferenceDto {
  @ApiProperty({
    description: 'Order ID to process payment for',
    example: 'b7e7db43-e1a0-493a-bbc3-ba8b6da08ec6',
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Optional message from the donor',
    example: 'Keep up the great work!',
    required: false,
  })
  @IsOptional()
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'ARS',
    default: 'ARS',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class PaymentStatusDto {
  @ApiProperty({ description: 'Payment ID' })
  id: string | number;

  @ApiProperty({ description: 'Payment status', example: 'approved' })
  status: string;

  @ApiProperty({
    description: 'Payment status detail',
    example: 'accredited',
  })
  status_detail: string;

  @ApiProperty({ description: 'Transaction amount', example: 100.0 })
  transaction_amount: number;

  @ApiProperty({ description: 'Currency ID', example: 'ARS' })
  currency_id: string;

  @ApiProperty({
    description: 'Date approved',
    example: '2023-01-01T00:00:00Z',
  })
  date_approved: string;
}

export class PreferenceResponseDto {
  @ApiProperty({ description: 'Preference ID' })
  preferenceId: string;

  @ApiProperty({ description: 'Init point URL' })
  initPoint: string;

  @ApiProperty({ description: 'Sandbox init point URL' })
  sandboxInitPoint: string;
}

class WebhookDataDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class WebhookNotificationDto {
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @ValidateNested()
  @Type(() => WebhookDataDto)
  data: WebhookDataDto;

  @IsOptional()
  live_mode?: boolean;

  @IsOptional()
  date_created?: string;

  @IsOptional()
  application_id?: number;

  @IsOptional()
  user_id?: string;

  @IsOptional()
  version?: number;

  @IsOptional()
  api_version?: string;

  @IsOptional()
  action?: string;
}

export class IPaymentCompletedDto {
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @ApiProperty({ description: 'Id del pago de mercadopago' })
  payment_id: string;

  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Order ID' })
  order_id: string;

  @ApiProperty({ description: 'Payment status', example: 'approved' })
  status: string;

  @ApiProperty({
    description: 'Payment status detail',
    example: 'accredited',
  })
  status_detail: string;

  @ApiProperty({ description: 'Transaction amount', example: 100.0 })
  amount: number;

  @ApiProperty({ description: 'Currency ID', example: 'ARS' })
  currency_id: string;

  @ApiProperty({ description: 'Payment type ID', example: 'credit_card' })
  payment_type_id: string;

  @ApiProperty({ description: 'Payment method ID', example: 'visa' })
  payment_method_id: string;

  @ApiProperty({
    description: 'Date approved',
    example: '2023-01-01T00:00:00Z',
  })
  date_approved: Date;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment UUID', example: 'b7e7db43-e1a0-493a-bbc3-ba8b6da08ec6' })
  id: string;

  @ApiProperty({ description: 'MercadoPago Payment ID', example: '1234567890' })
  paymentId: string;

  @ApiProperty({ description: 'Payment status', example: 'approved' })
  status: string;

  @ApiProperty({ description: 'Payment status detail', example: 'accredited' })
  statusDetail: string;

  @ApiProperty({ description: 'Amount paid', example: 1500.0 })
  amount: number;

  @ApiProperty({ description: 'Currency', example: 'ARS' })
  currencyId: string;

  @ApiProperty({ description: 'Payment type (credit_card, debit_card, etc)', example: 'credit_card' })
  paymentTypeId: string;

  @ApiProperty({ description: 'Payment method (visa, mastercard, etc)', example: 'visa' })
  paymentMethodId: string;

  @ApiProperty({ description: 'Date when payment was approved', example: '2024-01-15T10:30:00Z', nullable: true })
  dateApproved: Date | null;

  @ApiProperty({ description: 'Order ID', example: 'b7e7db43-e1a0-493a-bbc3-ba8b6da08ec6' })
  orderId: string;

  @ApiProperty({ description: 'User ID', example: 'b7e7db43-e1a0-493a-bbc3-ba8b6da08ec6' })
  userId: string;

  @ApiProperty({ description: 'Created timestamp', example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

export class MyPaymentResponseDto extends OmitType(PaymentResponseDto, ['userId', 'orderId'] as const) {}
