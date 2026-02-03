import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddToWishlistDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID to add',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;
}

export class WishlistItemResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  addedAt: Date;

  @ApiProperty({ description: 'Full product with relations' })
  product: {
    id: string;
    name: string;
    description: string;
    brand: string;
    model: string;
    basePrice: number;
    baseStock: number;
    imgUrls: string[];
    featured: boolean;
    isActive: boolean;
    category: {
      id: string;
      name: string;
    } | null;
  };
}

export class WishlistResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ type: [WishlistItemResponseDto] })
  items: WishlistItemResponseDto[];

  @ApiProperty({ example: 5, description: 'Total items in the wishlist' })
  totalItems: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}

export class WishlistSummaryDto {
  @ApiProperty({ example: 5, description: 'Number of items in the wishlist' })
  itemCount: number;
}
