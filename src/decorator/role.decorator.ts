import { SetMetadata, CustomDecorator } from '@nestjs/common';

export enum UserRole {
  SUPER_ADMIN = 'superadmin',
  ADMIN = 'admin',
  USER = 'user',
}

export const Roles = (...roles: UserRole[]): CustomDecorator<string> => SetMetadata('roles', roles);
