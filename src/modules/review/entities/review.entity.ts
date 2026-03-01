import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

import { Users } from '../../users/entities/users.entity';
import { Product } from '../../products/entities/products.entity';
import { Rating } from '../enum/review.enum';

@Entity('reviews')
@Unique(['user', 'product'])
@Index(['product'])
@Index(['user'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Rating })
  rating: Rating;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Users, (user) => user.reviews)
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @ManyToOne(() => Product, (product) => product.reviews)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
