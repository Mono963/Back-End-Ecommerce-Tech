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
import { Review } from 'src/modules/review/entities/review.entity';
@Index(['brand'])
@Index(['isActive', 'featured'])
@Index(['name', 'description'], { fulltext: true })
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column('text')
  description: string;

  @Column({ length: 50 })
  brand: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column('decimal', { precision: 10, scale: 2 })
  basePrice: number;

  @Column('int')
  baseStock: number;

  @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
  imgUrls: string[];

  @Column('json', { nullable: true })
  specifications: {
    screenSize?: string;
    resolution?: string;
    batteryLife?: string;
    weight?: string;
    ports?: string[];

    socket?: string;
    chipset?: string;
    tdp?: string;

    dpi?: string;
    switches?: string;

    warranty?: string;
    dimensions?: string;
    includedItems?: string[];
    [key: string]: any;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  hasVariants: boolean;

  @Column({ default: false })
  featured: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt: Date | null;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  @OneToMany(() => File, (file) => file.product, {
    cascade: ['remove'],
  })
  files: File[];

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];
}
