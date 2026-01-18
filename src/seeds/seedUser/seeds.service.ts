import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { seedSuperAdmin } from './user.seed';
import { seedRoles } from '../role.seed';

@Injectable()
export class SeedsService implements OnModuleInit {
  private readonly logger = new Logger(SeedsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.runAllSeeds();
  }

  async runAllSeeds(): Promise<void> {
    try {
      this.logger.log('🌱 Iniciando ejecución de seeds...');

      // 1. Primero crear los roles
      this.logger.log('📝 Ejecutando seeds de roles...');
      await seedRoles(this.dataSource);

      // 2. Luego crear el usuario Super Admin
      this.logger.log('👤 Ejecutando seeds de usuario Super Admin...');
      await seedSuperAdmin(this.dataSource);

      this.logger.log('✅ Todos los seeds se ejecutaron correctamente');
    } catch (error) {
      this.logger.error('❌ Error al ejecutar seeds:', error);
      // No lanzamos el error para que la aplicación pueda continuar
    }
  }
}
