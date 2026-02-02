import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
  | 'appointment-pending'
  | 'appointment-pending-admin'
  | 'appointment-cancelled'
  | 'appointment-cancelled-admin'
  | 'appointment-rejected'
  | 'appointment-approved'
  | 'contact-confirmation'
  | 'contact-admin'
  | 'donation-thanks'
  | 'donation-admin'
  | 'payment-pending'
  | 'payment-rejected';

export interface MailJobData {
  type: MailJobType;
  to: string;
  data: Record<string, unknown>;
}

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(@InjectQueue('mail') private readonly mailQueue: Queue<MailJobData>) {}

  private async addToQueue(type: MailJobType, to: string, data: Record<string, unknown>): Promise<void> {
    await this.mailQueue.add('send', { type, to, data });
    this.logger.log(`Email "${type}" encolado para: ${to}`);
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
    orderId: string,
    products: { name: string; quantity: number; price: number }[],
    orderTotal: number,
    orderDate: Date,
  ): Promise<void> {
    await this.addToQueue('order-processing', email, {
      userName,
      orderId,
      products,
      orderTotal,
      orderDate: orderDate.toISOString(),
    });
  }

  async queuePurchaseConfirmation(email: string): Promise<void> {
    await this.addToQueue('purchase-confirmation', email, {});
  }

  async queuePurchaseAlertToAdmin(
    userName: string,
    userEmail: string,
    orderId: string,
    orderTotal: number,
    orderDate: Date,
  ): Promise<void> {
    await this.addToQueue('purchase-alert-admin', 'rootscooperativadev@gmail.com', {
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

  // ==================== CITAS ====================

  async queueAppointmentPendingNotification(
    email: string,
    userName: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
  ): Promise<void> {
    await this.addToQueue('appointment-pending', email, {
      userName,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
    });
  }

  async queueAppointmentPendingToAdmin(
    userName: string,
    userEmail: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
  ): Promise<void> {
    await this.addToQueue('appointment-pending-admin', 'rootscooperativadev@gmail.com', {
      userName,
      userEmail,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
    });
  }

  async queueAppointmentCancelledNotification(
    email: string,
    userName: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
    reason?: string,
  ): Promise<void> {
    await this.addToQueue('appointment-cancelled', email, {
      userName,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
      reason,
    });
  }

  async queueAppointmentCancelledToAdmin(
    userName: string,
    userEmail: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
    reason?: string,
  ): Promise<void> {
    await this.addToQueue('appointment-cancelled-admin', 'rootscooperativadev@gmail.com', {
      userName,
      userEmail,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
      reason,
    });
  }

  async queueAppointmentRejectedToUser(
    email: string,
    userName: string,
    appointmentId: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
  ): Promise<void> {
    await this.addToQueue('appointment-rejected', email, {
      userName,
      appointmentId,
      visitTitle,
      slotDate,
      slotTime,
    });
  }

  async queueAppointmentApprovedEmail(
    email: string,
    userName: string,
    visitTitle: string,
    slotDate: string,
    slotTime: string,
    appointmentId: string,
  ): Promise<void> {
    await this.addToQueue('appointment-approved', email, {
      userName,
      visitTitle,
      slotDate,
      slotTime,
      appointmentId,
    });
  }

  // ==================== CONTACTO ====================

  async queueContactConfirmation(email: string, name: string, reason: string): Promise<void> {
    await this.addToQueue('contact-confirmation', email, { name, reason });
  }

  async queueContactNotificationToAdmin(name: string, email: string, phone: string, reason: string): Promise<void> {
    await this.addToQueue('contact-admin', 'rootscooperativadev@gmail.com', {
      name,
      email,
      phone,
      reason,
    });
  }

  // ==================== DONACIONES ====================

  async queueDonationThanks(email: string): Promise<void> {
    await this.addToQueue('donation-thanks', email, {});
  }

  async queueDonationAlertToAdmin(name: string, amount: number, email: string, phone: number): Promise<void> {
    await this.addToQueue('donation-admin', 'rootscooperativadev@gmail.com', {
      name,
      amount,
      email,
      phone,
    });
  }
}
