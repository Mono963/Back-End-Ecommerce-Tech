import { Category } from '../entities/category.entity';
import { ICategory } from '../interface/category.interface';

export class ResponseCategoryDto {
  static toDTO(category: Category): ICategory {
    return {
      id: category.id,
      category_name: category.category_name,
      products: category.products?.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        model: product.model,
        basePrice: product.basePrice,
        baseStock: product.baseStock,
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
              category_name: product.category.category_name,
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
