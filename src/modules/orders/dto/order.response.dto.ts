import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { OrderStatus } from '../enum/order.enum';
import { UserSummaryDto } from './order.shared.dto';
import { OrderDetailResponseDto } from './order.detail-response.dto';
import { PaginatedResponseDto } from '../../../common/pagination';

export class ResponseOrderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'ORD-202401-0001' })
  orderNumber: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;

  @ApiProperty({ type: OrderDetailResponseDto })
  orderDetail: OrderDetailResponseDto;
}

@ApiExtraModels(ResponseOrderDto)
export class PaginatedOrdersDto extends PaginatedResponseDto<ResponseOrderDto> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(ResponseOrderDto) },
  })
  declare items: ResponseOrderDto[];
}
