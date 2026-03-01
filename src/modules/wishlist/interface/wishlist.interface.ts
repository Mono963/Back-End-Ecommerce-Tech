import { IProducts } from 'src/modules/products/interface/products.interface';
import { IUserResponse } from '../../users/interfaces/user.interface';

export interface IWishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  addedAt: Date;

  wishlist?: IWishlist;
  product?: IProducts;
}

export interface IWishlist {
  id: string;
  user_id: string;
  createdAt: Date;
  updatedAt: Date;

  user?: IUserResponse;
  items: IWishlistItem[];
}

export interface IAddToWishlist {
  productId: string;
}

export interface IWishlistProductCategory {
  id: string;
  name: string;
}

export interface IWishlistProduct {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  basePrice: number;
  baseStock: number;
  imgUrls: string[];
  featured: boolean;
  isActive: boolean;
  category: IWishlistProductCategory | null;
}

export interface IWishlistItemResponse {
  id: string;
  addedAt: Date;
  product: IWishlistProduct;
}

export interface IWishlistResponse {
  id: string;
  items: IWishlistItemResponse[];
  totalItems: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWishlistSummary {
  itemCount: number;
}
