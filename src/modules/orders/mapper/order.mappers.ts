import { Order } from '../entities/order.entity';
import { IOrder } from '../interfaces/orders.interface';
import { IAddress } from '../../users/interfaces/user.interface';

export class ResponseOrderMapper {
  static toDTO(order: Order): IOrder {
    const shippingAddress: IAddress | null = order.orderDetail.shippingAddressSnapshot
      ? {
          ...order.orderDetail.shippingAddressSnapshot,
          country: order.orderDetail.shippingAddressSnapshot.country || 'Argentina',
        }
      : null;

    const response: IOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
      },
      orderDetail: {
        id: order.orderDetail.id,
        subtotal: Number(order.orderDetail.subtotal),
        tax: Number(order.orderDetail.tax),
        shipping: Number(order.orderDetail.shipping),
        total: Number(order.orderDetail.total),
        shippingAddress,
        shippingAddressId: order.orderDetail.shippingAddressId,
        paymentMethod: order.orderDetail.paymentMethod,
        items: order.orderDetail.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          productSnapshot: item.productSnapshot,
          variantsSnapshot: item.variantsSnapshot,
          createdAt: item.createdAt,
        })),
      },
    };

    if (order.cancellationReason) {
      response.cancellationReason = order.cancellationReason;
    }

    return response;
  }

  static toDTOList(orders: Order[]): IOrder[] {
    return orders.map((order) => this.toDTO(order));
  }
}
