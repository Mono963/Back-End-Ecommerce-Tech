import { Product } from '../Entities/products.entity';
import { ProductVariant } from '../Entities/products_variant.entity';
import { ResponseProductDto, ResponseVariantDto } from '../interface/pruducts.interface';

export function mapVariantToDto(variant: ProductVariant): ResponseVariantDto {
  return {
    id: variant.id,
    type: variant.type,
    name: variant.name,
    description: variant.description,
    priceModifier: Number(variant.priceModifier),
    stock: variant.stock,
    isAvailable: variant.isAvailable,
    sortOrder: variant.sortOrder,
  };
}

export function mapToProductDto(product: Product): ResponseProductDto {
  const calculateFinalPrice = (): number => {
    if (!product.hasVariants || !product.variants?.length) {
      return Number(product.basePrice);
    }

    const cheapestVariant = product.variants
      .filter((v) => v.isAvailable && v.stock > 0)
      .reduce((min, current) => (current.priceModifier < min.priceModifier ? current : min), product.variants[0]);

    return Number(product.basePrice) + Number(cheapestVariant?.priceModifier || 0);
  };

  const calculateTotalStock = (): number => {
    if (!product.hasVariants || !product.variants?.length) {
      return product.baseStock;
    }

    return product.variants.filter((v) => v.isAvailable).reduce((total, variant) => total + variant.stock, 0);
  };

  const getAllImageUrls = (): string[] => {
    const urls: string[] = [];

    if (product.imgUrls && product.imgUrls.length > 0) {
      urls.push(...product.imgUrls);
    }

    if (product.files && product.files.length > 0) {
      const fileUrls = product.files.map((file) => file.url);
      urls.push(...fileUrls);
    }

    return [...new Set(urls)];
  };

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    basePrice: Number(product.basePrice),
    baseStock: product.baseStock,
    finalPrice: calculateFinalPrice(),
    totalStock: calculateTotalStock(),
    category_name: product.category?.categoryName ?? '',
    imgUrls: getAllImageUrls(),
    specifications: product.specifications || {},
    hasVariants: product.hasVariants,
    isActive: product.isActive,
    variants: product.variants?.map(mapVariantToDto) || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
