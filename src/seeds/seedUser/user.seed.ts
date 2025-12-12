import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from 'src/modules/users/Entities/users.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { Logger } from '@nestjs/common';

export async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
  const logger = new Logger('seed User Admin');
  const userRepository = dataSource.getRepository(Users);
  const roleRepository = dataSource.getRepository(Role);

  const superAdminRole = await roleRepository.findOne({
    where: { name: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    logger.log('L Error: El rol SUPER_ADMIN no existe. Ejecuta primero los seeds de roles.');
    throw new Error('El rol SUPER_ADMIN debe existir antes de crear el usuario super admin');
  }

  const existingSuperAdmin = await userRepository.findOne({
    where: { email: 'superadmin@ecommerce.com' },
  });

  if (existingSuperAdmin) {
    logger.log('� Usuario Super Admin ya existe');
    return;
  }

  if (!process.env.SUPER_ADMIN_PASSWORD) {
    throw new Error('SUPER_ADMIN_PASSWORD must be set');
  }
  const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10);

  const superAdminUser = userRepository.create({
    name: 'Super Administrador',
    email: 'superadmin@ecommerce.com',
    username: 'superadmin',
    password: hashedPassword,
    birthDate: new Date('1990-01-01'),
    phone: '1234567890',
    address: 'Oficina Central',
    role: superAdminRole,
  });

  await userRepository.save(superAdminUser);

  logger.log(' Usuario Super Admin creado exitosamente');
}
