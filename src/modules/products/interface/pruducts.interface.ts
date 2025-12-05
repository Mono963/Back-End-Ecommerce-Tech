import { VariantType } from '../Entities/products_variant.entity';

export interface InterfaceProducts {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
}

export class ResponseVariantDto {
  id: string;
  type: VariantType;
  name: string;
  description?: string;
  priceModifier: number;
  stock: number;
  isAvailable: boolean;
  sortOrder: number;
}

export class ResponseProductDto {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  baseStock: number;
  finalPrice: number;
  totalStock: number;
  category_name: string;
  imgUrls: string[];
  specifications?: Record<string, null>;
  hasVariants: boolean;
  isActive: boolean;
  variants: ResponseVariantDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InterfaceProducts {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
}
