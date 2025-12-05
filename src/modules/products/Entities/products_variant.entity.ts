import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './products.entity';
import { CartItem } from '../../cart/entities/cart.item.entity';
import { OrderItem } from 'src/modules/orders/Entities/order.item';

// Tipos de variantes para productos tecnológicos
export enum TechVariantType {
  // Para computadoras y notebooks
  RAM = 'ram', // 8GB, 16GB, 32GB
  STORAGE = 'storage', // 256GB SSD, 1TB HDD
  PROCESSOR = 'processor', // i5, i7, Ryzen 5
  GRAPHICS = 'graphics', // GTX 1650, RTX 3060

  // Para periféricos
  COLOR = 'color', // Negro, Blanco, RGB
  CONNECTIVITY = 'connectivity', // Bluetooth, USB, Wireless

  // Para monitores
  SCREEN_SIZE = 'screen_size', // 24", 27", 32"
  RESOLUTION = 'resolution', // Full HD, 4K
  REFRESH_RATE = 'refresh_rate', // 60Hz, 144Hz, 240Hz

  // Genéricos
  WARRANTY = 'warranty', // 1 año, 2 años
  CONDITION = 'condition', // Nuevo, Reacondicionado
}

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Tipo de variante
  @Column({ type: 'enum', enum: TechVariantType })
  type: TechVariantType;

  // Nombre de la variante (ej: "16GB DDR4", "1TB NVMe SSD")
  @Column({ length: 100 })
  name: string;

  // Descripción opcional
  @Column({ length: 200, nullable: true })
  description: string;

  // Cuánto suma o resta al precio base
  // Ej: pasar de 8GB a 16GB RAM suma $50
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  priceModifier: number;

  // Stock de esta variante específica
  @Column('int', { default: 0 })
  stock: number;

  // ¿Está disponible?
  @Column({ default: true })
  isAvailable: boolean;

  // Orden de aparición (para mostrar primero las más populares)
  @Column('int', { default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Esta variante pertenece a un producto
  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE', // Si elimino el producto, se eliminan sus variantes
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Relaciones con items de orden y carrito
  @ManyToMany(() => OrderItem, (item) => item.variants)
  orderItems: OrderItem[];

  @ManyToMany(() => CartItem, (item) => item.variants)
  cartItems: CartItem[];
}
