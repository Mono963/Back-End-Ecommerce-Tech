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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { ProductsSearchQueryDto } from './Dto/PaginationQueryDto';
import { PaginatedProductsDto } from './Dto/paginated-products.dto';
import { ProductVariant } from './Entities/products_variant.entity';
import { CreateProductDto, CreateVariantDto, ResponseProductDto, UpdateProductDto } from './Dto/products.Dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener productos paginados con filtros opcionales',
    description: 'Retorna una lista paginada de productos activos con opciones de búsqueda',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Buscar por nombre de producto',
    example: 'Dell',
  })
  @ApiQuery({
    name: 'brand',
    required: false,
    type: String,
    description: 'Filtrar por marca',
    example: 'Dell',
  })
  @ApiQuery({
    name: 'price',
    required: false,
    type: Number,
    description: 'Buscar productos en rango de precio (±10%)',
    example: 1000,
  })
  @ApiQuery({
    name: 'featured',
    required: false,
    type: Boolean,
    description: 'Filtrar solo productos destacados',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Productos obtenidos exitosamente',
    type: PaginatedProductsDto,
  })
  async getProducts(@Query() searchQuery: ProductsSearchQueryDto): Promise<PaginatedProductsDto> {
    const { items, ...meta } = await this.productsService.getProducts(searchQuery);
    return { ...meta, items };
  }

  @Get('featured')
  @ApiOperation({
    summary: 'Obtener productos destacados',
    description: 'Retorna una lista de productos marcados como destacados',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad máxima de productos a retornar',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Productos destacados obtenidos',
    type: [ResponseProductDto],
  })
  async getFeaturedProducts(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ResponseProductDto[]> {
    return await this.productsService.getFeaturedProducts(limit);
  }

  @Get('brand/:brand')
  @ApiOperation({
    summary: 'Obtener productos por marca',
    description: 'Retorna todos los productos de una marca específica',
  })
  @ApiParam({
    name: 'brand',
    type: 'string',
    description: 'Nombre de la marca',
    example: 'Dell',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos de la marca obtenidos',
    type: [ResponseProductDto],
  })
  async getProductsByBrand(@Param('brand') brand: string): Promise<ResponseProductDto[]> {
    return await this.productsService.getProductsByBrand(brand);
  }

  @Get('category/:categoryId')
  @ApiOperation({
    summary: 'Obtener productos por categoría',
    description: 'Retorna todos los productos activos de una categoría específica',
  })
  @ApiParam({
    name: 'categoryId',
    type: 'string',
    description: 'ID de la categoría',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos de la categoría obtenidos',
    type: [ResponseProductDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  async getProductsByCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string): Promise<ResponseProductDto[]> {
    return await this.productsService.getProductsByCategory(categoryId);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Búsqueda de productos con autocompletado',
    description: 'Busca productos por nombre, marca o descripción con resultados rápidos',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Término de búsqueda',
    example: 'laptop',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Resultados de búsqueda',
    type: [ResponseProductDto],
  })
  async searchProducts(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ResponseProductDto[]> {
    return await this.productsService.searchProducts(query, limit);
  }

  @Get(':id/related')
  @ApiOperation({
    summary: 'Obtener productos relacionados',
    description: 'Retorna productos relacionados basados en categoría y marca',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID del producto',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de productos relacionados',
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: 'Productos relacionados obtenidos',
    type: [ResponseProductDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado',
  })
  async getRelatedProducts(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ): Promise<ResponseProductDto[]> {
    return await this.productsService.getRelatedProducts(productId, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener producto por ID (Público)',
    description: 'Retorna un producto específico con todas sus variantes - No requiere autenticación',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID del producto',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto encontrado',
    type: ResponseProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado',
  })
  async getProductById(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseProductDto> {
    return await this.productsService.getProductById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear nuevo producto',
    description: 'Crea un nuevo producto con variantes opcionales (Solo Admin)',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Producto creado exitosamente',
    type: ResponseProductDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o producto duplicado',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
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
    summary: 'Actualizar producto',
    description: 'Actualiza un producto existente (Solo Admin)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID del producto',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente',
    type: ResponseProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado',
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
    summary: 'Desactivar producto',
    description: 'Marca un producto como inactivo (soft delete) - Solo Admin',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID del producto',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto desactivado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado',
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
    summary: 'Agregar variante a producto',
    description: 'Agrega una nueva variante a un producto existente (Solo Admin)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID del producto',
  })
  @ApiBody({ type: CreateVariantDto })
  @ApiResponse({
    status: 201,
    description: 'Variante agregada exitosamente',
    type: ProductVariant,
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Variante duplicada',
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
    summary: 'Actualizar variante de producto',
    description: 'Actualiza una variante existente (Solo Admin)',
  })
  @ApiParam({
    name: 'variantId',
    type: 'string',
    description: 'ID de la variante',
  })
  @ApiBody({
    type: CreateVariantDto,
    description: 'Datos parciales de la variante a actualizar',
  })
  @ApiResponse({
    status: 200,
    description: 'Variante actualizada exitosamente',
    type: ProductVariant,
  })
  @ApiResponse({
    status: 404,
    description: 'Variante no encontrada',
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
    summary: 'Eliminar variante de producto',
    description: 'Elimina una variante existente (Solo Admin)',
  })
  @ApiParam({
    name: 'variantId',
    type: 'string',
    description: 'ID de la variante',
  })
  @ApiResponse({
    status: 200,
    description: 'Variante eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Variante no encontrada',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async removeVariant(@Param('variantId', ParseUUIDPipe) variantId: string): Promise<{ id: string; message: string }> {
    return await this.productsService.removeVariant(variantId);
  }

  @Get(':id/price')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Calcular precio de producto con variantes',
    description: 'Calcula el precio final del producto con las variantes seleccionadas',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID del producto',
  })
  @ApiQuery({
    name: 'variants',
    required: false,
    type: 'string',
    description: 'IDs de variantes separados por comas',
    example: 'uuid1,uuid2,uuid3',
  })
  @ApiResponse({
    status: 200,
    description: 'Precio calculado exitosamente',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        variantIds: { type: 'array', items: { type: 'string' } },
        finalPrice: { type: 'number' },
      },
    },
  })
  @UseGuards(AuthGuard)
  async calculatePrice(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('variants') variants?: string,
  ): Promise<{ productId: string; variantIds: string[]; finalPrice: number }> {
    const variantIds = variants ? variants.split(',').filter((id) => id.trim()) : [];
    const finalPrice = await this.productsService.calculateProductPrice(productId, variantIds);
    return { productId, variantIds, finalPrice };
  }

  @Get(':id/stock')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener stock disponible',
    description: 'Obtiene el stock disponible para un producto con variantes específicas',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID del producto',
  })
  @ApiQuery({
    name: 'variants',
    required: false,
    type: 'string',
    description: 'IDs de variantes separados por comas',
    example: 'uuid1,uuid2,uuid3',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        variantIds: { type: 'array', items: { type: 'string' } },
        availableStock: { type: 'number' },
      },
    },
  })
  @UseGuards(AuthGuard)
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
    summary: 'Cargar productos iniciales',
    description: 'Carga productos de prueba en la base de datos (Solo Admin)',
  })
  @ApiResponse({
    status: 201,
    description: 'Productos cargados exitosamente',
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
    description: 'Ya existen productos o faltan categorías',
  })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async seedProducts(): Promise<{ message: string; total: number }> {
    return await this.productsService.seedProducts();
  }
}
