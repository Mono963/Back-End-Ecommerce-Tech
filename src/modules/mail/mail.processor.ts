import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailJobData } from './mail-queue.service';

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send')
  async handleSend(job: Job<MailJobData>): Promise<void> {
    this.logger.log(`Procesando email tipo "${job.data.type}" para: ${job.data.to}`);

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

        // ==================== CITAS ====================
        case 'appointment-pending':
          await this.mailService.sendAppointmentPendingNotification(
            to,
            data.userName as string,
            data.appointmentId as string,
            data.visitTitle as string,
            data.slotDate as string,
            data.slotTime as string,
          );
          break;

        case 'appointment-pending-admin':
          await this.mailService.sendPendingAppointmentToAdmin(
            data.userName as string,
            data.userEmail as string,
            data.appointmentId as string,
            data.visitTitle as string,
            data.slotDate as string,
            data.slotTime as string,
          );
          break;

        case 'appointment-cancelled':
          await this.mailService.sendAppointmentCancelledNotification(
            to,
            data.userName as string,
            data.appointmentId as string,
            data.visitTitle as string,
            data.slotDate as string,
            data.slotTime as string,
            data.reason as string | undefined,
          );
          break;

        case 'appointment-cancelled-admin':
          await this.mailService.sendAppointmentCancelledNotificationToAdmin(
            data.userName as string,
            data.userEmail as string,
            data.appointmentId as string,
            data.visitTitle as string,
            data.slotDate as string,
            data.slotTime as string,
            data.reason as string | undefined,
          );
          break;

        case 'appointment-rejected':
          await this.mailService.sendAppointmentRejectedToUser(
            to,
            data.userName as string,
            data.appointmentId as string,
            data.visitTitle as string,
            data.slotDate as string,
            data.slotTime as string,
          );
          break;

        case 'appointment-approved':
          await this.mailService.sendAppointmentApprovedEmail(
            to,
            data.userName as string,
            data.visitTitle as string,
            data.slotDate as string,
            data.slotTime as string,
            data.appointmentId as string,
          );
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

        // ==================== DONACIONES ====================
        case 'donation-thanks':
          await this.mailService.sendDonationThanks(to);
          break;

        case 'donation-admin':
          await this.mailService.sendDonationAlertToAdmin(
            data.name as string,
            data.amount as number,
            data.email as string,
            data.phone as number,
          );
          break;

        default:
          this.logger.warn(`Tipo de email desconocido: ${type}`);
      }

      this.logger.log(`Email "${type}" enviado exitosamente a: ${to}`);
    } catch (error) {
      this.logger.error(`Error enviando email a ${job.data.to}: ${(error as Error).message}`);
      throw error; // Bull reintentará automáticamente
    }
  }
}
