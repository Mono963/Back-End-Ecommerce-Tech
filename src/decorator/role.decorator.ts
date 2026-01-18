import { SetMetadata, CustomDecorator } from '@nestjs/common';

export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const Roles = (...roles: UserRole[]): CustomDecorator<string> => SetMetadata('roles', roles);
