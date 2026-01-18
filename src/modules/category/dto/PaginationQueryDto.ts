import { IsInt, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiProperty({
    example: 10,
    required: false,
    description: 'The number of items to return per page',
  })
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  @Max(100)
  limit = 10;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'The page number to retrive',
  })
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  page = 1;
}

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
