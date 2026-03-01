import { IReviewResponsePublic } from '../../review/interface/IReview.interface';
import { TechVariantType } from '../enum/product.enum';

export interface IProductVariant {
  id: string;
  type: TechVariantType;
  name: string;
  description?: string;
  priceModifier: number;
  stock: number;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProducts {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string | null;
  basePrice: number;
  baseStock: number;
  imgUrls: string[];
  specifications?: LaptopSpecs | MouseSpecs | Record<string, unknown>;
  isActive: boolean;
  hasVariants: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    category_name: string;
  } | null;
  variants: IProductVariant[];
  reviews: IReviewResponsePublic[];
}

export interface IProductWhishlist {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  basePrice: number;
  baseStock: number;
  imgUrls: string[];
  featured: boolean;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  review: IReviewResponsePublic[];
}

export type LaptopSpecs = {
  screenSize: string;
  processor: string;
  graphics?: string;
  ram?: string;
  storage?: string;
};

export type MouseSpecs = {
  sensorType: string;
  maxDPI: number;
  wireless?: boolean;
};

export interface IAutocompleteResult {
  id: string;
  name: string;
  brand: string;
  basePrice: number;
  image: string | null;
  category: string | null;
}

export interface IAiProduct {
  id: string;
  name: string;
  brand: string;
  basePrice: number;
  imgUrls?: string[];
  category_name?: string | null;
}

export interface IAutocompleteResult {
  id: string;
  name: string;
  brand: string;
  basePrice: number;
  image: string | null;
  category: string | null;
}

export interface IHybridSearchStreamPayload {
  source: 'local' | 'ai';
  results: IAutocompleteResult[];
  message?: string;
}

export interface ICreateVariant {
  type: TechVariantType;
  name: string;
  description?: string;
  priceModifier: number;
  stock: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface IProductVariantResponse {
  id: string;
  type: TechVariantType;
  name: string;
  description?: string;
  priceModifier: number;
  stock: number;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateProduct {
  name: string;
  description: string;
  brand: string;
  model?: string;
  basePrice: number;
  baseStock: number;
  category_name: string;
  imgUrls?: string[];
  featured?: boolean;
  specifications?: LaptopSpecs | MouseSpecs | Record<string, unknown>;
  hasVariants?: boolean;
  variants?: ICreateVariant[];
}
export interface IUpdateProduct extends Partial<ICreateProduct> {
  isActive?: boolean;
}

export interface IProductResponse {
  id: string;
  name: string;
  description: string;
  brand: string;
  model?: string;
  basePrice: number;
  baseStock: number;
  finalPrice: number;
  originalPrice: number;
  totalStock: number;
  category_name: string;
  imgUrls: string[];
  specifications?: LaptopSpecs | MouseSpecs | Record<string, unknown>;
  hasVariants: boolean;
  isActive: boolean;
  featured: boolean;
  variants: IProductVariantResponse[];
  hasActiveDiscount: boolean;
  discountAmount: number;
  discountPercentage: number | null;
  discountEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
