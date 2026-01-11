import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
  Req,
  Query,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { AuthGuard } from 'src/guards/auth.guards';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginatedReviewsDto, Rating, ReviewFiltersDto, ReviewResponse } from './interface/IReview.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthenticatedRequest } from '../users/interface/IUserResponseDto';

@ApiBearerAuth()
@ApiTags('Reviews')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva reseña',
    description: 'Permite a un cliente crear una reseña para un producto',
  })
  @ApiResponse({
    status: 201,
    description: 'Reseña creada exitosamente',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Ya existe una reseña para este producto del usuario',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async create(@Body() dto: CreateReviewDto, @Req() req: AuthenticatedRequest): Promise<ReviewResponse> {
    return await this.reviewService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las reseñas con paginación y filtros',
    description:
      'Retorna todas las reseñas con metadata de paginación, filtros por rating, productId y nombre de usuario (Solo Admin)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Límite por página',
    example: 10,
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    enum: Rating,
    description: 'Filtrar por calificación',
    example: 5,
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: 'string',
    description: 'Filtrar por ID de producto',
  })
  @ApiQuery({
    name: 'userName',
    required: false,
    type: 'string',
    description: 'Buscar por nombre de usuario',
    example: 'Juan',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de reseñas con metadata',
    type: PaginatedReviewsDto,
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getAll(@Query() filters: ReviewFiltersDto): Promise<PaginatedReviewsDto> {
    return await this.reviewService.findAll(filters);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async findOne(@Param('id') id: string): Promise<ReviewResponse> {
    return await this.reviewService.findOne(id);
  }

  @Get('product/:productId/public')
  @ApiOperation({
    summary: 'Obtener reseñas públicas de un producto',
    description: 'Retorna todas las reseñas visibles de un producto (Sin autenticación)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reseñas del producto obtenidas',
    type: [Object],
  })
  async getProductReviewsPublic(@Param('productId') productId: string): Promise<ReviewResponse[]> {
    return await this.reviewService.findByProductPublic(productId);
  }

  @Get('can-review/:productId')
  @ApiOperation({
    summary: 'Verificar si el usuario puede dejar una reseña',
    description: 'Verifica si el usuario ya dejó una reseña para este producto',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de verificación',
    schema: {
      type: 'object',
      properties: {
        canReview: { type: 'boolean' },
        hasReviewed: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @UseGuards(AuthGuard)
  async canUserReview(
    @Param('productId') productId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ canReview: boolean; hasReviewed: boolean; message: string }> {
    return await this.reviewService.canUserReview(productId, req.user.sub);
  }

  @Get('product/:productId')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getProductReviews(@Param('productId') productId: string): Promise<ReviewResponse[]> {
    return await this.reviewService.findByProduct(productId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<void> {
    return await this.reviewService.remove(id, req.user.sub);
  }
}
