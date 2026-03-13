import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  UseInterceptors,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ProductsService } from './products.service';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { ProductsSearchQueryDto } from './dto/PaginationQueryDto';
import { PaginatedProductsDto } from './dto/paginated-products.dto';
import { ProductVariant } from './entities/products_variant.entity';
import { Observable } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
import { ResponseProductDto } from './dto/product.response.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.create.dto';
import { CreateVariantDto } from './dto/product.variant.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get paginated products with catalog filters',
    description: 'Returns a paginated list of active products with multiple combinable filters for the catalog',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Products per page (max 100)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Search by product name (partial, case-insensitive)',
    example: 'Laptop',
  })
  @ApiQuery({
    name: 'brand',
    required: false,
    type: String,
    description: 'Filter by brand (partial, case-insensitive)',
    example: 'Dell',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filter by category ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'color',
    required: false,
    type: String,
    description: 'Filter by variant color (partial, case-insensitive)',
    example: 'Black',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum product price',
    example: 100,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum product price',
    example: 2000,
  })
  @ApiQuery({
    name: 'basePrice',
    required: false,
    type: Number,
    description: 'Search products in price range (±10%) - Use minPrice/maxPrice for exact ranges',
    example: 1000,
  })
  @ApiQuery({
    name: 'featured',
    required: false,
    type: Boolean,
    description: 'Filter featured products only',
    example: true,
  })
  @ApiQuery({
    name: 'variantType',
    required: false,
    type: String,
    description: 'Filter by variant type (use with variantValue). Values: ram, storage, processor, vram, color, connectivity, screen_size, resolution, refresh_rate, warranty, condition, switch',
    example: 'ram',
  })
  @ApiQuery({
    name: 'variantValue',
    required: false,
    type: String,
    description: 'Filter by variant name/value (use with variantType)',
    example: '16GB',
  })
  @ApiQuery({
    name: 'inStock',
    required: false,
    type: Boolean,
    description: 'Filter only products with available stock',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: PaginatedProductsDto,
  })
  async getProducts(@Query() searchQuery: ProductsSearchQueryDto): Promise<PaginatedProductsDto> {
    const { items, ...meta } = await this.productsService.getProducts(searchQuery);
    return { ...meta, items };
  }

  @Get('featured')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get featured products',
    description: 'Returns a list of products marked as featured',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of products to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Featured products retrieved',
    type: [ResponseProductDto],
  })
  async getFeaturedProducts(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ResponseProductDto[]> {
    return await this.productsService.getFeaturedProducts(limit);
  }

  @Get('brand/:brand')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get products by brand',
    description: 'Returns all products from a specific brand',
  })
  @ApiParam({
    name: 'brand',
    type: 'string',
    description: 'Brand name',
    example: 'Dell',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of products to return',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Brand products retrieved',
    type: [ResponseProductDto],
  })
  async getProductsByBrand(
    @Param('brand') brand: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<ResponseProductDto[]> {
    return await this.productsService.getProductsByBrand(brand, limit);
  }

  @Get('category/:categoryId')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get products by category',
    description: 'Returns all active products from a specific category',
  })
  @ApiParam({
    name: 'categoryId',
    type: 'string',
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Category products retrieved',
    type: [ResponseProductDto],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of products to return',
    example: 20,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async getProductsByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<ResponseProductDto[]> {
    return await this.productsService.getProductsByCategory(categoryId, limit);
  }

  @Sse('search/hybrid')
  @Throttle({ default: { limit: 240, ttl: 60000 } })
  hybridSearch(@Query('q') query: string): Observable<MessageEvent> {
    return this.productsService.hybridSearchStream(query);
  }

  @Get(':id/variants-grouped')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get product variants grouped by type',
    description: 'Returns all available variants for a product, grouped by variant type (e.g. ram, color, storage)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Variants grouped by type',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getVariantsGrouped(@Param('id', ParseUUIDPipe) id: string) {
    return await this.productsService.getVariantsGroupedByType(id);
  }

  @Get(':id/related')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get related products',
    description: 'Returns related products based on category and brand',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of related products',
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: 'Related products retrieved',
    type: [ResponseProductDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getRelatedProducts(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ): Promise<ResponseProductDto[]> {
    return await this.productsService.getRelatedProducts(productId, limit);
  }

  @Get(':id')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get product by ID (Public)',
    description: 'Returns a specific product with all its variants - No authentication required',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ResponseProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductById(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseProductDto> {
    return await this.productsService.getProductById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new product',
    description: 'Creates a new product with optional variants (Admin only)',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ResponseProductDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or duplicate product',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createProduct(@Body() dto: CreateProductDto): Promise<ResponseProductDto> {
    return await this.productsService.createProduct(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product',
    description: 'Updates an existing product (Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ResponseProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ResponseProductDto> {
    return await this.productsService.updateProduct(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate product',
    description: 'Marks a product as inactive (soft delete) - Admin only',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Product deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string): Promise<{ id: string; message: string }> {
    return await this.productsService.deleteProduct(id);
  }

  @Post(':id/variants')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add variant to product',
    description: 'Adds a new variant to an existing product (Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
  })
  @ApiBody({ type: CreateVariantDto })
  @ApiResponse({
    status: 201,
    description: 'Variant added successfully',
    type: ProductVariant,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Duplicate variant',
  })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async addVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() variantDto: CreateVariantDto,
  ): Promise<ProductVariant> {
    return await this.productsService.addVariantToProduct(productId, variantDto);
  }

  @Put('variants/:variantId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product variant',
    description: 'Updates an existing variant (Admin only)',
  })
  @ApiParam({
    name: 'variantId',
    type: 'string',
    description: 'Variant ID',
  })
  @ApiBody({
    type: CreateVariantDto,
    description: 'Partial variant data to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Variant updated successfully',
    type: ProductVariant,
  })
  @ApiResponse({
    status: 404,
    description: 'Variant not found',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipMissingProperties: true,
    }),
  )
  async updateVariant(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() updateData: Partial<CreateVariantDto>,
  ): Promise<ProductVariant> {
    return await this.productsService.updateVariant(variantId, updateData);
  }

  @Delete('variants/:variantId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete product variant',
    description: 'Deletes an existing variant (Admin only)',
  })
  @ApiParam({
    name: 'variantId',
    type: 'string',
    description: 'Variant ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Variant deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Variant not found',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async removeVariant(@Param('variantId', ParseUUIDPipe) variantId: string): Promise<{ id: string; message: string }> {
    return await this.productsService.removeVariant(variantId);
  }

  @Get(':id/price')
  @ApiOperation({
    summary: 'Calculate product price with variants (Public)',
    description: 'Calculates the final product price with selected variants - No authentication required',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
  })
  @ApiQuery({
    name: 'variants',
    required: false,
    type: 'string',
    description: 'Variant IDs separated by commas',
    example: 'uuid1,uuid2,uuid3',
  })
  @ApiResponse({
    status: 200,
    description: 'Price calculated successfully',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        variantIds: { type: 'array', items: { type: 'string' } },
        finalPrice: { type: 'number' },
      },
    },
  })
  async calculatePrice(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('variants') variants?: string,
  ): Promise<{ productId: string; variantIds: string[]; finalPrice: number }> {
    const variantIds = variants ? variants.split(',').filter((id) => id.trim()) : [];
    const priceInfo = await this.productsService.calculateProductPrice(productId, variantIds);
    return { productId, variantIds, finalPrice: priceInfo.finalPrice };
  }

  @Get(':id/stock')
  @ApiOperation({
    summary: 'Get available stock (Public)',
    description: 'Gets the available stock for a product with specific variants - No authentication required',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Product ID',
  })
  @ApiQuery({
    name: 'variants',
    required: false,
    type: 'string',
    description: 'Variant IDs separated by commas',
    example: 'uuid1,uuid2,uuid3',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        variantIds: { type: 'array', items: { type: 'string' } },
        availableStock: { type: 'number' },
      },
    },
  })
  async getStock(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('variants') variants?: string,
  ): Promise<{ productId: string; variantIds: string[]; availableStock: number }> {
    const variantIds = variants ? variants.split(',').filter((id) => id.trim()) : [];
    const availableStock = await this.productsService.getAvailableStock(productId, variantIds);
    return { productId, variantIds, availableStock };
  }

  @Post('seeder')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Load initial products',
    description: 'Loads test products into the database (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Products loaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Products already exist or categories are missing',
  })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async seedProducts(): Promise<{ message: string; total: number }> {
    return await this.productsService.seedProducts();
  }
}
