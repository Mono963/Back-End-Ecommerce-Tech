import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index } from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { Product } from '../../products/Entities/products.entity';

@Entity('wishlist_items')
@Index(['wishlist', 'product'], { unique: true })
@Index(['wishlist'])
@Index(['product'])
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wishlist_id', type: 'uuid' })
  wishlist_id: string;

  @ManyToOne(() => Wishlist, (wishlist) => wishlist.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wishlist_id' })
  wishlist: Wishlist;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, {
    eager: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
