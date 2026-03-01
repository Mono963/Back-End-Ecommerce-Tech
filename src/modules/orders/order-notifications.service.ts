import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailQueueService } from '../mail/mail-queue_email.service';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enum/order.enum';

interface OrderProductInfo {
  name: string;
  quantity: number;
  price: number;
}

interface ShippingAddressInfo {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

@Injectable()
export class OrderNotificationService {
  private readonly logger = new Logger(OrderNotificationService.name);

  constructor(
    private readonly mailQueueService: MailQueueService,
    private readonly configService: ConfigService,
  ) {}

  buildProductsFromOrder(order: Order): OrderProductInfo[] {
    return (
      order.orderDetail?.items?.map((item) => ({
        name: item.productSnapshot?.name || item.product?.name || 'Producto',
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })) || []
    );
  }

  buildShippingAddress(order: Order): ShippingAddressInfo | null {
    const snapshot = order.orderDetail?.shippingAddressSnapshot;
    if (!snapshot) return null;
    return {
      street: snapshot.street || '',
      city: snapshot.city || '',
      province: snapshot.province || '',
      postalCode: snapshot.postalCode || '',
    };
  }

  async notifyOrderProcessing(order: Order): Promise<void> {
    const products = this.buildProductsFromOrder(order);
    const shippingAddress = this.buildShippingAddress(order);

    void (await this.mailQueueService.queueOrderProcessingNotification(
      order.user.email,
      order.user.name,
      order.orderNumber || order.id,
      products,
      Number(order.orderDetail.subtotal),
      Number(order.orderDetail.shipping),
      Number(order.orderDetail.tax),
      Number(order.orderDetail.total),
      shippingAddress,
      order.orderDetail.paymentMethod || 'No especificado',
      order.createdAt,
    ));
  }

  async notifyOrderShipped(order: Order): Promise<void> {
    const products = this.buildProductsFromOrder(order);
    const shippingAddress = this.buildShippingAddress(order);

    void (await this.mailQueueService.queueOrderShippedEmail(
      order.user.email,
      order.user.name,
      order.orderNumber || order.id,
      order.trackingNumber || 'Pendiente',
      order.trackingUrl || '',
      order.carrier || 'A definir',
      order.estimatedDelivery || 'A definir',
      shippingAddress,
      products,
      Number(order.orderDetail.total),
    ));
  }

  async notifyOrderDelivered(order: Order): Promise<void> {
    const products = this.buildProductsFromOrder(order);
    const deliveryDate = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const reviewUrl = `${this.configService.get<string>('FRONTEND_URL')}/reviews/${order.orderNumber || order.id}`;

    void (await this.mailQueueService.queueOrderDeliveredEmail(
      order.user.email,
      order.user.name,
      order.orderNumber || order.id,
      deliveryDate,
      products,
      reviewUrl,
    ));

    const productsForReview =
      order.orderDetail?.items?.map((item) => ({
        productName: item.productSnapshot?.name || item.product?.name || 'Producto',
        productImage: null as string | null,
        reviewUrl: `${this.configService.get<string>('FRONTEND_URL')}/products/${item.product_id}/review`,
      })) || [];

    void this.mailQueueService.queueReviewRequestEmail(
      order.user.email,
      order.user.name,
      order.orderNumber || order.id,
      productsForReview,
      reviewUrl,
    );
  }

  async notifyStatusChange(order: Order, status: OrderStatus): Promise<void> {
    switch (status) {
      case OrderStatus.PROCESSING:
        await this.notifyOrderProcessing(order);
        break;
      case OrderStatus.SHIPPED:
        await this.notifyOrderShipped(order);
        break;
      case OrderStatus.DELIVERED:
        await this.notifyOrderDelivered(order);
        break;
    }
  }

  async notifyPaymentApproved(order: Order, userName: string, userEmail: string): Promise<void> {
    const products = this.buildProductsFromOrder(order);
    const shippingAddress = this.buildShippingAddress(order);

    try {
      await this.mailQueueService.queuePurchaseConfirmation(
        userEmail,
        userName,
        order.orderNumber,
        products,
        Number(order.orderDetail?.subtotal || 0),
        Number(order.orderDetail?.shipping || 0),
        Number(order.orderDetail?.tax || 0),
        Number(order.orderDetail?.total || 0),
        shippingAddress,
        order.orderDetail?.paymentMethod || 'Mercado Pago',
        order.createdAt,
      );
      this.logger.log(`Purchase email enqueued for ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Error enqueuing purchase notification for ${userEmail}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async notifyPaymentApprovedToAdmin(userName: string, userEmail: string, order: Order): Promise<void> {
    try {
      await this.mailQueueService.queuePurchaseAlertToAdmin(
        userName,
        userEmail,
        order.id,
        order.orderDetail.total,
        order.createdAt,
      );
      this.logger.log(`Admin purchase alert email enqueued for ${userName}`);
    } catch (error) {
      this.logger.error(
        `Error enqueuing purchase notification for admin (${userName}):`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async notifyPaymentPending(userEmail: string, userName: string): Promise<void> {
    try {
      await this.mailQueueService.queuePaymentPendingEmail(userEmail, userName);
      this.logger.log(`Pending payment email enqueued for ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Error enqueuing pending payment notification for ${userEmail}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async notifyPaymentRejected(userEmail: string, userName: string): Promise<void> {
    try {
      await this.mailQueueService.queuePaymentRejectedEmail(userEmail, userName);
      this.logger.log(`Rejected payment email enqueued for ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Error enqueuing rejected payment notification for ${userEmail}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async notifyOrderCancelled(
    order: Order,
    cancellationReason: string | null,
    refundStatus: string | null,
  ): Promise<void> {
    const products = this.buildProductsFromOrder(order);

    void (await this.mailQueueService.queueOrderCancelledEmail(
      order.user.email,
      order.user.name,
      order.orderNumber || order.id,
      cancellationReason,
      products,
      Number(order.orderDetail.total),
      refundStatus,
    ));
  }

  async notifyRefundProcessed(
    order: Order,
    refundAmount: number,
    refundMethod: string,
    estimatedDays: number | null,
  ): Promise<void> {
    void (await this.mailQueueService.queueRefundProcessedEmail(
      order.user.email,
      order.user.name,
      order.orderNumber || order.id,
      refundAmount,
      refundMethod,
      estimatedDays,
      null,
    ));
  }
}
