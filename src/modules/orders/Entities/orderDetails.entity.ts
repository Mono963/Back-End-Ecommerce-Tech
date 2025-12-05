import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order.item';

@Entity('orders_details')
export class OrderDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Subtotal sin impuestos ni envío
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  // Impuestos
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  // Costo de envío
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping: number;

  // Total final
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  // Dirección de envío
  @Column({ type: 'json', nullable: true })
  shippingAddress: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Método de pago usado
  @Column({ nullable: true })
  paymentMethod: string; // "credit_card", "debit_card", "mercadopago", etc

  // Un detalle pertenece a una orden
  @OneToOne(() => Order, (order) => order.orderDetail)
  order: Order;

  // Un detalle tiene muchos items
  @OneToMany(() => OrderItem, (item) => item.orderDetail, {
    cascade: true,
  })
  items: OrderItem[];
}
