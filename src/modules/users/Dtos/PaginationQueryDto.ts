import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';

export class UserSearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: 'john_doe',
    required: false,
    description: 'Username to search for users',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    example: 'john@example.com',
    required: false,
    description: 'Email or partial email to search for users',
  })
  @IsOptional()
  @IsString()
  email?: string;
}
