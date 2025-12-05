import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Length, Max, Min } from 'class-validator';
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

export class ProductsSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'ram',
    required: false,
    description: 'name to search for products',
  })
  @IsOptional()
  @Length(3, 80)
  @IsString()
  name?: string;

  @ApiProperty({
    example: 1000,
    required: false,
    description: 'price to search for products',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price?: number;
}
