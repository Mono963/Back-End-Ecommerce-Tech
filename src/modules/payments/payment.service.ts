// src/modules/payments/payment.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IPaymentService,
  PaymentCompletedEvent,
  WebhookNotificationDto,
  MercadoPagoPaymentInfo,
} from './interface/patment.interface';
import {
  CreatePreferenceDto,
  PaymentStatusDto,
  PreferenceResponseDto,
} from './dto/create-payment.dto';
import { MercadoPagoService } from './mercadopago.service';

@Injectable()
export class PaymentsService implements IPaymentService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPreference(
    userId: string,
    dto: CreatePreferenceDto,
  ): Promise<PreferenceResponseDto> {
    return this.mercadoPagoService.createPreference(userId, dto);
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusDto> {
    return this.mercadoPagoService.getPaymentStatus(paymentId);
  }

  async handleWebhook(notification: WebhookNotificationDto): Promise<void> {
    this.logger.warn(
      'handleWebhook called directly on PaymentsService - should use WebhookRouterService',
    );
    const paymentInfo =
      await this.mercadoPagoService.processWebhook(notification);
    if (paymentInfo) {
      await this.processPaymentInfo(paymentInfo);
    }
  }

  async processPaymentInfo(paymentInfo: MercadoPagoPaymentInfo): Promise<void> {
    try {
      if (
        paymentInfo.status === 'approved' ||
        paymentInfo.status === 'pending' ||
        paymentInfo.status === 'in_process' ||
        paymentInfo.status === 'rejected'
      ) {
        if (!paymentInfo.external_reference) {
          this.logger.error('Payment approved but no external_reference found');
          return;
        }

        let userId: string;
        if (paymentInfo.external_reference.startsWith('donation-')) {
          userId = paymentInfo.external_reference.replace('donation-', '');
        } else {
          userId = paymentInfo.external_reference;
        }

        const event: PaymentCompletedEvent = {
          paymentId: paymentInfo.id.toString(),
          userId: userId,
          amount: paymentInfo.transaction_amount,
          currency: paymentInfo.currency_id,
          status: paymentInfo.status,
          statusDetail: paymentInfo.status_detail,
          paymentTypeId: paymentInfo.payment_type_id,
          paymentMethodId: paymentInfo.payment_method_id,
          dateApproved: paymentInfo.date_approved,
        };

        await this.eventEmitter.emitAsync('payment.completed', event);
        this.logger.log(
          `Donation payment completed event emitted for payment: ${paymentInfo.id}, user: ${userId}`,
        );
      } else {
        this.logger.log(
          `Donation payment not approved - Status: ${paymentInfo.status}, Payment: ${paymentInfo.id}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error processing donation payment: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
