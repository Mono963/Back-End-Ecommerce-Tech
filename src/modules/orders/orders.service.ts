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
import { Repository, DataSource, Between, FindManyOptions, QueryRunner } from 'typeorm';
import { Order, OrderStatus } from './Entities/order.entity';
import { OrderDetail } from './Entities/orderDetails.entity';
import { OrderItem } from './Entities/order.item';
import { Product } from '../products/Entities/products.entity';
import { ProductVariant } from '../products/Entities/products_variant.entity';
import { Users } from '../users/Entyties/users.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart.item.entity';
import { ProductsService } from '../products/products.service';
import { OrderFiltersDto, ResponseOrderDto } from './Dto/order.Dto';
import { IShippingAddressInternal } from './interfaces/orders.interface';
import { CartService } from '../cart/cart.service';

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
  ) {}

  async getOrder(id: string, userId?: string): Promise<ResponseOrderDto> {
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
      throw new NotFoundException(`Orden con id ${id} no encontrada`);
    }

    if (userId && order.user.id !== userId) {
      throw new BadRequestException('No tienes acceso a esta orden');
    }

    return this.mapOrderToDto(order);
  }

  async createOrderFromCart(userId: string, shippingAddress: IShippingAddressInternal): Promise<ResponseOrderDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['user', 'items', 'items.product', 'items.product.category', 'items.variants'],
      });

      if (!cart?.items || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
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

      return await this.getOrder(order.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleOrderCreationError(error);
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
          `Stock insuficiente para ${cartItem.product.name}. ` +
            `Disponible: ${availableStock}, Solicitado: ${cartItem.quantity}`,
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
      shippingAddress: IShippingAddressInternal | null;
      items: OrderItem[];
    },
  ): Promise<OrderDetail> {
    const orderDetail = queryRunner.manager.create(OrderDetail, {
      subtotal: data.subtotal,
      tax: data.tax,
      shipping: data.shipping,
      total: data.total,
      shippingAddress: data.shippingAddress ? data.shippingAddress : undefined,
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
      throw new InternalServerErrorException('Error al limpiar el carrito después de crear la orden');
    }
  }

  private handleOrderCreationError(error: unknown): never {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    this.logger.error('Error al crear la orden:', error);
    throw new InternalServerErrorException('Error al crear la orden');
  }

  private async updateProductStock(
    queryRunner: QueryRunner,
    productId: string,
    variantIds: string[],
    quantity: number,
  ): Promise<void> {
    const product = await queryRunner.manager.findOne(Product, {
      where: { id: productId },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Producto ${productId} no encontrado`);
    }

    if (!product.hasVariants || variantIds.length === 0) {
      // Actualizar stock base del producto
      product.baseStock -= quantity;
      if (product.baseStock < 0) {
        throw new BadRequestException(`Stock insuficiente para ${product.name}`);
      }
      await queryRunner.manager.save(Product, product);
    } else {
      // Actualizar stock de las variantes seleccionadas
      for (const variantId of variantIds) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: variantId },
        });

        if (!variant) {
          throw new NotFoundException(`Variante ${variantId} no encontrada`);
        }

        variant.stock -= quantity;
        if (variant.stock < 0) {
          throw new BadRequestException(`Stock insuficiente para variante ${variant.name} de ${product.name}`);
        }

        // Si el stock llega a 0, marcar como no disponible
        if (variant.stock === 0) {
          variant.isAvailable = false;
        }

        await queryRunner.manager.save(ProductVariant, variant);
      }
    }
  }

  /**
   * Obtiene las órdenes de un usuario específico
   * @param userId - ID del usuario
   * @returns Lista de órdenes del usuario
   */
  async getUserOrders(userId: string): Promise<ResponseOrderDto[]> {
    const orders = await this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['orderDetail', 'orderDetail.items', 'orderDetail.items.product', 'orderDetail.items.variants'],
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => this.mapOrderToDto(order));
  }

  /**
   * Obtiene todas las órdenes con filtros (Admin)
   * @param filters - Filtros de búsqueda
   * @returns Lista paginada de órdenes
   */
  async getAllOrders(filters: OrderFiltersDto): Promise<ResponseOrderDto[]> {
    const { status, startDate, endDate, page = 1, limit = 10 } = filters;

    const where: Record<string, unknown> = {};

    // Aplicar filtro de estado
    if (status) {
      where.status = status;
    }

    // Aplicar filtro de fechas
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = Between(new Date(startDate), new Date());
    }

    const options: FindManyOptions<Order> = {
      where,
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
    };

    const orders = await this.orderRepo.find(options);
    return orders.map((order) => this.mapOrderToDto(order));
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, paymentMethod?: string): Promise<ResponseOrderDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['orderDetail'],
    });

    if (!order) {
      throw new NotFoundException(`Orden ${orderId} no encontrada`);
    }

    // Validar transiciones de estado permitidas
    this.validateStatusTransition(order.status, status);

    order.status = status;

    // Si se está marcando como pagada, actualizar método de pago
    if (status === OrderStatus.PAID && paymentMethod) {
      order.orderDetail.paymentMethod = paymentMethod;
      await this.orderDetailRepo.save(order.orderDetail);
    }

    // Si se cancela, devolver stock
    if (status === OrderStatus.CANCELLED) {
      await this.restoreStock(orderId);
    }

    await this.orderRepo.save(order);

    return await this.getOrder(orderId);
  }

  /**
   * Valida las transiciones de estado permitidas
   * @param currentStatus - Estado actual
   * @param newStatus - Nuevo estado
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowedStatuses = validTransitions[currentStatus];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(`No se puede cambiar el estado de ${currentStatus} a ${newStatus}`);
    }
  }

  /**
   * Restaura el stock cuando se cancela una orden
   * @param orderId - ID de la orden a cancelar
   */
  private async restoreStock(orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['orderDetail', 'orderDetail.items', 'orderDetail.items.variants'],
    });

    if (!order) return;

    for (const item of order.orderDetail.items) {
      const product = await this.productRepo.findOne({
        where: { id: item.product_id },
      });

      if (!product) continue;

      if (!product.hasVariants || item.variants.length === 0) {
        // Restaurar stock base del producto
        product.baseStock += item.quantity;
        await this.productRepo.save(product);
      } else {
        // Restaurar stock de variantes
        for (const variant of item.variants) {
          variant.stock += item.quantity;
          if (variant.stock > 0) {
            variant.isAvailable = true;
          }
          await this.variantRepo.save(variant);
        }
      }
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `ORD-${year}-${month}`;

    // Obtener el último número de orden del mes actual
    const lastOrder = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.createdAt', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastOrder) {
      // ✅ CORREGIDO: usar índice [3] para obtener la secuencia
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

  private mapOrderToDto(order: Order): ResponseOrderDto {
    const shippingAddress = order.orderDetail.shippingAddress
      ? {
          ...order.orderDetail.shippingAddress,
          country: order.orderDetail.shippingAddress.country || 'Argentina',
        }
      : null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
      },
      orderDetail: {
        id: order.orderDetail.id,
        subtotal: Number(order.orderDetail.subtotal),
        tax: Number(order.orderDetail.tax),
        shipping: Number(order.orderDetail.shipping),
        total: Number(order.orderDetail.total),
        shippingAddress,
        paymentMethod: order.orderDetail.paymentMethod,
        items: order.orderDetail.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          productSnapshot: item.productSnapshot,
          variantsSnapshot: item.variantsSnapshot,
          createdAt: item.createdAt,
        })),
      },
    };
  }

  /**
   * Obtiene estadísticas de órdenes para el dashboard de admin
   * @returns Estadísticas agregadas de órdenes
   */
  async getOrderStats(): Promise<Record<string, unknown>> {
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
    const cancelledOrders = await this.orderRepo.count({
      where: { status: OrderStatus.CANCELLED },
    });

    // Calcular ingresos totales
    const revenue: { total?: string } | undefined = await this.orderDetailRepo
      .createQueryBuilder('detail')
      .leftJoin('detail.order', 'order')
      .select('SUM(detail.total)', 'total')
      .where('order.status != :status', { status: OrderStatus.CANCELLED })
      .getRawOne();

    // Calcular ingresos del mes actual
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
        cancelled: cancelledOrders,
      },
      revenue: {
        total: Number(revenue?.total) || 0,
        monthly: Number(monthlyRevenue?.total) || 0,
      },
      completionRate: totalOrders > 0 ? `${((deliveredOrders / totalOrders) * 100).toFixed(2)}%` : '0%',
      cancellationRate: totalOrders > 0 ? `${((cancelledOrders / totalOrders) * 100).toFixed(2)}%` : '0%',
    };
  }
}
