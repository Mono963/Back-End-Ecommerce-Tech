import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, ILike } from 'typeorm';
import { Product } from './entities/products.entity';
import { ProductVariant } from './entities/products_variant.entity';
import { CategoriesService } from '../category/category.service';
import { ProductsSearchQueryDto } from './dto/PaginationQueryDto';
import { paginate } from 'src/common/pagination/paginate';
import { CreateProductDto, CreateVariantDto, ResponseProductDto, UpdateProductDto } from './dto/products.Dto';
import { mapToProductDto } from './validate/products.validate';
import { PRODUCTS_SEED } from 'src/seeds/products.data';
import { N8nService } from '../N8N/n8n.service';
import { AiSearchResponse } from '../N8N/interface/n8n.interface';
import { IAiProduct, IAutocompleteResult, IHybridSearchStreamPayload } from './interface/products.interface';
import { EMPTY, Observable } from 'rxjs';
import { IPaginatedResult } from '../../common/pagination';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,

    @Inject(forwardRef(() => CategoriesService))
    private readonly categoriesService: CategoriesService,

    private readonly dataSource: DataSource,

    private readonly n8nService: N8nService,
  ) {}

  async getProducts(searchQuery: ProductsSearchQueryDto): Promise<IPaginatedResult<ResponseProductDto>> {
    const { name, basePrice, minPrice, maxPrice, brand, categoryId, color, featured, ...pagination } = searchQuery;

    const hasFilters: boolean = Boolean(
      name ||
        basePrice ||
        minPrice !== undefined ||
        maxPrice !== undefined ||
        brand ||
        categoryId ||
        color ||
        featured !== undefined,
    );

    if (!hasFilters) {
      const result = await paginate(this.productRepo, pagination, {
        relations: ['category', 'files', 'variants', 'reviews'],
        order: { createdAt: 'DESC' },
        where: { isActive: true },
      });

      return {
        items: result.items.map(mapToProductDto),
        total: result.total,
        pages: result.pages,
      };
    }

    const queryBuilder = this.productRepo.createQueryBuilder('product');
    queryBuilder.leftJoinAndSelect('product.category', 'category');
    queryBuilder.leftJoinAndSelect('product.files', 'files');
    queryBuilder.leftJoinAndSelect('product.variants', 'variants');
    queryBuilder.leftJoinAndSelect('product.reviews', 'review');
    queryBuilder.where('product.isActive = :isActive', { isActive: true });

    if (name) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    if (brand) {
      queryBuilder.andWhere('LOWER(product.brand) LIKE LOWER(:brand)', {
        brand: `%${brand}%`,
      });
    }

    if (categoryId) {
      queryBuilder.andWhere('product.category_id = :categoryId', { categoryId: String(categoryId) });
    }

    if (featured !== undefined) {
      queryBuilder.andWhere('product.featured = :featured', { featured });
    }

    if (color) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = product.id ' +
          "AND pv.type = 'color' AND LOWER(pv.name) LIKE LOWER(:colorName))",
        { colorName: `%${color}%` },
      );
    }

    if (basePrice && (minPrice !== undefined || maxPrice !== undefined)) {
      throw new BadRequestException('Cannot use basePrice with minPrice/maxPrice. Use one or the other.');
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice BETWEEN :minPriceRange AND :maxPriceRange', {
        minPriceRange: Number(minPrice),
        maxPriceRange: Number(maxPrice),
      });
    } else if (minPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice >= :minPriceRange', { minPriceRange: Number(minPrice) });
    } else if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice <= :maxPriceRange', { maxPriceRange: Number(maxPrice) });
    } else if (basePrice) {
      queryBuilder.andWhere(
        '(product.basePrice BETWEEN :basePriceMin AND :basePriceMax OR ' +
          'EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = product.id AND ' +
          '(product.basePrice + pv.priceModifier) BETWEEN :basePriceMin AND :basePriceMax))',
        {
          basePriceMin: basePrice * 0.9,
          basePriceMax: basePrice * 1.1,
        },
      );
    }

    queryBuilder.orderBy('product.createdAt', 'DESC');

    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const pages = Math.ceil(total / pagination.limit);

    return {
      items: items.map(mapToProductDto),
      total,
      pages,
    };
  }

  async getProductById(id: string): Promise<ResponseProductDto> {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
      relations: ['category', 'files', 'variants', 'reviews'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return mapToProductDto(product);
  }

  async createProduct(dto: CreateProductDto): Promise<ResponseProductDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const category = await this.categoriesService.findByName(dto.category_name);
      if (!category) {
        throw new NotFoundException(`Category '${dto.category_name}' not found`);
      }

      const existingProduct = await queryRunner.manager.findOne(Product, {
        where: { name: dto.name },
      });

      if (existingProduct) {
        throw new BadRequestException(`A product with the name '${dto.name}' already exists`);
      }

      if (dto.variants && dto.variants.length > 0) {
        this.validateVariants(dto.variants);
      }

      const productData = {
        name: dto.name,
        description: dto.description,
        brand: dto.brand,
        model: dto.model,
        basePrice: dto.basePrice,
        baseStock: dto.baseStock,
        imgUrls: dto.imgUrls || [],
        featured: dto.featured || false,
        specifications: dto.specifications || {},
        hasVariants: dto.hasVariants || false,
        isActive: true,
        category,
      };

      const product = queryRunner.manager.create(Product, productData);
      const savedProduct = await queryRunner.manager.save(product);

      if (dto.variants && dto.variants.length > 0) {
        const variants = dto.variants.map((variantDto, index) =>
          queryRunner.manager.create(ProductVariant, {
            ...variantDto,
            sortOrder: variantDto.sortOrder ?? index,
            product: savedProduct,
          }),
        );

        await queryRunner.manager.save(ProductVariant, variants);

        savedProduct.hasVariants = true;
        await queryRunner.manager.save(Product, savedProduct);
      }

      await queryRunner.commitTransaction();

      const fullProduct = await this.getProductWithRelations(savedProduct.id);
      return mapToProductDto(fullProduct);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<ResponseProductDto> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    if (dto.name && dto.name !== product.name) {
      const existingProduct = await this.productRepo.findOne({
        where: { name: dto.name },
      });

      if (existingProduct) {
        throw new BadRequestException(`A product with the name '${dto.name}' already exists`);
      }
    }

    if (dto.category_name) {
      const category = await this.categoriesService.findByName(dto.category_name);
      if (!category) {
        throw new NotFoundException(`Category '${dto.category_name}' not found`);
      }
      product.category = category;
    }

    Object.assign(product, {
      name: dto.name ?? product.name,
      description: dto.description ?? product.description,
      brand: dto.brand ?? product.brand,
      model: dto.model ?? product.model,
      basePrice: dto.basePrice ?? product.basePrice,
      baseStock: dto.baseStock ?? product.baseStock,
      imgUrls: dto.imgUrls ?? product.imgUrls,
      featured: dto.featured ?? product.featured,
      specifications: dto.specifications ?? product.specifications,
      hasVariants: dto.hasVariants ?? product.hasVariants,
      isActive: dto.isActive ?? product.isActive,
    });

    const updatedProduct = await this.productRepo.save(product);
    return await this.getProductById(updatedProduct.id);
  }

  async deleteProduct(id: string): Promise<{ id: string; message: string }> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    product.isActive = false;
    await this.productRepo.save(product);

    return {
      id,
      message: 'Product deactivated successfully',
    };
  }

  async addVariantToProduct(productId: string, variantDto: CreateVariantDto): Promise<ProductVariant> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    this.validateUniqueVariant(product, variantDto);

    const variant = this.variantRepo.create({
      ...variantDto,
      isAvailable: variantDto.isAvailable ?? true,
      sortOrder: variantDto.sortOrder ?? product.variants.length,
      product,
    });

    if (!product.hasVariants) {
      product.hasVariants = true;
      await this.productRepo.save(product);
    }

    return await this.variantRepo.save(variant);
  }

  async updateVariant(variantId: string, updateData: Partial<CreateVariantDto>): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product', 'product.variants'],
    });

    if (!variant) {
      throw new NotFoundException(`Variant with id ${variantId} not found`);
    }

    if (updateData.type || updateData.name) {
      const checkDto = {
        type: updateData.type ?? variant.type,
        name: updateData.name ?? variant.name,
      } as CreateVariantDto;

      const otherVariants = variant.product.variants.filter((v) => v.id !== variantId);
      variant.product.variants = otherVariants;

      this.validateUniqueVariant(variant.product, checkDto);
    }

    Object.assign(variant, updateData);
    return await this.variantRepo.save(variant);
  }

  async removeVariant(variantId: string): Promise<{ id: string; message: string }> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });

    if (!variant) {
      throw new NotFoundException(`Variant with id ${variantId} not found`);
    }

    await this.variantRepo.remove(variant);

    const remainingVariants = await this.variantRepo.count({
      where: { product: { id: variant.product.id } },
    });

    if (remainingVariants === 0) {
      variant.product.hasVariants = false;
      await this.productRepo.save(variant.product);
    }

    return {
      id: variantId,
      message: 'Variant deleted successfully',
    };
  }

  async calculateProductPrice(productId: string, variantIds: string[] = []): Promise<number> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    let totalPrice = Number(product.basePrice);

    if (variantIds.length > 0) {
      const variants = await this.variantRepo.find({
        where: {
          id: In(variantIds),
          product: { id: productId },
        },
      });

      if (variants.length !== variantIds.length) {
        throw new BadRequestException('One or more variants do not belong to this product');
      }

      const typesSet = new Set(variants.map((v) => v.type));
      if (typesSet.size !== variants.length) {
        throw new BadRequestException('Multiple variants of the same type cannot be selected');
      }

      totalPrice += variants.reduce((sum, variant) => sum + Number(variant.priceModifier), 0);
    }

    return totalPrice;
  }

  async getAvailableStock(productId: string, variantIds: string[] = []): Promise<number> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    if (!product.hasVariants || !product.variants || product.variants.length === 0) {
      return product.baseStock;
    }

    if (variantIds.length === 0) {
      return product.variants.filter((v) => v.isAvailable).reduce((total, variant) => total + variant.stock, 0);
    }

    const selectedVariants = product.variants.filter((v) => variantIds.includes(v.id) && v.isAvailable);

    if (selectedVariants.length !== variantIds.length) {
      throw new BadRequestException('One or more variants are not available');
    }

    return Math.min(...selectedVariants.map((v) => v.stock));
  }

  async getFeaturedProducts(limit: number = 10): Promise<ResponseProductDto[]> {
    const products = await this.productRepo.find({
      where: {
        featured: true,
        isActive: true,
      },
      relations: ['category', 'variants', 'files', 'reviews'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return products.map(mapToProductDto);
  }

  async getProductsByBrand(brand: string): Promise<ResponseProductDto[]> {
    const products = await this.productRepo.find({
      where: {
        brand: ILike(`%${brand}%`),
        isActive: true,
      },
      relations: ['category', 'variants', 'files', 'reviews'],
      order: { name: 'ASC' },
    });

    return products.map(mapToProductDto);
  }

  private async getProductWithRelations(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'variants', 'files'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  private validateVariants(variants: CreateVariantDto[]): void {
    const variantMap = new Map<string, Set<string>>();

    for (const variant of variants) {
      if (!variantMap.has(variant.type)) {
        variantMap.set(variant.type, new Set());
      }

      const namesForType = variantMap.get(variant.type);
      if (namesForType?.has(variant.name)) {
        throw new BadRequestException(`Duplicate variant: type '${variant.type}' with name '${variant.name}'`);
      } else {
        variantMap.set(variant.type, variantMap.get(variant.type)?.add(variant.name) || new Set([variant.name]));
      }

      namesForType.add(variant.name);
    }
  }

  private validateUniqueVariant(product: Product, variantDto: CreateVariantDto): void {
    const existingVariant = product.variants?.find((v) => v.type === variantDto.type && v.name === variantDto.name);

    if (existingVariant) {
      throw new BadRequestException(
        `A variant of type '${variantDto.type}' with name '${variantDto.name}' already exists`,
      );
    }
  }

  async seedProducts(): Promise<{ message: string; total: number }> {
    const created: Product[] = [];

    const categoriasSeeder = await this.categoriesService.getCategories();
    if (!categoriasSeeder || categoriasSeeder.items.length === 0) {
      return {
        message: 'No categories found. Seed categories first.',
        total: 0,
      };
    }

    if (!PRODUCTS_SEED || PRODUCTS_SEED.length === 0) {
      return {
        message: 'No seed data available',
        total: 0,
      };
    }

    if ((await this.productRepo.count()) > 0) {
      return {
        message: 'La base de datos ya contiene productos',
        total: 0,
      };
    }

    const invalidProducts = PRODUCTS_SEED.filter((p) => !p.category_name || p.category_name.trim() === '');

    if (invalidProducts.length > 0) {
      return {
        message: 'All products must have a valid category name',
        total: 0,
      };
    }

    for (const seedData of PRODUCTS_SEED) {
      try {
        const existing = await this.productRepo.findOneBy({ name: seedData.name });
        if (existing) {
          this.logger.log(`Product ${seedData.name} already exists, skipping...`);
          continue;
        }

        const category = await this.categoriesService.findByName(seedData.category_name);
        if (!category) {
          this.logger.log(`Category ${seedData.category_name} not found for ${seedData.name}`);
          continue;
        }

        const productData = {
          name: seedData.name,
          description: seedData.description,
          brand: seedData.brand,
          model: seedData.model,
          basePrice: seedData.basePrice,
          baseStock: seedData.baseStock,
          imgUrls: seedData.imgUrls || [],
          featured: seedData.featured || false,
          specifications: seedData.specifications || {},
          hasVariants: seedData.hasVariants || false,
          isActive: true,
          category,
        };

        const product = this.productRepo.create(productData);
        const savedProduct = await this.productRepo.save(product);

        if (seedData.variants && seedData.variants.length > 0) {
          const variants = seedData.variants.map((variantData, index) =>
            this.variantRepo.create({
              type: variantData.type,
              name: variantData.name,
              description: variantData.description || '',
              priceModifier: variantData.priceModifier,
              stock: variantData.stock,
              isAvailable: variantData.isAvailable ?? true,
              sortOrder: variantData.sortOrder ?? index,
              product: savedProduct,
            }),
          );

          await this.variantRepo.save(variants);

          savedProduct.hasVariants = true;
          await this.productRepo.save(savedProduct);

          this.logger.log(`Product ${seedData.name} created with ${variants.length} variants`);
        } else {
          this.logger.log(`Product ${seedData.name} created without variants`);
        }

        created.push(savedProduct);
      } catch (error) {
        this.logger.error(`Error creating product ${seedData.name}:`, error);
      }
    }

    return {
      message: `Products seeded successfully. Created: ${created.length}/${PRODUCTS_SEED.length}`,
      total: created.length,
    };
  }

  async getProductsByCategory(categoryId: string): Promise<ResponseProductDto[]> {
    const category = await this.categoriesService.getByIdCategory(categoryId);

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const products = await this.productRepo.find({
      where: {
        category: { id: categoryId },
        isActive: true,
      },
      relations: ['category', 'files', 'variants', 'reviews'],
      order: { createdAt: 'DESC' },
    });

    return products.map(mapToProductDto);
  }

  async searchProducts(query: string, limit: number = 10): Promise<ResponseProductDto[]> {
    if (!query?.trim()) return [];

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    const products = await this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.files', 'files')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.reviews', 'reviews')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(product.name) LIKE :searchTerm OR LOWER(product.brand) LIKE :searchTerm OR LOWER(product.description) LIKE :searchTerm)',
        { searchTerm },
      )
      .orderBy('product.featured', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return products.map(mapToProductDto);
  }

  async autocomplete(query: string, limit: number = 8): Promise<IAutocompleteResult[]> {
    if (!query || query.trim().length < 1) return [];

    const likeTerm = `%${query.trim().toLowerCase()}%`;
    const startsWith = query.trim().toLowerCase();

    const products = await this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select([
        'product.id',
        'product.name',
        'product.brand',
        'product.basePrice',
        'product.imgUrls',
        'product.featured',
        'category.category_name',
      ])
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(product.name) LIKE :likeTerm OR LOWER(product.brand) LIKE :likeTerm OR LOWER(product.description) LIKE :likeTerm)',
        { likeTerm },
      )
      .take(limit)
      .getMany();

    const sorted = products.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(startsWith) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(startsWith) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });

    return sorted.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      basePrice: Number(p.basePrice),
      image: p.imgUrls?.[0] || null,
      category: p.category?.category_name || null,
    }));
  }

  async aiSearch(query: string): Promise<AiSearchResponse> {
    if (!query?.trim() || query.trim().length < 3) {
      return { products: [], message: 'Query is too short' };
    }

    try {
      if (!this.n8nService.isEnabled) {
        return { products: await this.searchProducts(query, 10) };
      }
      return await this.n8nService.productSearch(query.trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`AI search failed: ${message}`);
      return { products: await this.searchProducts(query, 10), fallback: true };
    }
  }

  hybridSearchStream(query: string): Observable<{ data: IHybridSearchStreamPayload }> {
    if (!query || query.trim().length < 2) {
      return EMPTY;
    }
    return new Observable<{ data: IHybridSearchStreamPayload }>((subscriber) => {
      this.autocomplete(query, 8)
        .then((localResults) => {
          subscriber.next({
            data: {
              source: 'local',
              results: localResults,
            },
          });
        })
        .catch(() => {
          // Ignorar errores locales
        });

      this.n8nService
        .productSearch(query)
        .then((aiResponse) => {
          const aiResults: IAutocompleteResult[] = (aiResponse.products as IAiProduct[]).map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            basePrice: Number(p.basePrice),
            image: p.imgUrls?.[0] || null,
            category: p.category_name || null,
          }));

          subscriber.next({
            data: {
              source: 'ai',
              results: aiResults,
              message: aiResponse.message,
            },
          });

          subscriber.complete();
        })
        .catch(() => {
          subscriber.complete();
        });
    });
  }

  async getRelatedProducts(productId: string, limit: number = 6): Promise<ResponseProductDto[]> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const relatedProducts = await this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.files', 'files')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.reviews', 'reviews')
      .where('product.id != :productId', { productId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('(product.category_id = :categoryId OR LOWER(product.brand) = LOWER(:brand))', {
        categoryId: product.category?.id,
        brand: product.brand,
      })
      .orderBy('CASE WHEN product.category_id = :categoryId THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('product.featured', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .setParameter('categoryId', product.category?.id)
      .take(limit)
      .getMany();

    return relatedProducts.map(mapToProductDto);
  }
}
