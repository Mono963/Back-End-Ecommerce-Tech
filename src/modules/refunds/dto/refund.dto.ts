import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';
import { RefundStatus } from '../enum/refund.enum';

export class CreateRefundDto {
  @ApiProperty({ example: 'uuid-of-order', description: 'ID of the order to request refund for' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ example: 'Producto defectuoso', description: 'Short reason for the refund' })
  @IsNotEmpty()
  @IsString()
  @Length(5, 100)
  reason: string;

  @ApiProperty({ example: 'El producto llegó con daños visibles en el empaque y no funciona correctamente', description: 'Detailed description of the refund request' })
  @IsNotEmpty()
  @IsString()
  @Length(10, 1000)
  description: string;
}

export class AdminRefundActionDto {
  @ApiProperty({ example: 'Reembolso aprobado, se procesará en 5 días hábiles', description: 'Admin response/explanation' })
  @IsNotEmpty()
  @IsString()
  @Length(5, 1000)
  adminResponse: string;
}

export class RefundResponseDto {
  @ApiProperty({ description: 'Refund request ID' })
  id: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Refund reason' })
  reason: string;

  @ApiProperty({ description: 'Detailed description' })
  description: string;

  @ApiProperty({ enum: RefundStatus, description: 'Current refund status' })
  status: RefundStatus;

  @ApiPropertyOptional({ description: 'Admin response', nullable: true })
  adminResponse: string | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
