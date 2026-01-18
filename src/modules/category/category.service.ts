import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PRODUCTS_SEED } from 'src/seeds/products.data';
import { CategorySearchQueryDto } from './dto/PaginationQueryDto';
import { IPaginatedResult } from './interface/IPaginatedResult';

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

  async getCategories(query?: CategorySearchQueryDto): Promise<IPaginatedResult<Category>> {
    const { page = 1, limit = 10, category } = query || {};

    const queryBuilder = this.categoryRepo
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.products', 'products')
      .leftJoinAndSelect('products.category', 'productCategory')
      .leftJoinAndSelect('products.variants', 'variants')
      .leftJoinAndSelect('products.reviews', 'reviews')
      .leftJoinAndSelect('reviews.user', 'reviewUser');

    // Filtro por nombre de categoría
    if (category) {
      queryBuilder.andWhere('LOWER(category.categoryName) LIKE LOWER(:category)', {
        category: `%${category}%`,
      });
    }

    // Ordenamiento
    queryBuilder
      .orderBy('category.categoryName', 'ASC')
      .addOrderBy('products.featured', 'DESC')
      .addOrderBy('products.createdAt', 'DESC')
      .addOrderBy('variants.sortOrder', 'ASC');

    // Paginación
    const [categories, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: categories,
      total,
      pages: Math.ceil(total / limit),
    };
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
    const exist = await this.categoryRepo.findOne({ where: { id }, relations: ['products', 'products.variants'] });
    if (!exist) {
      throw new Error('La categoria no existe');
    }
    return exist;
  }
}
