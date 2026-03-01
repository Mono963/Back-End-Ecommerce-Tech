import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { OrdersService } from './orders.service';
import { UsersService } from '../users/users.service';
import { DiscountsService } from '../discounts/discounts.service';
import { ICreateAddress, IAddress } from '../users/interfaces/user.interface';
import { IOrder } from './interfaces/orders.interface';
import { ICartDiscountPreview, ICartDiscountPreviewItem } from '../cart/interfaces/interface.cart';
import { roundMoney } from '../../common/utils/money.utils';

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(forwardRef(() => CartService))
    private readonly cartService: CartService,

    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly discountsService: DiscountsService,
  ) {}

  async createOrderFromCartCheckout(
    userId: string,
    shippingAddress: ICreateAddress,
    promoCode?: string,
  ): Promise<IOrder> {
    const stockValidation = await this.cartService.validateCartStock(userId);

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
    const cart = await this.cartService.getOrCreateCart(userId);

    if (!cart.items || cart.items.length === 0) {
      return {
        subtotalOriginal: 0,
        subtotalWithDiscount: 0,
        totalDiscount: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        promoValid: false,
        promoErrors: ['Your cart is empty'],
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
}
