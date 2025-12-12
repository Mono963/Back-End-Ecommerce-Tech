import { Controller, Get, Post, Param, Delete, UseGuards, HttpCode, HttpStatus, Body, Req } from '@nestjs/common';
import { ReviewService } from './review.service';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { AuthGuard } from 'src/guards/auth.guards';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { Review } from './entities/review.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ReviewResponse } from './interface/IReview.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { AuthenticatedRequest } from '../users/interface/IUserResponseDto';

@ApiBearerAuth()
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async create(@Body() dto: CreateReviewDto, @Req() req: AuthenticatedRequest): Promise<ReviewResponse> {
    return await this.reviewService.create(dto, req.user.sub);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getAll(): Promise<Review[]> {
    return await this.reviewService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async findOne(@Param('id') id: string): Promise<ReviewResponse> {
    return await this.reviewService.findOne(id);
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
