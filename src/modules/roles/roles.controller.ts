import { Controller, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('seed_roles')
  @ApiOperation({
    summary: 'Ejecutar seeds de roles',
    description: 'Crea los 5 roles del sistema si no existen',
  })
  @ApiResponse({
    status: 201,
    description: 'Seeds ejecutados exitosamente',
    schema: {
      example: {
        message: 'Seeds ejecutados exitosamente',
        roles: ['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'CLEANER', 'KEY_KEEPER'],
      },
    },
  })
  @ApiBearerAuth()
  async runSeeds(): Promise<{ message: string; roles: string[] }> {
    return await this.rolesService.runSeeds();
  }
}
