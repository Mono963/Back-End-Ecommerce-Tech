import { IProducts } from 'src/modules/products/interface/products.interface';
import { IUserResponse } from '../../users/interfaces/user.interface';

// IWishlistItem representa la estructura de un ítem individual en la lista
export interface IWishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  addedAt: Date;

  // Relaciones (opcionales para evitar profundidad infinita)
  wishlist?: IWishlist;
  product?: IProducts; // Aquí deberías usar la interfaz de Product si la tienes
}

// IWishlist representa la lista de deseos principal
export interface IWishlist {
  id: string;
  user_id: string;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones
  user?: IUserResponse;
  items: IWishlistItem[];
}
