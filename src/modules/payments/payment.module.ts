import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';
import { AuthsModule } from '../auths/auths.module';
import { Users } from '../users/entities/users.entity';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/order.details.entity';
import { DiscountsModule } from '../discounts/discounts.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Payment, Users, Order, OrderDetail]),
    forwardRef(() => AuthsModule),
    forwardRef(() => MercadoPagoModule),
    forwardRef(() => OrdersModule),
    DiscountsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
