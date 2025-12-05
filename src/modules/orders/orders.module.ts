import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './Entities/order.entity';
import { OrderDetail } from './Entities/orderDetails.entity';
import { Product } from '../products/Entities/products.entity';
import { ProductVariant } from '../products/Entities/products_variant.entity';
import { AuthsModule } from '../auths/auths.module';
import { Users } from '../users/Entyties/users.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart.item.entity';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { OrderItem } from './Entities/order.item';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail, OrderItem, Users, Product, ProductVariant, Cart, CartItem]),
    forwardRef(() => AuthsModule),
    forwardRef(() => CartModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
