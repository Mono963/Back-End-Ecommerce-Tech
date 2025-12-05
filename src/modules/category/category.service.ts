import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PRODUCTS_SEED } from '../products/data/products.data';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async preloadCategories(): Promise<{ message: string }> {
    const uniqueCategoryNames = new Set<string>();
    const categoriesToInsert: Category[] = [];

    for (const cat of PRODUCTS_SEED) {
      const name = cat.categoryName;

      if (uniqueCategoryNames.has(name)) continue;
      uniqueCategoryNames.add(name);

      const exists = await this.findByName(name);
      if (!exists) {
        const newCategory = new Category();
        newCategory.categoryName = name;
        categoriesToInsert.push(newCategory);
      }
    }

    if (categoriesToInsert.length > 0) {
      await this.categoryRepo.save(categoriesToInsert);
      return { message: 'Categorías precargadas correctamente' };
    }

    throw new HttpException('Las categorías ya existen', HttpStatus.CONFLICT);
  }

  async getCategories(): Promise<Category[]> {
    return await this.categoryRepo.find({ relations: ['products'] });
  }

  async getCategoriesSeeder(): Promise<Category[]> {
    return await this.categoryRepo.find();
  }

  async findByName(categoryName: string): Promise<Category | null> {
    return await this.categoryRepo.findOneBy({ categoryName });
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const exists = await this.findByName(dto.categoryName);
    if (exists) {
      throw new HttpException(`La categoría "${dto.categoryName}" ya existe`, HttpStatus.CONFLICT);
    }

    const category = this.categoryRepo.create({
      categoryName: dto.categoryName,
    });
    return await this.categoryRepo.save(category);
  }
  async getByIdCategory(id: string): Promise<Category> {
    const exist = await this.categoryRepo.findOneBy({ id });
    if (!exist) {
      throw new Error('La categoria no existe');
    }
    return exist;
  }
}
