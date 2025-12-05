import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderDetail } from './orderDetails.entity';
import { Users } from 'src/modules/users/Entyties/users.entity';

// Estados de la orden
export enum OrderStatus {
  PENDING = 'pending', // Pendiente de pago
  PAID = 'paid', // Pagada
  PROCESSING = 'processing', // Preparando envío
  SHIPPED = 'shipped', // Enviada
  DELIVERED = 'delivered', // Entregada
  CANCELLED = 'cancelled', // Cancelada
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Número de orden para el cliente (ej: "ORD-2024-0001")
  @Column({ unique: true })
  orderNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Estado de la orden
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  // Una orden tiene un detalle
  @OneToOne(() => OrderDetail, (orderDetails) => orderDetails.order, {
    cascade: true,
  })
  @JoinColumn()
  orderDetail: OrderDetail;

  // Una orden pertenece a un usuario
  @ManyToOne(() => Users, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: Users;
}
