import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Cryptographic token received by email',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email associated with the account',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'New password. Must include an uppercase, a lowercase, a number, and a special character (!@#$%^&*), between 8 and 15 characters.',
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,15}$/, {
    message: 'Invalid password.',
  })
  newPassword: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Confirm the new password',
  })
  @IsString()
  confirmPassword: string;
}
