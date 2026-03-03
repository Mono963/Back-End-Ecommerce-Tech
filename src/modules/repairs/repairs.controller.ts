import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RepairsService } from './repairs.service';
import { CreateRepairDto, RepairResponseDto, UpdateRepairStatusDto } from './dto/repairs.dto';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { RepairStatus, RepairUrgency } from './enum/repairs.enum';
import { PaginatedRepairsDto, RepairSearchQueryDto } from './dto/paginate.rapair.dto';

@ApiTags('Repairs')
@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Submit a repair request' })
  @ApiResponse({ status: 201, description: 'Repair request submitted successfully' })
  async submitRepairRequest(@Body() dto: CreateRepairDto): Promise<{ message: string; repairId: string }> {
    return await this.repairsService.submitRepairRequest(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all repair requests (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RepairStatus,
    description: 'Filter by repair status',
  })
  @ApiQuery({
    name: 'urgency',
    required: false,
    enum: RepairUrgency,
    description: 'Filter by urgency level',
  })
  @ApiResponse({ status: 200, description: 'Paginated repair requests', type: PaginatedRepairsDto })
  async getAllRepairs(@Query() searchQuery: RepairSearchQueryDto): Promise<PaginatedRepairsDto> {
    return await this.repairsService.getAllRepairs(searchQuery);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get repair request by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Repair request details', type: RepairResponseDto })
  @ApiResponse({ status: 404, description: 'Repair not found' })
  async getRepairById(@Param('id', ParseUUIDPipe) id: string): Promise<RepairResponseDto> {
    return await this.repairsService.getRepairById(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Update repair status (admin)' })
  @ApiResponse({ status: 200, description: 'Repair status updated', type: RepairResponseDto })
  @ApiResponse({ status: 404, description: 'Repair not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateRepairStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRepairStatusDto,
  ): Promise<RepairResponseDto> {
    return await this.repairsService.updateRepairStatus(id, dto);
  }
}
