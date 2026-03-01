import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

export class PreferenceResponseDto {
  @ApiProperty({ description: 'Generated MercadoPago preference ID' })
  preferenceId: string;

  @ApiProperty({ description: 'Checkout init point URL' })
  initPoint: string;

  @ApiProperty({ description: 'Sandbox checkout init point URL' })
  sandboxInitPoint: string;
}
