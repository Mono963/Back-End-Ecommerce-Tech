import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'andresdelossantos99@gmail.com',
    description: 'Token received by email (in this case, the user email)',
  })
  @IsString()
  token: string;

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
