import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './Entities/order.entity';
import { OrderDetail } from './Entities/orderDetails.entity';
import { Product } from '../products/Entities/products.entity';
import { ProductVariant } from '../products/Entities/products_variant.entity';
import { Users } from '../users/Entyties/users.entity';
import { ResponseUserDto } from '../users/interface/IUserResponseDto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { OrderItem } from './Entities/order.item';

@Injectable()
export class OrdersService {
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

    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly dataSource: DataSource,
  ) {}

  async getOrder(id: string): Promise<any> {
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

    const userDto = ResponseUserDto.toDTO(order.user);

    return {
      id: order.id,
      date: order.date,
      status: order.status,
      user: userDto,
      orderDetail: {
        id: order.orderDetail.id,
        subtotal: Number(order.orderDetail.subtotal),
        tax: Number(order.orderDetail.tax),
        shipping: Number(order.orderDetail.shipping),
        total: Number(order.orderDetail.total),
        items: order.orderDetail.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          productSnapshot: item.productSnapshot,
          variantsSnapshot: item.variantsSnapshot,
          product: {
            id: item.product.id,
            name: item.product.name,
            currentPrice: Number(item.product.basePrice),
          },
          variants:
            item.variants?.map((v) => ({
              id: v.id,
              type: v.type,
              name: v.name,
              priceModifier: Number(v.priceModifier),
            })) || [],
        })),
      },
    };
  }

  async createOrderFromCart(userId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener el carrito del usuario
      const cart = await queryRunner.manager.findOne('Cart', {
        where: { user: { id: userId } },
        relations: ['user', 'items', 'items.product', 'items.variants'],
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      // Verificar stock para cada item del carrito
      for (const cartItem of cart.items) {
        const variantIds = cartItem.variants?.map((v) => v.id) || [];
        const availableStock = await this.productsService.getAvailableStock(cartItem.product.id, variantIds);

        if (availableStock < cartItem.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${cartItem.product.name}. ` +
              `Disponible: ${availableStock}, Solicitado: ${cartItem.quantity}`,
          );
        }
      }

      // Crear OrderItems desde CartItems
      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        // Crear snapshot del producto
        const productSnapshot = {
          name: cartItem.product.name,
          description: cartItem.product.description,
          basePrice: Number(cartItem.product.basePrice),
        };

        // Crear OrderItem
        const orderItem = queryRunner.manager.create(OrderItem, {
          quantity: cartItem.quantity,
          unitPrice: cartItem.priceAtAddition,
          subtotal: cartItem.subtotal,
          product: cartItem.product,
          variants: cartItem.variants || [],
          productSnapshot,
          variantsSnapshot: cartItem.selectedVariants,
        });

        orderItems.push(orderItem);
        subtotal += Number(cartItem.subtotal);

        // Actualizar stock
        await this.updateProductStock(
          queryRunner,
          cartItem.product.id,
          cartItem.variants?.map((v) => v.id) || [],
          cartItem.quantity,
        );
      }

      // Calcular totales
      const tax = subtotal * 0.21; // 21% IVA (ajustar según tu país)
      const shipping = 10; // Costo fijo de envío (ajustar según lógica de negocio)
      const total = subtotal + tax + shipping;

      // Crear OrderDetail con items
      const orderDetail = queryRunner.manager.create(OrderDetail, {
        subtotal,
        tax,
        shipping,
        total,
        items: orderItems,
      });

      const savedDetail = await queryRunner.manager.save(orderDetail);

      // Crear Order
      const order = queryRunner.manager.create(Order, {
        user: cart.user,
        orderDetail: savedDetail,
        status: 'active',
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Limpiar el carrito
      await queryRunner.manager.remove(cart);
      cart.total = 0;
      await queryRunner.manager.save(cart);

      await queryRunner.commitTransaction();

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la orden');
    } finally {
      await queryRunner.release();
    }
  }

  private async updateProductStock(
    queryRunner: any,
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
      await queryRunner.manager.save(product);
    } else {
      // Actualizar stock de las variantes seleccionadas
      for (const variantId of variantIds) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (!variant) {
          throw new NotFoundException(`Variante ${variantId} no encontrada`);
        }

        variant.stock -= quantity;
        if (variant.stock < 0) {
          throw new BadRequestException(`Stock insuficiente para variante ${variant.name} de ${product.name}`);
        }
        await queryRunner.manager.save(variant);
      }
    }
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    const orders = await this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['orderDetail', 'orderDetail.items', 'orderDetail.items.product'],
      order: { date: 'DESC' },
    });

    return orders;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const validStatuses = ['active', 'cancelled', 'processed', 'finalized'];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Orden ${orderId} no encontrada`);
    }

    order.status = status;
    return await this.orderRepo.save(order);
  }
}
