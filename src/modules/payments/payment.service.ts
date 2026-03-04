import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderDetail } from '../orders/entities/order.details.entity';
import { Users } from '../users/entities/users.entity';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { IPaymentService } from './validate/payment.validate';
import {
  ICreatePreference,
  IMercadoPagoPaymentInfo,
  IPaymentCompleted,
  IPaymentResponse,
  IPaymentStatus,
  IPreferenceResponse,
  IWebhookNotificationInterface,
} from './interface/payment.interface';
import { OrderStatus } from '../orders/enum/order.enum';
import { DiscountsService } from '../discounts/discounts.service';
import { OrderNotificationService } from '../orders/order-notifications.service';

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
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly discountsService: DiscountsService,
    private readonly orderNotificationService: OrderNotificationService,
    private readonly dataSource: DataSource,
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
    dto: ICreatePreference & { orderId: string },
  ): Promise<IPreferenceResponse> {
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

  async getPaymentStatus(paymentId: string): Promise<IPaymentStatus> {
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
    if (!paymentInfo.external_reference) {
      this.logger.error('Payment received but no external_reference found');
      return;
    }

    if (!paymentInfo.external_reference.startsWith('order-')) {
      this.logger.error(`Invalid external_reference format for order payment: ${paymentInfo.external_reference}`);
      return;
    }

    const orderId = paymentInfo.external_reference.replace('order-', '');
    const paymentId = paymentInfo.id.toString();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: orderId })
        .getOne();

      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['user', 'orderDetail', 'orderDetail.items'],
      });

      if (!order) {
        this.logger.error(`Order with ID ${orderId} not found`);
        await queryRunner.commitTransaction();
        return;
      }

      const existingPayment = await queryRunner.manager.findOne(Payment, {
        where: [{ paymentId }, { order: { id: orderId } }],
        relations: ['order', 'user'],
      });

      if (existingPayment) {
        this.logger.log(`Payment already exists for order ${orderId} (paymentId: ${paymentId}), skipping`);
        if (paymentInfo.status === 'approved' && order.status !== OrderStatus.PAID) {
          order.status = OrderStatus.PAID;
          await queryRunner.manager.save(Order, order);
        }

        await queryRunner.commitTransaction();
        if (paymentInfo.status === 'approved' && order.orderDetail?.promoCodeUsed) {
          try {
            await this.discountsService.registerPromoCodeUsageFromPaidOrder({
              promoCode: order.orderDetail.promoCodeUsed,
              userId: order.user.id,
              orderId: order.id,
              orderItems: order.orderDetail.items || [],
            });
          } catch (promoError) {
            this.logger.error(
              `Failed to register promo code usage for order ${orderId}`,
              promoError instanceof Error ? promoError.stack : undefined,
            );
          }
        }
        return;
      }
      const orderPayment = queryRunner.manager.create(Payment, {
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

      await queryRunner.manager.save(Payment, orderPayment);

      if (paymentInfo.status === 'approved') {
        order.status = OrderStatus.PAID;
        await queryRunner.manager.save(Order, order);

        if (order.orderDetail) {
          order.orderDetail.paymentMethod = paymentInfo.payment_method_id;
          await queryRunner.manager.save(OrderDetail, order.orderDetail);
        }
      }

      await queryRunner.commitTransaction();

      if (paymentInfo.status === 'approved' && order.orderDetail?.promoCodeUsed) {
        try {
          await this.discountsService.registerPromoCodeUsageFromPaidOrder({
            promoCode: order.orderDetail.promoCodeUsed,
            userId: order.user.id,
            orderId: order.id,
            orderItems: order.orderDetail.items || [],
          });
        } catch (promoError) {
          this.logger.error(
            `Failed to register promo code usage for order ${orderId}. Code: ${order.orderDetail.promoCodeUsed}`,
            promoError instanceof Error ? promoError.stack : undefined,
          );
        }
      }

      if (paymentInfo.status === 'approved') {
        const user = await this.userRepository.findOne({ where: { id: order.user.id } });
        if (user) {
          await this.orderNotificationService.notifyPaymentApproved(order, user.username || user.name, user.email);
          await this.orderNotificationService.notifyPaymentApprovedToAdmin(user.username, user.email, order);
        }
        this.logger.log(
          `Order payment approved and saved for order: ${orderId}, payment: ${paymentInfo.id}, user: ${order.user.id}`,
        );
      } else if (paymentInfo.status === 'pending' || paymentInfo.status === 'in_process') {
        const user = await this.userRepository.findOne({ where: { id: order.user.id } });
        if (user) {
          await this.orderNotificationService.notifyPaymentPending(user.email, user.username);
        }
        this.logger.log(
          `Order payment pending for order: ${orderId}, payment: ${paymentInfo.id}, status: ${paymentInfo.status}`,
        );
      } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
        const user = await this.userRepository.findOne({ where: { id: order.user.id } });
        if (user) {
          await this.orderNotificationService.notifyPaymentRejected(user.email, user.username);
        }
        this.logger.log(
          `Order payment rejected for order: ${orderId}, payment: ${paymentInfo.id}, status: ${paymentInfo.status}`,
        );
      } else {
        this.logger.log(`Order payment received with status: ${paymentInfo.status}, payment: ${paymentInfo.id}`);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing order payment: ${message}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      await queryRunner.release();
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
    const order_payments = await this.PaymentsRepository.find({
      relations: ['user', 'order'],
    });
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
}
