import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Users } from '../../users/Entities/users.entity';
import { WishlistItem } from './wishlist-item.entity';

@Entity('wishlists')
export class Wishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  user_id: string;

  @ManyToOne(() => Users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @OneToMany(() => WishlistItem, (item) => item.wishlist, {
    cascade: true,
  })
  items: WishlistItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
