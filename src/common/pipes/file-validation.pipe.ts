import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform<Express.Multer.File> {
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  private readonly maxSizeInBytes = 200 * 1024; // 200 KB

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File not provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed. Allowed: ${this.allowedMimeTypes.join(', ')}`);
    }

    if (file.size > this.maxSizeInBytes) {
      throw new BadRequestException('File size cannot exceed 200 KB');
    }

    return file;
  }
}
