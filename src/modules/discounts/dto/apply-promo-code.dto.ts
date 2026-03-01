import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ApplyPromoCodeDto {
  @ApiProperty({ example: 'NEWS30', description: 'Codigo promocional a validar' })
  @IsString()
  @Length(3, 50)
  code: string;
}
