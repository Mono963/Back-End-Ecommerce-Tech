import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

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
