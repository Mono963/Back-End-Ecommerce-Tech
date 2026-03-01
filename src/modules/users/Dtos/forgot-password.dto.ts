import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'andresdelossantos99@gmail.com',
    description: 'Email of the user requesting a password reset',
  })
  @IsEmail()
  email: string;
}
