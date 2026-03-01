import { forwardRef, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart } from './entities/cart.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from '../users/entities/users.entity';
import { Product } from '../products/entities/products.entity';
import { ProductVariant } from '../products/entities/products_variant.entity';
import { AuthsModule } from '../auths/auths.module';
import { CartItem } from './entities/cart.item.entity';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { MailModule } from '../mail/mail.module';
import { AbandonedCartService } from './abandoned-cart.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Users, Product, ProductVariant]),
    forwardRef(() => AuthsModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => OrdersModule),
    forwardRef(() => MailModule),
  ],
  controllers: [CartController],
  providers: [CartService, AbandonedCartService, DistributedLockService],
  exports: [CartService, AbandonedCartService, TypeOrmModule],
})
export class CartModule {}
