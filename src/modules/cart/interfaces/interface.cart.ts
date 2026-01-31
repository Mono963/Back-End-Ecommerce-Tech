import { ProductVariant } from '../../products/entities/products_variant.entity';

export class ICartItemVariant {
  id: string;
  type: string;
  name: string;
  priceModifier: number;
  stock: number;
  isAvailable: boolean;
}

export class ICartItemResponse {
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
      name: string;
    } | null;
  };
}

export class ICartResponse {
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
