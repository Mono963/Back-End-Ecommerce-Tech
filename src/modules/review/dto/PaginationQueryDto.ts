import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';
import { ReviewResponseAdminDto, ReviewResponsePublicDto } from './review.response.interface';
import { Rating } from '../enum/review.enum';

export class ReviewSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    enum: Rating,
    description: 'Filter reviews by rating',
  })
  @IsOptional()
  @IsEnum(Rating)
  rating?: Rating;

  @ApiProperty({
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter reviews by product ID',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    required: false,
    example: 'john_doe',
    description: 'Search reviews by username',
  })
  @IsOptional()
  @IsString()
  userName?: string;
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
