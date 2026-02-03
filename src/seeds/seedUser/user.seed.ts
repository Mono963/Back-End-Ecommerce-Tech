import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from '../../modules/users/entities/users.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { Logger } from '@nestjs/common';

export async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
  const logger = new Logger('Seed Super Admin');
  const userRepository = dataSource.getRepository(Users);
  const roleRepository = dataSource.getRepository(Role);

  const superAdminRole = await roleRepository.findOne({
    where: { name: 'SUPER_ADMIN' },
  });

  if (!superAdminRole) {
    logger.log('Error: SUPER_ADMIN role does not exist. Run the role seeds first.');
    throw new Error('SUPER_ADMIN role must exist before creating the super admin user');
  }

  const existingSuperAdmin = await userRepository.findOne({
    where: { email: 'superadmin@ecommerce.com' },
  });

  if (existingSuperAdmin) {
    logger.log('Super admin user already exists');
    return;
  }

  if (!process.env.SUPER_ADMIN_PASSWORD) {
    throw new Error('SUPER_ADMIN_PASSWORD must be set');
  }
  const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10);

  const superAdminUser = userRepository.create({
    name: 'Super Administrator',
    email: 'superadmin@ecommerce.com',
    username: 'superadmin',
    password: hashedPassword,
    birthDate: new Date('1990-01-01'),
    phone: '1234567890',
    role: superAdminRole,
  });

  await userRepository.save(superAdminUser);

  logger.log('Super admin user created successfully');
}
