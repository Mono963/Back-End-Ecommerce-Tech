import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/common/pagination/paginated-response.dto';
import { ResponseProductDto } from '../interface/pruducts.interface';

@ApiExtraModels(ResponseProductDto)
export class PaginatedProductsDto extends PaginatedResponseDto<ResponseProductDto> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(ResponseProductDto) },
  })
  declare items: ResponseProductDto[];
}
