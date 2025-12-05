import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { v2 as CloudinaryType } from 'cloudinary';

import { ProductsService } from '../products/products.service';
import { File } from './entities/file.entity';
import { CloudinaryUploadResult } from './interface/file.interface';
import { Product } from '../products/Entities/products.entity';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private readonly productService: ProductsService,

    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @Inject('CLOUDINARY')
    private readonly cloudinary: typeof CloudinaryType,
  ) {}

  async uploadImage(id: string, file: Express.Multer.File): Promise<{ id: string; url: string }> {
    if (!file?.buffer) {
      this.logger.error('Archivo vacío o no proporcionado');
      throw new BadRequestException('Archivo inválido');
    }

    const productDto = await this.productService.getProductById(id);
    if (!productDto) {
      this.logger.warn(`Producto con ID ${id} no encontrado`);
      throw new NotFoundException(`Producto con ID ${id} no existe`);
    }

    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['files'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no existe`);
    }

    this.logger.log(`Subiendo imagen para producto: ${product.id}`);

    const result = await this.uploadToCloudinary(file);
    this.logger.log(`Imagen subida correctamente: ${result.secure_url}`);

    const image = this.fileRepo.create({
      url: result.secure_url,
      mimeType: file.mimetype,
      product,
    });

    await this.fileRepo.save(image);

    const updatedFiles = await this.fileRepo.find({
      where: { product: { id: product.id } },
    });

    product.imgUrls = updatedFiles.map((file) => file.url);
    await this.productRepo.save(product);

    return { id: image.id, url: image.url };
  }

  private uploadToCloudinary(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || 'products',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Error al subir imagen a Cloudinary', error);
            return reject(new Error('Error al subir imagen a Cloudinary'));
          }
          resolve(result as CloudinaryUploadResult);
        },
      );

      Readable.from(file.buffer).pipe(stream);
    });
  }

  async getProductImages(productId: string): Promise<File[]> {
    return await this.fileRepo.find({
      where: { product: { id: productId } },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteImage(imageId: string): Promise<{ message: string }> {
    const image = await this.fileRepo.findOne({
      where: { id: imageId },
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    const productId = image.product.id;

    await this.fileRepo.remove(image);

    const remainingFiles = await this.fileRepo.find({
      where: { product: { id: productId } },
    });

    await this.productRepo.update(productId, {
      imgUrls: remainingFiles.map((f) => f.url),
    });

    return { message: 'Imagen eliminada correctamente' };
  }
}
