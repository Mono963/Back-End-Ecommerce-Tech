import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundRequest } from './entities/refund-request.entity';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RefundRequest, Order]), MailModule, JwtModule],
  controllers: [RefundsController],
  providers: [RefundsService],
})
export class RefundsModule {}
