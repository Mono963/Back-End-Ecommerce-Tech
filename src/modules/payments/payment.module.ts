import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Users } from '../users/Entyties/users.entity';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MercadoPagoService } from './mercadopago.service';
import { Donate } from '../donations/entities/donation.entity';
import { DonationsModule } from '../donations/donations.module';
import { AuthsModule } from '../auths/auths.module';
import { OrderPaymentsModule } from '../order-payments/order-payments.module';
import { WebhookRouterService } from './webhooks-router.service';
import { OrderPaymentsService } from '../order-payments/order-payments.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Users, Donate]),
    forwardRef(() => DonationsModule),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthsModule),
    forwardRef(() => OrderPaymentsModule),
    MailModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MercadoPagoService,
    WebhookRouterService,
    OrderPaymentsService,
  ],
  exports: [PaymentsService, MercadoPagoService, WebhookRouterService],
})
export class PaymentsModule {}
