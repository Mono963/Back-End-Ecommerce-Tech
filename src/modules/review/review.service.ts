import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/products.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from '../users/entities/users.entity';
import { ICreateReview, IReviewResponseAdmin, IReviewResponsePublic } from './interface/IReview.interface';
import { ReviewSearchQueryDto } from './dto/PaginationQueryDto';
import { IPaginatedResult, paginate } from '../../common/pagination';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly dataSource: DataSource,
  ) {}

  private toPublicResponse(review: Review): IReviewResponsePublic {
    return {
      id: review.id,
      rating: review.rating,
      message: review.message,
      createdAt: review.createdAt,
      user: review.user
        ? {
            id: review.user.id,
            name: review.user.name,
          }
        : undefined,
      product: review.product
        ? {
            id: review.product.id,
            name: review.product.name,
          }
        : undefined,
    };
  }

  private toAdminResponse(review: Review): IReviewResponseAdmin {
    return {
      id: review.id,
      rating: review.rating,
      message: review.message,
      isVisible: review.isVisible,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user
        ? {
            id: review.user.id,
            name: review.user.name,
            email: review.user.email,
          }
        : undefined,
      product: review.product
        ? {
            id: review.product.id,
            name: review.product.name,
          }
        : undefined,
    };
  }

  async create(dto: ICreateReview, userId: string): Promise<IReviewResponsePublic> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID '${userId}' was not found`);
      }

      const ProductReview = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId },
      });

      if (!ProductReview) {
        throw new BadRequestException(`Product with ID '${dto.productId}' was not found`);
      }

      const existingReview = await queryRunner.manager.findOne(Review, {
        where: { user: { id: userId }, product: { id: dto.productId } },
      });

      if (existingReview) {
        throw new BadRequestException('You already submitted a review for this product');
      }

      const reviewData: Partial<Review> = {
        rating: dto.rating,
        message: dto.message,
        user,
        product: ProductReview,
      };

      const review = queryRunner.manager.create(Review, reviewData);
      await queryRunner.manager.save(review);
      await queryRunner.commitTransaction();

      return this.toPublicResponse(review);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(searchQuery: ReviewSearchQueryDto): Promise<IPaginatedResult<Review>> {
    const { rating, productId, userName, ...pagination } = searchQuery;

    if (!rating && !productId && !userName) {
      return await paginate(this.reviewRepo, pagination, {
        relations: ['user', 'product'],
        order: { createdAt: 'DESC' },
      });
    }

    const queryBuilder = this.reviewRepo.createQueryBuilder('review');

    queryBuilder.leftJoinAndSelect('review.user', 'user').leftJoinAndSelect('review.product', 'product').where('1 = 1');

    if (rating !== undefined) {
      queryBuilder.andWhere('review.rating = :rating', { rating });
    }

    if (productId) {
      queryBuilder.andWhere('product.id = :productId', { productId });
    }

    if (userName) {
      queryBuilder.andWhere('LOWER(user.name) LIKE LOWER(:userName)', {
        userName: `%${userName}%`,
      });
    }

    queryBuilder.orderBy('review.createdAt', 'DESC');

    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const pages = Math.ceil(total / pagination.limit);

    return {
      items,
      total,
      pages,
    };
  }

  async findOne(id: string): Promise<IReviewResponsePublic> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user', 'product'],
    });
    if (!review) {
      throw new NotFoundException(`Review with id '${id}' was not found`);
    }
    return this.toPublicResponse(review);
  }

  async findByProduct(productId: string, limit: number = 50): Promise<IReviewResponseAdmin[]> {
    const reviews = await this.reviewRepo.find({
      where: { product: { id: productId } },
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return reviews.map((r) => this.toAdminResponse(r));
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }

    if (review.user.id !== userId) {
      throw new BadRequestException('You cannot delete reviews from other users');
    }

    await this.reviewRepo.delete(id);
  }

  async findByProductPublic(productId: string, limit: number = 20): Promise<IReviewResponsePublic[]> {
    const reviews = await this.reviewRepo.find({
      where: {
        product: { id: productId },
        isVisible: true,
      },
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return reviews.map((r) => this.toPublicResponse(r));
  }

  async canUserReview(
    productId: string,
    userId: string,
  ): Promise<{ canReview: boolean; hasReviewed: boolean; message: string }> {
    const existingReview = await this.reviewRepo.findOne({
      where: {
        product: { id: productId },
        user: { id: userId },
      },
    });

    if (existingReview) {
      return {
        canReview: false,
        hasReviewed: true,
        message: 'You have already left a review for this product',
      };
    }

    return {
      canReview: true,
      hasReviewed: false,
      message: 'You can leave a review for this product',
    };
  }

  async toggleVisibility(id: string): Promise<IReviewResponseAdmin> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }

    review.isVisible = !review.isVisible;
    await this.reviewRepo.save(review);

    return this.toAdminResponse(review);
  }
}
