import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { NewsletterQueueService } from './newsletter-queue.service';
import { NewsletterProcessor } from './newsletter.processor';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { NewsletterTracking } from './entities/newsletter-tracking.entity';
import { NewsletterCampaign } from './entities/newsletter-campaign.entity';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { Product } from '../products/entities/products.entity';
import { AuthsModule } from '../auths/auths.module';
import { MailModule } from '../mail/mail.module';
import { ProductsModule } from '../products/products.module';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsletterSubscriber, NewsletterTracking, NewsletterCampaign, Product]),
    BullModule.registerQueue({ name: 'newsletter' }),
    forwardRef(() => AuthsModule),
    MailModule,
    ProductsModule,
    DiscountsModule,
  ],
  controllers: [NewsletterController, CampaignController],
  providers: [NewsletterService, NewsletterQueueService, NewsletterProcessor, CampaignService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
