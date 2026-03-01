import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Unique file ID generated when uploading the image',
  })
  id: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/v123456789/product.jpg',
    description: 'Public URL of the image uploaded to Cloudinary',
  })
  url: string;
}

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to upload (JPG, PNG, etc.)',
  })
  file?: Express.Multer.File;
}
