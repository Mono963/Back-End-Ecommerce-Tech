export enum Rating {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

export interface ReviewDto {
  rating: Rating;
  message: string;
  productId: string;
}

export interface ReviewResponse {
  id: string;
  rating: Rating;
  message: string;
}
