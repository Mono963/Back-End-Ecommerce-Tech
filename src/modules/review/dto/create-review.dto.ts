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

export class PaginatedReviewsDto {
  @ApiProperty({ type: [Object] })
  items: ReviewResponsePublicDto[];

  @ApiProperty({ example: 100, description: 'Total reviews' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  pages: number;
}

export class PaginatedReviewsAdminDto {
  @ApiProperty({ type: [Object] })
  items: ReviewResponseAdminDto[];

  @ApiProperty({ example: 100, description: 'Total reviews' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  pages: number;
}

class ReviewUserPublicDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User display name' })
  name: string;
}

class ReviewUserAdminDto extends ReviewUserPublicDto {
  @ApiProperty({ description: 'User email address' })
  email: string;
}

class ReviewProductDto {
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
