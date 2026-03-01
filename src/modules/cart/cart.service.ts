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
import { Users } from '../users/entities/users.entity';
import { Product } from '../products/entities/products.entity';
import { ProductVariant } from '../products/entities/products_variant.entity';
import { CartItem } from './entities/cart.item.entity';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import {
  IAddToCart,
  ICartItemResponse,
  ICartResponse,
  ICartDiscountPreview,
  ICartDiscountPreviewItem,
  IResponseCartSummary,
  IStockValidationIssue,
  IStockValidationResult,
  IUpdateCartItem,
  IVariantValidationResult,
} from './interfaces/interface.cart';
import { ICreateAddress, IAddress } from '../users/interfaces/user.interface';
import { roundMoney } from '../../common/utils/money.utils';
import { ICategory } from '../category/interface/category.interface';
import { UsersService } from '../users/users.service';
import { IOrder } from '../orders/interfaces/orders.interface';
import { DiscountsService } from '../discounts/discounts.service';

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

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,

    private readonly discountsService: DiscountsService,

    private readonly dataSource: DataSource,
  ) {}

  async getCartById(userId: string): Promise<ICartResponse> {
    const cart = await this.getOrCreateCart(userId);
    return this.mapCartToResponse(cart);
  }

  async getCartSummary(userId: string): Promise<IResponseCartSummary> {
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

  async addProductToCart(userId: string, dto: IAddToCart): Promise<ICartResponse> {
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
        cart = queryRunner.manager.create(Cart, {
          user,
          total: 0,
          item_count: 0,
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
        throw new BadRequestException(`Insufficient stock. Available: ${availableStock}, Requested: ${dto.quantity}`);
      }

      let cartItem = this.findExistingCartItem(cart.items, dto.productId, dto.variantIds || []);

      if (cartItem) {
        const newQuantity = cartItem.quantity + dto.quantity;
        if (availableStock < newQuantity) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${availableStock}, Total requested: ${newQuantity}`,
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

      await this.recalculateCartTotals(queryRunner, cart);

      await queryRunner.commitTransaction();
      return await this.getCartById(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not add product to cart');
    } finally {
      await queryRunner.release();
    }
  }

  async updateCartItemQuantity(userId: string, cartItemId: string, dto: IUpdateCartItem): Promise<ICartResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['items', 'items.product', 'items.variants'],
      });

      if (!cart) {
        throw new NotFoundException('Cart not found for user');
      }

      const cartItem = cart.items?.find((item) => item.id === cartItemId);
      if (!cartItem) {
        throw new NotFoundException('Cart item not found');
      }

      if (dto.quantity === 0) {
        await queryRunner.manager.delete(CartItem, { id: cartItemId });

        const remainingItems = cart.items.filter((item) => item.id !== cartItemId);
        const newTotal = parseFloat(remainingItems.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2));
        const newItemCount = remainingItems.reduce((sum, item) => sum + item.quantity, 0);

        await queryRunner.manager.update(Cart, cart.id, { total: newTotal, item_count: newItemCount });
      } else {
        const variantIds = cartItem.variants?.map((v) => v.id) || [];
        const availableStock = await this.productsService.getAvailableStock(cartItem.product.id, variantIds);

        if (availableStock < dto.quantity) {
          throw new BadRequestException(`Insufficient stock. Available: ${availableStock}, Requested: ${dto.quantity}`);
        }

        cartItem.quantity = dto.quantity;
        cartItem.subtotal = parseFloat((dto.quantity * Number(cartItem.priceAtAddition)).toFixed(2));
        await queryRunner.manager.save(cartItem);

        await this.recalculateCartTotals(queryRunner, cart);
      }

      await queryRunner.commitTransaction();
      return await this.getCartById(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update cart item');
    } finally {
      await queryRunner.release();
    }
  }

  async removeCartItem(userId: string, cartItemId: string): Promise<{ message: string; cart: ICartResponse }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['items', 'items.product'],
      });

      if (!cart) {
        throw new NotFoundException('Cart not found for user');
      }

      const cartItem = cart.items?.find((item) => item.id === cartItemId);
      if (!cartItem) {
        throw new NotFoundException('Cart item not found');
      }

      await queryRunner.manager.delete(CartItem, { id: cartItemId });

      const remainingItems = cart.items.filter((item) => item.id !== cartItemId);
      const newTotal = parseFloat(remainingItems.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2));
      const newItemCount = remainingItems.reduce((sum, item) => sum + item.quantity, 0);

      await queryRunner.manager.update(Cart, cart.id, { total: newTotal, item_count: newItemCount });

      await queryRunner.commitTransaction();

      const updatedCart = await this.getCartById(userId);
      return {
        message: 'Cart item removed successfully',
        cart: updatedCart,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not remove cart item');
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
        throw new NotFoundException('Cart not found for user');
      }

      if (cart.items && cart.items.length > 0) {
        await queryRunner.manager.delete(CartItem, { cart_id: cart.id });
      }

      await queryRunner.manager.update(Cart, cart.id, { total: 0, item_count: 0 });

      await queryRunner.commitTransaction();

      this.logger.log(`User ${userId} cart cleared successfully.`);
      return { message: 'Cart cleared successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not clear cart');
    } finally {
      await queryRunner.release();
    }
  }

  async selectAddressForCheckout(userId: string, addressId: string): Promise<{ message: string }> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found for user');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['addresses'],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (!user.addresses || !user.addresses.find((a) => a.id === addressId)) {
      throw new BadRequestException(`Address with id ${addressId} does not exist in the user's saved addresses`);
    }
    cart.selectedAddressId = addressId;
    await this.cartRepository.save(cart);

    this.logger.log(`Address ${addressId} selected for user ${userId} cart`);

    return { message: 'Address selected successfully for checkout' };
  }

  async getSelectedAddress(userId: string): Promise<{ selectedAddressId: string | null }> {
    const cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      select: ['id', 'selectedAddressId'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found for user');
    }

    return { selectedAddressId: cart.selectedAddressId };
  }

  async validateCartStock(userId: string): Promise<IStockValidationResult> {
    const cart = await this.getOrCreateCart(userId);
    const issues: IStockValidationIssue[] = [];

    if (cart.items.length === 0) {
      return { valid: true, issues: [] };
    }

    const productIds = cart.items.map((item) => item.product.id);

    const products = await this.productRepository.find({
      where: { id: In(productIds) },
      relations: ['variants'],
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of cart.items) {
      const currentProduct = productMap.get(item.product.id);

      if (!currentProduct?.isActive) {
        issues.push({
          itemId: item.id,
          productId: item.product.id,
          productName: item.product.name,
          issue: 'Product not available',
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      const variantIds = item.variants?.map((v) => v.id) || [];
      let availableStock = currentProduct.baseStock;

      if (variantIds.length > 0 && currentProduct.variants) {
        const matchingVariants = currentProduct.variants.filter((v) => variantIds.includes(v.id));
        availableStock = matchingVariants.length > 0 ? Math.min(...matchingVariants.map((v) => v.stock)) : 0;
      }

      if (availableStock < item.quantity) {
        issues.push({
          itemId: item.id,
          productId: item.product.id,
          productName: item.product.name,
          issue: 'Insufficient stock',
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

  async createOrderFromCartCheckout(
    userId: string,
    shippingAddress: ICreateAddress,
    promoCode?: string,
  ): Promise<IOrder> {
    const stockValidation = await this.validateCartStock(userId);

    if (!stockValidation.valid) {
      throw new BadRequestException({
        message: 'Some products in the cart are not available',
        issues: stockValidation.issues,
      });
    }

    const newAddress = await this.usersService.addAddress(userId, shippingAddress);

    const addressForOrder: IAddress = {
      id: newAddress.id,
      label: newAddress.label,
      street: newAddress.street,
      city: newAddress.city,
      province: newAddress.province,
      postalCode: newAddress.postalCode,
      country: newAddress.country,
      isDefault: newAddress.isDefault,
    };

    return await this.ordersService.createOrderFromCart(userId, addressForOrder, promoCode);
  }

  async getCartDiscountPreview(userId: string, promoCode?: string): Promise<ICartDiscountPreview> {
    const cart = await this.getOrCreateCart(userId);

    if (!cart.items || cart.items.length === 0) {
      return {
        subtotalOriginal: 0,
        subtotalWithDiscount: 0,
        totalDiscount: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        promoValid: false,
        promoErrors: ['Tu carrito esta vacio'],
        items: [],
      };
    }

    let promoValid = true;
    let promoErrors: string[] = [];
    let validatedPromoCode = undefined;
    let eligibleProductIds: string[] | undefined;

    if (promoCode) {
      const validation = await this.discountsService.validatePromoCode(promoCode, userId, cart.items);
      if (!validation.valid) {
        promoValid = false;
        promoErrors = validation.errors ?? [];
      } else {
        validatedPromoCode = validation.promoCode;
        eligibleProductIds = validation.eligibleProductIds;
      }
    }

    const itemDiscounts = await this.discountsService.calculateOrderDiscounts(
      cart.items,
      validatedPromoCode,
      eligibleProductIds,
    );

    let subtotalOriginal = 0;
    let subtotalWithDiscount = 0;
    let totalDiscount = 0;
    const items: ICartDiscountPreviewItem[] = [];

    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const discount = itemDiscounts[i];
      const originalUnitPrice = discount.originalUnitPrice;
      const discountAmount = discount.discountAmount;
      const finalUnitPrice = originalUnitPrice - discountAmount;
      const subtotal = finalUnitPrice * item.quantity;

      subtotalOriginal += originalUnitPrice * item.quantity;
      subtotalWithDiscount += subtotal;
      totalDiscount += discountAmount * item.quantity;

      items.push({
        productId: item.product?.id || '',
        quantity: item.quantity,
        originalUnitPrice,
        discountAmount,
        discountSource: discount.discountSource || null,
        discountCode: discount.discountCode || null,
        finalUnitPrice,
        subtotal,
      });
    }

    subtotalOriginal = roundMoney(subtotalOriginal);
    subtotalWithDiscount = roundMoney(subtotalWithDiscount);
    totalDiscount = roundMoney(totalDiscount);

    const totals = this.ordersService.calculateOrderTotals(subtotalWithDiscount);

    return {
      subtotalOriginal,
      subtotalWithDiscount,
      totalDiscount,
      tax: roundMoney(totals.tax),
      shipping: roundMoney(totals.shipping),
      total: roundMoney(totals.total),
      promoValid,
      promoErrors,
      items,
    };
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
          cart.item_count = 0;
          await queryRunner.manager.save(cart);
          cleanedCount++;
        }
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Abandoned carts cleaned successfully',
        cleaned: cleanedCount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error cleaning abandoned carts:', error);
      throw new InternalServerErrorException('Error cleaning abandoned carts');
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
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      cart = this.cartRepository.create({
        user,
        total: 0,
        item_count: 0,
        items: [],
      });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  private async validateAndGetProduct(queryRunner: QueryRunner, productId: string): Promise<Product> {
    const product = await queryRunner.manager.findOne(Product, {
      where: { id: productId },
      relations: ['variants', 'category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    return product;
  }

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

    if (!variantIds || variantIds.length === 0) {
      if (hasVariants) {
        throw new BadRequestException('This product requires selecting variants');
      }
      return { selectedVariants: [], variantsSnapshot: [] };
    }

    if (!hasVariants) {
      throw new BadRequestException('This product does not accept variants');
    }

    selectedVariants = await queryRunner.manager.find(ProductVariant, {
      where: {
        id: In(variantIds),
        product: { id: productId },
        isAvailable: true,
      },
    });

    if (selectedVariants.length !== variantIds.length) {
      throw new BadRequestException('One or more variants are invalid or unavailable');
    }
    const typesSet = new Set(selectedVariants.map((v) => v.type));
    if (typesSet.size !== selectedVariants.length) {
      throw new BadRequestException('Multiple variants of the same type cannot be selected');
    }
    variantsSnapshot = selectedVariants.map((v) => ({
      id: v.id,
      type: v.type,
      name: v.name,
      priceModifier: Number(v.priceModifier),
    }));

    return { selectedVariants, variantsSnapshot };
  }

  private findExistingCartItem(items: CartItem[], productId: string, variantIds: string[]): CartItem | undefined {
    return items?.find((item) => {
      if (item.product.id !== productId) return false;

      const itemVariantIds = item.variants?.map((v) => v.id) || [];

      if (itemVariantIds.length !== variantIds.length) return false;

      if (itemVariantIds.length === 0 && variantIds.length === 0) return true;

      const sortedItemIds = [...itemVariantIds].sort();
      const sortedNewIds = [...variantIds].sort();

      return sortedItemIds.every((id, index) => id === sortedNewIds[index]);
    });
  }

  private async recalculateCartTotals(queryRunner: QueryRunner | EntityManager, cart: Cart): Promise<void> {
    cart.total = parseFloat(cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2));
    cart.item_count = this.calculateItemCount(cart.items);

    if ('manager' in queryRunner) {
      await queryRunner.manager.save(cart);
    } else {
      await queryRunner.save(cart);
    }
  }

  private calculateItemCount(items: CartItem[] | undefined): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  private mapCartToResponse(cart: Cart): ICartResponse {
    const items: ICartItemResponse[] =
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
                category_name: (item.product.category as ICategory).category_name || 'Unnamed',
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
