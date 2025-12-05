import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateVariantDto, ResponseProductDto } from './Dto/products.Dto';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.admin';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { ProductsSearchQueryDto } from './Dto/PaginationQueryDto';
import { PaginatedProductsDto } from './Dto/paginated-products.dto';
import { Product } from './Entities/products.entity';
import { ProductVariant } from './Entities/products_variant.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve all products (paginated) with optional search filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Name to search for products',
  })
  @ApiQuery({
    name: 'price',
    required: false,
    type: Number,
    description: 'Price to search for products',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: PaginatedProductsDto })
  @UseGuards(AuthGuard)
  async getProducts(@Query() searchQuery: ProductsSearchQueryDto): Promise<PaginatedProductsDto> {
    const { items, ...meta } = await this.productsService.getProducts(searchQuery);
    return { ...meta, items };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product by ID with all variants' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(AuthGuard)
  async getProductById(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseProductDto> {
    return await this.productsService.getProductById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product with optional variants' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createProduct(@Body() dto: CreateProductDto): Promise<Product> {
    return await this.productsService.createProduct(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product ID' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ResponseProductDto> {
    return await this.productsService.updateProduct(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete product (mark as inactive)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deactivated successfully' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string): Promise<{ id: string; message: string }> {
    return await this.productsService.deleteProduct(id);
  }

  @Post(':id/variants')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add variant to existing product' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product ID' })
  @ApiBody({ type: CreateVariantDto })
  @ApiResponse({ status: 201, description: 'Variant added successfully' })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async addVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() variantDto: CreateVariantDto,
  ): Promise<ProductVariant> {
    return await this.productsService.addVariantToProduct(productId, variantDto);
  }

  @Put('variants/:variantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async updateVariant(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() updateData: Partial<CreateVariantDto>,
  ): Promise<ProductVariant> {
    return await this.productsService.updateVariant(variantId, updateData);
  }

  @Delete('variants/:variantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove product variant' })
  @ApiParam({ name: 'variantId', type: 'string', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Variant removed successfully' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async removeVariant(@Param('variantId', ParseUUIDPipe) variantId: string): Promise<{ id: string; message: string }> {
    return await this.productsService.removeVariant(variantId);
  }

  @Get(':id/price')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate product price with specific variants' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product ID' })
  @ApiQuery({
    name: 'variants',
    required: false,
    type: 'string',
    description: 'Comma-separated variant IDs',
  })
  @UseGuards(AuthGuard)
  async calculatePrice(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('variants') variants?: string,
  ): Promise<{ productId: string; variantIds: string[]; finalPrice: number }> {
    const variantIds = variants ? variants.split(',') : [];
    const finalPrice = await this.productsService.calculateProductPrice(productId, variantIds);
    return { productId, variantIds, finalPrice };
  }

  @Get(':id/stock')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available stock for product with specific variants' })
  @ApiParam({ name: 'id', type: 'string', description: 'Product ID' })
  @ApiQuery({
    name: 'variants',
    required: false,
    type: 'string',
    description: 'Comma-separated variant IDs',
  })
  @UseGuards(AuthGuard)
  async getStock(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('variants') variants?: string,
  ): Promise<{ productId: string; variantIds: string[]; availableStock: number }> {
    const variantIds = variants ? variants.split(',') : [];
    const availableStock = await this.productsService.getAvailableStock(productId, variantIds);
    return { productId, variantIds, availableStock };
  }

  @Post('seeder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed initial products data' })
  @ApiResponse({ status: 201, description: 'Products seeded successfully' })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async seedProducts(): Promise<{ message: string; total: number }> {
    return await this.productsService.seedProducts();
  }
}
