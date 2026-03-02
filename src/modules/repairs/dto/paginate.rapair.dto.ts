import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto, PaginationQueryDto } from '../../../common/pagination';
import { RepairStatus, RepairUrgency } from '../enum/repairs.enum';
import { IsEnum, IsOptional } from 'class-validator';
import { RepairResponseDto } from './repairs.dto';

export class RepairSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'pending',
    required: false,
    enum: RepairStatus,
    description: 'Filter by repair status',
  })
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @ApiProperty({
    example: 'high',
    required: false,
    enum: RepairUrgency,
    description: 'Filter by urgency level',
  })
  @IsOptional()
  @IsEnum(RepairUrgency)
  urgency?: RepairUrgency;
}

@ApiExtraModels(RepairResponseDto)
export class PaginatedRepairsDto extends PaginatedResponseDto<RepairResponseDto> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(RepairResponseDto) },
  })
  declare items: RepairResponseDto[];
}
