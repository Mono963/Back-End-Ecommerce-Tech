import { ApiProperty } from '@nestjs/swagger';
import { Rating } from '../enum/review.enum';
import { ReviewUserAdminDto, ReviewUserPublicDto } from './review.user.interface';

export class ReviewProductDto {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;
}

export class ReviewResponsePublicDto {
  @ApiProperty({ description: 'Review ID' })
  id: string;

  @ApiProperty({
    description: 'Rating given by the user',
    enum: Rating,
    example: Rating.FIVE,
  })
  rating: Rating;

  @ApiProperty({ description: 'Review message content' })
  message: string;

  @ApiProperty({ description: 'Review creation date' })
  createdAt: Date;

  @ApiProperty({
    description: 'User information (public)',
    type: ReviewUserPublicDto,
    required: false,
  })
  user?: ReviewUserPublicDto;

  @ApiProperty({
    description: 'Product information',
    type: ReviewProductDto,
    required: false,
  })
  product?: ReviewProductDto;
}

export class ReviewResponseAdminDto {
  @ApiProperty({ description: 'Review ID' })
  id: string;

  @ApiProperty({
    description: 'Rating given by the user',
    enum: Rating,
    example: Rating.FOUR,
  })
  rating: Rating;

  @ApiProperty({ description: 'Review message content' })
  message: string;

  @ApiProperty({
    description: 'Indicates whether the review is visible to the public',
    example: true,
  })
  isVisible: boolean;

  @ApiProperty({ description: 'Review creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Review last update date' })
  updatedAt: Date;

  @ApiProperty({
    description: 'User information (admin)',
    type: ReviewUserAdminDto,
    required: false,
  })
  user?: ReviewUserAdminDto;

  @ApiProperty({
    description: 'Product information',
    type: ReviewProductDto,
    required: false,
  })
  product?: ReviewProductDto;
}
