import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { OrderDetail } from './order.details.entity';
import { Product } from '../../products/entities/products.entity';
import { ProductVariant } from '../../products/entities/products_variant.entity';
import { DiscountSource } from '../../discounts/enums/discount.enums';

@Index(['order_detail_id'])
@Index(['product_id'])
@Index(['createdAt'])
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'json', nullable: true })
  variantsSnapshot:
    | {
        id: string;
        type: string;
        name: string;
        priceModifier: number;
      }[]
    | null;

  @Column({ type: 'json' })
  productSnapshot: {
    name: string;
    description: string;
    basePrice: number;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalUnitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  discountSource: DiscountSource;

  @Column({ type: 'varchar', length: 50, nullable: true })
  discountCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ name: 'order_detail_id' })
  order_detail_id: string;

  @Column({ name: 'product_id' })
  product_id: string;

  @ManyToOne(() => OrderDetail, (detail) => detail.items)
  @JoinColumn({ name: 'order_detail_id' })
  orderDetail: OrderDetail;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToMany(() => ProductVariant, (variant) => variant.orderItems)
  @JoinTable({
    name: 'order_item_variants',
    joinColumn: { name: 'order_item_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'variant_id', referencedColumnName: 'id' },
  })
  variants: ProductVariant[];
}
