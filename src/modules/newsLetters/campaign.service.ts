import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { NewsletterCampaign } from './entities/newsletter-campaign.entity';
import { Product } from '../products/entities/products.entity';
import { NewsletterQueueService } from './newsletter-queue.service';
import { NewsletterService } from './newsletter.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CampaignType, CampaignStatus } from './interface/newsletter.interface';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(NewsletterCampaign)
    private readonly campaignRepository: Repository<NewsletterCampaign>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly queueService: NewsletterQueueService,
    private readonly newsletterService: NewsletterService,
  ) {}

  async create(dto: CreateCampaignDto, createdBy: string): Promise<NewsletterCampaign> {
    if (dto.featuredProductIds && dto.featuredProductIds.length > 0) {
      await this.validateProductIds(dto.featuredProductIds);
    }

    const campaign = this.campaignRepository.create({
      ...dto,
      createdBy,
      status: dto.status || 'draft',
      campaignType: dto.campaignType || 'custom',
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      featuredProductIds: dto.featuredProductIds || [],
    });

    const saved = await this.campaignRepository.save(campaign);
    this.logger.log(`Campaign created: ${saved.id} - ${saved.name}`);
    return saved;
  }

  async findAll(filters?: { status?: CampaignStatus; campaignType?: CampaignType }): Promise<NewsletterCampaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign');
    query.where('campaign.deletedAt IS NULL');

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }

    if (filters?.campaignType) {
      query.andWhere('campaign.campaignType = :campaignType', { campaignType: filters.campaignType });
    }

    query.orderBy('campaign.createdAt', 'DESC');
    return await query.getMany();
  }

  async findOne(id: string): Promise<NewsletterCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['creator'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<NewsletterCampaign> {
    const campaign = await this.findOne(id);

    if (dto.featuredProductIds && dto.featuredProductIds.length > 0) {
      await this.validateProductIds(dto.featuredProductIds);
    }

    Object.assign(campaign, {
      ...dto,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : campaign.scheduledFor,
    });

    const updated = await this.campaignRepository.save(campaign);
    this.logger.log(`Campaign updated: ${updated.id} - ${updated.name}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    await this.campaignRepository.softDelete(id);
    this.logger.log(`Campaign soft deleted: ${id} - ${campaign.name}`);
  }

  async sendCampaign(campaignId: string): Promise<{ enqueuedCount: number }> {
    const campaign = await this.findOne(campaignId);

    if (campaign.status !== 'active') {
      throw new BadRequestException(`Campaign status must be 'active' to send. Current status: ${campaign.status}`);
    }

    let products: Product[] = [];
    if (campaign.featuredProductIds.length > 0) {
      products = await this.productRepository.find({
        where: {
          id: In(campaign.featuredProductIds),
          isActive: true,
        },
        relations: ['category'],
      });
    }

    let enqueuedCount = 0;
    await this.newsletterService.processSubscribersInBatches(async (subscriber) => {
      const tracking = await this.newsletterService.createTrackingRecord(subscriber, 'custom');
      await this.queueService.queueCustomCampaign(subscriber, tracking.id, campaign, products);
      enqueuedCount++;
    });

    if (enqueuedCount === 0) {
      this.logger.warn('No active subscribers found for campaign.');
    } else {
      this.logger.log(`Campaign "${campaign.name}" enqueued for ${enqueuedCount} subscribers.`);
    }

    return { enqueuedCount };
  }

  // ==================== PRIVATE HELPERS ====================

  private async validateProductIds(productIds: string[]): Promise<void> {
    const products = await this.productRepository.find({
      where: { id: In(productIds) },
      select: ['id', 'isActive'],
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`Products not found: ${missingIds.join(', ')}`);
    }

    const inactiveProducts = products.filter((p) => !p.isActive);
    if (inactiveProducts.length > 0) {
      throw new BadRequestException(
        `Inactive products cannot be featured: ${inactiveProducts.map((p) => p.id).join(', ')}`,
      );
    }
  }
}
