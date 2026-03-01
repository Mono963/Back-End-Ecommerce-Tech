import { IAddress } from '../../users/interfaces/user.interface';
import { OrderStatus } from '../enum/order.enum';

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

export interface IOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  cancellationReason?: string | null;
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
  limit: number;
  page: number;
}

export interface IOrderDetailResponse {
  id: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  totalDiscount: number;
  promoCodeUsed?: string | null;
  shippingAddress?: IAddress;
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
  originalUnitPrice?: number | null;
  discountAmount?: number;
  discountSource?: string | null;
  discountCode?: string | null;
  productSnapshot: IProductSnapshot;
  variantsSnapshot?: IVariantSnapshot[] | null;
  createdAt: Date;
}

export interface IUpdateOrderStatus {
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export interface IOrdersByStatus {
  pending: number;
  paid: number;
  processing: number;
  shipped: number;
  delivered: number;
}

export interface IRevenue {
  total: number;
  monthly: number;
}

export interface IOrderStats {
  totalOrders: number;
  ordersByStatus: IOrdersByStatus;
  revenue: IRevenue;
  completionRate: string;
}
