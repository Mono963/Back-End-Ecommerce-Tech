import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiProperty({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}
