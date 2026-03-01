import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../../products/entities/products.entity';
import { ProductVariant } from '../../products/entities/products_variant.entity';

@Index(['cart_id', 'product_id'])
@Index(['cart_id'])
@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtAddition: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'json', nullable: true })
  selectedVariants:
    | {
        id: string;
        type: string;
        name: string;
        priceModifier: number;
      }[]
    | null;

  @CreateDateColumn()
  addedAt: Date;

  @Column({ type: 'uuid' })
  cart_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToMany(() => ProductVariant, (variant) => variant.cartItems)
  @JoinTable({
    name: 'cart_item_variants',
    joinColumn: { name: 'cart_item_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'variant_id', referencedColumnName: 'id' },
  })
  variants: ProductVariant[];
}
