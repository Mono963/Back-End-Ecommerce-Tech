import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DonationsService } from 'src/modules/donations/donations.service';
import { PaymentCompletedEvent } from '../interface/patment.interface';
import {
  PaymentStatus,
  PaymentStatusDetail,
} from 'src/modules/donations/dto/create-donation.dto';

@Injectable()
export class PaymentCompletedListener {
  private readonly logger = new Logger(PaymentCompletedListener.name);

  constructor(private readonly donationsService: DonationsService) {}

  @OnEvent('payment.completed', { async: true })
  async handlePaymentCompletedEvent(payload: PaymentCompletedEvent) {
    try {
      this.logger.log('🟢 Evento recibido: payment.completed');
      this.logger.debug(`Payload: ${JSON.stringify(payload)}`);

      if (!payload.userId || !payload.paymentId) {
        this.logger.error('❌ Payload incompleto:', payload);
        return;
      }

      await this.donationsService.createDonate(payload.userId, {
        pagoId: payload.paymentId,
        status: payload.status as PaymentStatus,
        statusDetail: payload.statusDetail as PaymentStatusDetail,
        amount: payload.amount,
        currencyId: payload.currency,
        paymentTypeId: payload.paymentTypeId,
        paymentMethodId: payload.paymentMethodId,
        dateApproved: new Date(payload.dateApproved),
      });

      this.logger.log(`✅ Donación guardada correctamente`);
    } catch (error) {
      this.logger.error(
        '❌ Error al procesar el evento payment.completed',
        error,
      );
    }
  }
}
