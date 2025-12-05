import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, Index } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order.item';

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

  @Column({ type: 'json', nullable: true })
  shippingAddress: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };

  @Column({ nullable: true })
  paymentMethod: string;

  @OneToOne(() => Order, (order) => order.orderDetail)
  order: Order;

  @OneToMany(() => OrderItem, (item) => item.orderDetail, {
    cascade: true,
  })
  items: OrderItem[];
}
