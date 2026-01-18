import { ReviewResponse } from 'src/modules/review/interface/IReview.interface';

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
    categoryName: string;
  } | null;
  variants: IProductVariant[];
  reviews: ReviewResponse[];
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
  review: ReviewResponse[];
}

export enum TechVariantType {
  RAM = 'ram',
  STORAGE = 'storage',
  PROCESSOR = 'processor',
  VRAM = 'vram',
  COLOR = 'color',
  CONNECTIVITY = 'connectivity',
  SCREEN_SIZE = 'screen_size',
  RESOLUTION = 'resolution',
  REFRESH_RATE = 'refresh_rate',
  WARRANTY = 'warranty',
  CONDITION = 'condition',
  SWITCH = 'switch',
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
