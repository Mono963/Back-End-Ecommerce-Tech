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
import { CartItem } from './cart.item.entity';
import { Users } from 'src/modules/users/Entyties/users.entity';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Total del carrito
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Un carrito pertenece a un usuario
  @ManyToOne(() => Users, (user) => user.cart)
  @JoinColumn({ name: 'user_id' })
  user: Users;

  // Un carrito tiene muchos items
  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, {
    cascade: true, // Si elimino el carrito, se eliminan los items
  })
  items: CartItem[];
}
