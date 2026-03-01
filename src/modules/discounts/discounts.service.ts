import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import { ProductDiscount } from './entities/product-discount.entity';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeUsage } from './entities/promo-code-usage.entity';
import { Product } from '../products/entities/products.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart.item.entity';
import { DiscountType, DiscountSource } from './enums/discount.enums';
import {
  IOrderItemDiscount,
  IPromoCodeLookupOptions,
  IPromoCodeValidation,
  IPaidOrderDiscountItem,
} from './interfaces/discount.interfaces';
import { CreateProductDiscountDto, UpdateProductDiscountDto } from './dto/create-product-discount.dto';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/create-promo-code.dto';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(
    @InjectRepository(ProductDiscount)
    private readonly productDiscountRepo: Repository<ProductDiscount>,

    @InjectRepository(PromoCode)
    private readonly promoCodeRepo: Repository<PromoCode>,

    @InjectRepository(PromoCodeUsage)
    private readonly promoCodeUsageRepo: Repository<PromoCodeUsage>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    private readonly dataSource: DataSource,
  ) {}

  private normalizeCode(code: string): string {
    return code.toUpperCase().trim();
  }

  private validateDateRange(startDate: Date | null, endDate: Date | null): void {
    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  private validateDiscountValue(discountType: DiscountType, value: number): void {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      throw new BadRequestException('El valor del descuento debe ser mayor a 0');
    }

    if (discountType === DiscountType.PERCENTAGE && numericValue > 100) {
      throw new BadRequestException('El descuento porcentual no puede ser mayor a 100');
    }
  }

  private validateUsageLimits(maxUses: number | null, maxUsesPerUser: number | null, currentUses: number): void {
    if (maxUses !== null && maxUses < currentUses) {
      throw new BadRequestException(`maxUses no puede ser menor que currentUses (${currentUses})`);
    }

    if (maxUses !== null && maxUsesPerUser !== null && maxUsesPerUser > maxUses) {
      throw new BadRequestException('maxUsesPerUser no puede ser mayor que maxUses');
    }
  }

  private rangesOverlap(startA: Date | null, endA: Date | null, startB: Date | null, endB: Date | null): boolean {
    const aStart = startA ? startA.getTime() : Number.NEGATIVE_INFINITY;
    const aEnd = endA ? endA.getTime() : Number.POSITIVE_INFINITY;
    const bStart = startB ? startB.getTime() : Number.NEGATIVE_INFINITY;
    const bEnd = endB ? endB.getTime() : Number.POSITIVE_INFINITY;

    return aStart <= bEnd && bStart <= aEnd;
  }

  async hasOverlappingActiveProductDiscount(
    productId: string,
    startDate: Date | null,
    endDate: Date | null,
    excludeId?: string,
  ): Promise<boolean> {
    const activeDiscounts = await this.productDiscountRepo.find({
      where: { product_id: productId, isActive: true },
    });

    return activeDiscounts.some((discount) => {
      if (excludeId && discount.id === excludeId) {
        return false;
      }

      return this.rangesOverlap(startDate, endDate, discount.startDate, discount.endDate);
    });
  }

  // ==========================================
  // PRODUCT DISCOUNTS - CRUD
  // ==========================================

  async createProductDiscount(dto: CreateProductDiscountDto): Promise<ProductDiscount> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`Producto con id ${dto.productId} no encontrado`);
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    this.validateDateRange(startDate, endDate);
    this.validateDiscountValue(dto.discountType, dto.value);

    if (dto.discountType === DiscountType.FIXED && dto.value > Number(product.basePrice)) {
      throw new BadRequestException(
        `El descuento fijo ($${dto.value}) no puede superar el precio base del producto ($${product.basePrice})`,
      );
    }

    const hasOverlap = await this.hasOverlappingActiveProductDiscount(dto.productId, startDate, endDate);
    if (hasOverlap) {
      throw new ConflictException('Ya existe un descuento activo para ese producto y rango de fechas');
    }

    const discount = this.productDiscountRepo.create({
      discountType: dto.discountType,
      value: dto.value,
      startDate,
      endDate,
      isActive: true,
      product_id: dto.productId,
    });

    return await this.productDiscountRepo.save(discount);
  }

  async updateProductDiscount(id: string, dto: UpdateProductDiscountDto): Promise<ProductDiscount> {
    const discount = await this.productDiscountRepo.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!discount) {
      throw new NotFoundException(`Descuento con id ${id} no encontrado`);
    }

    const nextDiscountType = dto.discountType ?? discount.discountType;
    const nextValue = dto.value !== undefined ? dto.value : Number(discount.value);
    const nextStartDate =
      dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : discount.startDate;
    const nextEndDate = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : discount.endDate;
    const nextIsActive = dto.isActive ?? discount.isActive;

    this.validateDateRange(nextStartDate, nextEndDate);
    this.validateDiscountValue(nextDiscountType, nextValue);

    if (nextDiscountType === DiscountType.FIXED && nextValue > Number(discount.product.basePrice)) {
      throw new BadRequestException(
        `El descuento fijo ($${nextValue}) no puede superar el precio base del producto ($${discount.product.basePrice})`,
      );
    }

    if (nextIsActive) {
      const hasOverlap = await this.hasOverlappingActiveProductDiscount(
        discount.product_id,
        nextStartDate,
        nextEndDate,
        discount.id,
      );

      if (hasOverlap) {
        throw new ConflictException('Ya existe otro descuento activo para ese producto y rango de fechas');
      }
    }

    discount.discountType = nextDiscountType;
    discount.value = nextValue;
    discount.startDate = nextStartDate;
    discount.endDate = nextEndDate;
    discount.isActive = nextIsActive;

    return await this.productDiscountRepo.save(discount);
  }

  async deleteProductDiscount(id: string): Promise<{ message: string }> {
    const discount = await this.productDiscountRepo.findOne({ where: { id } });
    if (!discount) {
      throw new NotFoundException(`Descuento con id ${id} no encontrado`);
    }

    discount.isActive = false;
    await this.productDiscountRepo.save(discount);
    return { message: 'Descuento desactivado exitosamente' };
  }

  async getProductDiscounts(): Promise<ProductDiscount[]> {
    return await this.productDiscountRepo.find({
      where: { isActive: true },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProductDiscountByProductId(productId: string): Promise<ProductDiscount | null> {
    return await this.getActiveProductDiscount(productId);
  }

  // ==========================================
  // PROMO CODES - CRUD
  // ==========================================

  async createPromoCode(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const normalizedCode = this.normalizeCode(dto.code);

    const existing = await this.promoCodeRepo.findOne({ where: { code: normalizedCode } });
    if (existing) {
      throw new ConflictException(`Ya existe un codigo promocional con el codigo '${normalizedCode}'`);
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    this.validateDateRange(startDate, endDate);
    this.validateDiscountValue(dto.discountType, dto.value);
    this.validateUsageLimits(dto.maxUses || null, dto.maxUsesPerUser || null, 0);

    const promoCode = this.promoCodeRepo.create({
      code: normalizedCode,
      description: dto.description || null,
      discountType: dto.discountType,
      value: dto.value,
      startDate,
      endDate,
      isActive: true,
      maxUses: dto.maxUses || null,
      maxUsesPerUser: dto.maxUsesPerUser || null,
      minOrderAmount: dto.minOrderAmount || null,
      applicableProductIds: dto.applicableProductIds || null,
      applicableCategoryIds: dto.applicableCategoryIds || null,
    });

    return await this.promoCodeRepo.save(promoCode);
  }

  async updatePromoCode(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepo.findOne({ where: { id } });
    if (!promoCode) {
      throw new NotFoundException(`Codigo promocional con id ${id} no encontrado`);
    }

    const nextDiscountType = dto.discountType ?? promoCode.discountType;
    const nextValue = dto.value !== undefined ? dto.value : Number(promoCode.value);
    const nextStartDate =
      dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : promoCode.startDate;
    const nextEndDate = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : promoCode.endDate;
    const nextMaxUses = dto.maxUses !== undefined ? dto.maxUses || null : promoCode.maxUses;
    const nextMaxUsesPerUser = dto.maxUsesPerUser !== undefined ? dto.maxUsesPerUser || null : promoCode.maxUsesPerUser;

    this.validateDateRange(nextStartDate, nextEndDate);
    this.validateDiscountValue(nextDiscountType, nextValue);
    this.validateUsageLimits(nextMaxUses, nextMaxUsesPerUser, promoCode.currentUses);

    if (dto.description !== undefined) promoCode.description = dto.description || null;
    promoCode.discountType = nextDiscountType;
    promoCode.value = nextValue;
    promoCode.startDate = nextStartDate;
    promoCode.endDate = nextEndDate;
    if (dto.isActive !== undefined) promoCode.isActive = dto.isActive;
    promoCode.maxUses = nextMaxUses;
    promoCode.maxUsesPerUser = nextMaxUsesPerUser;
    if (dto.minOrderAmount !== undefined) promoCode.minOrderAmount = dto.minOrderAmount || null;
    if (dto.applicableProductIds !== undefined) promoCode.applicableProductIds = dto.applicableProductIds || null;
    if (dto.applicableCategoryIds !== undefined) promoCode.applicableCategoryIds = dto.applicableCategoryIds || null;

    return await this.promoCodeRepo.save(promoCode);
  }

  async deletePromoCode(id: string): Promise<{ message: string }> {
    const promoCode = await this.promoCodeRepo.findOne({ where: { id } });
    if (!promoCode) {
      throw new NotFoundException(`Codigo promocional con id ${id} no encontrado`);
    }

    promoCode.isActive = false;
    await this.promoCodeRepo.save(promoCode);
    return { message: 'Codigo promocional desactivado exitosamente' };
  }

  async getPromoCodes(): Promise<PromoCode[]> {
    return await this.promoCodeRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getPromoCodeById(id: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepo.findOne({ where: { id } });
    if (!promoCode) {
      throw new NotFoundException(`Codigo promocional con id ${id} no encontrado`);
    }
    return promoCode;
  }

  async getPromoCodeUsage(id: string): Promise<PromoCodeUsage[]> {
    return await this.promoCodeUsageRepo.find({
      where: { promo_code_id: id },
      relations: ['user', 'order'],
      order: { usedAt: 'DESC' },
    });
  }

  // ==========================================
  // DISCOUNT CALCULATION LOGIC (CORE)
  // ==========================================

  async assertPromoCodeExists(code: string, options: IPromoCodeLookupOptions = {}): Promise<PromoCode> {
    const normalizedCode = this.normalizeCode(code);
    const promoCode = await this.promoCodeRepo.findOne({ where: { code: normalizedCode } });

    if (!promoCode) {
      throw new NotFoundException(`Codigo promocional '${normalizedCode}' no encontrado`);
    }

    if (options.requireActive && !promoCode.isActive) {
      throw new BadRequestException('El codigo promocional no esta activo');
    }

    if (options.requireCurrentValidity) {
      const now = new Date();
      if (promoCode.startDate && new Date(promoCode.startDate) > now) {
        throw new BadRequestException('El codigo promocional aun no esta vigente');
      }
      if (promoCode.endDate && new Date(promoCode.endDate) < now) {
        throw new BadRequestException('El codigo promocional ha expirado');
      }
    }

    return promoCode;
  }

  async validatePromoCodeForUserCart(code: string, userId: string): Promise<IPromoCodeValidation> {
    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product', 'items.product.category'],
    });

    if (!cart?.items || cart.items.length === 0) {
      return { valid: false, errors: ['Tu carrito esta vacio'] };
    }

    return await this.validatePromoCode(code, userId, cart.items);
  }

  async getActiveProductDiscount(productId: string): Promise<ProductDiscount | null> {
    const now = new Date();

    const discount = await this.productDiscountRepo
      .createQueryBuilder('d')
      .where('d.product_id = :productId', { productId })
      .andWhere('d.isActive = :isActive', { isActive: true })
      .andWhere('(d.startDate IS NULL OR d.startDate <= :now)', { now })
      .andWhere('(d.endDate IS NULL OR d.endDate >= :now)', { now })
      .getOne();

    return discount;
  }

  async getActiveDiscountsForProducts(productIds: string[]): Promise<Map<string, ProductDiscount>> {
    if (productIds.length === 0) return new Map();

    const now = new Date();

    const discounts = await this.productDiscountRepo
      .createQueryBuilder('d')
      .where('d.product_id IN (:...productIds)', { productIds })
      .andWhere('d.isActive = :isActive', { isActive: true })
      .andWhere('(d.startDate IS NULL OR d.startDate <= :now)', { now })
      .andWhere('(d.endDate IS NULL OR d.endDate >= :now)', { now })
      .getMany();

    const map = new Map<string, ProductDiscount>();
    for (const d of discounts) {
      map.set(d.product_id, d);
    }
    return map;
  }

  calculateDiscountAmount(originalPrice: number, discountType: DiscountType, value: number): number {
    let amount: number;

    if (discountType === DiscountType.PERCENTAGE) {
      amount = originalPrice * (Number(value) / 100);
    } else {
      amount = Number(value);
    }

    return Math.min(Math.round(amount * 100) / 100, originalPrice);
  }

  async validatePromoCode(code: string, userId: string, cartItems: CartItem[]): Promise<IPromoCodeValidation> {
    if (!cartItems || cartItems.length === 0) {
      return { valid: false, errors: ['Tu carrito esta vacio'] };
    }

    const normalizedCode = this.normalizeCode(code);
    const errors: string[] = [];

    const promoCode = await this.promoCodeRepo.findOne({ where: { code: normalizedCode } });

    if (!promoCode) {
      return { valid: false, errors: ['Codigo promocional no encontrado'] };
    }

    if (!promoCode.isActive) {
      return { valid: false, errors: ['Este codigo promocional ya no esta activo'] };
    }

    const now = new Date();

    if (promoCode.startDate && new Date(promoCode.startDate) > now) {
      errors.push('Este codigo promocional aun no esta vigente');
    }

    if (promoCode.endDate && new Date(promoCode.endDate) < now) {
      errors.push('Este codigo promocional ha expirado');
    }

    if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
      errors.push('Este codigo promocional ha alcanzado el limite de usos');
    }

    if (promoCode.maxUsesPerUser !== null) {
      const userUsageCount = await this.promoCodeUsageRepo.count({
        where: { promo_code_id: promoCode.id, user_id: userId },
      });

      if (userUsageCount >= promoCode.maxUsesPerUser) {
        errors.push('Ya has utilizado este codigo el maximo de veces permitido');
      }
    }

    if (promoCode.minOrderAmount !== null) {
      const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
      if (cartTotal < Number(promoCode.minOrderAmount)) {
        errors.push(
          `El monto minimo de compra para este codigo es $${promoCode.minOrderAmount}. Tu carrito: $${cartTotal.toFixed(2)}`,
        );
      }
    }

    let eligibleProductIds: string[] = [];

    if (promoCode.applicableProductIds && promoCode.applicableProductIds.length > 0) {
      eligibleProductIds = cartItems
        .filter((item) => promoCode.applicableProductIds.includes(item.product?.id || ''))
        .map((item) => item.product?.id || '');

      if (eligibleProductIds.length === 0) {
        errors.push('Ningun producto de tu carrito es elegible para este codigo');
      }
    } else if (promoCode.applicableCategoryIds && promoCode.applicableCategoryIds.length > 0) {
      eligibleProductIds = cartItems
        .filter((item) => {
          const categoryId = item.product?.category?.id;
          if (!categoryId) return false;
          return promoCode.applicableCategoryIds.includes(categoryId);
        })
        .map((item) => item.product?.id || '');

      if (eligibleProductIds.length === 0) {
        errors.push('Ningun producto de tu carrito pertenece a una categoria elegible para este codigo');
      }
    } else {
      eligibleProductIds = cartItems.map((item) => item.product?.id || '');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, promoCode, eligibleProductIds };
  }

  async calculateOrderDiscounts(
    cartItems: CartItem[],
    promoCode?: PromoCode,
    eligibleProductIds?: string[],
  ): Promise<IOrderItemDiscount[]> {
    const productIds = cartItems.map((item) => item.product?.id || '').filter(Boolean);
    const activeDiscounts = await this.getActiveDiscountsForProducts(productIds);

    const results: IOrderItemDiscount[] = [];

    for (const cartItem of cartItems) {
      const productId = cartItem.product?.id || '';
      const originalPrice = Number(cartItem.priceAtAddition);

      const adminDiscount = activeDiscounts.get(productId);
      let adminDiscountAmount = 0;
      if (adminDiscount) {
        adminDiscountAmount = this.calculateDiscountAmount(
          originalPrice,
          adminDiscount.discountType,
          adminDiscount.value,
        );
      }

      let codeDiscountAmount = 0;
      const isEligible = !eligibleProductIds || eligibleProductIds.includes(productId);
      if (promoCode && isEligible) {
        codeDiscountAmount = this.calculateDiscountAmount(originalPrice, promoCode.discountType, promoCode.value);
      }

      if (adminDiscountAmount === 0 && codeDiscountAmount === 0) {
        results.push({
          originalUnitPrice: originalPrice,
          discountAmount: 0,
          discountSource: null,
          discountCode: null,
        });
      } else if (adminDiscountAmount >= codeDiscountAmount) {
        results.push({
          originalUnitPrice: originalPrice,
          discountAmount: adminDiscountAmount,
          discountSource: DiscountSource.ADMIN_PRODUCT,
          discountCode: null,
        });
      } else {
        results.push({
          originalUnitPrice: originalPrice,
          discountAmount: codeDiscountAmount,
          discountSource: DiscountSource.CODE,
          discountCode: promoCode.code,
        });
      }
    }

    return results;
  }

  async recordPromoCodeUsage(
    promoCodeId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUsage = await queryRunner.manager.findOne(PromoCodeUsage, {
        where: { promo_code_id: promoCodeId, order_id: orderId },
      });

      if (existingUsage) {
        await queryRunner.commitTransaction();
        return;
      }

      const promoCode = await queryRunner.manager.findOne(PromoCode, {
        where: { id: promoCodeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!promoCode) {
        throw new NotFoundException('Codigo promocional no encontrado');
      }

      promoCode.currentUses += 1;
      await queryRunner.manager.save(PromoCode, promoCode);

      const usage = queryRunner.manager.create(PromoCodeUsage, {
        promo_code_id: promoCodeId,
        user_id: userId,
        order_id: orderId,
        discountAmount,
      });

      await queryRunner.manager.save(PromoCodeUsage, usage);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof QueryFailedError) {
        const driverError = (error as QueryFailedError & { driverError?: { code?: string } }).driverError;
        if (driverError?.code === '23505') {
          this.logger.warn(`Uso de promo ya registrado para order ${orderId}`);
          return;
        }
      }

      this.logger.error('Error registrando uso de codigo promocional:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async registerPromoCodeUsageFromPaidOrder(params: {
    promoCode: string;
    userId: string;
    orderId: string;
    orderItems: IPaidOrderDiscountItem[];
  }): Promise<void> {
    const normalizedCode = this.normalizeCode(params.promoCode);
    const promo = await this.promoCodeRepo.findOne({ where: { code: normalizedCode } });

    if (!promo) {
      this.logger.warn(`No se registro uso de promo porque el codigo '${normalizedCode}' no existe`);
      return;
    }

    const codeDiscountTotal = params.orderItems.reduce((sum, item) => {
      const source = item.discountSource || null;
      const itemCode = this.normalizeCode(item.discountCode || '');
      if (source !== DiscountSource.CODE || itemCode !== promo.code) {
        return sum;
      }

      const discountPerUnit = Number(item.discountAmount) || 0;
      return sum + discountPerUnit * item.quantity;
    }, 0);

    const roundedTotal = Math.round(codeDiscountTotal * 100) / 100;
    if (roundedTotal <= 0) {
      return;
    }

    await this.recordPromoCodeUsage(promo.id, params.userId, params.orderId, roundedTotal);
  }
}
