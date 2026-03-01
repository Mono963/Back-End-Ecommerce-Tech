import { Rating } from '../enum/review.enum';

export interface IReview {
  rating: Rating;
  message: string;
  isVisible?: boolean;
  productId: string;
}

export interface IReviewResponsePublic {
  id: string;
  rating: Rating;
  message: string;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
  };
}

export interface IReviewResponseAdmin {
  id: string;
  rating: Rating;
  message: string;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  product?: {
    id: string;
    name: string;
  };
}

export interface ICreateReview {
  productId: string;
  rating: Rating;
  message: string;
}
