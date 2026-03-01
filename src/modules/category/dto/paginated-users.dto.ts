import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/common/pagination/paginated-response.dto';
import { ResponseCategoryDto } from '../mappers/category.mapper';

@ApiExtraModels(ResponseCategoryDto)
export class PaginatedCategoryDto extends PaginatedResponseDto<ResponseCategoryDto> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(ResponseCategoryDto) },
  })
  declare items: ResponseCategoryDto[];
}
