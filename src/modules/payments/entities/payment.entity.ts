import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToOne } from 'typeorm';
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

  @Column('float')
  amount: number;

  @Column()
  currencyId: string;

  @Column()
  paymentTypeId: string;

  @Column()
  paymentMethodId: string;

  @Column({ type: 'timestamp' })
  dateApproved: Date;

  @ManyToOne(() => Users, (user) => user.payment)
  user: Users;

  @OneToOne(() => Order, (order) => order.payment)
  order: Order;

  @CreateDateColumn()
  createdAt: Date;
}
