import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Users } from './users.entity';

@Entity('addresses')
@Index(['user_id'])
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  label: string;

  @Column({ length: 255 })
  street: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 100 })
  province: string;

  @Column({ name: 'postal_code', length: 20 })
  postalCode: string;

  @Column({ length: 100, default: 'Argentina' })
  country: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => Users, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
