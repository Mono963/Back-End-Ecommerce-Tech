import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order.details.entity';
import { Product } from '../products/entities/products.entity';
import { ProductVariant } from '../products/entities/products_variant.entity';
import { AuthsModule } from '../auths/auths.module';
import { Users } from '../users/entities/users.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart.item.entity';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { OrderItem } from './entities/order.item';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail, OrderItem, Users, Product, ProductVariant, Cart, CartItem]),
    forwardRef(() => AuthsModule),
    forwardRef(() => CartModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, TypeOrmModule],
})
export class OrdersModule {}
