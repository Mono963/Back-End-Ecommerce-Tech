import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, Index } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order.item.entity';
import { IAddress } from '../../users/interfaces/user.interface';

@Index(['total'])
@Index(['paymentMethod'])
@Entity('orders_details')
export class OrderDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'uuid', nullable: true })
  shippingAddressId: string;

  @Column({ type: 'jsonb', nullable: true })
  shippingAddressSnapshot: IAddress;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDiscount: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  promoCodeUsed: string;

  @OneToOne(() => Order, (order) => order.orderDetail)
  order: Order;

  @OneToMany(() => OrderItem, (item) => item.orderDetail, {
    cascade: true,
  })
  items: OrderItem[];
}
