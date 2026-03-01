import { ProductVariant } from '../../products/entities/products_variant.entity';

export interface ICartItemVariant {
  id: string;
  type: string;
  name: string;
  priceModifier: number;
  stock: number;
  isAvailable: boolean;
}

export interface ICartItemResponse {
  id: string;
  quantity: number;
  priceAtAddition: number;
  subtotal: number;
  addedAt: Date;
  selectedVariants:
    | {
        id: string;
        type: string;
        name: string;
        priceModifier: number;
      }[]
    | null;
  variants: ICartItemVariant[];
  product: {
    id: string;
    name: string;
    description: string;
    brand: string;
    model: string;
    basePrice: number;
    baseStock: number;
    imgUrls: string[];
    hasVariants: boolean;
    isActive: boolean;
    category: {
      id: string;
      category_name: string;
    } | null;
  };
}

export interface ICartResponse {
  id: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: ICartItemResponse[];
  itemCount: number;
}

export interface IStockValidationIssue {
  itemId: string;
  productId: string;
  productName: string;
  issue: string;
  requested: number;
  available: number;
}

export interface IStockValidationResult {
  valid: boolean;
  issues: IStockValidationIssue[];
}

export interface IVariantValidationResult {
  selectedVariants: ProductVariant[];
  variantsSnapshot: Array<{
    id: string;
    type: string;
    name: string;
    priceModifier: number;
  }>;
}

export interface IResponseCartSummary {
  itemCount: number;
  total: number;
  hasItems: boolean;
}

export interface ICartDiscountPreviewItem {
  productId: string;
  quantity: number;
  originalUnitPrice: number;
  discountAmount: number;
  discountSource: string | null;
  discountCode: string | null;
  finalUnitPrice: number;
  subtotal: number;
}

export interface ICartDiscountPreview {
  subtotalOriginal: number;
  subtotalWithDiscount: number;
  totalDiscount: number;
  tax: number;
  shipping: number;
  total: number;
  promoValid: boolean;
  promoErrors: string[];
  items: ICartDiscountPreviewItem[];
}

export interface IAddToCart {
  productId: string;
  quantity: number;
  variantIds?: string[];
}

export interface IUpdateCartItem {
  quantity: number;
}
