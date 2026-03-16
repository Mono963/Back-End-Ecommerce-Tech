import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/pagination';
import { OrderStatus } from '../enum/order.enum';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class OrderFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'End date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'ORD-2024-01-0001',
    description: 'Search by order number',
  })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({
    example: 'juan@example.com',
    description: 'Search by user email',
  })
  @IsOptional()
  @IsString()
  userEmail?: string;
}
