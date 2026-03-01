import { ResponseProductDto } from '../../products/dto/product.response.dto';

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
