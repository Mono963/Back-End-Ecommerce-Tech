import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/products.entity';
import { ProductVariant } from './entities/products_variant.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesModule } from '../category/category.module';
import { AuthsModule } from '../auths/auths.module';
import { Review } from '../review/entities/review.entity';
import { N8nModule } from '../N8N/n8n.module';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, Review]),
    forwardRef(() => CategoriesModule),
    forwardRef(() => AuthsModule),
    forwardRef(() => N8nModule),
    forwardRef(() => DiscountsModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
