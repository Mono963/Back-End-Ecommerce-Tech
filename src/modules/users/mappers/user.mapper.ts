import { IUserResponse, IUserResponseWithAdmin, UserWithDetails } from '../interfaces/user.interface';

export class UserMapper {
  static toResponse(user: UserWithDetails): IUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      birthDate: user.birthDate,
      phone: user.phone,
      username: user.username,
      role: user.role?.name,
      createdAt: user.createdAt ?? new Date(),
      deletedAt: user.deletedAt,
      address:
        user.addresses?.map((address) => ({
          id: address.id,
          label: address.label,
          street: address.street,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
          country: address.country,
          isDefault: address.isDefault,
        })) ?? [],
      orders:
        user.orders?.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
        })) ?? [],
      wishlistCount: user.wishlistCount ?? 0,
      cart: user.cart
        ? {
            id: user.cart.id,
            total: user.cart.total,
            createdAt: user.cart.createdAt,
            updatedAt: user.cart.updatedAt,
            items: user.cart.items ?? [],
            itemCount: user.cart.item_count,
          }
        : undefined,
    };
  }

  static toResponseList(users: UserWithDetails[]): IUserResponse[] {
    return users.map((user) => this.toResponse(user));
  }

  static toAdminResponse(user: UserWithDetails): IUserResponseWithAdmin {
    return {
      ...this.toResponse(user),
      role: user.role?.name ?? '',
    };
  }

  static toAdminResponseList(users: UserWithDetails[]): IUserResponseWithAdmin[] {
    return users.map((user) => this.toAdminResponse(user));
  }
}
