import { ApiProperty } from '@nestjs/swagger';

import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Rating } from '../enum/review.enum';

export class CreateReviewDto {
  @IsUUID()
  @ApiProperty({
    description: 'ID of the product being reviewed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Rate from 1 to 5',
    example: Rating.FOUR,
  })
  @IsNotEmpty()
  @IsEnum(Rating)
  rating: Rating;

  @ApiProperty({
    description: 'Message about the product',
    example: 'I loved the product',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
