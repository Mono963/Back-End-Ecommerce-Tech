import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { Users } from '../users/Entyties/users.entity';
import { Product } from '../products/Entities/products.entity';
import { ProductVariant } from '../products/Entities/products_variant.entity';
import { CartItem } from './entities/cart.item.entity';
import { AddToCartDTO, CartItemResponseDTO, CartResponseDTO, UpdateCartItemDTO } from './dto/create-cart.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartService {
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

    private readonly dataSource: DataSource,
  ) {}

  async getCart(userId: string): Promise<CartResponseDTO> {
    const cart = await this.getOrCreateCart(userId);
    return this.mapCartToResponse(cart);
  }

  async addProductToCart(userId: string, dto: AddToCartDTO): Promise<CartResponseDTO> {
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
          throw new NotFoundException(`User with ID ${userId} not found`);
        }
        cart = queryRunner.manager.create(Cart, { user, total: 0, items: [] });
        await queryRunner.manager.save(cart);
      }

      // Obtener producto con variantes
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId },
        relations: ['variants'],
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found`);
      }

      // Obtener y validar variantes si se proporcionaron
      let selectedVariants: ProductVariant[] = [];
      let variantsSnapshot = null;

      if (dto.variantIds && dto.variantIds.length > 0) {
        if (!product.hasVariants) {
          throw new BadRequestException('Este producto no tiene variantes disponibles');
        }

        selectedVariants = await queryRunner.manager.find(ProductVariant, {
          where: {
            id: In(dto.variantIds),
            product: { id: dto.productId },
          },
        });

        if (selectedVariants.length !== dto.variantIds.length) {
          throw new BadRequestException('Una o más variantes no son válidas para este producto');
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
      }

      // Calcular precio con variantes
      const unitPrice = await this.productsService.calculateProductPrice(dto.productId, dto.variantIds || []);

      // Verificar stock
      const availableStock = await this.productsService.getAvailableStock(dto.productId, dto.variantIds || []);

      if (availableStock < dto.quantity) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${dto.quantity}`);
      }

      // Buscar item existente con las mismas variantes
      let cartItem = this.findExistingCartItem(cart.items, dto.productId, dto.variantIds || []);

      if (cartItem) {
        // Actualizar cantidad existente
        const newQuantity = cartItem.quantity + dto.quantity;
        if (availableStock < newQuantity) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${availableStock}, Total solicitado: ${newQuantity}`,
          );
        }
        cartItem.quantity = newQuantity;
        cartItem.subtotal = parseFloat((newQuantity * Number(cartItem.priceAtAddition)).toFixed(2));
      } else {
        // Crear nuevo item
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

      // Recalcular total del carrito
      cart.total = parseFloat(cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2));

      await queryRunner.manager.save(cart);
      await queryRunner.commitTransaction();

      return await this.getCart(userId);
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

  async updateCartItemQuantity(userId: string, cartItemId: string, dto: UpdateCartItemDTO): Promise<CartResponseDTO> {
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
        // Remover item
        await queryRunner.manager.remove(cartItem);
        cart.items = cart.items.filter((item) => item.id !== cartItemId);
      } else {
        // Verificar stock con variantes
        const variantIds = cartItem.variants?.map((v) => v.id) || [];
        const availableStock = await this.productsService.getAvailableStock(cartItem.product.id, variantIds);

        if (availableStock < dto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${dto.quantity}`,
          );
        }

        // Actualizar cantidad
        cartItem.quantity = dto.quantity;
        cartItem.subtotal = parseFloat((dto.quantity * Number(cartItem.priceAtAddition)).toFixed(2));
        await queryRunner.manager.save(cartItem);
      }

      // Recalcular total
      cart.total = parseFloat(cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2));

      await queryRunner.manager.save(cart);
      await queryRunner.commitTransaction();

      return await this.getCart(userId);
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

  async removeCartItem(userId: string, cartItemId: string): Promise<{ message: string; cart: CartResponseDTO }> {
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

      // Recalcular total
      cart.total = parseFloat(cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2));

      await queryRunner.manager.save(cart);
      await queryRunner.commitTransaction();

      const updatedCart = await this.getCart(userId);
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
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items'],
    });

    if (!cart) {
      throw new NotFoundException(`Carrito no encontrado para el usuario`);
    }

    await this.cartItemRepository.remove(cart.items);
    cart.total = 0;
    await this.cartRepository.save(cart);

    return { message: 'Carrito vaciado exitosamente' };
  }

  // Crear orden desde el carrito
  async createOrderFromCart(userId: string): Promise<any> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'items', 'items.product', 'items.variants'],
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    // Aquí conectarías con OrdersService para crear la orden
    // pasando los items del carrito con sus variantes

    return cart;
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'items', 'items.product', 'items.variants'],
    });

    if (!cart) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
      }
      cart = this.cartRepository.create({ user, total: 0, items: [] });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  private findExistingCartItem(items: CartItem[], productId: string, variantIds: string[]): CartItem | undefined {
    return items?.find((item) => {
      if (item.product.id !== productId) return false;

      const itemVariantIds = item.variants?.map((v) => v.id) || [];

      // Verificar si tienen las mismas variantes
      if (itemVariantIds.length !== variantIds.length) return false;

      const sortedItemIds = [...itemVariantIds].sort();
      const sortedNewIds = [...variantIds].sort();

      return sortedItemIds.every((id, index) => id === sortedNewIds[index]);
    });
  }

  private mapCartToResponse(cart: Cart): CartResponseDTO {
    const items: CartItemResponseDTO[] =
      cart.items?.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceAtAddition: Number(item.priceAtAddition),
        subtotal: Number(item.subtotal),
        selectedVariants: item.selectedVariants,
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          basePrice: Number(item.product.basePrice),
          baseStock: item.product.baseStock,
          imgUrls: item.product.imgUrls || [],
          hasVariants: item.product.hasVariants,
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
