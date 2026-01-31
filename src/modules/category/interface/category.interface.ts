import { IProducts } from 'src/modules/products/interface/products.interface';

export interface ICategory {
  id: string;
  categoryName: string;
  products?: IProducts[];
}

export interface ICreateCategory {
  categoryName: string;
}
