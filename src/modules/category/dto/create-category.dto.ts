import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Technology',
  })
  @IsString()
  @MaxLength(50)
  category_name: string;
}
