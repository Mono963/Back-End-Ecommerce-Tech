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
      this.logger.log('Starting seed execution...');

      this.logger.log('Running role seeds...');
      await seedRoles(this.dataSource);
      this.logger.log('Running super admin user seed...');
      await seedSuperAdmin(this.dataSource);

      this.logger.log('All seeds ran successfully');
    } catch (error) {
      this.logger.error('Error running seeds:', error);
    }
  }
}
