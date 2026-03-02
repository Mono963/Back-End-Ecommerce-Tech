import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { DeviceType, RepairStatus, RepairUrgency } from '../enum/repairs.enum';

export class CreateRepairDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Full name of the client' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 80)
  fullName: string;

  @ApiProperty({ example: 'juan@ejemplo.com', description: 'Contact email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+541112345678', description: 'Contact phone' })
  @IsNotEmpty()
  @IsString()
  @Length(10, 20)
  phone: string;

  @ApiProperty({ example: 'laptop', enum: DeviceType, description: 'Type of device' })
  @IsNotEmpty()
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiProperty({ example: 'MSI', description: 'Device brand' })
  @IsNotEmpty()
  @IsString()
  brand: string;

  @ApiProperty({ example: 'GF63 Thin', description: 'Device model' })
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiProperty({ example: 'La pantalla no enciende y hace ruidos extraños', description: 'Issue description' })
  @IsNotEmpty()
  @IsString()
  @Length(10, 1000)
  issueDescription: string;

  @ApiProperty({ example: 'medium', enum: RepairUrgency, description: 'Urgency level' })
  @IsNotEmpty()
  @IsEnum(RepairUrgency)
  urgency: RepairUrgency;
}

export class UpdateRepairStatusDto {
  @ApiProperty({ example: 'reviewing', enum: RepairStatus, description: 'New repair status' })
  @IsNotEmpty()
  @IsEnum(RepairStatus)
  status: RepairStatus;

  @ApiPropertyOptional({ example: 'Se requiere cambio de pantalla', description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  adminNotes?: string;
}

export class RepairResponseDto {
  @ApiProperty({ description: 'Repair ID' })
  id: string;

  @ApiProperty({ description: 'Client full name' })
  fullName: string;

  @ApiProperty({ description: 'Client email' })
  email: string;

  @ApiProperty({ description: 'Client phone' })
  phone: string;

  @ApiProperty({ enum: DeviceType, description: 'Type of device' })
  deviceType: DeviceType;

  @ApiProperty({ description: 'Device brand' })
  brand: string;

  @ApiProperty({ description: 'Device model' })
  model: string;

  @ApiProperty({ description: 'Issue description' })
  issueDescription: string;

  @ApiProperty({ enum: RepairUrgency, description: 'Urgency level' })
  urgency: RepairUrgency;

  @ApiProperty({ enum: RepairStatus, description: 'Current repair status' })
  status: RepairStatus;

  @ApiPropertyOptional({ description: 'Admin notes', nullable: true })
  adminNotes: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
