import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailJobData } from './mail-queue_email.service';

type MailHandler = (to: string, data: Record<string, unknown>) => Promise<void>;

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly handlers: Record<string, MailHandler>;

  constructor(private readonly mailService: MailService) {
    this.handlers = {
      // Auth / Users
      welcome: (to, d) => this.mailService.sendWelcomeEmail(to, d.userName as string),

      login: (to, d) => this.mailService.sendLoginNotification(to, d.userName as string),

      'data-changed': (to, d) => this.mailService.sendUserDataChangedNotification(to, d.userName as string),

      'password-reset': (to, d) => this.mailService.sendPasswordResetEmail(to, d.name as string, d.resetUrl as string),

      'password-changed': (to, d) => this.mailService.sendPasswordChangedConfirmationEmail(to, d.name as string),

      'account-deleted': (to, d) => this.mailService.sendAccountDeletedNotification(to, d.userName as string),

      // Orders / Payments
      'order-processing': (to, d) =>
        this.mailService.sendOrderProcessingNotification(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.products as { name: string; quantity: number; price: number }[],
          d.subtotal as number,
          d.shipping as number,
          d.tax as number,
          d.total as number,
          d.shippingAddress as { street: string; city: string; province: string; postalCode: string } | null,
          d.paymentMethod as string,
          new Date(d.orderDate as string),
        ),

      'purchase-confirmation': (to, d) =>
        this.mailService.sendPurchaseConfirmation(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.products as { name: string; quantity: number; price: number }[],
          d.subtotal as number,
          d.shipping as number,
          d.tax as number,
          d.total as number,
          d.shippingAddress as { street: string; city: string; province: string; postalCode: string } | null,
          d.paymentMethod as string,
          new Date(d.orderDate as string),
        ),

      'purchase-alert-admin': (_to, d) =>
        this.mailService.sendPurchaseAlertToAdmin(
          d.userName as string,
          d.userEmail as string,
          d.orderId as string,
          d.orderTotal as number,
          new Date(d.orderDate as string),
        ),

      'payment-pending': (to, d) => this.mailService.sendPaymentPendingEmail(to, d.userName as string),

      'payment-rejected': (to, d) => this.mailService.sendPaymentRejectedEmail(to, d.userName as string),

      // Contact
      'contact-confirmation': (to, d) =>
        this.mailService.sendContactConfirmation(to, d.name as string, d.reason as string),

      'contact-admin': (_to, d) =>
        this.mailService.sendContactNotificationToAdmin(
          d.name as string,
          d.email as string,
          d.phone as string,
          d.reason as string,
        ),

      // Order lifecycle
      'order-shipped': (to, d) =>
        this.mailService.sendOrderShippedEmail(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.trackingNumber as string,
          d.trackingUrl as string,
          d.carrier as string,
          d.estimatedDelivery as string,
          d.shippingAddress as { street: string; city: string; province: string; postalCode: string },
          d.products as { name: string; quantity: number; price: number }[],
          d.orderTotal as number,
        ),

      'order-delivered': (to, d) =>
        this.mailService.sendOrderDeliveredEmail(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.deliveryDate as string,
          d.products as { name: string; quantity: number; price: number }[],
          d.reviewUrl as string,
        ),

      'order-cancelled': (to, d) =>
        this.mailService.sendOrderCancelledEmail(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.cancellationReason as string | null,
          d.products as { name: string; quantity: number; price: number }[],
          d.orderTotal as number,
          d.refundStatus as string | null,
        ),

      'refund-processed': (to, d) =>
        this.mailService.sendRefundProcessedEmail(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.refundAmount as number,
          d.refundMethod as string,
          d.estimatedDays as number | null,
          d.refundId as string | null,
        ),

      'abandoned-cart': (to, d) =>
        this.mailService.sendAbandonedCartEmail(
          to,
          d.userName as string,
          d.cartItems as { productName: string; productImage: string | null; quantity: number; price: number }[],
          d.cartTotal as number,
          d.cartUrl as string,
          d.discountCode as string | undefined,
        ),

      'review-request': (to, d) =>
        this.mailService.sendReviewRequestEmail(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.products as { productName: string; productImage: string | null; reviewUrl: string }[],
          d.reviewUrl as string,
        ),

      // Repairs
      'repair-confirmation': (to, d) =>
        this.mailService.sendRepairConfirmation(
          to,
          d.fullName as string,
          d.repairId as string,
          d.deviceType as string,
          d.brand as string,
          d.model as string,
          d.issueDescription as string,
        ),

      'repair-admin': (_to, d) =>
        this.mailService.sendRepairNotificationToAdmin(
          d.fullName as string,
          d.email as string,
          d.phone as string,
          d.deviceType as string,
          d.brand as string,
          d.model as string,
          d.issueDescription as string,
          d.urgency as string,
        ),

      'repair-status-update': (to, d) =>
        this.mailService.sendRepairStatusUpdate(
          to,
          d.fullName as string,
          d.repairId as string,
          d.status as string,
          d.adminNotes as string | undefined,
        ),

      // Refunds
      'refund-request-confirmation': (to, d) =>
        this.mailService.sendRefundRequestConfirmation(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.reason as string,
          d.description as string,
          d.refundId as string,
        ),

      'refund-request-admin': (_to, d) =>
        this.mailService.sendRefundRequestNotificationToAdmin(
          d.userName as string,
          d.userEmail as string,
          d.orderNumber as string,
          d.reason as string,
          d.description as string,
          d.refundId as string,
          d.orderTotal as number,
        ),

      'refund-rejected': (to, d) =>
        this.mailService.sendRefundRejectedEmail(
          to,
          d.userName as string,
          d.orderNumber as string,
          d.adminResponse as string,
          d.refundId as string,
        ),
    };
  }

  @Process('send')
  async handleSend(job: Job<MailJobData>): Promise<void> {
    const { type, to, data } = job.data;
    this.logger.log(`Processing email type "${type}" for: ${to}`);

    try {
      const handler = this.handlers[type];
      if (!handler) {
        this.logger.warn(`Unknown email type: ${type as string}`);
        return;
      }

      await handler(to, data);
      this.logger.log(`Email "${type}" sent successfully to: ${to}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${(error as Error).message}`);
      throw error;
    }
  }
}
