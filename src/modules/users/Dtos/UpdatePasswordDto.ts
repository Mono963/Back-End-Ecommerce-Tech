import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'contraseñaActual123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NuevaPassword!1' })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,15}$/, {
    message:
      'La nueva contraseña debe tener una mayúscula, una minúscula, un número y un carácter especial (!@#$%^&*), entre 8 y 15 caracteres.',
  })
  newPassword: string;
}
