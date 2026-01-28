import { Product } from '../../products/entities/products.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  categoryName: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
