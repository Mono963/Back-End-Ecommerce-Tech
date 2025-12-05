import { VariantType } from '../Entities/products_variant.entity';

interface ProductSeedData {
  name: string;
  description: string;
  basePrice: number;
  baseStock: number;
  categoryName: string;
  specifications?: Record<string, any>;
  hasVariants?: boolean;
  variants?: {
    type: VariantType;
    name: string;
    description?: string;
    priceModifier: number;
    stock: number;
    isAvailable?: boolean;
    sortOrder?: number;
  }[];
}

export const PRODUCTS_SEED: ProductSeedData[] = [
  // Smartphones con variantes de almacenamiento y color
  {
    name: 'iPhone 15',
    description: 'The latest flagship smartphone from Apple with advanced features',
    basePrice: 799.99,
    baseStock: 0, // Solo vende variantes
    categoryName: 'smartphone',
    specifications: {
      brand: 'Apple',
      warranty: '1 year',
      screenSize: '6.1"',
      operatingSystem: 'iOS 17',
    },
    hasVariants: true,
    variants: [
      { type: VariantType.STORAGE, name: '128GB', priceModifier: 0, stock: 15, sortOrder: 1 },
      { type: VariantType.STORAGE, name: '256GB', priceModifier: 100, stock: 12, sortOrder: 2 },
      { type: VariantType.STORAGE, name: '512GB', priceModifier: 300, stock: 8, sortOrder: 3 },
      { type: VariantType.COLOR, name: 'Black', priceModifier: 0, stock: 20, sortOrder: 1 },
      { type: VariantType.COLOR, name: 'Blue', priceModifier: 0, stock: 15, sortOrder: 2 },
      { type: VariantType.COLOR, name: 'Pink', priceModifier: 0, stock: 10, sortOrder: 3 },
    ],
  },
  {
    name: 'Samsung Galaxy S24',
    description: 'Premium Android smartphone with AI-powered features',
    basePrice: 699.99,
    baseStock: 0,
    categoryName: 'smartphone',
    specifications: {
      brand: 'Samsung',
      warranty: '1 year',
      screenSize: '6.2"',
      operatingSystem: 'Android 14',
    },
    hasVariants: true,
    variants: [
      { type: VariantType.STORAGE, name: '128GB', priceModifier: 0, stock: 18, sortOrder: 1 },
      { type: VariantType.STORAGE, name: '256GB', priceModifier: 80, stock: 14, sortOrder: 2 },
      { type: VariantType.COLOR, name: 'Phantom Black', priceModifier: 0, stock: 16, sortOrder: 1 },
      { type: VariantType.COLOR, name: 'Cream', priceModifier: 0, stock: 12, sortOrder: 2 },
    ],
  },
  {
    name: 'Motorola Edge 40',
    description: 'Mid-range smartphone with excellent camera performance',
    basePrice: 449.99,
    baseStock: 25, // Producto simple sin variantes
    categoryName: 'smartphone',
    specifications: {
      brand: 'Motorola',
      warranty: '2 years',
      screenSize: '6.55"',
      operatingSystem: 'Android 13',
    },
    hasVariants: false,
  },

  // Monitores con variantes de tamaño
  {
    name: 'Samsung Odyssey G9',
    description: 'Ultra-wide curved gaming monitor with 240Hz refresh rate',
    basePrice: 1299.99,
    baseStock: 0,
    categoryName: 'monitor',
    specifications: {
      brand: 'Samsung',
      warranty: '3 years',
      panelType: 'QLED',
      resolution: '5120x1440',
    },
    hasVariants: true,
    variants: [
      { type: VariantType.SCREEN_SIZE, name: '49"', priceModifier: 0, stock: 8, sortOrder: 1 },
      { type: VariantType.SCREEN_SIZE, name: '57"', priceModifier: 800, stock: 3, sortOrder: 2 },
    ],
  },
  {
    name: 'LG UltraGear 27GP950',
    description: 'Professional 4K gaming monitor with HDR support',
    basePrice: 599.99,
    baseStock: 0,
    categoryName: 'monitor',
    specifications: {
      brand: 'LG',
      warranty: '2 years',
      panelType: 'IPS',
      resolution: '3840x2160',
    },
    hasVariants: true,
    variants: [
      { type: VariantType.SCREEN_SIZE, name: '27"', priceModifier: 0, stock: 15, sortOrder: 1 },
      { type: VariantType.SCREEN_SIZE, name: '32"', priceModifier: 200, stock: 10, sortOrder: 2 },
    ],
  },
  {
    name: 'Acer Predator X34',
    description: 'Curved ultrawide monitor for immersive gaming',
    basePrice: 799.99,
    baseStock: 12,
    categoryName: 'monitor',
    specifications: {
      brand: 'Acer',
      warranty: '3 years',
      panelType: 'IPS',
      resolution: '3440x1440',
    },
    hasVariants: false,
  },

  // Teclados mecánicos con variantes de switches
  {
    name: 'Razer BlackWidow V4',
    description: 'Professional mechanical gaming keyboard',
    basePrice: 129.99,
    baseStock: 0,
    categoryName: 'keyboard',
    specifications: {
      brand: 'Razer',
      warranty: '2 years',
      connectivity: 'USB-C',
      backlight: 'RGB',
    },
    hasVariants: true,
    variants: [
      {
        type: VariantType.PROCESSOR,
        name: 'Green Switches',
        description: 'Clicky tactile switches',
        priceModifier: 0,
        stock: 20,
        sortOrder: 1,
      },
      {
        type: VariantType.PROCESSOR,
        name: 'Yellow Switches',
        description: 'Linear switches',
        priceModifier: 10,
        stock: 15,
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'Corsair K70 RGB',
    description: 'Premium mechanical keyboard with Cherry MX switches',
    basePrice: 159.99,
    baseStock: 0,
    categoryName: 'keyboard',
    specifications: {
      brand: 'Corsair',
      warranty: '2 years',
      connectivity: 'USB',
      backlight: 'RGB',
    },
    hasVariants: true,
    variants: [
      {
        type: VariantType.PROCESSOR,
        name: 'Cherry MX Red',
        description: 'Linear switches',
        priceModifier: 0,
        stock: 18,
        sortOrder: 1,
      },
      {
        type: VariantType.PROCESSOR,
        name: 'Cherry MX Blue',
        description: 'Clicky switches',
        priceModifier: 15,
        stock: 12,
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'Logitech G Pro X',
    description: 'Tenkeyless mechanical gaming keyboard',
    basePrice: 89.99,
    baseStock: 25,
    categoryName: 'keyboard',
    specifications: {
      brand: 'Logitech',
      warranty: '2 years',
      connectivity: 'USB',
      backlight: 'RGB',
    },
    hasVariants: false,
  },

  // Ratones gaming (productos simples)
  {
    name: 'Razer Viper V3 Pro',
    description: 'Ultra-lightweight wireless gaming mouse',
    basePrice: 149.99,
    baseStock: 30,
    categoryName: 'mouse',
    specifications: {
      brand: 'Razer',
      warranty: '2 years',
      connectivity: 'Wireless',
      sensor: 'Focus Pro 30K',
    },
    hasVariants: false,
  },
  {
    name: 'Logitech G502 X',
    description: 'High-performance gaming mouse with customizable weights',
    basePrice: 79.99,
    baseStock: 40,
    categoryName: 'mouse',
    specifications: {
      brand: 'Logitech',
      warranty: '2 years',
      connectivity: 'USB',
      sensor: 'HERO 25K',
    },
    hasVariants: false,
  },
  {
    name: 'SteelSeries Rival 650',
    description: 'Dual-sensor wireless gaming mouse',
    basePrice: 99.99,
    baseStock: 20,
    categoryName: 'mouse',
    specifications: {
      brand: 'SteelSeries',
      warranty: '1 year',
      connectivity: 'Wireless/USB',
      sensor: 'TrueMove3+',
    },
    hasVariants: false,
  },
];
