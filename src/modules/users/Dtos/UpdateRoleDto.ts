import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({
    example: true,
    description: 'Define si el usuario será admin o no',
  })
  @IsBoolean()
  isAdmin?: boolean;

  @ApiProperty({
    example: true,
    description: 'Define si el usuario será Superadmin o no',
  })
  @IsBoolean()
  isSuperAdmin?: boolean;
}

export interface ResponseUserRoleDto {
  isAdmin: boolean;
  isSuperAdmin: boolean;
}
