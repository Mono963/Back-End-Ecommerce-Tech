import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID único del archivo generado al subir la imagen',
  })
  id: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/v123456789/product.jpg',
    description: 'URL pública de la imagen subida a Cloudinary',
  })
  url: string;
}

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo de imagen a subir (JPG, PNG, etc.)',
  })
  file?: Express.Multer.File;
}
