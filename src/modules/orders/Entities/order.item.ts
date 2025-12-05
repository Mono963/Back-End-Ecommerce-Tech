import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
} from 'typeorm';
import { OrderDetail } from './orderDetails.entity';
import { Product } from 'src/modules/products/Entities/products.entity';
import { ProductVariant } from 'src/modules/products/Entities/products_variant.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  // Precio por unidad al momento de la compra
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  // Guardamos las variantes que tenía al momento de comprar
  // Por si después cambian de precio o se descontinúan
  @Column({ type: 'json', nullable: true })
  variantsSnapshot:
    | {
        id: string;
        type: string;
        name: string;
        priceModifier: number;
      }[]
    | null;

  // Guardamos info del producto al momento de comprar
  // Por si después cambia el nombre, precio, etc
  @Column({ type: 'json' })
  productSnapshot: {
    name: string;
    description: string;
    basePrice: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  // Este item pertenece a un detalle de orden
  @ManyToOne(() => OrderDetail, (detail) => detail.items)
  @JoinColumn({ name: 'order_detail_id' })
  orderDetail: OrderDetail;

  // Referencia al producto original
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Variantes que se compraron
  @ManyToMany(() => ProductVariant)
  @JoinTable({
    name: 'order_item_variants',
    joinColumn: { name: 'order_item_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'variant_id', referencedColumnName: 'id' },
  })
  variants: ProductVariant[];
}
