import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order.details.entity';
import { Product } from '../products/entities/products.entity';
import { ProductVariant } from '../products/entities/products_variant.entity';
import { Users } from '../users/entities/users.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart.item.entity';
import { ProductsService } from '../products/products.service';
import { IOrderFilters, IOrder, OrderStatus } from './interfaces/orders.interface';
import { UpdateOrderStatusDto, OrderStatsDto } from './dto/order.Dto';
import { CartService } from '../cart/cart.service';
import { OrderItem } from './entities/order.item';
import { IAddress } from '../users/interfaces/user.interface';
import { MailQueueService } from '../mail/mail-queue_email.service';
import { UserRole } from '../../decorator/role.decorator';
import { ResponseOrderMapper } from './mapper/order.mappers';
import { OrderValidations } from './validates/order.validates';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,

    private readonly productsService: ProductsService,
    private readonly dataSource: DataSource,
    private readonly mailQueueService: MailQueueService,
    private readonly configService: ConfigService,
  ) {}

  async getOrderById(id: string, userId?: string): Promise<IOrder> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'user',
        'orderDetail',
        'orderDetail.items',
        'orderDetail.items.product',
        'orderDetail.items.variants',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (userId && order.user.id !== userId) {
      throw new BadRequestException('You do not have access to this order');
    }

    return ResponseOrderMapper.toDTO(order);
  }

  async createOrderFromCart(userId: string, shippingAddress: IAddress): Promise<IOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['user', 'items', 'items.product', 'items.product.category', 'items.variants'],
      });

      if (!cart?.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      let shippingAddressSnapshot: IAddress;
      let shippingAddressId: string | null = null;

      if (cart.selectedAddressId) {
        const user = await queryRunner.manager.findOne(Users, {
          where: { id: userId },
          relations: ['addresses'],
        });

        const selectedAddress = user?.addresses?.find((addr) => addr.id === cart.selectedAddressId);

        if (selectedAddress) {
          shippingAddressId = selectedAddress.id;
          shippingAddressSnapshot = {
            id: selectedAddress.id,
            label: selectedAddress.label,
            street: selectedAddress.street,
            city: selectedAddress.city,
            province: selectedAddress.province,
            postalCode: selectedAddress.postalCode,
            country: selectedAddress.country,
            isDefault: selectedAddress.isDefault,
          };
          this.logger.log(`Using saved address ${shippingAddressId} for order`);
        } else {
          this.logger.warn(`Address ${cart.selectedAddressId} not found; using temporary address if provided`);
        }
      }

      if (!shippingAddressSnapshot && shippingAddress) {
        shippingAddressSnapshot = shippingAddress;
        shippingAddressId = shippingAddress.id;
      }

      await this.verifyStockAvailability(cart.items);

      const orderNumber = await this.generateOrderNumber();

      const subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0);

      const tax = subtotal * 0.21;
      const shipping = this.calculateShipping(subtotal);
      const total = subtotal + tax + shipping;

      const orderDetail = await this.createOrderDetail(queryRunner, {
        subtotal,
        tax,
        shipping,
        total,
        shippingAddressId,
        shippingAddressSnapshot,
        shippingAddress: shippingAddress || null,
        items: [],
      });

      const orderItems = await this.createOrderItemsFromCart(queryRunner, cart.items, orderDetail.id);

      orderDetail.items = orderItems;
      await queryRunner.manager.save(OrderDetail, orderDetail);

      const order = await this.createMainOrder(queryRunner, {
        orderNumber,
        user: cart.user,
        userId: cart.user.id,
        orderDetail,
      });

      await this.clearUserCart(cart.user.id);

      await queryRunner.commitTransaction();

      return await this.getOrderById(order.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      OrderValidations.handleOrderCreationErrorValidate(error);
    } finally {
      await queryRunner.release();
    }
  }

  async getUserOrders(userId: string): Promise<IOrder[]> {
    const orders = await this.orderRepo.find({
      where: { user: { id: userId } },
      relations: [
        'user',
        'orderDetail',
        'orderDetail.items',
        'orderDetail.items.product',
        'orderDetail.items.variants',
      ],
      order: { createdAt: 'DESC' },
    });

    return ResponseOrderMapper.toDTOList(orders);
  }

  async getAllOrders(filters: IOrderFilters): Promise<{
    items: IOrder[];
    total: number;
    pages: number;
  }> {
    const { status, startDate, endDate, orderNumber, userEmail, page, limit } = filters;

    if (!status && !startDate && !endDate && !orderNumber && !userEmail) {
      const [orders, total] = await this.orderRepo.findAndCount({
        relations: [
          'user',
          'orderDetail',
          'orderDetail.items',
          'orderDetail.items.product',
          'orderDetail.items.variants',
        ],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const pages = Math.ceil(total / limit);

      return {
        items: ResponseOrderMapper.toDTOList(orders),
        total,
        pages,
      };
    }

    const queryBuilder = this.orderRepo.createQueryBuilder('order');
    queryBuilder.leftJoinAndSelect('order.user', 'user');
    queryBuilder.leftJoinAndSelect('order.orderDetail', 'orderDetail');
    queryBuilder.leftJoinAndSelect('orderDetail.items', 'items');
    queryBuilder.leftJoinAndSelect('items.product', 'product');
    queryBuilder.leftJoinAndSelect('items.variants', 'variants');
    queryBuilder.where('1 = 1');

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (startDate && endDate) {
      const endDateAdjusted = new Date(endDate);
      endDateAdjusted.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: endDateAdjusted,
      });
    } else if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      const endDateAdjusted = new Date(endDate);
      endDateAdjusted.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('order.createdAt <= :endDate', {
        endDate: endDateAdjusted,
      });
    }

    if (orderNumber) {
      queryBuilder.andWhere('LOWER(order.orderNumber) LIKE LOWER(:orderNumber)', {
        orderNumber: `%${orderNumber}%`,
      });
    }

    if (userEmail) {
      queryBuilder.andWhere('LOWER(user.email) LIKE LOWER(:userEmail)', {
        userEmail: `%${userEmail}%`,
      });
    }

    queryBuilder.orderBy('order.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();
    const pages = Math.ceil(total / limit);

    return {
      items: ResponseOrderMapper.toDTOList(orders),
      total,
      pages,
    };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, dto: UpdateOrderStatusDto): Promise<IOrder> {
    const { trackingNumber, trackingUrl, carrier, estimatedDelivery } = dto;

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'orderDetail', 'orderDetail.items', 'orderDetail.items.product', 'payment'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    OrderValidations.validateStatusTransition(order.status, status);

    order.status = status;

    // Guardar datos de tracking cuando se marca como SHIPPED
    if (status === OrderStatus.SHIPPED) {
      order.trackingNumber = trackingNumber || null;
      order.trackingUrl = trackingUrl || null;
      order.carrier = carrier || null;
      order.estimatedDelivery = estimatedDelivery || null;
    }

    await this.orderRepo.save(order);

    if (status === OrderStatus.PROCESSING) {
      const products =
        order.orderDetail.items?.map((item) => ({
          name: item.productSnapshot?.name || item.product?.name || 'Producto',
          quantity: item.quantity,
          price: Number(item.unitPrice),
        })) || [];

      const shippingAddress = order.orderDetail.shippingAddressSnapshot
        ? {
            street: order.orderDetail.shippingAddressSnapshot.street || '',
            city: order.orderDetail.shippingAddressSnapshot.city || '',
            province: order.orderDetail.shippingAddressSnapshot.province || '',
            postalCode: order.orderDetail.shippingAddressSnapshot.postalCode || '',
          }
        : null;

      void this.mailQueueService.queueOrderProcessingNotification(
        order.user.email,
        order.user.name,
        order.orderNumber || order.id,
        products,
        Number(order.orderDetail.subtotal),
        Number(order.orderDetail.shipping),
        Number(order.orderDetail.tax),
        Number(order.orderDetail.total),
        shippingAddress,
        order.orderDetail.paymentMethod || 'No especificado',
        order.createdAt,
      );
    }

    if (status === OrderStatus.SHIPPED) {
      const products =
        order.orderDetail.items?.map((item) => ({
          name: item.productSnapshot?.name || item.product?.name || 'Producto',
          quantity: item.quantity,
          price: Number(item.unitPrice),
        })) || [];

      const shippingAddress = order.orderDetail.shippingAddressSnapshot
        ? {
            street: order.orderDetail.shippingAddressSnapshot.street || '',
            city: order.orderDetail.shippingAddressSnapshot.city || '',
            province: order.orderDetail.shippingAddressSnapshot.province || '',
            postalCode: order.orderDetail.shippingAddressSnapshot.postalCode || '',
          }
        : null;

      void this.mailQueueService.queueOrderShippedEmail(
        order.user.email,
        order.user.name,
        order.orderNumber || order.id,
        order.trackingNumber || 'Pendiente',
        order.trackingUrl || '',
        order.carrier || 'A definir',
        order.estimatedDelivery || 'A definir',
        shippingAddress,
        products,
        Number(order.orderDetail.total),
      );
    }
    if (status === OrderStatus.DELIVERED) {
      const products =
        order.orderDetail.items?.map((item) => ({
          name: item.productSnapshot?.name || item.product?.name || 'Producto',
          quantity: item.quantity,
          price: Number(item.unitPrice),
        })) || [];

      const deliveryDate = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const reviewUrl = `${this.configService.get<string>('FRONTEND_URL')}/reviews/${order.orderNumber || order.id}`;

      void this.mailQueueService.queueOrderDeliveredEmail(
        order.user.email,
        order.user.name,
        order.orderNumber || order.id,
        deliveryDate,
        products,
        reviewUrl,
      );

      const productsForReview =
        order.orderDetail.items?.map((item) => ({
          productName: item.productSnapshot?.name || item.product?.name || 'Producto',
          productImage: null as string | null,
          reviewUrl: `${this.configService.get<string>('FRONTEND_URL')}/products/${item.product_id}/review`,
        })) || [];

      void this.mailQueueService.queueReviewRequestEmail(
        order.user.email,
        order.user.name,
        order.orderNumber || order.id,
        productsForReview,
        reviewUrl,
      );
    }

    return await this.getOrderById(orderId);
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `ORD-${year}-${month}`;

    const lastOrder = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.createdAt', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      const orderParts = lastOrder.orderNumber.split('-');
      if (orderParts.length === 4) {
        const lastSequence = parseInt(orderParts[3]);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  private calculateShipping(subtotal: number): number {
    if (subtotal >= 250) return 0;
    if (subtotal >= 100) return 10;
    return 20;
  }

  async getOrderStats(): Promise<OrderStatsDto> {
    const totalOrders = await this.orderRepo.count();
    const pendingOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PENDING },
    });
    const paidOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PAID },
    });
    const processingOrders = await this.orderRepo.count({
      where: { status: OrderStatus.PROCESSING },
    });
    const shippedOrders = await this.orderRepo.count({
      where: { status: OrderStatus.SHIPPED },
    });
    const deliveredOrders = await this.orderRepo.count({
      where: { status: OrderStatus.DELIVERED },
    });

    const revenue: { total?: string } | undefined = await this.orderDetailRepo
      .createQueryBuilder('detail')
      .leftJoin('detail.order', 'order')
      .select('SUM(detail.total)', 'total')
      .where('order.status != :status', { status: OrderStatus.CANCELLED })
      .getRawOne();

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue: { total?: string } | undefined = await this.orderDetailRepo
      .createQueryBuilder('detail')
      .leftJoin('detail.order', 'order')
      .select('SUM(detail.total)', 'total')
      .where('order.status != :status', { status: OrderStatus.CANCELLED })
      .andWhere('order.createdAt >= :date', { date: currentMonth })
      .getRawOne();

    return {
      totalOrders,
      ordersByStatus: {
        pending: pendingOrders,
        paid: paidOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
      },
      revenue: {
        total: Number(revenue?.total) || 0,
        monthly: Number(monthlyRevenue?.total) || 0,
      },
      completionRate: totalOrders > 0 ? `${((deliveredOrders / totalOrders) * 100).toFixed(2)}%` : '0%',
    };
  }

  async cancelOrder(
    orderId: string,
    requesterId: string,
    requesterRole: UserRole,
    cancellationReason: string,
  ): Promise<IOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'orderDetail', 'orderDetail.items', 'orderDetail.items.product', 'payment'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (requesterRole === UserRole.CLIENT && order.user.id !== requesterId) {
      throw new BadRequestException('You do not have access to this order');
    }

    if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException('Only pending or paid orders can be cancelled');
    }

    const previousStatus = order.status;
    order.status = OrderStatus.CANCELLED;
    order.cancellationReason = cancellationReason;

    await this.orderRepo.save(order);

    await this.restoreStock(orderId);

    const products =
      order.orderDetail.items?.map((item) => ({
        name: item.productSnapshot?.name || item.product?.name || 'Producto',
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })) || [];

    // Determinar el estado de reembolso
    const refundStatus = previousStatus === OrderStatus.PAID ? 'Reembolso en proceso' : null;

    void this.mailQueueService.queueOrderCancelledEmail(
      order.user.email,
      order.user.name,
      order.orderNumber || order.id,
      order.cancellationReason,
      products,
      Number(order.orderDetail.total),
      refundStatus,
    );

    // Si la orden estaba PAGADA, enviar email de reembolso
    if (previousStatus === OrderStatus.PAID) {
      const paymentMethod = order.payment?.paymentMethodId || order.orderDetail?.paymentMethod || 'Mercado Pago';

      void this.mailQueueService.queueRefundProcessedEmail(
        order.user.email,
        order.user.name,
        order.orderNumber || order.id,
        Number(order.orderDetail.total),
        paymentMethod,
        5,
        null,
      );
    }

    return await this.getOrderById(orderId);
  }

  ////////////////////////////////////////// Methods privados //////////////////////////////////////////

  private async restoreStock(orderId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['orderDetail', 'orderDetail.items', 'orderDetail.items.variants'],
      });

      if (!order) {
        await queryRunner.rollbackTransaction();
        return;
      }

      for (const item of order.orderDetail.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.product_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) continue;

        if (!product.hasVariants || item.variants.length === 0) {
          product.baseStock += item.quantity;
          await queryRunner.manager.save(Product, product);
        } else {
          for (const variant of item.variants) {
            const lockedVariant = await queryRunner.manager.findOne(ProductVariant, {
              where: { id: variant.id },
              lock: { mode: 'pessimistic_write' },
            });

            if (!lockedVariant) continue;

            lockedVariant.stock += item.quantity;
            if (lockedVariant.stock > 0) {
              lockedVariant.isAvailable = true;
            }
            await queryRunner.manager.save(ProductVariant, lockedVariant);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error restoring stock:', error);
      throw new InternalServerErrorException('Error restoring stock');
    } finally {
      await queryRunner.release();
    }
  }

  private async verifyStockAvailability(cartItems: CartItem[]): Promise<void> {
    for (const cartItem of cartItems) {
      const variantIds = cartItem.variants?.map((v) => v.id) || [];
      const availableStock = await this.productsService.getAvailableStock(cartItem.product.id, variantIds);

      if (availableStock < cartItem.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${cartItem.product.name}. ` +
            `Available: ${availableStock}, Requested: ${cartItem.quantity}`,
        );
      }
    }
  }

  private async createOrderItemsFromCart(
    queryRunner: QueryRunner,
    cartItems: CartItem[],
    orderDetailId: string,
  ): Promise<OrderItem[]> {
    const orderItems: OrderItem[] = [];

    for (const cartItem of cartItems) {
      const productSnapshot = {
        name: cartItem.product.name,
        description: cartItem.product.description,
        basePrice: Number(cartItem.product.basePrice),
        brand: cartItem.product.brand,
        model: cartItem.product.model,
      };

      const variantsSnapshot =
        cartItem.selectedVariants ||
        cartItem.variants?.map((v) => ({
          id: v.id,
          type: v.type,
          name: v.name,
          priceModifier: v.priceModifier,
        })) ||
        null;

      const orderItem = queryRunner.manager.create(OrderItem, {
        quantity: cartItem.quantity,
        unitPrice: cartItem.priceAtAddition,
        subtotal: cartItem.subtotal,
        product: cartItem.product,
        product_id: cartItem.product.id,
        order_detail_id: orderDetailId,
        variants: cartItem.variants || [],
        productSnapshot,
        variantsSnapshot,
      });

      const savedOrderItem = await queryRunner.manager.save(OrderItem, orderItem);
      orderItems.push(savedOrderItem);

      await this.updateProductStock(
        queryRunner,
        cartItem.product.id,
        cartItem.variants?.map((v) => v.id) || [],
        cartItem.quantity,
      );
    }

    return orderItems;
  }

  private async createOrderDetail(
    queryRunner: QueryRunner,
    data: {
      subtotal: number;
      tax: number;
      shipping: number;
      total: number;
      shippingAddressId?: string | null;
      shippingAddressSnapshot?: IAddress | null;
      shippingAddress: IAddress | null;
      items: OrderItem[];
    },
  ): Promise<OrderDetail> {
    const orderDetail = queryRunner.manager.create(OrderDetail, {
      subtotal: data.subtotal,
      tax: data.tax,
      shipping: data.shipping,
      total: data.total,
      shippingAddressId: data.shippingAddressId || null,
      shippingAddressSnapshot: data.shippingAddressSnapshot || null,
      paymentMethod: undefined,
      items: data.items,
    });

    return await queryRunner.manager.save(OrderDetail, orderDetail);
  }

  private async createMainOrder(
    queryRunner: QueryRunner,
    data: {
      orderNumber: string;
      user: Users;
      userId: string;
      orderDetail: OrderDetail;
    },
  ): Promise<Order> {
    const order = queryRunner.manager.create(Order, {
      orderNumber: data.orderNumber,
      user: data.user,
      user_id: data.userId,
      orderDetail: data.orderDetail,
      status: OrderStatus.PENDING,
    });

    return await queryRunner.manager.save(Order, order);
  }

  private async clearUserCart(userId: string): Promise<void> {
    const clear = await this.cartService.clearCart(userId);
    if (!clear) {
      throw new InternalServerErrorException('Failed to clear cart after creating the order');
    }
  }

  private async updateProductStock(
    queryRunner: QueryRunner,
    productId: string,
    variantIds: string[],
    quantity: number,
  ): Promise<void> {
    const product = await queryRunner.manager.findOne(Product, {
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    if (!product.hasVariants || variantIds.length === 0) {
      product.baseStock -= quantity;
      if (product.baseStock < 0) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }
      await queryRunner.manager.save(Product, product);
    } else {
      for (const variantId of variantIds) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: variantId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!variant) {
          throw new NotFoundException(`Variant ${variantId} not found`);
        }

        variant.stock -= quantity;
        if (variant.stock < 0) {
          throw new BadRequestException(`Insufficient stock for variant ${variant.name} of ${product.name}`);
        }

        if (variant.stock === 0) {
          variant.isAvailable = false;
        }

        await queryRunner.manager.save(ProductVariant, variant);
      }
    }
  }
}
