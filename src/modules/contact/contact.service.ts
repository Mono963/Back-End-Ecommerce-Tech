import { Injectable } from '@nestjs/common';
import { MailQueueService } from '../mail/mail-queue_email.service';
import { IContact } from './interface/interfaces.contact';

@Injectable()
export class ContactService {
  constructor(private readonly mailQueueService: MailQueueService) {}

  private sanitizeInput(value: string): string {
    return value.replace(/[\r\n]/g, ' ').replace(/<[^>]*>/g, '').trim();
  }

  async handleContactForm(contactDto: IContact): Promise<void> {
    const name = this.sanitizeInput(contactDto.name);
    const email = contactDto.email;
    const phone = contactDto.phone;
    const reason = this.sanitizeInput(contactDto.reason);

    await this.mailQueueService.queueContactConfirmation(email, name, reason);
    await this.mailQueueService.queueContactNotificationToAdmin(name, email, phone, reason);
  }
}
