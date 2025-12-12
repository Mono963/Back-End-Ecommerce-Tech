import { Controller, Get, Post, Body, UseGuards, Param, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CategoriesService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';

import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';

@ApiTags('Category')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  private readonly logger = new Logger(CategoriesController.name);

  @Get()
  getAll(): Promise<Category[]> {
    return this.categoriesService.getCategories();
  }

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.createCategory(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<Category> {
    const category = this.categoriesService.getByIdCategory(id);
    return category;
  }

  @ApiBearerAuth()
  @Post('seeder')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async seedCategories(): Promise<{ message: string; data?: Category[] }> {
    return await this.categoriesService.preloadCategories();
  }
}
