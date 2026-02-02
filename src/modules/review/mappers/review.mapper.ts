import { Review } from '../entities/review.entity';
import { IReviewResponseAdmin, IReviewResponsePublic } from '../interface/IReview.interface';

export class ReviewMapper {
  static toPublicResponse(review: Review): IReviewResponsePublic {
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

  static toPublicResponseList(reviews: Review[]): IReviewResponsePublic[] {
    return reviews.map((review) => this.toPublicResponse(review));
  }

  static toAdminResponse(review: Review): IReviewResponseAdmin {
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

  static toAdminResponseList(reviews: Review[]): IReviewResponseAdmin[] {
    return reviews.map((review) => this.toAdminResponse(review));
  }
}
