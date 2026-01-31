import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    example: 'Casa',
    description: 'Label for the address (e.g., Home, Work, Office)',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'El label es requerido' })
  @MinLength(2, { message: 'El label debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El label no puede exceder 50 caracteres' })
  label: string;

  @ApiProperty({
    example: 'Av. Corrientes 1234, Piso 5, Depto B',
    description: 'Street address with number, floor, apartment',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'La calle es requerida' })
  @MinLength(5, { message: 'La calle debe tener al menos 5 caracteres' })
  @MaxLength(255, { message: 'La calle no puede exceder 255 caracteres' })
  street: string;

  @ApiProperty({
    example: 'Buenos Aires',
    description: 'City name',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'La ciudad es requerida' })
  @MinLength(2, { message: 'La ciudad debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  city: string;

  @ApiProperty({
    example: 'CABA',
    description: 'Province or state',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'La provincia es requerida' })
  @MinLength(2, { message: 'La provincia debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'La provincia no puede exceder 100 caracteres' })
  province: string;

  @ApiProperty({
    example: 'C1043',
    description: 'Postal code',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'El código postal es requerido' })
  @MinLength(3, { message: 'El código postal debe tener al menos 3 caracteres' })
  @MaxLength(20, { message: 'El código postal no puede exceder 20 caracteres' })
  @Matches(/^[A-Z0-9\s-]+$/i, {
    message: 'El código postal solo puede contener letras, números, espacios y guiones',
  })
  postalCode: string;

  @ApiPropertyOptional({
    example: 'Argentina',
    description: 'Country name',
    default: 'Argentina',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El país no puede exceder 100 caracteres' })
  country?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Set this address as the default shipping address',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({
    example: 'Oficina',
    description: 'Updated label for the address',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({
    example: 'Av. Libertador 5678, Piso 10',
    description: 'Updated street address',
  })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({
    example: 'Rosario',
    description: 'Updated city',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: 'Santa Fe',
    description: 'Updated province',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({
    example: 'S2000',
    description: 'Updated postal code',
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[A-Z0-9\s-]+$/i)
  postalCode?: string;

  @ApiPropertyOptional({
    example: 'Argentina',
    description: 'Updated country',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Update default address status',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UserAddressDto {
  @ApiProperty({ example: 'uuid-address-123' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Casa' })
  @IsString()
  label: string;

  @ApiProperty({ example: 'Av. Corrientes 1234' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'Buenos Aires' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'CABA' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'C1043' })
  @IsString()
  postalCode: string;

  @ApiProperty({ example: 'Argentina' })
  @IsString()
  country: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isDefault: boolean;
}
