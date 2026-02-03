import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePreferenceDto, PaymentStatusDto, PreferenceResponseDto } from '../payments/dto/create-payment.dto';

import { MailQueueService } from '../mail/mail-queue_email.service';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/order.details.entity';
import { Users } from '../users/entities/users.entity';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { IPaymentService } from './validate/payment.validate';
import {
  IMercadoPagoPaymentInfo,
  IPaymentCompleted,
  IPaymentResponse,
  IWebhookNotificationInterface,
} from './interface/payment.interface';
import { OrderStatus } from '../orders/interfaces/orders.interface';

@Injectable()
export class PaymentsService implements IPaymentService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    @InjectRepository(Payment)
    private readonly PaymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepository: Repository<OrderDetail>,
    private readonly mailQueueService: MailQueueService,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  private mapPaymentToResponse(payment: Payment): IPaymentResponse {
    return {
      id: payment.id,
      paymentId: payment.paymentId,
      status: payment.status,
      statusDetail: payment.statusDetail,
      amount: payment.amount,
      currencyId: payment.currencyId,
      paymentTypeId: payment.paymentTypeId,
      paymentMethodId: payment.paymentMethodId,
      dateApproved: payment.dateApproved,
      orderId: payment.order?.id,
      userId: payment.user?.id,
      createdAt: payment.createdAt,
    };
  }

  async createPreferencePayment(
    userId: string,
    dto: CreatePreferenceDto & { orderId: string },
  ): Promise<PreferenceResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId, user: { id: userId } },
      relations: ['user', 'orderDetail'],
    });

    if (!order) {
      throw new BadRequestException(`Order with ID ${dto.orderId} not found or doesn't belong to user ${userId}`);
    }
    const cartTotal = Number(order.orderDetail.total);
    if (Number.isNaN(cartTotal)) {
      throw new BadRequestException('Invalid cart total');
    }

    return await this.mercadoPagoService.createPreference(userId, dto.orderId, dto);
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusDto> {
    return await this.mercadoPagoService.getPaymentStatus(paymentId);
  }

  async handleWebhook(notification: IWebhookNotificationInterface): Promise<void> {
    this.logger.warn('handleWebhook called directly on PaymentsService - should use WebhookRouterService');
    const paymentInfo = await this.mercadoPagoService.processWebhook(notification);
    if (paymentInfo) {
      await this.processPaymentInfo(paymentInfo);
    }
  }

  async processPaymentInfo(paymentInfo: IMercadoPagoPaymentInfo): Promise<void> {
    try {
      if (!paymentInfo.external_reference) {
        this.logger.error('Payment received but no external_reference found');
        return;
      }

      if (!paymentInfo.external_reference.startsWith('order-')) {
        this.logger.error(`Invalid external_reference format for order payment: ${paymentInfo.external_reference}`);
        return;
      }

      const orderId = paymentInfo.external_reference.replace('order-', '');

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['user', 'orderDetail'],
      });

      if (!order) {
        this.logger.error(`Order with ID ${orderId} not found`);
        return;
      }

      const paymentId = paymentInfo.id.toString();
      const existingPayment = await this.PaymentsRepository.findOne({
        where: [{ paymentId }, { order: { id: orderId } }],
        relations: ['order', 'user'],
      });

      if (existingPayment) {
        this.logger.log(`Payment already exists for order ${orderId} (paymentId: ${paymentId}), skipping insert`);

        // Ensure order state is up to date on duplicated webhooks
        if (existingPayment.order) {
          if (paymentInfo.status === 'approved' && existingPayment.order.status !== OrderStatus.PAID) {
            existingPayment.order.status = OrderStatus.PAID;
            await this.orderRepository.save(existingPayment.order);
          }
        }
        return;
      }

      const orderPayment = this.PaymentsRepository.create({
        paymentId,
        status: paymentInfo.status,
        statusDetail: paymentInfo.status_detail,
        amount: paymentInfo.transaction_amount,
        currencyId: paymentInfo.currency_id,
        paymentTypeId: paymentInfo.payment_type_id,
        paymentMethodId: paymentInfo.payment_method_id,
        dateApproved: paymentInfo.date_approved ? new Date(paymentInfo.date_approved) : null,
        user: order.user,
        order,
      });

      await this.PaymentsRepository.save(orderPayment);

      if (paymentInfo.status === 'approved') {
        order.status = OrderStatus.PAID;
        await this.orderRepository.save(order);

        if (order.orderDetail) {
          order.orderDetail.paymentMethod = paymentInfo.payment_method_id;
          await this.orderDetailRepository.save(order.orderDetail);
        }

        await this.sendOrderPaymentNotificationAsync(order.user.id);
        await this.sendOrderPaymentNotificationAsyncToAdmin(order.user.id, order);

        this.logger.log(
          `Order payment approved and saved for order: ${orderId}, payment: ${paymentInfo.id}, user: ${order.user.id}`,
        );
      } else if (paymentInfo.status === 'pending' || paymentInfo.status === 'in_process') {
        await this.sendOrderPaymentPendingNotificationAsync(order.user.id);

        this.logger.log(
          `Order payment pending for order: ${orderId}, payment: ${paymentInfo.id}, status: ${paymentInfo.status}`,
        );
      } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
        await this.sendOrderPaymentFailureNotificationAsync(order.user.id);

        this.logger.log(
          `Order payment rejected for order: ${orderId}, payment: ${paymentInfo.id}, status: ${paymentInfo.status}`,
        );
      } else {
        this.logger.log(`Order payment received with status: ${paymentInfo.status}, payment: ${paymentInfo.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing order payment: ${message}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async getPaymentByOrderId(orderId: string): Promise<IPaymentResponse | null> {
    const payment = await this.PaymentsRepository.findOne({
      where: { order: { id: orderId } },
      relations: ['user', 'order'],
    });
    return payment ? this.mapPaymentToResponse(payment) : null;
  }

  async getPaymentsByUserId(userId: string): Promise<IPaymentResponse[]> {
    const payments = await this.PaymentsRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'order'],
      order: { createdAt: 'DESC' },
    });
    return payments.map((p) => this.mapPaymentToResponse(p));
  }

  async getAllOrdersPayment(): Promise<IPaymentCompleted[]> {
    const order_payments = await this.PaymentsRepository.find();
    return order_payments.map((payment) => ({
      id: payment.id,
      payment_id: payment.paymentId,
      user_id: payment.user.id,
      order_id: payment.order.id,
      status: payment.status,
      status_detail: payment.statusDetail,
      amount: payment.amount,
      currency_id: payment.currencyId,
      payment_type_id: payment.paymentTypeId,
      payment_method_id: payment.paymentMethodId,
      date_approved: payment.dateApproved,
      createdAt: payment.createdAt,
    }));
  }

  private async sendOrderPaymentNotificationAsync(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`User with ID ${id} not found for order notification`);
      return;
    }

    this.mailQueueService
      .queuePurchaseConfirmation(user.email)
      .then(() => {
        this.logger.log(`Purchase email enqueued for ${user.email}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enqueuing purchase notification for ${user.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }

  private async sendOrderPaymentPendingNotificationAsync(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`User with ID ${id} not found for pending payment notification`);
      return;
    }

    this.mailQueueService
      .queuePaymentPendingEmail(user.email, user.username)
      .then(() => {
        this.logger.log(`Pending payment email enqueued for ${user.email}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enqueuing pending payment notification for ${user.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }

  private async sendOrderPaymentFailureNotificationAsync(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`User with ID ${id} not found for rejected payment notification`);
      return;
    }

    this.mailQueueService
      .queuePaymentRejectedEmail(user.email, user.username)
      .then(() => {
        this.logger.log(`Rejected payment email enqueued for ${user.email}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enqueuing rejected payment notification for ${user.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }

  private async sendOrderPaymentNotificationAsyncToAdmin(id: string, order: Order): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`User with ID ${id} not found for order notification`);
      return;
    }

    this.mailQueueService
      .queuePurchaseAlertToAdmin(user.username, user.email, order.id, order.orderDetail.total, order.createdAt)
      .then(() => {
        this.logger.log(`Admin purchase alert email enqueued for ${user.username}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enqueuing purchase notification for admin (${user.username}):`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }
}
