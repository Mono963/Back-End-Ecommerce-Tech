import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { MailQueueService } from '../mail/mail-queue_email.service';

export interface AbandonedCartItem {
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
}

@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  // Tiempo en horas antes de considerar un carrito como abandonado
  private readonly ABANDONED_THRESHOLD_HOURS = 24;

  // URL base del frontend para el carrito
  private readonly FRONTEND_URL = 'https://frontend-rootscoop.vercel.app';

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly mailQueueService: MailQueueService,
  ) {}

  /**
   * Cron job que se ejecuta cada hora para detectar carritos abandonados
   * y enviar emails de recordatorio a los usuarios
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAbandonedCarts(): Promise<void> {
    this.logger.log('Checking for abandoned carts...');

    try {
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - this.ABANDONED_THRESHOLD_HOURS);

      // Buscar carritos abandonados que:
      // 1. No hayan sido notificados
      // 2. Tengan al menos 1 item
      // 3. No hayan sido actualizados en las últimas 24 horas
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

  /**
   * Procesa un carrito abandonado individual
   */
  private async processAbandonedCart(cart: Cart): Promise<void> {
    try {
      // Verificar que el usuario tenga email verificado y esté activo
      if (!cart.user?.email || cart.user?.deletedAt !== null) {
        this.logger.debug(`Skipping cart ${cart.id}: user invalid or banned`);
        return;
      }

      // Preparar los items del carrito para el email
      const cartItems: AbandonedCartItem[] = cart.items.map((item) => ({
        productName: item.product?.name || 'Producto',
        productImage: item.product?.imgUrls?.[0] || null,
        quantity: item.quantity,
        price: Number(item.subtotal),
      }));

      // Calcular total
      const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);

      // URL del carrito
      const cartUrl = `${this.FRONTEND_URL}/cart`;

      // Encolar el email de carrito abandonado
      await this.mailQueueService.queueAbandonedCartEmail(
        cart.user.email,
        cart.user.name || 'Cliente',
        cartItems,
        cartTotal,
        cartUrl,
      );

      // Marcar el carrito como notificado
      await this.cartRepository.update(cart.id, {
        abandonedNotificationSent: true,
      });

      this.logger.log(`Abandoned cart email queued for user: ${cart.user.email}`);
    } catch (error) {
      this.logger.error(`Error processing abandoned cart ${cart.id}: ${(error as Error).message}`);
    }
  }

  /**
   * Resetea el flag de notificación cuando el usuario modifica el carrito
   * Este método debe ser llamado desde CartService cuando se añade/modifica/elimina items
   */
  async resetAbandonedFlag(cartId: string): Promise<void> {
    await this.cartRepository.update(cartId, {
      abandonedNotificationSent: false,
      lastActivityAt: new Date(),
    });
  }

  /**
   * Método manual para enviar email de carrito abandonado (para testing)
   */
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
