import { IProducts } from 'src/modules/products/interface/products.interface';

export interface ICategory {
  id: string;
  category_name: string;
  products?: IProducts[];
}

export interface ICreateCategory {
  category_name: string;
}
