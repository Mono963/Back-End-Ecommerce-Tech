import { IUserAddress } from '../../users/interfaces/user.interface';

export interface IProductSnapshot {
  name: string;
  description: string;
  basePrice: number;
  brand?: string;
  model?: string;
}

export interface IVariantSnapshot {
  id: string;
  type: string;
  name: string;
  priceModifier: number;
}

export interface IOrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productSnapshot: IProductSnapshot;
  variantsSnapshot: IVariantSnapshot[] | null;
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

export interface IShippingAddress {
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

export interface IResponseOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  user: IUserSummary;
  orderDetail: IOrderDetailResponse;
}

export interface IOrderFilters {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  orderNumber?: string;
  userEmail?: string;
  limit?: number;
  page?: number;
}

export interface IOrderDetailResponse {
  id: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress?: IUserAddress | null;
  shippingAddressId?: string | null;
  paymentMethod?: string | null;
  items: IOrderItemResponse[];
}

export interface IUserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface IOrderItemResponse {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productSnapshot: IProductSnapshot;
  variantsSnapshot?: IVariantSnapshot[] | null;
  createdAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}
