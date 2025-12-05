import { forwardRef, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart } from './entities/cart.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from '../users/Entyties/users.entity';
import { Product } from '../products/Entities/products.entity';
import { ProductVariant } from '../products/Entities/products_variant.entity';
import { AuthsModule } from '../auths/auths.module';
import { CartItem } from './entities/cart.item.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Users, Product, ProductVariant]),
    forwardRef(() => AuthsModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService, TypeOrmModule],
})
export class CartModule {}
