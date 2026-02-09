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
