import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of contact',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Contact email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+541112345678',
    description: 'Contact phone',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'Inquiry about services',
    description: 'Reason for contact',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
