import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { ProductsService } from '../products/products.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { v2 as CloudinaryType, UploadApiErrorResponse, UploadApiResponse, UploadStream } from 'cloudinary';
import { Readable, PassThrough } from 'stream';

describe('FileService', () => {
  let service: FileService;
  let productService: Partial<Record<keyof ProductsService, jest.Mock>>;
  let fileRepo: Partial<Record<keyof Repository<File>, jest.Mock>>;
  let cloudinary: typeof CloudinaryType;

  beforeEach(async () => {
    productService = {
      findProductEntityById: jest.fn(),
      saveProductEntity: jest.fn(),
    };

    fileRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    cloudinary = {
      uploader: {
        upload_stream: (
          options?: any,
          callback?: (error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => void,
        ): UploadStream => {
          const passthrough = new PassThrough();
          process.nextTick(() => {
            if (callback) {
              callback(undefined, {
                public_id: 'fake_id',
                version: 1,
                signature: 'fake_signature',
                width: 100,
                height: 100,
                format: 'jpg',
                resource_type: 'image',
                created_at: new Date().toISOString(),
                tags: [],
                bytes: 1234,
                type: 'upload',
                etag: 'fake_etag',
                placeholder: false,
                url: 'http://res.cloudinary.com/demo/image/upload/v1/fake.jpg',
                secure_url: 'https://cloudinary.com/fake-image.jpg',
                original_filename: 'fake_image',
                pages: 0,
                access_mode: 'public',
                moderation: [],
                access_control: [],
                context: {},
                metadata: {},
              } as unknown as UploadApiResponse);
            }
          });
          return passthrough;
        },
      },
    } as unknown as typeof CloudinaryType;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: ProductsService, useValue: productService },
        { provide: getRepositoryToken(File), useValue: fileRepo },
        { provide: 'CLOUDINARY', useValue: cloudinary },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  describe('uploadImage', () => {
    // Cast explícito para que TS y ESLint estén contentos
    const fakeFile = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake image buffer'),
      size: 1234,
      destination: '',
      filename: '',
      path: '',
      stream: new Readable(),
    } as Express.Multer.File;

    const productMock = {
      id: 'prod-1',
      imgUrls: [],
    };

    it('debería lanzar BadRequestException si no hay archivo o buffer', async () => {
      await expect(service.uploadImage('prod-1', null as any)).rejects.toThrow(BadRequestException);
      // Para evitar error TS: casteamos a unknown primero, luego a Express.Multer.File
      const invalidFile = {
        ...fakeFile,
        buffer: null,
      } as unknown as Express.Multer.File;

      await expect(service.uploadImage('prod-1', invalidFile)).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar NotFoundException si producto no existe', async () => {
      productService.findProductEntityById!.mockResolvedValue(null);

      await expect(service.uploadImage('prod-1', fakeFile)).rejects.toThrow(NotFoundException);

      expect(productService.findProductEntityById).toHaveBeenCalledWith('prod-1');
    });

    it('debería subir la imagen correctamente y actualizar el producto', async () => {
      productService.findProductEntityById!.mockResolvedValue(productMock);

      const createdImage = new File();
      createdImage.id = 'file-1';
      createdImage.url = 'https://cloudinary.com/fake-image.jpg';
      createdImage.mimeType = 'image/png';
      createdImage.product = productMock as any;

      fileRepo.create!.mockReturnValue(createdImage as File);
      fileRepo.save!.mockResolvedValue(createdImage as File);
      fileRepo.find!.mockResolvedValue([createdImage as File]);

      productService.saveProductEntity!.mockResolvedValue(productMock as any);

      const result = await service.uploadImage('prod-1', fakeFile);

      expect(productService.findProductEntityById).toHaveBeenCalledWith('prod-1');
      expect(fileRepo.create).toHaveBeenCalledWith({
        url: 'https://cloudinary.com/fake-image.jpg',
        mimeType: 'image/png',
        product: productMock,
      });
      expect(fileRepo.save).toHaveBeenCalledWith(createdImage);
      expect(fileRepo.find).toHaveBeenCalledWith({
        where: { product: { id: 'prod-1' } },
      });
      expect(productService.saveProductEntity).toHaveBeenCalledWith({
        ...productMock,
        imgUrls: ['https://cloudinary.com/fake-image.jpg'],
      });
      expect(result).toEqual({
        id: 'file-1',
        url: 'https://cloudinary.com/fake-image.jpg',
      });
    });

    it('debería rechazar si hay error en upload_stream', async () => {
      productService.findProductEntityById!.mockResolvedValue(productMock);

      // Mock error en upload_stream usando PassThrough
      cloudinary.uploader.upload_stream = (
        options?: any,
        callback?: (error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => void,
      ): UploadStream => {
        const passthrough = new PassThrough();
        process.nextTick(() => {
          if (callback) {
            callback(
              {
                message: 'fail upload',
                name: 'Error',
                http_code: 500,
              } as UploadApiErrorResponse,
              undefined,
            );
          }
        });
        return passthrough;
      };

      await expect(service.uploadImage('prod-1', fakeFile)).rejects.toThrow('Error al subir imagen a Cloudinary');
    });
  });
});
