import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

export interface MailJobData {
  type: string;
  to: string;
  data: Record<string, unknown>;
}

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
        case 'welcome':
          await this.mailService.sendWelcomeEmail(to, data.userName as string);
          break;
        case 'login':
          await this.mailService.sendLoginNotification(to, data.userName as string);
          break;
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
        case 'data-changed':
          await this.mailService.sendUserDataChangedNotification(to, data.userName as string);
          break;
        case 'password-reset':
          await this.mailService.sendPasswordResetEmail(to, data.name as string, data.resetUrl as string);
          break;
        case 'password-changed':
          await this.mailService.sendPasswordChangedConfirmationEmail(to, data.name as string);
          break;
        default:
          this.logger.warn(`Tipo de email desconocido: ${type}`);
      }

      this.logger.log(`Email "${type}" enviado exitosamente a: ${to}`);
    } catch (error) {
      this.logger.error(`Error enviando email a ${job.data.to}: ${(error as Error).message}`);
      throw error; // Bull reintentara automaticamente
    }
  }
}
