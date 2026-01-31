import { OrderStatus } from '../../orders/interfaces/orders.interface';

export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  phone: string;
  address: IUserAddress | string;
  username: string;
  createdAt: Date;
  deletedAt: Date | null;
  orders?: IOrderResponse[];
  wishlistCount?: number;
  cart?: ICartResponse;
  role?: string;
}

export interface IUserAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface IOrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

export interface ICartResponse {
  id: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: unknown[];
}

export interface IUserResponseWithAdmin extends IUserResponse {
  password: string;
}

export interface ICreateAddress {
  label: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface IUpdateAddress {
  label?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

export interface ICreateUser {
  name: string;
  email: string;
  birthDate: string;
  phone?: string;
  address?: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IUpdateUser {
  name?: string;
  email?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export interface ICreateUserDb {
  name: string;
  email: string;
  birthDate: string;
  phone?: string;
  address?: string;
  username: string;
  password: string;
}

export interface IUpdateUserDb {
  name?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  username?: string;
  password?: string;
}

export interface IUpdateRole {
  roleId: string;
}

export interface IResetPassword {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IUpdatePassword {
  currentPassword: string;
  newPassword: string;
}
