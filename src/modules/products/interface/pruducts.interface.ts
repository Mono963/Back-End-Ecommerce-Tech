import { TechVariantType } from '../Entities/products_variant.entity';

export interface InterfaceProducts {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
}

export interface ResponseVariantDto {
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
