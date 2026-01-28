import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/products.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from '../users/entities/users.entity';
import {
  PaginatedReviewsAdminDto,
  ReviewFiltersDto,
  ReviewResponsePublic,
  ReviewResponseAdmin,
} from './interface/IReview.interface';
import { CreateReviewDto } from './dto/create-review.dto';

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

  // ============ FUNCIONES DE MAPEO (Punto 3) ============

  // Mapea una Review a respuesta PÚBLICA (sin isVisible)
  private toPublicResponse(review: Review): ReviewResponsePublic {
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

  // Mapea una Review a respuesta ADMIN (con isVisible)
  private toAdminResponse(review: Review): ReviewResponseAdmin {
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

  // ============ MÉTODOS DEL SERVICIO ============

  async create(dto: CreateReviewDto, userId: string): Promise<ReviewResponsePublic> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`El usuario con el ID '${userId}' no fue encontrado`);
      }

      const ProductReview = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId },
      });

      if (!ProductReview) {
        throw new BadRequestException(`El producto no con el ID '${dto.productId}' no fue encontrado`);
      }

      const existingReview = await queryRunner.manager.findOne(Review, {
        where: { user: { id: userId }, product: { id: dto.productId } },
      });

      if (existingReview) {
        throw new BadRequestException('Ya dejaste un review para este producto');
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

  // GET /review - Solo ADMIN (devuelve isVisible)
  async findAll(filters?: ReviewFiltersDto): Promise<PaginatedReviewsAdminDto> {
    const { rating, productId, userName, page = 1, limit = 10 } = filters || {};

    // Si no hay filtros, usar findAndCount directo
    if (!rating && !productId && !userName) {
      const [reviews, total] = await this.reviewRepo.findAndCount({
        relations: ['user', 'product'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const pages = Math.ceil(total / limit);

      return {
        items: reviews.map((r) => this.toAdminResponse(r)),
        total,
        pages,
      };
    }

    // Si hay filtros, usar QueryBuilder
    const queryBuilder = this.reviewRepo.createQueryBuilder('review');
    queryBuilder.leftJoinAndSelect('review.user', 'user');
    queryBuilder.leftJoinAndSelect('review.product', 'product');

    // Filtrar por rating
    if (rating !== undefined) {
      queryBuilder.andWhere('review.rating = :rating', { rating });
    }

    // Filtrar por productId
    if (productId) {
      queryBuilder.andWhere('product.id = :productId', { productId });
    }

    // Filtrar por nombre de usuario
    if (userName) {
      queryBuilder.andWhere('LOWER(user.name) LIKE LOWER(:userName)', {
        userName: `%${userName}%`,
      });
    }

    queryBuilder.orderBy('review.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [reviews, total] = await queryBuilder.getManyAndCount();
    const pages = Math.ceil(total / limit);

    return {
      items: reviews.map((r) => this.toAdminResponse(r)),
      total,
      pages,
    };
  }

  async findOne(id: string): Promise<ReviewResponsePublic> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user', 'product'],
    });
    if (!review) {
      throw new NotFoundException(`La Reseña con este '${id}' no fue encontrada`);
    }
    return this.toPublicResponse(review);
  }

  // GET /review/product/:productId - Solo ADMIN (devuelve isVisible)
  async findByProduct(productId: string): Promise<ReviewResponseAdmin[]> {
    const reviews = await this.reviewRepo.find({
      where: { product: { id: productId } },
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
    });
    return reviews.map((r) => this.toAdminResponse(r));
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!review) {
      throw new NotFoundException(`Review con id ${id} no encontrada`);
    }

    if (review.user.id !== userId) {
      throw new BadRequestException('No puedes eliminar reviews de otros usuarios');
    }

    await this.reviewRepo.delete(id);
  }

  // GET /review/product/:productId/public - PÚBLICO (sin isVisible, solo visibles)
  async findByProductPublic(productId: string): Promise<ReviewResponsePublic[]> {
    const reviews = await this.reviewRepo.find({
      where: {
        product: { id: productId },
        isVisible: true,
      },
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
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
        message: 'Ya has dejado una reseña para este producto',
      };
    }

    return {
      canReview: true,
      hasReviewed: false,
      message: 'Puedes dejar una reseña para este producto',
    };
  }

  // Método para que el admin cambie la visibilidad
  async toggleVisibility(id: string): Promise<ReviewResponseAdmin> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user', 'product'],
    });

    if (!review) {
      throw new NotFoundException(`Review con id ${id} no encontrada`);
    }

    review.isVisible = !review.isVisible;
    await this.reviewRepo.save(review);

    return this.toAdminResponse(review);
  }
}
