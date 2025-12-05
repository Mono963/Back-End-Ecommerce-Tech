import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  InternalServerErrorException,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CategoriesService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';

import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.admin';
import { Roles, UserRole } from '../../decorator/role.decorator';

@ApiTags('Category')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiBearerAuth()
  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(): Promise<Category[]> {
    return this.categoriesService.getCategories();
  }

  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.createCategory(dto);
  }

  @ApiBearerAuth()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getById(@Param('id') id: string): Promise<Category> {
    const category = this.categoriesService.getByIdCategory(id);
    return category;
  }

  @ApiBearerAuth()
  @Post('seeder')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async seedCategories(): Promise<{ message: string; data?: Category[] }> {
    try {
      return await this.categoriesService.preloadCategories();
    } catch (error) {
      console.error('[CategoriesController:seedCategories] →', error);
      throw new InternalServerErrorException('Error al precargar las categorías');
    }
  }
}
