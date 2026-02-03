import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { ContactDto } from './dto/contact-dto';

@Injectable()
export class ContactService {
  constructor(private readonly mailService: MailService) {}

  async handleContactForm(contactDto: ContactDto): Promise<void> {
    const { name, email, phone, reason } = contactDto;

    await this.mailService.sendContactConfirmation(email, name, reason);

    await this.mailService.sendContactNotificationToAdmin(name, email, phone, reason);
  }
}
