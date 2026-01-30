import { Controller, Get, Post, Body, UseGuards, Param, Logger, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CategoriesService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';

import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { PaginatedCategoryDto } from './dto/paginated-users.dto';
import { CategorySearchQueryDto } from './dto/PaginationQueryDto';
import { ResponseCategoryDto } from './interface/category.interface';

@ApiTags('Category')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  private readonly logger = new Logger(CategoriesController.name);

  @ApiOperation({
    summary: 'Retrieve all users (paginated) with optional search filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'OK', type: PaginatedCategoryDto })
  @Get()
  async getUsers(@Query() searchQuery: CategorySearchQueryDto): Promise<PaginatedCategoryDto> {
    const { items, ...meta } = await this.categoriesService.getCategories(searchQuery);
    return { ...meta, items: ResponseCategoryDto.toDTOList(items) };
  }

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @ApiOperation({
    summary: 'Create category',
  })
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.createCategory(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'search category by its ID',
  })
  getById(@Param('id') id: string): Promise<Category> {
    const category = this.categoriesService.getByIdCategory(id);
    return category;
  }

  @ApiBearerAuth()
  @Post('seeder')
  @ApiOperation({
    summary: 'Load the seeds to the database',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async seedCategories(): Promise<{ message: string; data?: Category[] }> {
    return await this.categoriesService.preloadCategories();
  }
}
