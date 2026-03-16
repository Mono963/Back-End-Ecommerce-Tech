import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { DataSource, Repository } from 'typeorm';
import { seedRoles } from 'src/seeds/role.seed';
import { iRoleSuperAdmin, IRoleSuperAdminById } from './entities/interface/role.interface';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<iRoleSuperAdmin[]> {
    return await this.roleRepository.find({ select: ['id', 'name'] });
  }

  async findRoleById(roleId: string): Promise<IRoleSuperAdminById> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found`);
    }
    return role;
  }

  async runSeeds(): Promise<{ message: string; roles: string[] }> {
    this.logger.log('Running role seeds...');

    try {
      await seedRoles(this.dataSource);

      const roles = await this.roleRepository.find({
        select: ['name', 'description'],
      });

      this.logger.log('Seeds executed successfully');

      return {
        message: 'Seeds executed successfully',
        roles: roles.map((r) => r.name),
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);

      this.logger.error(`Error running seeds: ${message}`);
      throw new Error(`Error running seeds: ${message}`);
    }
  }
}
