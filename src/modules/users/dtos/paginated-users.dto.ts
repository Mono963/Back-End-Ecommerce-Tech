import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/common/pagination/paginated-response.dto';
import { UserResponseWithAdminDto } from './user-response.dto';

@ApiExtraModels(UserResponseWithAdminDto)
export class PaginatedUsersDto extends PaginatedResponseDto<UserResponseWithAdminDto> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(UserResponseWithAdminDto) },
  })
  declare items: UserResponseWithAdminDto[];
}
