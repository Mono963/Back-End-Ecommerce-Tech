import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Review } from './entities/review.entity';
import { Product } from '../products/Entities/products.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from '../users/Entities/users.entity';
import { ReviewDto, ReviewResponse } from './interface/IReview.interface';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly dataSource: DataSource,
  ) {}
  async create(dto: ReviewDto, userId: string): Promise<ReviewResponse> {
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
      return review;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Review[]> {
    const reviews = await this.reviewRepo.find({
      relations: ['user', 'product'],
    });
    return reviews;
  }

  async findOne(id: string): Promise<ReviewResponse> {
    const reviews = await this.reviewRepo.findOne({
      where: { id },
      relations: ['user', 'product'],
    });
    if (!reviews) {
      throw new NotFoundException(`La Reseña con este '${id}' no fue encontrada`);
    }
    return reviews;
  }

  async findByProduct(productId: string): Promise<Review[]> {
    return await this.reviewRepo.find({
      where: { product: { id: productId }, isVisible: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
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
}
