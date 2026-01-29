import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePreferenceDto, PaymentStatusDto, PreferenceResponseDto } from '../payments/dto/create-payment.dto';

import { MailService } from '../mail/mail.service';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { Users } from '../users/entities/users.entity';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { IPaymentService } from './validate/payment.validate';
import {
  IMercadoPagoPaymentInfo,
  IPaymentCompleted,
  IWebhookNotificationInterface,
} from './interface/patment.interface';

@Injectable()
export class PaymentsService implements IPaymentService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    @InjectRepository(Payment)
    private readonly PaymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly mailService: MailService,
    @InjectRepository(Users)
    private readonly userRespository: Repository<Users>,
  ) {}

  async createPreferencePayment(
    userId: string,
    dto: CreatePreferenceDto & { orderId: string },
  ): Promise<PreferenceResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId, user: { id: userId } },
      relations: ['user'],
    });

    if (!order) {
      throw new BadRequestException(`Cart with ID ${dto.orderId} not found or doesn't belong to user ${userId}`);
    }
    const cartTotal = Number(order.orderDetail.total);
    const dtoAmount = Number(dto.amount);

    if (cartTotal !== dtoAmount) {
      throw new BadRequestException(`Amount mismatch: Cart total is ${cartTotal}, but received amount is ${dtoAmount}`);
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
      if (paymentInfo.status === 'approved') {
        if (!paymentInfo.external_reference) {
          this.logger.error('Payment approved but no external_reference found');
          return;
        }

        if (!paymentInfo.external_reference.startsWith('order-')) {
          this.logger.error(`Invalid external_reference format for order payment: ${paymentInfo.external_reference}`);
          return;
        }

        const orderId = paymentInfo.external_reference.replace('order-', '');

        const order = await this.orderRepository.findOne({
          where: { id: orderId },
          relations: ['user'],
        });

        if (!order) {
          this.logger.error(`Cart with ID ${orderId} not found`);
          return;
        }

        const orderPayment = this.PaymentsRepository.create({
          paymentId: paymentInfo.id.toString(),
          status: paymentInfo.status,
          statusDetail: paymentInfo.status_detail,
          amount: paymentInfo.transaction_amount,
          currencyId: paymentInfo.currency_id,
          paymentTypeId: paymentInfo.payment_type_id,
          paymentMethodId: paymentInfo.payment_method_id,
          dateApproved: new Date(paymentInfo.date_approved),
          user: order.user,
          order,
        });

        await this.PaymentsRepository.save(orderPayment);

        if (orderPayment.status === 'approved') {
          await this.sendOrderPaymentNotificationAsync(order.user.id);
          await this.sendOrderPaymentNotificationAsyncToAdmin(order.user.id, order);
        }
        if (orderPayment.status === 'pending' || orderPayment.status === 'in_process') {
          await this.sendOrderPaymentPendingNotificationAsync(order.user.id);
        }
        if (orderPayment.status === 'rejected') {
          await this.sendOrderPaymentFailureNotificationAsync(order.user.id);
        }

        this.logger.log(
          `Order payment completed and saved for cart: ${orderId}, payment: ${paymentInfo.id}, user: ${order.user.id}`,
        );
      } else {
        this.logger.log(`Order payment not approved - Status: ${paymentInfo.status}, Payment: ${paymentInfo.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing order payment: ${message}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return await this.PaymentsRepository.findOne({
      where: { order: { id: orderId } },
      relations: ['user', 'order'],
    });
  }

  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    return await this.PaymentsRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'order', 'order.cart'],
      order: { createdAt: 'DESC' },
    });
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
    const user = await this.userRespository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`Usuario con ID ${id} no encontrado para notificación de orden`);
      return;
    }

    this.mailService
      .sendPurchaseConfirmation(user.email)
      .then(() => {
        this.logger.log(`Correo de notificación de compra enviado a ${user.email}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enviando notificación de compra a ${user.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }

  private async sendOrderPaymentPendingNotificationAsync(id: string): Promise<void> {
    const user = await this.userRespository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`Usuario con ID ${id} no encontrado para notificación de pago pendiente`);
      return;
    }

    this.mailService
      .sendPaymentPendingEmail(user.email, user.username)
      .then(() => {
        this.logger.log(`Correo de notificación de pago pendiente enviado a ${user.email}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enviando notificación de pago pendiente a ${user.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }

  private async sendOrderPaymentFailureNotificationAsync(id: string): Promise<void> {
    const user = await this.userRespository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`Usuario con ID ${id} no encontrado para notificación de pago rechazado`);
      return;
    }

    this.mailService
      .sendPaymentRejectedEmail(user.email, user.username)
      .then(() => {
        this.logger.log(`Correo de notificación de pago rechazado enviado a ${user.email}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enviando notificación de pago rechazado a ${user.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }

  private async sendOrderPaymentNotificationAsyncToAdmin(id: string, order: Order): Promise<void> {
    const user = await this.userRespository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`Usuario con ID ${id} no encontrado para notificación de orden`);
      return;
    }

    this.mailService
      .sendPurchaseAlertToAdmin(user.username, user.email, order.id, order.orderDetail.total, order.createdAt)
      .then(() => {
        this.logger.log(`Correo de notificación de compra enviado a ${user.username}`);
      })
      .catch((error) => {
        this.logger.error(
          `Error enviando notificación de compra a ${user.username}:`,
          error instanceof Error ? error.message : String(error),
        );
      });
  }
}
