import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './Entities/products.entity';
import { ProductVariant } from './Entities/products_variant.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesModule } from '../category/category.module';
import { AuthsModule } from '../auths/auths.module';
import { Review } from '../review/entities/review.entity';
import { N8nModule } from '../N8N/n8n.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, Review]),
    forwardRef(() => CategoriesModule),
    forwardRef(() => AuthsModule),
    forwardRef(() => N8nModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
