import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleUserDto {
  @ApiProperty({ example: 'google-uid-123456' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'johndoe@gmail.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'ya29.a0AfH6SMC...' })
  @IsString()
  accessToken: string;
}
