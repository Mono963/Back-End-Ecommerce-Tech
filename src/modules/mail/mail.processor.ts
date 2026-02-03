import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailJobData } from './mail-queue_email.service';

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send')
  async handleSend(job: Job<MailJobData>): Promise<void> {
    this.logger.log(`Processing email type "${job.data.type}" for: ${job.data.to}`);

    try {
      const { type, to, data } = job.data;

      switch (type) {
        // ==================== AUTH / USUARIOS ====================
        case 'welcome':
          await this.mailService.sendWelcomeEmail(to, data.userName as string);
          break;

        case 'login':
          await this.mailService.sendLoginNotification(to, data.userName as string);
          break;

        case 'data-changed':
          await this.mailService.sendUserDataChangedNotification(to, data.userName as string);
          break;

        case 'password-reset':
          await this.mailService.sendPasswordResetEmail(to, data.name as string, data.resetUrl as string);
          break;

        case 'password-changed':
          await this.mailService.sendPasswordChangedConfirmationEmail(to, data.name as string);
          break;

        case 'account-deleted':
          await this.mailService.sendAccountDeletedNotification(to, data.userName as string);
          break;

        // ==================== ORDENES / PAGOS ====================
        case 'order-processing':
          await this.mailService.sendOrderProcessingNotification(
            to,
            data.userName as string,
            data.orderId as string,
            data.products as { name: string; quantity: number; price: number }[],
            data.orderTotal as number,
            new Date(data.orderDate as string),
          );
          break;

        case 'purchase-confirmation':
          await this.mailService.sendPurchaseConfirmation(to);
          break;

        case 'purchase-alert-admin':
          await this.mailService.sendPurchaseAlertToAdmin(
            data.userName as string,
            data.userEmail as string,
            data.orderId as string,
            data.orderTotal as number,
            new Date(data.orderDate as string),
          );
          break;

        case 'payment-pending':
          await this.mailService.sendPaymentPendingEmail(to, data.userName as string);
          break;

        case 'payment-rejected':
          await this.mailService.sendPaymentRejectedEmail(to, data.userName as string);
          break;

        // ==================== CONTACTO ====================
        case 'contact-confirmation':
          await this.mailService.sendContactConfirmation(to, data.name as string, data.reason as string);
          break;

        case 'contact-admin':
          await this.mailService.sendContactNotificationToAdmin(
            data.name as string,
            data.email as string,
            data.phone as string,
            data.reason as string,
          );
          break;

        // ==================== NUEVOS TEMPLATES DE ORDEN ====================
        case 'order-shipped':
          await this.mailService.sendOrderShippedEmail(
            to,
            data.userName as string,
            data.orderNumber as string,
            data.trackingNumber as string,
            data.trackingUrl as string,
            data.carrier as string,
            data.estimatedDelivery as string,
            data.shippingAddress as {
              street: string;
              city: string;
              province: string;
              postalCode: string;
            },
            data.products as { name: string; quantity: number; price: number }[],
            data.orderTotal as number,
          );
          break;

        case 'order-delivered':
          await this.mailService.sendOrderDeliveredEmail(
            to,
            data.userName as string,
            data.orderNumber as string,
            data.deliveryDate as string,
            data.products as { name: string; quantity: number; price: number }[],
            data.reviewUrl as string,
          );
          break;

        case 'order-cancelled':
          await this.mailService.sendOrderCancelledEmail(
            to,
            data.userName as string,
            data.orderNumber as string,
            data.cancellationReason as string | null,
            data.products as { name: string; quantity: number; price: number }[],
            data.orderTotal as number,
            data.refundStatus as string | null,
          );
          break;

        case 'refund-processed':
          await this.mailService.sendRefundProcessedEmail(
            to,
            data.userName as string,
            data.orderNumber as string,
            data.refundAmount as number,
            data.refundMethod as string,
            data.estimatedDays as number | null,
            data.refundId as string | null,
          );
          break;

        case 'abandoned-cart':
          await this.mailService.sendAbandonedCartEmail(
            to,
            data.userName as string,
            data.cartItems as {
              productName: string;
              productImage: string | null;
              quantity: number;
              price: number;
            }[],
            data.cartTotal as number,
            data.cartUrl as string,
            data.discountCode as string | undefined,
          );
          break;

        case 'review-request':
          await this.mailService.sendReviewRequestEmail(
            to,
            data.userName as string,
            data.orderNumber as string,
            data.products as {
              productName: string;
              productImage: string | null;
              reviewUrl: string;
            }[],
            data.reviewUrl as string,
          );
          break;

        default:
          this.logger.warn(`Tipo de email desconocido: ${type as string}`);
      }

      this.logger.log(`Email "${type}" sent successfully to: ${to}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${job.data.to}: ${(error as Error).message}`);
      throw error;
    }
  }
}
