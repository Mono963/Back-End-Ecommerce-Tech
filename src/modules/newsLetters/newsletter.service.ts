import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { NewsletterTracking } from './entities/newsletter-tracking.entity';
import { CampaignType } from './interface/newsletter.interface';
import { NewsletterQueueService } from './newsletter-queue.service';
import { randomBytes } from 'crypto';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(NewsletterSubscriber)
    private readonly subscriberRepository: Repository<NewsletterSubscriber>,
    @InjectRepository(NewsletterTracking)
    private readonly trackingRepository: Repository<NewsletterTracking>,
    private readonly queueService: NewsletterQueueService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * Subscribe an email to the newsletter and send welcome email.
   */
  async subscribe(email: string, name?: string): Promise<{ message: string }> {
    const existing = await this.subscriberRepository.findOne({ where: { email } });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Este email ya está suscrito al newsletter.');
      }

      // Reactivate
      const newToken = randomBytes(32).toString('hex');
      await this.subscriberRepository.update(existing.id, {
        isActive: true,
        name: name || existing.name,
        unsubscribeToken: newToken,
        unsubscribedAt: null,
      });

      const reactivated = await this.subscriberRepository.findOneBy({ id: existing.id });
      await this.enqueueNewsletter(reactivated, 'welcome');

      this.logger.log(`Subscriber reactivated: ${email}`);
      return { message: 'Te has suscrito nuevamente al newsletter.' };
    }

    const subscriber = this.subscriberRepository.create({
      email,
      name: name || null,
      unsubscribeToken: randomBytes(32).toString('hex'),
    });

    const saved = await this.subscriberRepository.save(subscriber);
    await this.enqueueNewsletter(saved, 'welcome');

    this.logger.log(`New subscriber: ${email}`);
    return { message: 'Te has suscrito al newsletter exitosamente.' };
  }

  /**
   * Cron job that runs on the 1st of each month at 9:00 AM (Argentina time)
   */
  @Cron('0 9 1 * *', {
    name: 'monthly-newsletter',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleMonthlyNewsletter(): Promise<void> {
    this.logger.log('Starting monthly newsletter enqueue...');

    const totalProcessed = await this.processSubscribersInBatches(async (subscriber) => {
      await this.enqueueNewsletter(subscriber, 'monthly');
    });

    if (totalProcessed === 0) {
      this.logger.warn('No active subscribers found for newsletter.');
      return;
    }

    this.logger.log(`Monthly newsletter enqueued for ${totalProcessed} subscribers.`);
  }

  /**
   * Send promotional newsletter to all active subscribers
   */
  async sendPromoNewsletter(
    title: string,
    description: string,
    discountCode?: string,
  ): Promise<{ enqueuedCount: number }> {
    const promoData = { title, description, discountCode };

    const totalProcessed = await this.processSubscribersInBatches(async (subscriber) => {
      await this.enqueueNewsletter(subscriber, 'promo', promoData);
    });

    if (totalProcessed === 0) {
      this.logger.warn('No active subscribers found for promo newsletter.');
    } else {
      this.logger.log(`Promo newsletter enqueued for ${totalProcessed} subscribers.`);
    }

    return { enqueuedCount: totalProcessed };
  }

  /**
   * Unsubscribe using token
   */
  async unsubscribe(token: string): Promise<{ email: string }> {
    if (!token || token.length < 32) {
      throw new NotFoundException('Token inválido');
    }

    const subscriber = await this.subscriberRepository.findOne({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      throw new NotFoundException('Token inválido o expirado');
    }

    if (!subscriber.isActive) {
      this.logger.log(`Subscriber ${subscriber.email} already unsubscribed.`);
      return { email: subscriber.email };
    }

    await this.subscriberRepository.update(subscriber.id, {
      isActive: false,
      unsubscribedAt: new Date(),
    });

    this.logger.log(`Subscriber unsubscribed: ${subscriber.email}`);
    return { email: subscriber.email };
  }

  /**
   * Get newsletter tracking statistics
   */
  async getTrackingStats(campaignType?: CampaignType): Promise<{
    total: number;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
  }> {
    const query = this.trackingRepository.createQueryBuilder('tracking');

    if (campaignType) {
      query.where('tracking.campaignType = :campaignType', { campaignType });
    }

    const [total, sent, failed, opened, clicked] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('tracking.status = :status', { status: 'sent' }).getCount(),
      query.clone().andWhere('tracking.status = :status', { status: 'failed' }).getCount(),
      query.clone().andWhere('tracking.opened_at IS NOT NULL').getCount(),
      query.clone().andWhere('tracking.clicked_at IS NOT NULL').getCount(),
    ]);

    return { total, sent, failed, opened, clicked };
  }

  /**
   * Track email open via tracking pixel
   */
  async trackOpen(trackingId: string): Promise<void> {
    const tracking = await this.trackingRepository.findOne({
      where: { id: trackingId },
    });

    if (!tracking || tracking.openedAt) {
      return;
    }

    await this.trackingRepository.update(trackingId, {
      openedAt: new Date(),
      status: 'opened',
    });

    this.logger.log(`Newsletter open tracked: ${trackingId}`);
  }

  /**
   * Track email link click
   */
  async trackClick(trackingId: string): Promise<{ redirectUrl: string }> {
    const tracking = await this.trackingRepository.findOne({
      where: { id: trackingId },
    });

    if (!tracking) {
      return { redirectUrl: this.frontendUrl };
    }

    if (!tracking.clickedAt) {
      await this.trackingRepository.update(trackingId, {
        clickedAt: new Date(),
        status: 'clicked',
      });
      this.logger.log(`Newsletter click tracked: ${trackingId}`);
    }

    return { redirectUrl: this.frontendUrl };
  }

  // ==================== SHARED HELPERS ====================

  async processSubscribersInBatches(
    callback: (subscriber: NewsletterSubscriber) => Promise<void>,
    batchSize: number = 100,
  ): Promise<number> {
    let offset = 0;
    let totalProcessed = 0;

    while (true) {
      const subscribers = await this.subscriberRepository.find({
        where: { isActive: true },
        take: batchSize,
        skip: offset,
        order: { subscribedAt: 'ASC' },
      });

      if (subscribers.length === 0) break;

      for (const subscriber of subscribers) {
        await callback(subscriber);
      }

      totalProcessed += subscribers.length;
      offset += batchSize;

      if (subscribers.length < batchSize) break;
    }

    return totalProcessed;
  }

  async createTrackingRecord(
    subscriber: NewsletterSubscriber,
    campaignType: CampaignType,
  ): Promise<NewsletterTracking> {
    return await this.trackingRepository.save({
      campaignType,
      subscriberId: subscriber.id,
      email: subscriber.email,
      status: 'queued',
    });
  }

  private async enqueueNewsletter(
    subscriber: NewsletterSubscriber,
    type: CampaignType,
    promoData?: { title: string; description: string; discountCode?: string },
  ): Promise<void> {
    const tracking = await this.createTrackingRecord(subscriber, type);

    switch (type) {
      case 'welcome':
        await this.queueService.queueWelcomeNewsletter(subscriber, tracking.id);
        break;
      case 'monthly':
        await this.queueService.queueMonthlyNewsletter(subscriber, tracking.id);
        break;
      case 'promo':
        await this.queueService.queuePromoNewsletter(subscriber, tracking.id, promoData);
        break;
      default:
        this.logger.warn(`Unknown campaign type: ${type}`);
    }
  }
}
