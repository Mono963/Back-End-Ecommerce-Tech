import { IProducts } from 'src/modules/products/interface/products.interface';
import { IUserResponse } from '../../users/interfaces/user.interface';

// IWishlistItem represents the structure of a single list item
export interface IWishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  addedAt: Date;

  // Relations (optional to avoid infinite depth)
  wishlist?: IWishlist;
  product?: IProducts; // Use the Product interface here if you have it
}

// IWishlist represents the main wishlist
export interface IWishlist {
  id: string;
  user_id: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user?: IUserResponse;
  items: IWishlistItem[];
}
