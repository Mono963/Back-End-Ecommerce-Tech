import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/pagination';

export class CategorySearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'laptops',
    required: false,
    description: 'Category to search for users',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
