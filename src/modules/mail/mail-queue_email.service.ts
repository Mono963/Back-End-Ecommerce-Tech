import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';

export type MailJobType =
  | 'welcome'
  | 'login'
  | 'order-processing'
  | 'purchase-confirmation'
  | 'purchase-alert-admin'
  | 'data-changed'
  | 'password-reset'
  | 'password-changed'
  | 'account-deleted'
  | 'contact-confirmation'
  | 'contact-admin'
  | 'payment-pending'
  | 'payment-rejected'
  | 'order-shipped'
  | 'order-delivered'
  | 'order-cancelled'
  | 'refund-processed'
  | 'abandoned-cart'
  | 'review-request'
  | 'repair-confirmation'
  | 'repair-admin'
  | 'repair-status-update';

export interface MailJobData {
  type: MailJobType;
  to: string;
  data: Record<string, unknown>;
}

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly adminEmail: string;

  constructor(
    @InjectQueue('mail') private readonly mailQueue: Queue<MailJobData>,
    private readonly configService: ConfigService,
  ) {
    this.adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'worldassemblytechnolog@gmail.com';
  }

  private async addToQueue(type: MailJobType, to: string, data: Record<string, unknown>): Promise<void> {
    await this.mailQueue.add('send', { type, to, data });
    this.logger.log(`Email "${type}" enqueued for: ${to}`);
  }

  // ==================== AUTH / USUARIOS ====================

  async queueWelcomeEmail(email: string, userName: string): Promise<void> {
    await this.addToQueue('welcome', email, { userName });
  }

  async queueLoginNotification(email: string, userName: string): Promise<void> {
    await this.addToQueue('login', email, { userName });
  }

  async queueDataChangedNotification(email: string, userName: string): Promise<void> {
    await this.addToQueue('data-changed', email, { userName });
  }

  async queuePasswordResetEmail(email: string, name: string, resetUrl: string): Promise<void> {
    await this.addToQueue('password-reset', email, { name, resetUrl });
  }

  async queuePasswordChangedConfirmation(email: string, name: string): Promise<void> {
    await this.addToQueue('password-changed', email, { name });
  }

  async queueAccountDeletedNotification(email: string, userName: string): Promise<void> {
    await this.addToQueue('account-deleted', email, { userName });
  }

  // ==================== ORDENES / PAGOS ====================

  async queueOrderProcessingNotification(
    email: string,
    userName: string,
    orderNumber: string,
    products: { name: string; quantity: number; price: number }[],
    subtotal: number,
    shipping: number,
    tax: number,
    total: number,
    shippingAddress: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    } | null,
    paymentMethod: string,
    orderDate: Date,
  ): Promise<void> {
    await this.addToQueue('order-processing', email, {
      userName,
      orderNumber,
      products,
      subtotal,
      shipping,
      tax,
      total,
      shippingAddress,
      paymentMethod,
      orderDate: orderDate.toISOString(),
    });
  }

  async queuePurchaseConfirmation(
    email: string,
    userName: string,
    orderNumber: string,
    products: { name: string; quantity: number; price: number }[],
    subtotal: number,
    shipping: number,
    tax: number,
    total: number,
    shippingAddress: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    } | null,
    paymentMethod: string,
    orderDate: Date,
  ): Promise<void> {
    await this.addToQueue('purchase-confirmation', email, {
      userName,
      orderNumber,
      products,
      subtotal,
      shipping,
      tax,
      total,
      shippingAddress,
      paymentMethod,
      orderDate: orderDate.toISOString(),
    });
  }

  async queuePurchaseAlertToAdmin(
    userName: string,
    userEmail: string,
    orderId: string,
    orderTotal: number,
    orderDate: Date,
  ): Promise<void> {
    await this.addToQueue('purchase-alert-admin', this.adminEmail, {
      userName,
      userEmail,
      orderId,
      orderTotal,
      orderDate: orderDate.toISOString(),
    });
  }

  async queuePaymentPendingEmail(email: string, userName: string): Promise<void> {
    await this.addToQueue('payment-pending', email, { userName });
  }

  async queuePaymentRejectedEmail(email: string, userName: string): Promise<void> {
    await this.addToQueue('payment-rejected', email, { userName });
  }

  // ==================== CONTACTO ====================

  async queueContactConfirmation(email: string, name: string, reason: string): Promise<void> {
    await this.addToQueue('contact-confirmation', email, { name, reason });
  }

  async queueContactNotificationToAdmin(name: string, email: string, phone: string, reason: string): Promise<void> {
    await this.addToQueue('contact-admin', this.adminEmail, {
      name,
      email,
      phone,
      reason,
    });
  }

  // ==================== NUEVOS TEMPLATES DE ORDEN ====================

  async queueOrderShippedEmail(
    email: string,
    userName: string,
    orderNumber: string,
    trackingNumber: string,
    trackingUrl: string,
    carrier: string,
    estimatedDelivery: string,
    shippingAddress: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    } | null,
    products: { name: string; quantity: number; price: number }[],
    orderTotal: number,
  ): Promise<void> {
    await this.addToQueue('order-shipped', email, {
      userName,
      orderNumber,
      trackingNumber,
      trackingUrl,
      carrier,
      estimatedDelivery,
      shippingAddress: shippingAddress || {
        street: 'No especificada',
        city: '',
        province: '',
        postalCode: '',
      },
      products,
      orderTotal,
    });
  }

  async queueOrderDeliveredEmail(
    email: string,
    userName: string,
    orderNumber: string,
    deliveryDate: string,
    products: { name: string; quantity: number; price: number }[],
    reviewUrl: string,
  ): Promise<void> {
    await this.addToQueue('order-delivered', email, {
      userName,
      orderNumber,
      deliveryDate,
      products,
      reviewUrl,
    });
  }

  async queueOrderCancelledEmail(
    email: string,
    userName: string,
    orderNumber: string,
    cancellationReason: string | null,
    products: { name: string; quantity: number; price: number }[],
    orderTotal: number,
    refundStatus: string | null,
  ): Promise<void> {
    await this.addToQueue('order-cancelled', email, {
      userName,
      orderNumber,
      cancellationReason,
      products,
      orderTotal,
      refundStatus,
    });
  }

  async queueRefundProcessedEmail(
    email: string,
    userName: string,
    orderNumber: string,
    refundAmount: number,
    refundMethod: string,
    estimatedDays: number | null,
    refundId: string | null,
  ): Promise<void> {
    await this.addToQueue('refund-processed', email, {
      userName,
      orderNumber,
      refundAmount,
      refundMethod,
      estimatedDays,
      refundId,
    });
  }

  async queueAbandonedCartEmail(
    email: string,
    userName: string,
    cartItems: {
      productName: string;
      productImage: string | null;
      quantity: number;
      price: number;
    }[],
    cartTotal: number,
    cartUrl: string,
    discountCode?: string,
  ): Promise<void> {
    await this.addToQueue('abandoned-cart', email, {
      userName,
      cartItems,
      cartTotal,
      cartUrl,
      discountCode,
    });
  }

  // ==================== REPARACIONES ====================

  async queueRepairConfirmation(
    email: string,
    fullName: string,
    repairId: string,
    deviceType: string,
    brand: string,
    model: string,
    issueDescription: string,
  ): Promise<void> {
    await this.addToQueue('repair-confirmation', email, {
      fullName,
      repairId,
      deviceType,
      brand,
      model,
      issueDescription,
    });
  }

  async queueRepairNotificationToAdmin(
    fullName: string,
    email: string,
    phone: string,
    deviceType: string,
    brand: string,
    model: string,
    issueDescription: string,
    urgency: string,
  ): Promise<void> {
    await this.addToQueue('repair-admin', this.adminEmail, {
      fullName,
      email,
      phone,
      deviceType,
      brand,
      model,
      issueDescription,
      urgency,
    });
  }

  async queueRepairStatusUpdate(
    email: string,
    fullName: string,
    repairId: string,
    status: string,
    adminNotes?: string | null,
  ): Promise<void> {
    await this.addToQueue('repair-status-update', email, {
      fullName,
      repairId,
      status,
      adminNotes,
    });
  }

  async queueReviewRequestEmail(
    email: string,
    userName: string,
    orderNumber: string,
    products: {
      productName: string;
      productImage: string | null;
      reviewUrl: string;
    }[],
    reviewUrl: string,
  ): Promise<void> {
    await this.addToQueue('review-request', email, {
      userName,
      orderNumber,
      products,
      reviewUrl,
    });
  }
}
