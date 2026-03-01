import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { TechVariantType } from '../enum/product.enum';

export class CreateVariantDto {
  @ApiProperty({ enum: TechVariantType, example: TechVariantType.STORAGE })
  @IsEnum(TechVariantType)
  type: TechVariantType;

  @ApiProperty({ example: '512GB SSD NVMe' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ example: 'High-speed NVMe SSD storage' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiProperty({ example: 200.0, description: 'Price modifier (can be positive or negative)' })
  @IsNumber()
  priceModifier: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class ResponseVariantDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ enum: TechVariantType, example: TechVariantType.RAM })
  type: TechVariantType;

  @ApiProperty({ example: '16GB DDR4' })
  name: string;

  @ApiPropertyOptional({ example: 'High-speed DDR4 memory' })
  description?: string;

  @ApiProperty({ example: 120.0 })
  priceModifier: number;

  @ApiProperty({ example: 25 })
  stock: number;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({ example: 1 })
  sortOrder: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T14:45:00Z' })
  updatedAt: Date;
}
