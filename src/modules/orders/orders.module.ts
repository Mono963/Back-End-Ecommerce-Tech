import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CheckoutService } from './checkout.service';
import { OrderNotificationService } from './order-notifications.service';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order.details.entity';
import { Product } from '../products/entities/products.entity';
import { ProductVariant } from '../products/entities/products_variant.entity';
import { AuthsModule } from '../auths/auths.module';
import { Users } from '../users/entities/users.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart.item.entity';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { OrderItem } from './entities/order.item.entity';
import { MailModule } from '../mail/mail.module';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail, OrderItem, Users, Product, ProductVariant, Cart, CartItem]),
    forwardRef(() => AuthsModule),
    forwardRef(() => CartModule),
    forwardRef(() => UsersModule),
    MailModule,
    DiscountsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CheckoutService, OrderNotificationService],
  exports: [OrdersService, CheckoutService, OrderNotificationService, TypeOrmModule],
})
export class OrdersModule {}
