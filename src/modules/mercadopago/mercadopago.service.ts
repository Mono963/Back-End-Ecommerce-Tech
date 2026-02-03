import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from 'mercadopago';
import { Users } from '../users/entities/users.entity';
import { Order } from '../orders/entities/order.entity';
import { CreatePreferenceDto, PaymentStatusDto, PreferenceResponseDto } from '../payments/dto/create-payment.dto';
import { IMercadoPagoPaymentInfo, IWebhookNotificationInterface } from '../payments/interface/payment.interface';
import { isMercadoPagoError } from '../payments/validate/payment.validate';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly client: MercadoPagoConfig;
  private readonly preference: Preference;
  private readonly payment: Payment;
  private readonly merchantOrder: MerchantOrder;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN is required but not provided');
    }
    this.client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });
    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
    this.merchantOrder = new MerchantOrder(this.client);
  }

  async createPreference(userId: string, orderId: string, dto: CreatePreferenceDto): Promise<PreferenceResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User with ID ${userId} not found`);
      throw new BadRequestException(`User with ID ${userId} not found`);
    }

    if (!orderId) {
      throw new BadRequestException('Order ID is required for payments');
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: ['orderDetail'],
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found for user ${userId}`);
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    if (!order.orderDetail?.total || order.orderDetail.total <= 0) {
      throw new BadRequestException('Order total must be greater than 0');
    }

    const externalReference = `order-${orderId}`;
    const itemTitle = 'Compra en WAT';
    const itemDescription = dto.message || 'Purchase from cart';

    const frontendUrl = (this.configService.get<string>('FRONTEND_MP_URL') || '').replace(/\/$/, '');
    const backendUrl = (this.configService.get<string>('BACKEND_MP_URL') || '').replace(/\/$/, '');

    if (!frontendUrl) {
      this.logger.error('FRONTEND_MP_URL is not configured');
      throw new BadRequestException('Payment service is not properly configured');
    }

    if (!backendUrl) {
      this.logger.error('BACKEND_MP_URL is not configured');
      throw new BadRequestException('Payment service is not properly configured');
    }

    const isLocalhost = frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1');

    const preferenceData = {
      items: [
        {
          id: `${orderId}`,
          title: itemTitle,
          description: itemDescription,
          quantity: 1,
          currency_id: dto.currency || 'ARS',
          unit_price: Number(order.orderDetail.total),
        },
      ],
      payer: {
        email: user.email,
      },
      back_urls: {
        success: `${frontendUrl}/orders/success`,
        failure: `${frontendUrl}/orders/failure`,
        pending: `${frontendUrl}/orders/pending`,
      },
      notification_url: `${backendUrl}/payments/webhook`,
      external_reference: externalReference,
      ...(isLocalhost ? {} : { auto_return: 'approved' as const }),
    };

    try {
      const response = await this.preference.create({ body: preferenceData });
      this.logger.log(
        `Payment preference created: ${response.id} for ${orderId} - user: ${userId} Con la orden ${orderId ? `, OrderId: ${orderId}` : ''}`,
      );
      return {
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Error creating ${orderId} preference for user ${userId}: ${message}`);
      throw new BadRequestException(`Failed to create ${orderId} preference`);
    }
  }

  async processWebhook(notification: unknown): Promise<IMercadoPagoPaymentInfo | null> {
    try {
      if (!notification || typeof notification !== 'object') {
        this.logger.warn('Invalid webhook notification format received');
        return null;
      }

      const notif = notification as IWebhookNotificationInterface;
      if (!notif.type || !notif.data?.id) {
        this.logger.warn('Webhook notification missing required fields');
        return null;
      }

      const resourceId = notif.data.id;
      this.logger.log(`Processing ${notif.type} notification with ID: ${resourceId}`);

      if (notif.type === 'topic_merchant_order_wh' || notif.type === 'merchant_order') {
        return await this.processMerchantOrderWebhook(resourceId);
      }

      if (notif.type === 'payment') {
        return await this.processPaymentWebhook(resourceId);
      }

      this.logger.log(`Received unhandled webhook type: ${notif.type}`);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing webhook: ${message}`, error instanceof Error ? error.stack : undefined);
      return null;
    }
  }

  /**
   * Procesa webhook de merchant_order - obtiene los payments asociados
   */
  private async processMerchantOrderWebhook(merchantOrderId: string): Promise<IMercadoPagoPaymentInfo | null> {
    try {
      this.logger.log(`Fetching merchant order: ${merchantOrderId}`);
      const merchantOrderResponse = await this.merchantOrder.get({ merchantOrderId });

      if (!merchantOrderResponse) {
        this.logger.warn(`Merchant order ${merchantOrderId} not found`);
        return null;
      }

      this.logger.log(`Merchant order ${merchantOrderId} status: ${merchantOrderResponse.status}`);

      const payments = merchantOrderResponse.payments || [];
      const approvedPayment = payments.find((p: { status?: string }) => p.status === 'approved');
      const paymentToProcess = approvedPayment || payments[0];

      if (!paymentToProcess?.id) {
        this.logger.warn(`No payments found in merchant order ${merchantOrderId}`);
        return null;
      }

      this.logger.log(`Processing payment ${paymentToProcess.id} from merchant order`);
      return await this.processPaymentWebhook(String(paymentToProcess.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Error processing merchant order ${merchantOrderId}: ${message}`);
      return null;
    }
  }

  /**
   * Procesa webhook de payment directamente
   */
  private async processPaymentWebhook(paymentId: string): Promise<IMercadoPagoPaymentInfo | null> {
    const isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';

    if (isDevelopment && (paymentId === '123456' || paymentId === 'test' || paymentId.length < 8)) {
      this.logger.log(`Test webhook detected with ID: ${paymentId} - Simulating approved payment`);
      const mockPaymentInfo: IMercadoPagoPaymentInfo = {
        id: parseInt(paymentId) || 123456,
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 100,
        currency_id: 'ARS',
        external_reference: 'order-test-uuid',
        payment_type_id: 'credit_card',
        payment_method_id: 'visa',
        date_approved: new Date().toISOString(),
      };
      return mockPaymentInfo;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const paymentInfo = await this.getPaymentInfoWithRetry(paymentId, 6, 3000);

    if (!paymentInfo) {
      this.logger.warn(`Payment info for ID ${paymentId} could not be retrieved after retries.`);
      return null;
    }

    this.logger.log(
      `Payment webhook processed successfully - Status: ${paymentInfo.status}, External Ref: ${paymentInfo.external_reference}`,
    );
    return paymentInfo;
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusDto> {
    try {
      const paymentInfo = await this.getPaymentInfo(paymentId);
      return {
        id: paymentInfo.id,
        status: paymentInfo.status,
        status_detail: paymentInfo.status_detail,
        transaction_amount: paymentInfo.transaction_amount,
        currency_id: paymentInfo.currency_id,
        date_approved: paymentInfo.date_approved,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting payment status: ${message}`);
      throw new BadRequestException('Failed to get payment status');
    }
  }

  private async getPaymentInfo(paymentId: string): Promise<IMercadoPagoPaymentInfo> {
    try {
      const paymentResponse = await this.payment.get({ id: paymentId });
      return paymentResponse as IMercadoPagoPaymentInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      if (isMercadoPagoError(error)) {
        const responseData = error.response?.data as { message?: string };
        if (responseData?.message === 'payment not found') {
          this.logger.warn(`Payment not found for ID: ${paymentId}`);
        }
      }
      this.logger.error(`Error fetching payment info: ${errorMessage}`);
      throw new BadRequestException(`Failed to fetch payment information: ${errorMessage}`);
    }
  }

  private async getPaymentInfoWithRetry(
    paymentId: string,
    maxRetries = 3,
    delayMs = 2000,
  ): Promise<IMercadoPagoPaymentInfo | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getPaymentInfo(paymentId);
      } catch (error) {
        const isPaymentNotFound =
          error instanceof BadRequestException && error.message.includes('Failed to fetch payment information');

        if (isPaymentNotFound && attempt < maxRetries) {
          this.logger.warn(`Payment info not found on attempt ${attempt}/${maxRetries}, retrying...`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        if (isPaymentNotFound) {
          this.logger.warn(`Payment info not available after ${maxRetries} retries.`);
          return null;
        }

        throw error;
      }
    }
    return null;
  }

  private getPaymentTypeFromReference(externalReference: string): string {
    if (!externalReference) return 'unknown';
    if (externalReference.startsWith('donation-')) return 'donation';
    if (externalReference.startsWith('cart-')) return 'cart';
    return 'legacy-donation';
  }
}
