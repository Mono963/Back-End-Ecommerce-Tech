import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan, QueryRunner, EntityManager } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { Users } from '../users/Entities/users.entity';
import { Product } from '../products/Entities/products.entity';
import { ProductVariant } from '../products/Entities/products_variant.entity';
import { CartItem } from './entities/cart.item.entity';
import { AddToCartDTO, UpdateCartItemDTO } from './dto/create-cart.dto';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import {
  ICartItemResponseDTO,
  ICartResponseDTO,
  IResponseCartSummaryDTO,
  IStockValidationIssue,
  IStockValidationResult,
  IVariantValidationResult,
} from './interfaces/interface.cart';
import { IShippingAddressDto } from '../orders/interfaces/orders.interface';
import { ResponseOrderDto } from '../orders/Dto/order.Dto';
import { ICategory } from '../category/interface/category.interface';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,

    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,

    private readonly productsService: ProductsService,

    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,

    private readonly dataSource: DataSource,
  ) {}

  async getCartById(userId: string): Promise<ICartResponseDTO> {
    const cart = await this.getOrCreateCart(userId);
    return this.mapCartToResponse(cart);
  }

  async getCartSummary(userId: string): Promise<IResponseCartSummaryDTO> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items'],
    });

    if (!cart) {
      return { itemCount: 0, total: 0, hasItems: false };
    }

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      itemCount,
      total: Number(cart.total),
      hasItems: cart.items.length > 0,
    };
  }

  async addProductToCart(userId: string, dto: AddToCartDTO): Promise<ICartResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['user', 'items', 'items.product', 'items.variants'],
      });

      if (!cart) {
        const user = await queryRunner.manager.findOne(Users, {
          where: { id: userId },
        });
        if (!user) {
          throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }
        cart = queryRunner.manager.create(Cart, {
          user,
          total: 0,
          items: [],
        });
        await queryRunner.manager.save(cart);
      }

      const product = await this.validateAndGetProduct(queryRunner, dto.productId);

      const { selectedVariants, variantsSnapshot } = await this.validateAndGetVariants(
        queryRunner,
        dto.productId,
        dto.variantIds || [],
        product.hasVariants,
      );

      const unitPrice = await this.productsService.calculateProductPrice(dto.productId, dto.variantIds || []);

      const availableStock = await this.productsService.getAvailableStock(dto.productId, dto.variantIds || []);

      if (availableStock < dto.quantity) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${dto.quantity}`);
      }

      let cartItem = this.findExistingCartItem(cart.items, dto.productId, dto.variantIds || []);

      if (cartItem) {
        const newQuantity = cartItem.quantity + dto.quantity;
        if (availableStock < newQuantity) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${availableStock}, Total solicitado: ${newQuantity}`,
          );
        }
        cartItem.quantity = newQuantity;
        cartItem.subtotal = parseFloat((newQuantity * Number(cartItem.priceAtAddition)).toFixed(2));
      } else {
        cartItem = queryRunner.manager.create(CartItem, {
          cart,
          product,
          quantity: dto.quantity,
          priceAtAddition: unitPrice,
          subtotal: parseFloat((dto.quantity * unitPrice).toFixed(2)),
          selectedVariants: variantsSnapshot,
          variants: selectedVariants,
        });

        if (!cart.items) cart.items = [];
        cart.items.push(cartItem);
      }

      await queryRunner.manager.save(cartItem);

      await this.recalculateCartTotal(queryRunner, cart);

      await queryRunner.commitTransaction();
      return await this.getCartById(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('No se pudo agregar el producto al carrito');
    } finally {
      await queryRunner.release();
    }
  }

  async updateCartItemQuantity(userId: string, cartItemId: string, dto: UpdateCartItemDTO): Promise<ICartResponseDTO> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['items', 'items.product', 'items.variants'],
      });

      if (!cart) {
        throw new NotFoundException(`Carrito no encontrado para el usuario`);
      }

      const cartItem = cart.items?.find((item) => item.id === cartItemId);
      if (!cartItem) {
        throw new NotFoundException(`Item del carrito no encontrado`);
      }

      if (dto.quantity === 0) {
        await queryRunner.manager.remove(cartItem);
        cart.items = cart.items.filter((item) => item.id !== cartItemId);
      } else {
        const variantIds = cartItem.variants?.map((v) => v.id) || [];
        const availableStock = await this.productsService.getAvailableStock(cartItem.product.id, variantIds);

        if (availableStock < dto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${dto.quantity}`,
          );
        }

        cartItem.quantity = dto.quantity;
        cartItem.subtotal = parseFloat((dto.quantity * Number(cartItem.priceAtAddition)).toFixed(2));
        await queryRunner.manager.save(cartItem);
      }

      await this.recalculateCartTotal(queryRunner, cart);

      await queryRunner.commitTransaction();
      return await this.getCartById(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('No se pudo actualizar el item del carrito');
    } finally {
      await queryRunner.release();
    }
  }

  async removeCartItem(userId: string, cartItemId: string): Promise<{ message: string; cart: ICartResponseDTO }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['items', 'items.product'],
      });

      if (!cart) {
        throw new NotFoundException(`Carrito no encontrado para el usuario`);
      }

      const cartItem = cart.items?.find((item) => item.id === cartItemId);
      if (!cartItem) {
        throw new NotFoundException(`Item del carrito no encontrado`);
      }

      await queryRunner.manager.remove(cartItem);
      cart.items = cart.items.filter((item) => item.id !== cartItemId);

      await this.recalculateCartTotal(queryRunner, cart);

      await queryRunner.commitTransaction();

      const updatedCart = await this.getCartById(userId);
      return {
        message: 'Item eliminado del carrito exitosamente',
        cart: updatedCart,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('No se pudo eliminar el item del carrito');
    } finally {
      await queryRunner.release();
    }
  }

  async clearCart(userId: string): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['items'],
      });

      if (!cart) {
        throw new NotFoundException(`Carrito no encontrado para el usuario`);
      }

      if (cart.items && cart.items.length > 0) {
        await queryRunner.manager.remove(CartItem, cart.items);
      }

      cart.items = [];
      cart.total = 0;

      await queryRunner.manager.save(cart);

      await queryRunner.commitTransaction();

      this.logger.log(`Carrito del usuario ${userId} vaciado exitosamente.`);
      return { message: 'Carrito vaciado exitosamente' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('No se pudo vaciar el carrito');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Selecciona una dirección del usuario para el checkout
   * Valida que la dirección exista en user.addresses antes de guardarla
   */
  async selectAddressForCheckout(userId: string, addressId: string): Promise<{ message: string }> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!cart) {
      throw new NotFoundException(`Carrito no encontrado para el usuario`);
    }

    // Validar que el usuario tenga esa dirección
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'addresses'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    const addressExists = user.addresses?.some((addr) => addr.id === addressId);

    if (!addressExists) {
      throw new BadRequestException(
        `La dirección con id ${addressId} no existe en las direcciones guardadas del usuario`,
      );
    }

    // Guardar el addressId seleccionado en el carrito
    cart.selectedAddressId = addressId;
    await this.cartRepository.save(cart);

    this.logger.log(`Dirección ${addressId} seleccionada para carrito del usuario ${userId}`);

    return { message: 'Dirección seleccionada exitosamente para el checkout' };
  }

  /**
   * Obtiene la dirección seleccionada actual del carrito
   */
  async getSelectedAddress(userId: string): Promise<{ selectedAddressId: string | null }> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      select: ['id', 'selectedAddressId'],
    });

    if (!cart) {
      throw new NotFoundException(`Carrito no encontrado para el usuario`);
    }

    return { selectedAddressId: cart.selectedAddressId };
  }

  async validateCartStock(userId: string): Promise<IStockValidationResult> {
    const cart = await this.getOrCreateCart(userId);
    const issues: IStockValidationIssue[] = [];

    for (const item of cart.items) {
      const currentProduct = await this.productRepository.findOne({
        where: { id: item.product.id },
      });

      if (!currentProduct?.isActive) {
        issues.push({
          itemId: item.id,
          productId: item.product.id,
          productName: item.product.name,
          issue: 'Producto no disponible',
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      const variantIds = item.variants?.map((v) => v.id) || [];
      const availableStock = await this.productsService.getAvailableStock(item.product.id, variantIds);

      if (availableStock < item.quantity) {
        issues.push({
          itemId: item.id,
          productId: item.product.id,
          productName: item.product.name,
          issue: 'Stock insuficiente',
          requested: item.quantity,
          available: availableStock,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  async createOrderFromCartCheckout(userId: string, shippingAddress: IShippingAddressDto): Promise<ResponseOrderDto> {
    const stockValidation = await this.validateCartStock(userId);

    if (!stockValidation.valid) {
      throw new BadRequestException({
        message: 'Algunos productos en el carrito no están disponibles',
        issues: stockValidation.issues,
      });
    }

    return await this.ordersService.createOrderFromCart(userId, shippingAddress);
  }

  async cleanupAbandonedCarts(daysOld: number = 30): Promise<{
    message: string;
    cleaned: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const abandonedCarts = await queryRunner.manager.find(Cart, {
        where: {
          updatedAt: LessThan(cutoffDate),
        },
        relations: ['items'],
      });

      let cleanedCount = 0;

      for (const cart of abandonedCarts) {
        if (cart.items.length > 0) {
          await queryRunner.manager.remove(cart.items);
          cart.total = 0;
          await queryRunner.manager.save(cart);
          cleanedCount++;
        }
      }

      await queryRunner.commitTransaction();

      return {
        message: `Carritos abandonados limpiados exitosamente`,
        cleaned: cleanedCount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error limpiando carritos abandonados:', error);
      throw new InternalServerErrorException('Error al limpiar carritos abandonados');
    } finally {
      await queryRunner.release();
    }
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'items', 'items.product', 'items.product.category', 'items.variants'],
    });

    if (!cart) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
      }
      cart = this.cartRepository.create({
        user,
        total: 0,
        items: [],
      });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  /**
   * Valida y obtiene un producto
   */
  private async validateAndGetProduct(queryRunner: QueryRunner, productId: string): Promise<Product> {
    const product = await queryRunner.manager.findOne(Product, {
      where: { id: productId },
      relations: ['variants', 'category'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    if (!product.isActive) {
      throw new BadRequestException('El producto no está disponible');
    }

    return product;
  }

  /**
   * Valida y obtiene variantes - LÓGICA MEJORADA
   */
  private async validateAndGetVariants(
    queryRunner: QueryRunner,
    productId: string,
    variantIds: string[],
    hasVariants: boolean,
  ): Promise<IVariantValidationResult> {
    let selectedVariants: ProductVariant[] = [];
    let variantsSnapshot: Array<{
      id: string;
      type: string;
      name: string;
      priceModifier: number;
    }> = [];

    // ✅ Caso 1: No se enviaron variantes
    if (!variantIds || variantIds.length === 0) {
      if (hasVariants) {
        // Si el producto tiene variantes pero no se seleccionaron, es un error
        throw new BadRequestException('Este producto requiere seleccionar variantes');
      }
      // Si no tiene variantes, está bien no enviar ninguna
      return { selectedVariants: [], variantsSnapshot: [] };
    }

    // ✅ Caso 2: Se enviaron variantes
    if (!hasVariants) {
      throw new BadRequestException('Este producto no acepta variantes');
    }

    selectedVariants = await queryRunner.manager.find(ProductVariant, {
      where: {
        id: In(variantIds),
        product: { id: productId },
        isAvailable: true,
      },
    });

    if (selectedVariants.length !== variantIds.length) {
      throw new BadRequestException('Una o más variantes no son válidas o no están disponibles');
    }

    // Validar que no hay variantes duplicadas del mismo tipo
    const typesSet = new Set(selectedVariants.map((v) => v.type));
    if (typesSet.size !== selectedVariants.length) {
      throw new BadRequestException('No se pueden seleccionar múltiples variantes del mismo tipo');
    }

    // Crear snapshot de variantes
    variantsSnapshot = selectedVariants.map((v) => ({
      id: v.id,
      type: v.type,
      name: v.name,
      priceModifier: Number(v.priceModifier),
    }));

    return { selectedVariants, variantsSnapshot };
  }

  /**
   * Busca un item existente en el carrito con el mismo producto y variantes - LÓGICA CORREGIDA
   */
  private findExistingCartItem(items: CartItem[], productId: string, variantIds: string[]): CartItem | undefined {
    return items?.find((item) => {
      if (item.product.id !== productId) return false;

      const itemVariantIds = item.variants?.map((v) => v.id) || [];

      // ✅ Ambos arrays deben tener la misma longitud
      if (itemVariantIds.length !== variantIds.length) return false;

      // ✅ Si ambos están vacíos, coinciden
      if (itemVariantIds.length === 0 && variantIds.length === 0) return true;

      // ✅ Comparar arrays ordenados
      const sortedItemIds = [...itemVariantIds].sort();
      const sortedNewIds = [...variantIds].sort();

      return sortedItemIds.every((id, index) => id === sortedNewIds[index]);
    });
  }

  private async recalculateCartTotal(queryRunner: QueryRunner | EntityManager, cart: Cart): Promise<void> {
    cart.total = parseFloat(cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2));

    if ('manager' in queryRunner) {
      // Es un QueryRunner
      await queryRunner.manager.save(cart);
    } else {
      // Es un EntityManager
      await queryRunner.save(cart);
    }
  }

  /**
   * Mapea el carrito a DTO de respuesta
   */
  private mapCartToResponse(cart: Cart): ICartResponseDTO {
    const items: ICartItemResponseDTO[] =
      cart.items?.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceAtAddition: Number(item.priceAtAddition),
        subtotal: Number(item.subtotal),
        addedAt: item.addedAt,
        selectedVariants: item.selectedVariants,
        variants:
          item.variants?.map((v) => ({
            id: v.id,
            type: v.type,
            name: v.name,
            priceModifier: Number(v.priceModifier),
            stock: v.stock,
            isAvailable: v.isAvailable,
          })) || [],
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          brand: item.product.brand,
          model: item.product.model,
          basePrice: Number(item.product.basePrice),
          baseStock: item.product.baseStock,
          imgUrls: item.product.imgUrls || [],
          hasVariants: item.product.hasVariants,
          isActive: item.product.isActive,
          category: item.product.category
            ? {
                id: item.product.category.id,
                name: (item.product.category as ICategory).categoryName || 'Sin nombre',
              }
            : null,
        },
      })) || [];

    return {
      id: cart.id,
      total: Number(cart.total),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }
}
