import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class SelectAddressDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the address from user.addresses array',
  })
  @IsUUID('4', { message: 'addressId must be a valid UUID' })
  @IsNotEmpty({ message: 'addressId is required' })
  addressId: string;
}
