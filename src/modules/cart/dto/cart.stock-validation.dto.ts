import { ApiProperty } from '@nestjs/swagger';

export class StockValidationIssueDto {
  @ApiProperty({ description: 'Cart item ID' })
  itemId: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({
    description: 'Description of the stock issue',
    example: 'Insufficient stock',
  })
  issue: string;

  @ApiProperty({ description: 'Requested quantity', example: 5 })
  requested: number;

  @ApiProperty({ description: 'Available stock', example: 2 })
  available: number;
}

export class StockValidationResultDto {
  @ApiProperty({ description: 'Indicates if stock validation passed', example: false })
  valid: boolean;

  @ApiProperty({
    description: 'List of stock validation issues',
    type: [StockValidationIssueDto],
  })
  issues: StockValidationIssueDto[];
}
