import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileService } from './file.service';
import { FileController } from './file.controller';
import { File } from './entities/file.entity';
import { Product } from '../products/Entities/products.entity';

import { ProductsModule } from '../products/products.module';
import { AuthsModule } from '../auths/auths.module';

import { CloudinaryProvider } from '../../config/cloudinary';

@Module({
  imports: [TypeOrmModule.forFeature([File, Product]), forwardRef(() => ProductsModule), forwardRef(() => AuthsModule)],
  controllers: [FileController],
  providers: [FileService, CloudinaryProvider],
  exports: [FileService],
})
export class FileModule {}
