import { ResponseProductDto } from 'src/modules/products/Dto/products.Dto';

export interface N8nProductSearchResponse {
  products: ResponseProductDto[];
  message?: string;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface AiSearchResponse extends N8nProductSearchResponse {
  fallback?: boolean;
}
