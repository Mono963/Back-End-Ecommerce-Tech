import { Product } from '../entities/products.entity';
import { ProductVariant } from '../entities/products_variant.entity';
import { ResponseProductDto, ResponseVariantDto } from '../dto/products.Dto';

export function mapVariantToDto(variant: ProductVariant): ResponseVariantDto {
  return {
    id: variant.id,
    type: variant.type,
    name: variant.name,
    description: variant.description || undefined,
    priceModifier: Number(variant.priceModifier),
    stock: variant.stock,
    isAvailable: variant.isAvailable,
    sortOrder: variant.sortOrder,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  };
}

export function mapToProductDto(product: Product): ResponseProductDto {
  const calculateFinalPrice = (): number => {
    if (!product.hasVariants || !product.variants?.length) {
      return Number(product.basePrice);
    }

    const availableVariants = product.variants.filter((v) => v.isAvailable && v.stock > 0);

    if (availableVariants.length === 0) {
      return Number(product.basePrice);
    }

    const cheapestVariant = availableVariants.reduce(
      (min, current) => (Number(current.priceModifier) < Number(min.priceModifier) ? current : min),
      availableVariants[0],
    );

    return Number(product.basePrice) + Number(cheapestVariant.priceModifier);
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
      const fileUrls = product.files.filter((file) => file.url).map((file) => file.url);
      urls.push(...fileUrls);
    }

    return [...new Set(urls)];
  };

  const getSortedVariants = (): ResponseVariantDto[] => {
    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    return product.variants.sort((a, b) => a.sortOrder - b.sortOrder).map(mapVariantToDto);
  };

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    model: product.model || undefined,
    basePrice: Number(product.basePrice),
    baseStock: product.baseStock,
    finalPrice: calculateFinalPrice(),
    totalStock: calculateTotalStock(),
    category_name: product.category?.category_name ?? '',
    imgUrls: getAllImageUrls(),
    specifications: product.specifications || {},
    hasVariants: product.hasVariants,
    isActive: product.isActive,
    featured: product.featured,
    variants: getSortedVariants(),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function mapProductListToDto(products: Product[]): ResponseProductDto[] {
  return products.map(mapToProductDto);
}

export function getProductStats(product: Product): {
  totalVariants: number;
  availableVariants: number;
  priceRange: { min: number; max: number };
  outOfStockVariants: number;
} {
  if (!product.variants || product.variants.length === 0) {
    return {
      totalVariants: 0,
      availableVariants: 0,
      priceRange: {
        min: Number(product.basePrice),
        max: Number(product.basePrice),
      },
      outOfStockVariants: 0,
    };
  }

  const availableVariants = product.variants.filter((v) => v.isAvailable);
  const outOfStockVariants = product.variants.filter((v) => v.stock === 0);

  const prices = product.variants.map((v) => Number(product.basePrice) + Number(v.priceModifier));

  return {
    totalVariants: product.variants.length,
    availableVariants: availableVariants.length,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
    },
    outOfStockVariants: outOfStockVariants.length,
  };
}
