import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { Users } from '../../users/entities/users.entity';
import { OrderDetail } from './order.details.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Index(['status'])
@Index(['createdAt'])
@Index(['user_id', 'status'])
@Index(['orderNumber'], { unique: true })
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ name: 'user_id' })
  user_id: string;

  @OneToOne(() => OrderDetail, (orderDetails) => orderDetails.order, {
    cascade: true,
  })
  @JoinColumn()
  orderDetail: OrderDetail;

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;

  @ManyToOne(() => Users, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: Users;
}
