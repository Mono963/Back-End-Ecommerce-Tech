import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from 'src/modules/products/Entities/products.entity';
import { ProductVariant } from 'src/modules/products/Entities/products_variant.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cantidad del producto
  @Column({ type: 'int', default: 1 })
  quantity: number;

  // Precio al momento de agregar (producto base + variantes)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtAddition: number;

  // Subtotal = precio × cantidad
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  // Guardamos info de las variantes seleccionadas
  // Ejemplo: {ram: "16GB", storage: "512GB SSD"}
  @Column({ type: 'json', nullable: true })
  selectedVariants:
    | {
        id: string;
        type: string;
        name: string;
        priceModifier: number;
      }[]
    | null;

  // Este item pertenece a un carrito
  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  // Este item es de un producto
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Variantes seleccionadas (16GB RAM, 512GB SSD, etc)
  @ManyToMany(() => ProductVariant)
  @JoinTable({
    name: 'cart_item_variants',
    joinColumn: { name: 'cart_item_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'variant_id', referencedColumnName: 'id' },
  })
  variants: ProductVariant[];
}
