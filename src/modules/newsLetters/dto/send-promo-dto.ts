import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendPromoDto {
  @ApiProperty({
    description: 'Title of the promotional newsletter.',
    example: 'Ofertas de Verano 2025',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Description/body of the promotional newsletter.',
    example: 'Aprovechá nuestros descuentos exclusivos de verano.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    description: 'Optional discount code for the promotion.',
    example: 'VERANO2025',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;
}
