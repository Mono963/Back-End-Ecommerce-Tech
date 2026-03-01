import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
  Req,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ReviewService } from './review.service';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { AuthGuard } from 'src/guards/auth.guards';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthRequest } from 'src/common/auths/auth-request.interface';
import { ReviewMapper } from './mappers/review.mapper';
import { PaginatedReviewsAdminDto, ReviewSearchQueryDto } from './dto/PaginationQueryDto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseAdminDto, ReviewResponsePublicDto } from './dto/review.response.interface';
import { Rating } from './enum/review.enum';

@ApiBearerAuth()
@ApiTags('Reviews')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new review',
    description: 'Allows a customer to create a review for a product',
  })
  @ApiResponse({
    status: 201,
    description: 'Review successfully created',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'A review for this product already exists for this user',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async create(@Body() dto: CreateReviewDto, @Req() req: AuthRequest): Promise<ReviewResponsePublicDto> {
    return await this.reviewService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Retrieve all reviews (paginated) with optional filters (Admin)',
    description:
      'Returns paginated reviews including isVisible. Allows filtering by rating, productId and username (Admin only)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'rating',
    required: false,
    enum: Rating,
    description: 'Filter by rating',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product ID',
  })
  @ApiQuery({
    name: 'userName',
    required: false,
    type: String,
    description: 'Search by username',
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    type: PaginatedReviewsAdminDto,
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAll(@Query() searchQuery: ReviewSearchQueryDto): Promise<PaginatedReviewsAdminDto> {
    const { items, ...meta } = await this.reviewService.findAll(searchQuery);

    return {
      ...meta,
      items: ReviewMapper.toAdminResponseList(items),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a review by ID',
    description: 'Returns a specific review (without isVisible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Review found',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async findOne(@Param('id') id: string): Promise<ReviewResponsePublicDto> {
    return await this.reviewService.findOne(id);
  }

  @Get('product/:productId/public')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({
    summary: 'Get public reviews for a product',
    description: 'Returns all visible reviews for a product (No authentication, without isVisible)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product reviews retrieved',
    type: [Object],
  })
  async getProductReviewsPublic(@Param('productId') productId: string): Promise<ReviewResponsePublicDto[]> {
    return await this.reviewService.findByProductPublic(productId);
  }

  @Get('can-review/:productId')
  @ApiOperation({
    summary: 'Check if the user can leave a review',
    description: 'Checks whether the user has already submitted a review for this product',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status',
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
    @Req() req: AuthRequest,
  ): Promise<{ canReview: boolean; hasReviewed: boolean; message: string }> {
    return await this.reviewService.canUserReview(productId, req.user.sub);
  }

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get all reviews for a product (Admin)',
    description: 'Returns all reviews for a product INCLUDING isVisible (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product reviews retrieved (includes isVisible)',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getProductReviews(@Param('productId') productId: string): Promise<ReviewResponsePublicDto[]> {
    return await this.reviewService.findByProduct(productId);
  }

  @Patch(':id/visibility')
  @ApiOperation({
    summary: 'Change review visibility (Admin)',
    description: 'Toggles a review visibility (visible / hidden)',
  })
  @ApiResponse({
    status: 200,
    description: 'Visibility successfully updated',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async toggleVisibility(@Param('id') id: string): Promise<ReviewResponseAdminDto> {
    return await this.reviewService.toggleVisibility(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a review',
    description: 'A customer can only delete their own reviews',
  })
  @ApiResponse({
    status: 200,
    description: 'Review successfully deleted',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async remove(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    return await this.reviewService.remove(id, req.user.sub);
  }
}
