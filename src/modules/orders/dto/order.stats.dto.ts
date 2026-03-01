import { ApiProperty } from '@nestjs/swagger';

export class OrdersByStatusDto {
  @ApiProperty({ example: 5 })
  pending: number;

  @ApiProperty({ example: 3 })
  paid: number;

  @ApiProperty({ example: 10 })
  processing: number;

  @ApiProperty({ example: 8 })
  shipped: number;

  @ApiProperty({ example: 120 })
  delivered: number;
}

export class RevenueDto {
  @ApiProperty({ example: 254320.5 })
  total: number;

  @ApiProperty({ example: 35000.0 })
  monthly: number;
}

export class OrderStatsDto {
  @ApiProperty({ example: 150 })
  totalOrders: number;

  @ApiProperty({ type: OrdersByStatusDto })
  ordersByStatus: OrdersByStatusDto;

  @ApiProperty({ type: RevenueDto })
  revenue: RevenueDto;

  @ApiProperty({ example: '80.00%' })
  completionRate: string;
}
