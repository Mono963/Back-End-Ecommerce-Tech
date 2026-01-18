import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform<Express.Multer.File> {
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  private readonly maxSizeInBytes = 200 * 1024; // 200 KB

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido. Permitidos: ${this.allowedMimeTypes.join(', ')}`);
    }

    if (file.size > this.maxSizeInBytes) {
      throw new BadRequestException(`El tamaño del archivo no puede superar los 200 KB`);
    }

    return file;
  }
}
