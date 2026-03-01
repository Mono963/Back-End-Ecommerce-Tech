import { ApiProperty } from '@nestjs/swagger';

export class CartItemVariantDto {
  @ApiProperty({ description: 'Variant ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Variant type', example: 'size' })
  type: string;

  @ApiProperty({ description: 'Variant name', example: 'Large' })
  name: string;

  @ApiProperty({ description: 'Price modifier applied by this variant', example: 200 })
  priceModifier: number;

  @ApiProperty({ description: 'Available stock for this variant', example: 10 })
  stock: number;

  @ApiProperty({ description: 'Indicates if the variant is available', example: true })
  isAvailable: boolean;
}

export class SelectedVariantDto {
  @ApiProperty({ description: 'Variant ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Variant type', example: 'color' })
  type: string;

  @ApiProperty({ description: 'Variant name', example: 'Red' })
  name: string;

  @ApiProperty({ description: 'Price modifier applied by this variant', example: 150 })
  priceModifier: number;
}
