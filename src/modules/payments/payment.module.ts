import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';
import { AuthsModule } from '../auths/auths.module';
import { MailModule } from '../mail/mail.module';
import { Users } from '../users/entities/users.entity';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { Payment } from './entities/payment.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Payment, Users]),
    forwardRef(() => AuthsModule),
    MailModule,
    forwardRef(() => MercadoPagoService),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
