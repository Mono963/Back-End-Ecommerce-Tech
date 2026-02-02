import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Tecnología',
  })
  @IsString()
  @MaxLength(50)
  category_name: string;
}
