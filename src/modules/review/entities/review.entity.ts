import { Product } from 'src/modules/products/Entities/products.entity';
import { Users } from 'src/modules/users/Entities/users.entity';
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
import { Rating } from '../interface/IReview.interface';

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

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
