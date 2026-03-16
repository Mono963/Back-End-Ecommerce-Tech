import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { RoleSuperAdminByIdDto, RoleSuperAdminDto } from './entities/dto/role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all roles',
    description: 'Returns all system roles',
  })
  @ApiResponse({
    status: 200,
    description: 'List of roles',
    schema: {
      example: [
        { id: 'uuid-1', name: 'CLIENT' },
        { id: 'uuid-2', name: 'ADMIN' },
        { id: 'uuid-3', name: 'SUPER_ADMIN' },
      ],
    },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(): Promise<RoleSuperAdminDto[]> {
    return await this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Returns a single role with full details',
  })
  @ApiResponse({
    status: 200,
    description: 'Role found',
    type: RoleSuperAdminByIdDto,
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findRoleById(@Param('id', ParseUUIDPipe) id: string): Promise<RoleSuperAdminByIdDto> {
    return await this.rolesService.findRoleById(id);
  }

  @Post('seed_roles')
  @ApiOperation({
    summary: 'Run role seeds',
    description: 'Create the 5 system roles if they do not exist',
  })
  @ApiResponse({
    status: 201,
    description: 'Seeds executed successfully',
    schema: {
      example: {
        message: 'Seeds executed successfully',
        roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT'],
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async runSeeds(): Promise<{ message: string; roles: string[] }> {
    return await this.rolesService.runSeeds();
  }
}
