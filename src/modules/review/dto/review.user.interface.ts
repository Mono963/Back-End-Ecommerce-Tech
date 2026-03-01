import { ApiProperty } from '@nestjs/swagger';

export class ReviewUserPublicDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User display name' })
  name: string;
}

export class ReviewUserAdminDto extends ReviewUserPublicDto {
  @ApiProperty({ description: 'User email address' })
  email: string;
}
