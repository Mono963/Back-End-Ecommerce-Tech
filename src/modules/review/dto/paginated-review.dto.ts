import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/common/pagination/paginated-response.dto';
import { ReviewResponseAdminDto } from './review.response.interface';

@ApiExtraModels(ReviewResponseAdminDto)
export class PaginatedUsersDto extends PaginatedResponseDto<ReviewResponseAdminDto> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(ReviewResponseAdminDto) },
  })
  declare items: ReviewResponseAdminDto[];
}
