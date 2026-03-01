import { Product } from '../entities/products.entity';
import { ProductVariant } from '../entities/products_variant.entity';
import { ProductDiscount } from '../../discounts/entities/product-discount.entity';
import { DiscountType } from '../../discounts/enums/discount.enums';
import { ResponseVariantDto } from '../dto/product.variant.dto';
import { ResponseProductDto } from '../dto/product.response.dto';

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

export function mapToProductDto(product: Product, activeDiscount?: ProductDiscount | null): ResponseProductDto {
  const calculateBaseDisplayPrice = (): number => {
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

  const calculateDiscountInfo = (
    originalPrice: number,
    discount?: ProductDiscount | null,
  ): {
    finalPrice: number;
    hasActiveDiscount: boolean;
    discountAmount: number;
    discountPercentage: number | null;
    discountEndDate: Date | null;
    originalPrice: number;
  } => {
    if (!discount) {
      return {
        finalPrice: originalPrice,
        hasActiveDiscount: false,
        discountAmount: 0,
        discountPercentage: null,
        discountEndDate: null,
        originalPrice,
      };
    }

    let discountAmount: number;
    let discountPercentage: number | null;

    if (discount.discountType === DiscountType.PERCENTAGE) {
      discountAmount = Math.round(originalPrice * (Number(discount.value) / 100) * 100) / 100;
      discountPercentage = Number(discount.value);
    } else {
      discountAmount = Math.min(Number(discount.value), originalPrice);
      discountPercentage = null;
    }

    const finalPrice = Math.max(0, Math.round((originalPrice - discountAmount) * 100) / 100);

    return {
      finalPrice,
      hasActiveDiscount: true,
      discountAmount,
      discountPercentage,
      discountEndDate: discount.endDate || null,
      originalPrice,
    };
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

  const baseDisplayPrice = calculateBaseDisplayPrice();
  const discountInfo = calculateDiscountInfo(baseDisplayPrice, activeDiscount);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    brand: product.brand,
    model: product.model || undefined,
    basePrice: Number(product.basePrice),
    baseStock: product.baseStock,
    finalPrice: discountInfo.finalPrice,
    originalPrice: discountInfo.originalPrice,
    totalStock: calculateTotalStock(),
    category_name: product.category?.category_name ?? '',
    imgUrls: getAllImageUrls(),
    specifications: product.specifications || {},
    hasVariants: product.hasVariants,
    isActive: product.isActive,
    featured: product.featured,
    variants: getSortedVariants(),
    hasActiveDiscount: discountInfo.hasActiveDiscount,
    discountAmount: discountInfo.discountAmount,
    discountPercentage: discountInfo.discountPercentage,
    discountEndDate: discountInfo.discountEndDate,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function mapProductListToDto(
  products: Product[],
  discountMap?: Map<string, ProductDiscount>,
): ResponseProductDto[] {
  return products.map((p) => mapToProductDto(p, discountMap?.get(p.id)));
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
