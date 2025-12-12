import { Logger } from '@nestjs/common';
import { Role } from 'src/modules/roles/entities/role.entity';
import { DataSource } from 'typeorm';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const logger = new Logger('Role Seed');
  const roleRepository = dataSource.getRepository(Role);

  const roles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Super Administrador con acceso total al sistema de e-commerce',
      permissions: {
        products: ['create', 'read', 'update', 'delete', 'restore'],
        categories: ['create', 'read', 'update', 'delete'],
        orders: ['create', 'read', 'update', 'delete', 'cancel', 'refund'],
        users: ['create', 'read', 'update', 'delete', 'ban', 'unban', 'restore'],
        cart: ['read', 'update', 'delete'],
        roles: ['create', 'read', 'update', 'delete'],
        files: ['upload', 'read', 'delete'],
        payments: ['create', 'read', 'update', 'delete', 'refund'],
        system: ['backup', 'restore', 'logs', 'settings', 'analytics', 'seeds'],
      },
    },
    {
      name: 'ADMIN',
      description: 'Administrador del e-commerce',
      permissions: {
        products: ['create', 'read', 'update', 'delete'],
        categories: ['create', 'read', 'update', 'delete'],
        orders: ['read', 'update', 'cancel'],
        users: ['read', 'update', 'ban', 'unban'],
        cart: ['read', 'update'],
        files: ['upload', 'read', 'delete'],
        payments: ['read', 'refund'],
        system: ['logs', 'analytics'],
      },
    },
    {
      name: 'CLIENT',
      description: 'Cliente del e-commerce',
      permissions: {
        products: ['read'],
        categories: ['read'],
        orders: ['create', 'read', 'cancel'],
        cart: ['create', 'read', 'update', 'delete'],
        files: ['read'],
        profile: ['read', 'update'],
      },
    },
  ];

  for (const roleData of roles) {
    const existingRole = await roleRepository.findOne({
      where: { name: roleData.name },
    });

    if (!existingRole) {
      await roleRepository.save(roleData);
      logger.log(`✅ Rol creado: ${roleData.name}`);
    } else {
      logger.log(`⚠️ Rol ya existe: ${roleData.name}`);
    }
  }
}
