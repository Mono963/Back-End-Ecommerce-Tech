import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform<Express.Multer.File> {
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  private readonly maxSizeInBytes = 5 * 1024 * 1024;

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File not provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed. Allowed: ${this.allowedMimeTypes.join(', ')}`);
    }

    if (file.size > this.maxSizeInBytes) {
      throw new BadRequestException('File size cannot exceed 5 MB');
    }

    return file;
  }
}
