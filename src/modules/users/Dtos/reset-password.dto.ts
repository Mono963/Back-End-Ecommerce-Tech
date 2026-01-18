import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'andresdelossantos99@gmail.com',
    description: 'Token recibido en el email (en este caso, el email del usuario)',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NuevaPassword123!',
    description:
      'Nueva contraseña. Debe tener una mayúscula, una minúscula, un número y un carácter especial (!@#$%^&*), entre 8 y 15 caracteres.',
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,15}$/, {
    message: 'Password inválida.',
  })
  newPassword: string;

  @ApiProperty({
    example: 'NuevaPassword123!',
    description: 'Confirmación de la nueva contraseña',
  })
  @IsString()
  confirmPassword: string;
}
