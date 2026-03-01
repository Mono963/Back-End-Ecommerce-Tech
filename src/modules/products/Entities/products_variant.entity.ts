import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Product } from './products.entity';

import { CartItem } from '../../cart/entities/cart.item.entity';
import { OrderItem } from '../../orders/entities/order.item.entity';
import { TechVariantType } from '../enum/product.enum';

@Index(['product_id', 'type'])
@Index(['isAvailable', 'stock'])
@Index(['type'])
@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TechVariantType })
  type: TechVariantType;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 200, nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  @Index()
  priceModifier: number;

  @Column('int', { default: 0 })
  stock: number;

  @Column({ default: true })
  isAvailable: boolean;

  @Column('int', { default: 0 })
  @Index()
  sortOrder: number;

  @Column({ name: 'product_id' })
  product_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToMany(() => OrderItem, (item) => item.variants)
  orderItems: OrderItem[];

  @ManyToMany(() => CartItem, (item) => item.variants)
  cartItems: CartItem[];
}
