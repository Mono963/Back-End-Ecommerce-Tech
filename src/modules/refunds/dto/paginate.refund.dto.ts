import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto, PaginationQueryDto } from '../../../common/pagination';
import { RefundStatus } from '../enum/refund.enum';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RefundResponseDto } from './refund.dto';

export class RefundSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'pending',
    required: false,
    enum: RefundStatus,
    description: 'Filter by refund status',
  })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiProperty({
    example: 'uuid-of-user',
    required: false,
    description: 'Filter by user ID',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

@ApiExtraModels(RefundResponseDto)
export class PaginatedRefundsDto extends PaginatedResponseDto<RefundResponseDto> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(RefundResponseDto) },
  })
  declare items: RefundResponseDto[];
}
