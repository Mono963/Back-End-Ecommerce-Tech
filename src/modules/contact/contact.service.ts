import { Injectable } from '@nestjs/common';
import { MailQueueService } from '../mail/mail-queue_email.service';
import { ContactDto } from './dto/contact-dto';

@Injectable()
export class ContactService {
  constructor(private readonly mailQueueService: MailQueueService) {}

  async handleContactForm(contactDto: ContactDto): Promise<void> {
    const { name, email, phone, reason } = contactDto;

    await this.mailQueueService.queueContactConfirmation(email, name, reason);
    await this.mailQueueService.queueContactNotificationToAdmin(name, email, phone, reason);
  }
}
