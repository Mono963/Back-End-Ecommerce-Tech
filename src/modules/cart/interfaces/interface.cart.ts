import { ProductVariant } from 'src/modules/products/Entities/products_variant.entity';

export class ICartItemVariantDTO {
  id: string;
  type: string;
  name: string;
  priceModifier: number;
  stock: number;
  isAvailable: boolean;
}

export class ICartItemResponseDTO {
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
  variants: ICartItemVariantDTO[];
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

export class ICartResponseDTO {
  id: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: ICartItemResponseDTO[];
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

export interface IResponseCartSummaryDTO {
  itemCount: number;
  total: number;
  hasItems: boolean;
}
