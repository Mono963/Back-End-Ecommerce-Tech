import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { File } from '../../file/entities/file.entity';
import { ProductVariant } from './products_variant.entity';

@Index(['brand']) // Para buscar todos los productos de una marca (Dell, HP, etc)
@Index(['isActive', 'featured']) // Para buscar productos activos y destacados
@Index(['name', 'description'], { fulltext: true }) // Para búsqueda de texto
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nombre del producto (ej: "Notebook Dell Inspiron 15")
  @Column({ length: 200 })
  @Index()
  name: string;

  // Descripción completa
  @Column('text')
  description: string;

  // Marca (Dell, HP, Logitech, etc)
  @Column({ length: 50 })
  brand: string;

  // Modelo específico
  @Column({ length: 100, nullable: true })
  model: string;

  // Precio base (sin variantes)
  @Column('decimal', { precision: 10, scale: 2 })
  @Index()
  basePrice: number;

  // Stock base (sin contar variantes)
  @Column('int')
  baseStock: number;

  // URLs de imágenes
  @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
  imgUrls: string[];

  // Especificaciones técnicas como JSON
  // Esto permite flexibilidad según el tipo de producto
  @Column('json', { nullable: true })
  specifications: {
    // Para notebooks/PCs
    screenSize?: string; // "15.6 pulgadas"
    resolution?: string; // "1920x1080"
    batteryLife?: string; // "8 horas"
    weight?: string; // "1.8 kg"
    ports?: string[]; // ["USB-C", "HDMI", "Jack 3.5mm"]

    // Para componentes
    socket?: string; // "LGA 1700" para procesadores
    chipset?: string; // "B550" para motherboards
    tdp?: string; // "65W" para procesadores

    // Para periféricos
    dpi?: string; // "16000 DPI" para mouse
    switches?: string; // "Cherry MX Red" para teclados

    // Genéricos
    warranty?: string; // "2 años"
    dimensions?: string; // "30x20x2 cm"
    includedItems?: string[]; // ["Cable USB", "Manual", "Driver CD"]

    [key: string]: any; // Permite agregar más según necesites
  };

  // ¿Está activo para venta?
  @Column({ default: true })
  isActive: boolean;

  // ¿Tiene variantes? (RAM, almacenamiento, etc)
  @Column({ default: false })
  hasVariants: boolean;

  // ¿Es producto destacado?
  @Column({ default: false })
  featured: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Soft delete (no se elimina realmente de la DB)
  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt: Date | null;

  // Un producto tiene muchas variantes
  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  // Un producto puede tener archivos (manuales PDF, drivers, etc)
  @OneToMany(() => File, (file) => file.product, {
    cascade: ['remove'],
  })
  files: File[];

  // Un producto pertenece a una categoría
  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
