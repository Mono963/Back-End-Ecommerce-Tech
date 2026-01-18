import { IProducts } from 'src/modules/products/interface/products.interface';
import { Category } from '../entities/category.entity';

export interface ICategory {
  id: string;
  categoryName: string;
  products?: IProducts[];
}

export class ResponseCategoryDto {
  static toDTO(category: Category): ICategory {
    return {
      id: category.id,
      categoryName: category.categoryName,
      products: category.products?.map((product) => ({
        id: product.id,
        name: product.name, // ✅ Mantener 'name'
        description: product.description,
        brand: product.brand,
        model: product.model,
        basePrice: product.basePrice, // ✅ Mantener 'basePrice'
        baseStock: product.baseStock, // ✅ Mantener 'baseStock'
        imgUrls: product.imgUrls,
        specifications: product.specifications,
        isActive: product.isActive,
        hasVariants: product.hasVariants,
        featured: product.featured,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        category: product.category
          ? {
              id: product.category.id,
              categoryName: product.category.categoryName,
            }
          : null,
        variants:
          product.variants?.map((variant) => ({
            id: variant.id,
            type: variant.type,
            name: variant.name,
            description: variant.description,
            priceModifier: variant.priceModifier,
            stock: variant.stock,
            isAvailable: variant.isAvailable,
            sortOrder: variant.sortOrder,
            createdAt: variant.createdAt,
            updatedAt: variant.updatedAt,
          })) || [],
        reviews:
          product.reviews?.map((review) => ({
            id: review.id,
            rating: review.rating,
            message: review.message,
            createdAt: review.createdAt,
          })) || [],
      })),
    };
  }

  static toDTOList(categories: Category[]): ICategory[] {
    return categories.map((category) => this.toDTO(category));
  }
}
