import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, ILike } from 'typeorm';
import { Product } from './entities/products.entity';
import { ProductVariant } from './entities/products_variant.entity';
import { CategoriesService } from '../category/category.service';
import { ProductsSearchQueryDto } from './dto/PaginationQueryDto';
import { paginate } from 'src/common/pagination/paginate';
import { IPaginatedResultProducts } from './interface/IPaginatedResult';
import { CreateProductDto, CreateVariantDto, ResponseProductDto, UpdateProductDto } from './dto/products.Dto';
import { mapToProductDto } from './validate/products.validate';
import { PRODUCTS_SEED } from 'src/seeds/products.data';
import { N8nService } from '../N8N/n8n.service';
import { AiSearchResponse } from '../N8N/interface/n8n.interface';
import {
  IAiProduct,
  IAutocompleteResult,
  IHybridSearchResponse,
  IHybridSearchStreamPayload,
} from './interface/products.interface';
import { EMPTY, Observable } from 'rxjs';

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

  async getProducts(searchQuery: ProductsSearchQueryDto): Promise<IPaginatedResultProducts<ResponseProductDto>> {
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
        '(product.basePrice BETWEEN :minPrice AND :maxPrice OR ' +
          'EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = product.id AND ' +
          '(product.basePrice + pv.priceModifier) BETWEEN :minPrice AND :maxPrice))',
        {
          minPrice: basePrice * 0.9,
          maxPrice: basePrice * 1.1,
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
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return mapToProductDto(product);
  }

  async createProduct(dto: CreateProductDto): Promise<ResponseProductDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const category = await this.categoriesService.findByName(dto.categoryName);
      if (!category) {
        throw new NotFoundException(`Categoría '${dto.categoryName}' no encontrada`);
      }

      const existingProduct = await queryRunner.manager.findOne(Product, {
        where: { name: dto.name },
      });

      if (existingProduct) {
        throw new BadRequestException(`Ya existe un producto con el nombre '${dto.name}'`);
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
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    if (dto.name && dto.name !== product.name) {
      const existingProduct = await this.productRepo.findOne({
        where: { name: dto.name },
      });

      if (existingProduct) {
        throw new BadRequestException(`Ya existe un producto con el nombre '${dto.name}'`);
      }
    }

    if (dto.categoryName) {
      const category = await this.categoriesService.findByName(dto.categoryName);
      if (!category) {
        throw new NotFoundException(`Categoría '${dto.categoryName}' no encontrada`);
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
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    product.isActive = false;
    await this.productRepo.save(product);

    return {
      id,
      message: 'Producto desactivado correctamente',
    };
  }

  async addVariantToProduct(productId: string, variantDto: CreateVariantDto): Promise<ProductVariant> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
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
      throw new NotFoundException(`Variante con id ${variantId} no encontrada`);
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
      throw new NotFoundException(`Variante con id ${variantId} no encontrada`);
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
      message: 'Variante eliminada correctamente',
    };
  }

  async calculateProductPrice(productId: string, variantIds: string[] = []): Promise<number> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
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
        throw new BadRequestException('Una o más variantes no pertenecen a este producto');
      }

      const typesSet = new Set(variants.map((v) => v.type));
      if (typesSet.size !== variants.length) {
        throw new BadRequestException('No se pueden seleccionar múltiples variantes del mismo tipo');
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
      throw new NotFoundException(`Producto con id ${productId} no encontrado`);
    }

    if (!product.hasVariants || !product.variants || product.variants.length === 0) {
      return product.baseStock;
    }

    if (variantIds.length === 0) {
      return product.variants.filter((v) => v.isAvailable).reduce((total, variant) => total + variant.stock, 0);
    }

    const selectedVariants = product.variants.filter((v) => variantIds.includes(v.id) && v.isAvailable);

    if (selectedVariants.length !== variantIds.length) {
      throw new BadRequestException('Una o más variantes no están disponibles');
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
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
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
        throw new BadRequestException(`Variante duplicada: tipo '${variant.type}' con nombre '${variant.name}'`);
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
        `Ya existe una variante de tipo '${variantDto.type}' con nombre '${variantDto.name}'`,
      );
    }
  }

  async seedProducts(): Promise<{ message: string; total: number }> {
    const created: Product[] = [];

    const categoriasSeeder = await this.categoriesService.getCategories();
    if (!categoriasSeeder || categoriasSeeder.items.length === 0) {
      return {
        message: 'No hay categorías. Primero precarga las categorías.',
        total: 0,
      };
    }

    if (!PRODUCTS_SEED || PRODUCTS_SEED.length === 0) {
      return {
        message: 'No hay datos para precargar',
        total: 0,
      };
    }

    if ((await this.productRepo.count()) > 0) {
      return {
        message: 'La base de datos ya contiene productos',
        total: 0,
      };
    }

    const invalidProducts = PRODUCTS_SEED.filter((p) => !p.categoryName || p.categoryName.trim() === '');

    if (invalidProducts.length > 0) {
      return {
        message: 'Todos los productos deben tener un nombre de categoría válido',
        total: 0,
      };
    }

    for (const seedData of PRODUCTS_SEED) {
      try {
        const existing = await this.productRepo.findOneBy({ name: seedData.name });
        if (existing) {
          this.logger.log(`Producto ${seedData.name} ya existe, omitiendo...`);
          continue;
        }

        const category = await this.categoriesService.findByName(seedData.categoryName);
        if (!category) {
          this.logger.log(`Categoría ${seedData.categoryName} no encontrada para ${seedData.name}`);
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

          this.logger.log(`Producto ${seedData.name} creado con ${variants.length} variantes`);
        } else {
          this.logger.log(`Producto ${seedData.name} creado sin variantes`);
        }

        created.push(savedProduct);
      } catch (error) {
        this.logger.error(`Error creando producto ${seedData.name}:`, error);
      }
    }

    return {
      message: `Productos precargados correctamente. Creados: ${created.length}/${PRODUCTS_SEED.length}`,
      total: created.length,
    };
  }

  async getProductsByCategory(categoryId: string): Promise<ResponseProductDto[]> {
    const category = await this.categoriesService.getByIdCategory(categoryId);

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${categoryId} no encontrada`);
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

  /**
   * Búsqueda local simple
   */
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

  /**
   * Autocomplete optimizado: startsWith + contains en un solo query
   */
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
        'category.categoryName',
      ])
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(product.name) LIKE :likeTerm OR LOWER(product.brand) LIKE :likeTerm OR LOWER(product.description) LIKE :likeTerm)',
        { likeTerm },
      )
      .take(limit)
      .getMany();

    // Orden en memoria: primero startsWith, luego featured
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
      category: p.category?.categoryName || null,
    }));
  }

  /**
   * Búsqueda vía AI (n8n) con fallback local
   */
  async aiSearch(query: string): Promise<AiSearchResponse> {
    if (!query?.trim() || query.trim().length < 3) {
      return { products: [], message: 'Consulta muy corta' };
    }

    try {
      if (!this.n8nService.isEnabled) {
        return { products: await this.searchProducts(query, 10) };
      }
      return await this.n8nService.productSearch(query.trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`AI search failed: ${message}`);
      return { products: await this.searchProducts(query, 10), fallback: true };
    }
  }

  /**
   * Búsqueda híbrida: local + AI
   */
  async hybridSearch(query: string, useAi: boolean = false, limit: number = 8): Promise<IHybridSearchResponse> {
    // 🔒 Anti-spam REAL
    if (!query || query.trim().length < 2) {
      return { results: [], source: 'local' };
    }

    const localResults = await this.autocomplete(query, limit);

    if (!useAi || !this.n8nService.isEnabled || query.trim().length < 3) {
      return { results: localResults, source: 'local' };
    }

    try {
      const aiResponse = await this.n8nService.productSearch(query.trim());

      const aiResults: IAutocompleteResult[] = (aiResponse.products as IAiProduct[]).map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        basePrice: Number(p.basePrice),
        image: p.imgUrls?.[0] || null,
        category: p.category_name || null,
      }));

      return {
        results: localResults,
        aiResults,
        aiMessage: aiResponse.message,
        source: 'hybrid',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`Hybrid AI search failed: ${message}`);
      return { results: localResults, source: 'local' };
    }
  }

  hybridSearchStream(query: string): Observable<{ data: IHybridSearchStreamPayload }> {
    if (!query || query.trim().length < 2) {
      return EMPTY;
    }
    return new Observable<{ data: IHybridSearchStreamPayload }>((subscriber) => {
      // 🔹 BÚSQUEDA LOCAL (rápida)
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
          // opcional: no rompemos el stream
        });

      // 🔹 BÚSQUEDA AI (lenta)
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
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
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
