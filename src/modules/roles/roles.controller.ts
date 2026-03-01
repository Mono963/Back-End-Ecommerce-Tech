import { Controller, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

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
