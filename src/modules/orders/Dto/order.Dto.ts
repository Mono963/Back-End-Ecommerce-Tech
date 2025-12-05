import { IsUUID, IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ProductIdDto {
  @ApiProperty({ example: 'c3f45d9a-0a44-4d8b-8b93-8f22987402f4' })
  @IsUUID()
  id: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'a0f99ac2-7a89-4c44-8a78-cf2d3b95a90c' })
  @IsUUID()
  userId: string;

  @ApiProperty({
    example: [{ id: 'c3f45d9a-0a44-4d8b-8b93-8f22987402f4' }, { id: 'bc8a2049-5ee6-4aa4-a073-3e11891cb6a9' }],
    type: [ProductIdDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductIdDto)
  products: ProductIdDto[];
}
