import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { NewsletterCampaign } from './entities/newsletter-campaign.entity';
import { Product } from '../products/entities/products.entity';
import { INewsletterJobData } from './interface/newsletter.interface';

@Injectable()
export class NewsletterQueueService {
  private readonly logger = new Logger(NewsletterQueueService.name);

  constructor(@InjectQueue('newsletter') private readonly newsletterQueue: Queue<INewsletterJobData>) {}

  private async addToQueue(data: INewsletterJobData): Promise<void> {
    await this.newsletterQueue.add('send', data);
    this.logger.log(`Newsletter "${data.type}" enqueued for: ${data.email}`);
  }

  async queueWelcomeNewsletter(subscriber: NewsletterSubscriber, trackingId: string): Promise<void> {
    await this.addToQueue({
      type: 'welcome',
      subscriberId: subscriber.id,
      email: subscriber.email,
      subscriberName: subscriber.name,
      unsubscribeToken: subscriber.unsubscribeToken,
      trackingId,
    });
  }

  async queueMonthlyNewsletter(subscriber: NewsletterSubscriber, trackingId: string): Promise<void> {
    await this.addToQueue({
      type: 'monthly',
      subscriberId: subscriber.id,
      email: subscriber.email,
      subscriberName: subscriber.name,
      unsubscribeToken: subscriber.unsubscribeToken,
      trackingId,
    });
  }

  async queuePromoNewsletter(
    subscriber: NewsletterSubscriber,
    trackingId: string,
    promoData: { title: string; description: string; discountCode?: string },
  ): Promise<void> {
    await this.addToQueue({
      type: 'promo',
      subscriberId: subscriber.id,
      email: subscriber.email,
      subscriberName: subscriber.name,
      unsubscribeToken: subscriber.unsubscribeToken,
      trackingId,
      promoData,
    });
  }

  async queueCustomCampaign(
    subscriber: NewsletterSubscriber,
    trackingId: string,
    campaign: NewsletterCampaign,
    products: Product[],
  ): Promise<void> {
    await this.addToQueue({
      type: 'custom',
      subscriberId: subscriber.id,
      email: subscriber.email,
      subscriberName: subscriber.name,
      unsubscribeToken: subscriber.unsubscribeToken,
      trackingId,
      campaignData: {
        subject: campaign.subject,
        title: campaign.title,
        body: campaign.body,
        discountCode: campaign.discountCode || undefined,
        ctaText: campaign.ctaText,
        ctaUrl: campaign.ctaUrl,
        featuredProducts: products.map((p) => ({
          id: p.id,
          name: p.name,
          basePrice: p.basePrice,
          imgUrls: p.imgUrls,
          category: p.category
            ? {
                id: p.category.id,
                category_name: p.category.category_name,
              }
            : undefined,
        })),
      },
    });
  }
}
