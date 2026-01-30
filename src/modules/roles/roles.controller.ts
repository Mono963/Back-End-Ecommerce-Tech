import { Controller, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
  async runSeeds(): Promise<{ message: string; roles: string[] }> {
    return await this.rolesService.runSeeds();
  }
}
