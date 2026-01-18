export interface IProductSnapshotDto {
  name: string;
  description: string;
  basePrice: number;
  brand?: string;
  model?: string;
}

export interface IVariantSnapshotDto {
  id: string;
  type: string;
  name: string;
  priceModifier: number;
}

export interface IOrderItemDto {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productSnapshot: IProductSnapshotDto;
  variantsSnapshot: IVariantSnapshotDto[] | null;
  product: {
    id: string;
    name: string;
    brand: string;
    currentPrice: number;
  };
  variants: {
    id: string;
    type: string;
    name: string;
    priceModifier: number;
  }[];
  createdAt: Date;
}

export interface IShippingAddressDto {
  street: string;
  number: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface IShippingAddressInternal {
  street: string;
  number: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}
