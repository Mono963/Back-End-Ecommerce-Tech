import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
    description: 'Email to search for users',
  })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;
}
