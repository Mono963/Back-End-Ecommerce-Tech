import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MercadoPagoService } from './mercadopago.service';
import { PaymentsModule } from '../payments/payment.module';
import { Users } from '../users/entities/users.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Users, Order]), forwardRef(() => PaymentsModule)],
  controllers: [],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
