import { Injectable, Logger } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { OrderPaymentsService } from '../order-payments/order-payments.service';
import { WebhookNotificationDto } from './interface/patment.interface';
import { MercadoPagoService } from './mercadopago.service';

@Injectable()
export class WebhookRouterService {
  private readonly logger = new Logger(WebhookRouterService.name);
  private processedWebhooks = new Set<string>();
  private readonly WEBHOOK_TTL = 60000;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly orderPaymentsService: OrderPaymentsService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  async handleWebhook(notification: WebhookNotificationDto): Promise<void> {
    const webhookKey = `${notification.type}_${notification.data?.id}_${notification.id}`;
    if (this.processedWebhooks.has(webhookKey)) {
      this.logger.log(`Webhook already processed: ${webhookKey}`);
      return;
    }

    this.processedWebhooks.add(webhookKey);
    setTimeout(
      () => this.processedWebhooks.delete(webhookKey),
      this.WEBHOOK_TTL,
    );

    try {
      const paymentInfo =
        await this.mercadoPagoService.processWebhook(notification);

      if (!paymentInfo) {
        this.logger.warn('No payment info received from webhook processing');
        return;
      }

      const paymentType = this.determinePaymentType(
        paymentInfo.external_reference,
      );

      this.logger.log(`Processing ${paymentType} payment: ${paymentInfo.id}`);

      switch (paymentType) {
        case 'donation':
          await this.paymentsService.processPaymentInfo(paymentInfo);
          break;
        case 'cart':
          await this.orderPaymentsService.processPaymentInfo(paymentInfo);
          break;
        default:
          this.logger.warn(
            `Unknown payment type for external_reference: ${paymentInfo.external_reference}`,
          );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error processing webhook: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private determinePaymentType(
    externalReference: string,
  ): 'donation' | 'cart' | 'unknown' {
    if (!externalReference) {
      return 'unknown';
    }

    if (externalReference.startsWith('donation-')) {
      return 'donation';
    }

    if (externalReference.startsWith('cart-')) {
      return 'cart';
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(externalReference)) {
      return 'donation';
    }

    return 'unknown';
  }
}
