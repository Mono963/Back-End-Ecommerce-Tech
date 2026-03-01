import { DiscountSource } from '../enums/discount.enums';
import { PromoCode } from '../entities/promo-code.entity';

export interface IDiscountResult {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  discountSource: DiscountSource | null;
  discountCode: string | null;
  discountPercentage: number | null;
}

export interface IOrderItemDiscount {
  originalUnitPrice: number;
  discountAmount: number;
  discountSource: DiscountSource | null;
  discountCode: string | null;
}

export interface IPromoCodeValidation {
  valid: boolean;
  promoCode?: PromoCode;
  errors?: string[];
  eligibleProductIds?: string[];
}

export interface IPaidOrderDiscountItem {
  quantity: number;
  discountAmount: number;
  discountSource: DiscountSource | null;
  discountCode: string | null;
}

export interface IPromoCodeLookupOptions {
  requireActive?: boolean;
  requireCurrentValidity?: boolean;
}
