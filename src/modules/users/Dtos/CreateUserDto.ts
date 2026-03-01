import { PickType, ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'This field must contain the users name',
    example: 'Carli',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 80)
  name: string;

  @ApiProperty({
    description: 'This field must contain the users email address',
    example: 'carli@gmail.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'This field must contain the birthdate',
    example: '1990-05-15',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    description: 'This field must contain the phone number',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone format' })
  phone: string;

  @ApiProperty({
    description: 'This field must contain the username',
    example: 'Carli87',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 80)
  username: string;

  @ApiProperty({
    description: 'This field must contain the password',
    example: 'Carli87@',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,15}$/, {
    message:
      'The password must have at least one uppercase letter, one lowercase letter, one number, and one special character. (!@#$%^&*)',
  })
  password: string;

  @ApiProperty({
    description: 'This field must contain the confirm password',
    example: 'Carli87@',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,15}$/, {
    message:
      'The confirmPassword must have at least one uppercase letter, one lowercase letter, one number, and one special character. (!@#$%^&*)',
  })
  confirmPassword: string;
}

export class LoginUserDto extends PickType(CreateUserDto, ['email', 'password']) {}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class CreateUserDbDto extends OmitType(CreateUserDto, ['confirmPassword'] as const) {}

export class UpdateUserDbDto extends OmitType(UpdateUserDto, ['confirmPassword', 'email'] as const) {}
