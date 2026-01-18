import { ApiProperty } from '@nestjs/swagger';
import { Rating } from '../interface/IReview.interface';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
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
