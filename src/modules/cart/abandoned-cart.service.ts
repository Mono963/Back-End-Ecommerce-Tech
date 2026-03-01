import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cart } from './entities/cart.entity';
import { MailQueueService } from '../mail/mail-queue_email.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';

export interface AbandonedCartItem {
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
}

@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  private readonly ABANDONED_THRESHOLD_HOURS = 24;

  private readonly FRONTEND_URL: string;

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly mailQueueService: MailQueueService,
    private readonly configService: ConfigService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    this.FRONTEND_URL = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkAbandonedCarts(): Promise<void> {
    const result = await this.distributedLockService.withLock('cron:abandoned-carts', 55 * 60 * 1000, () =>
      this.processAbandonedCarts(),
    );
    if (result === null) {
      this.logger.debug('Abandoned cart check skipped — another instance holds the lock');
    }
  }

  private async processAbandonedCarts(): Promise<void> {
    this.logger.log('Checking for abandoned carts...');

    try {
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - this.ABANDONED_THRESHOLD_HOURS);

      const abandonedCarts = await this.cartRepository.find({
        where: {
          abandonedNotificationSent: false,
          item_count: MoreThan(0),
          updatedAt: LessThan(thresholdDate),
        },
        relations: ['user', 'items', 'items.product'],
      });

      this.logger.log(`Found ${abandonedCarts.length} abandoned carts`);

      for (const cart of abandonedCarts) {
        await this.processAbandonedCart(cart);
      }

      this.logger.log('Abandoned cart check completed');
    } catch (error) {
      this.logger.error(`Error checking abandoned carts: ${(error as Error).message}`);
    }
  }

  private async processAbandonedCart(cart: Cart): Promise<void> {
    try {
      if (!cart.user?.email || cart.user?.deletedAt !== null) {
        this.logger.debug(`Skipping cart ${cart.id}: user invalid or banned`);
        return;
      }

      const cartItems: AbandonedCartItem[] = cart.items.map((item) => ({
        productName: item.product?.name || 'Producto',
        productImage: item.product?.imgUrls?.[0] || null,
        quantity: item.quantity,
        price: Number(item.subtotal),
      }));

      const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);

      const cartUrl = `${this.FRONTEND_URL}/cart`;

      await this.mailQueueService.queueAbandonedCartEmail(
        cart.user.email,
        cart.user.name || 'Cliente',
        cartItems,
        cartTotal,
        cartUrl,
      );

      await this.cartRepository.update(cart.id, {
        abandonedNotificationSent: true,
      });

      this.logger.log(`Abandoned cart email queued for user: ${cart.user.email}`);
    } catch (error) {
      this.logger.error(`Error processing abandoned cart ${cart.id}: ${(error as Error).message}`);
    }
  }

  async resetAbandonedFlag(cartId: string): Promise<void> {
    await this.cartRepository.update(cartId, {
      abandonedNotificationSent: false,
      lastActivityAt: new Date(),
    });
  }

  async sendAbandonedCartEmailManual(cartId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['user', 'items', 'items.product'],
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    await this.processAbandonedCart(cart);
  }
}
