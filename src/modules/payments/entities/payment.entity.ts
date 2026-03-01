import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  paymentId: string;

  @Column()
  status: string;

  @Column()
  statusDetail: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  currencyId: string;

  @Column()
  paymentTypeId: string;

  @Column()
  paymentMethodId: string;

  @Column({ type: 'timestamp', nullable: true })
  dateApproved: Date | null;

  @ManyToOne(() => Users, (user) => user.payments)
  user: Users;

  @OneToOne(() => Order, (order) => order.payment)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @CreateDateColumn()
  createdAt: Date;
}
