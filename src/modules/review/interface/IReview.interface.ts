export enum Rating {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

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
