import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { NewsletterTracking } from './entities/newsletter-tracking.entity';
import { INewsletterJobData } from './interface/newsletter.interface';

@Processor('newsletter')
export class NewsletterProcessor {
  private readonly logger = new Logger(NewsletterProcessor.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(NewsletterTracking)
    private readonly trackingRepository: Repository<NewsletterTracking>,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  @Process('send')
  async handleSend(job: Job<INewsletterJobData>): Promise<void> {
    const { type, email, subscriberName, unsubscribeToken, trackingId, promoData, campaignData } = job.data;
    const userName = subscriberName || 'Suscriptor';
    this.logger.log(`Processing newsletter type "${type}" for: ${email}`);

    const unsubscribeUrl = unsubscribeToken
      ? `${this.frontendUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`
      : undefined;

    try {
      switch (type) {
        case 'welcome':
          await this.mailService.sendNewsletterWelcome(email, userName, unsubscribeUrl, trackingId);
          break;

        case 'monthly':
          await this.mailService.sendNewsletterMonthly(email, userName, unsubscribeUrl, trackingId);
          break;

        case 'promo':
          await this.mailService.sendNewsletterPromo(
            email,
            userName,
            unsubscribeUrl,
            promoData?.title || 'Promoción Especial',
            promoData?.description || '',
            promoData?.discountCode,
            trackingId,
          );
          break;

        case 'custom':
          await this.mailService.sendCustomCampaignNewsletter(
            email,
            userName,
            unsubscribeUrl,
            campaignData,
            trackingId,
          );
          break;

        default:
          this.logger.warn(`Unknown newsletter type: ${type as string}`);
          return;
      }

      await this.trackingRepository.update(trackingId, {
        status: 'sent',
        sentAt: new Date(),
      });

      this.logger.log(`Newsletter "${type}" sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(`Error sending newsletter to ${email}: ${(error as Error).message}`);

      await this.trackingRepository.update(trackingId, {
        status: 'failed',
        errorMessage: (error as Error).message,
      });

      throw error;
    }
  }
}
