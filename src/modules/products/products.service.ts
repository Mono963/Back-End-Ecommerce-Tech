import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Product } from './Entities/products.entity';
import { ProductVariant } from './Entities/products_variant.entity';
import { CreateProductDto, UpdateProductDto, CreateVariantDto } from './Dto/products.Dto';
import { CategoriesService } from '../category/category.service';
import { mapToProductDto } from './Dto/products.mapper';
import { ProductsSearchQueryDto } from './Dto/PaginationQueryDto';
import { paginate } from 'src/common/pagination/paginate';
import { IPaginatedResultProducts } from './interface/IPaginatedResult';
import { ResponseProductDto } from './interface/pruducts.interface';
import { PRODUCTS_SEED } from './data/products.data';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,

    @Inject(forwardRef(() => CategoriesService))
    private readonly categoriesService: CategoriesService,

    private readonly dataSource: DataSource,
  ) {}

  async getProducts(searchQuery: ProductsSearchQueryDto): Promise<IPaginatedResultProducts<ResponseProductDto>> {
    const { name, price, ...pagination } = searchQuery;

    if (!name && !price) {
      const result = await paginate(this.productRepo, pagination, {
        relations: ['category', 'orderDetails', 'files', 'variants'],
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
    queryBuilder.where('product.isActive = :isActive', { isActive: true });

    if (name) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    if (price) {
      queryBuilder.andWhere(
        '(product.basePrice BETWEEN :minPrice AND :maxPrice OR ' +
          'EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = product.id AND ' +
          '(product.basePrice + pv.priceModifier) BETWEEN :minPrice AND :maxPrice))',
        {
          minPrice: price * 0.9,
          maxPrice: price * 1.1,
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
      relations: ['category', 'orderDetails', 'files', 'variants'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    return mapToProductDto(product);
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
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
        basePrice: dto.basePrice,
        baseStock: dto.baseStock,
        specifications: dto.specifications || {},
        hasVariants: dto.hasVariants || false,
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

        await this.variantRepo.save(variants);
        savedProduct.hasVariants = true;
        await this.productRepo.save(savedProduct);
      }

      await queryRunner.commitTransaction();
      return await this.getProductWithRelations(savedProduct.id);
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
      basePrice: dto.basePrice ?? product.basePrice,
      baseStock: dto.baseStock ?? product.baseStock,
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
      relations: ['variants', 'orderDetails'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    if (product.orderDetails && product.orderDetails.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el producto porque tiene órdenes asociadas. Puede desactivarlo en su lugar.',
      );
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

      const namesForType = variantMap.get(variant.type)!;
      if (namesForType.has(variant.name)) {
        throw new BadRequestException(`Variante duplicada: tipo '${variant.type}' con nombre '${variant.name}'`);
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
    if (!categoriasSeeder || categoriasSeeder.length === 0) {
      return { message: 'No hay categorías. Primero precarga las categorías.', total: 0 };
    }

    if (!PRODUCTS_SEED || PRODUCTS_SEED.length === 0) {
      return { message: 'No hay datos para precargar', total: 0 };
    }

    if ((await this.productRepo.count()) > 0) {
      return { message: 'La base de datos ya contiene productos', total: 0 };
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
          console.log(`Producto ${seedData.name} ya existe, omitiendo...`);
          continue;
        }

        const category = await this.categoriesService.findByName(seedData.categoryName);
        if (!category) {
          console.log(`Categoría ${seedData.categoryName} no encontrada para ${seedData.name}`);
          continue;
        }

        const productData = {
          name: seedData.name,
          description: seedData.description,
          basePrice: seedData.basePrice,
          baseStock: seedData.baseStock,
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

          console.log(`Producto ${seedData.name} creado con ${variants.length} variantes`);
        } else {
          console.log(`Producto ${seedData.name} creado sin variantes`);
        }

        created.push(savedProduct);
      } catch (error) {
        console.error(`Error creando producto ${seedData.name}:`, error);
      }
    }

    return {
      message: `Productos precargados correctamente. Creados: ${created.length}/${PRODUCTS_SEED.length}`,
      total: created.length,
    };
  }
}
