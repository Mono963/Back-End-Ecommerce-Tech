import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Casa' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'Av. Corrientes 1234' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Buenos Aires' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'CABA' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: 'C1043' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiPropertyOptional({ default: 'Argentina' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

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
