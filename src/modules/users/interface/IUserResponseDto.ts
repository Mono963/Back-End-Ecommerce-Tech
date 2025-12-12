import { OrderStatus } from 'src/modules/orders/Entities/order.entity';
import { Users } from '../Entities/users.entity';

export interface IUserResponseDto {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  phone: string;
  address: UserAddress | string;
  username: string;
  createdAt: Date;
  deletedAt: Date | null;
  orders?: IOrderResponseDto[];
  cart?: ICartResponseDto;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

export interface IOrderResponseDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

// User Address Interface agregar en el futuro
export interface UserAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface ICartResponseDto {
  id: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: unknown[];
}

export class ResponseUserDto {
  static toDTO(user: Users): IUserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      birthDate: user.birthDate,
      phone: user.phone,
      address: user.address || '',
      username: user.username,
      role: user.role?.name,
      createdAt: user.createdAt ?? new Date(),
      deletedAt: user.deletedAt,
      orders:
        user.orders?.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          orderDetail: order.orderDetail,
        })) ?? [],
      cart: user.cart
        ? {
            id: user.cart.id,
            total: user.cart.total,
            createdAt: user.cart.createdAt,
            updatedAt: user.cart.updatedAt,
            items: user.cart.items ?? [],
          }
        : undefined,
    };
  }

  static toDTOList(users: Users[]): IUserResponseDto[] {
    return users.map((user) => this.toDTO(user));
  }
}

export interface IUserResponseWithAdmin extends IUserResponseDto {
  role: string;
  password: string;
}

export class ResponseUserWithAdminDto {
  static toDTO(user: Users): IUserResponseWithAdmin {
    return {
      ...ResponseUserDto.toDTO(user),
      role: user.role?.name,
      password: user.password,
    };
  }

  static toDTOList(users: Users[]): IUserResponseWithAdmin[] {
    return users.map((user) => this.toDTO(user));
  }
}
