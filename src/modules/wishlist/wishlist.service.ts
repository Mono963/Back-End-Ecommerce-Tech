import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Product } from '../products/entities/products.entity';
import { WishlistResponseDto, WishlistSummaryDto, WishlistItemResponseDto } from './dto/wishlist.dto';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,

    @InjectRepository(WishlistItem)
    private readonly wishlistItemRepo: Repository<WishlistItem>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  /**
   * Obtener o crear wishlist del usuario
   */
  private async getOrCreateWishlist(userId: string): Promise<Wishlist> {
    let wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
      relations: ['items', 'items.product', 'items.product.category'],
    });

    if (!wishlist) {
      wishlist = this.wishlistRepo.create({ user_id: userId });
      wishlist = await this.wishlistRepo.save(wishlist);
      this.logger.log(`Wishlist creada para usuario ${userId}`);
    }

    return wishlist;
  }

  /**
   * Obtener wishlist completa del usuario
   */
  async getWishlist(userId: string): Promise<WishlistResponseDto> {
    const wishlist = await this.getOrCreateWishlist(userId);

    return this.mapWishlistToDto(wishlist);
  }

  /**
   * Obtener resumen de wishlist (para navbar)
   */
  async getWishlistSummary(userId: string): Promise<WishlistSummaryDto> {
    const wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
      relations: ['items'],
    });

    return {
      itemCount: wishlist?.items?.length || 0,
    };
  }

  /**
   * Agregar producto a wishlist
   */
  async addToWishlist(userId: string, productId: string): Promise<WishlistItemResponseDto> {
    // Verificar que el producto existe y está activo
    const product = await this.productRepo.findOne({
      where: { id: productId, isActive: true },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con id ${productId} no encontrado o no está activo`);
    }

    // Obtener o crear wishlist
    const wishlist = await this.getOrCreateWishlist(userId);

    // Verificar si el producto ya está en la wishlist
    const existingItem = await this.wishlistItemRepo.findOne({
      where: {
        wishlist_id: wishlist.id,
        product_id: productId,
      },
    });

    if (existingItem) {
      throw new BadRequestException('Este producto ya está en tu lista de deseados');
    }

    // Crear el item
    const wishlistItem = this.wishlistItemRepo.create({
      wishlist_id: wishlist.id,
      product_id: productId,
    });

    const savedItem = await this.wishlistItemRepo.save(wishlistItem);

    this.logger.log(`Producto ${productId} agregado a wishlist de usuario ${userId}`);

    // Cargar el item completo con relaciones
    const itemWithProduct = await this.wishlistItemRepo.findOne({
      where: { id: savedItem.id },
      relations: ['product', 'product.category'],
    });

    return this.mapWishlistItemToDto(itemWithProduct);
  }

  /**
   * Eliminar producto de wishlist
   */
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist no encontrada');
    }

    const item = await this.wishlistItemRepo.findOne({
      where: {
        wishlist_id: wishlist.id,
        product_id: productId,
      },
    });

    if (!item) {
      throw new NotFoundException('Producto no encontrado en la wishlist');
    }

    await this.wishlistItemRepo.remove(item);

    this.logger.log(`Producto ${productId} eliminado de wishlist de usuario ${userId}`);
  }

  /**
   * Vaciar wishlist
   */
  async clearWishlist(userId: string): Promise<void> {
    const wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
      relations: ['items'],
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist no encontrada');
    }

    if (wishlist.items && wishlist.items.length > 0) {
      await this.wishlistItemRepo.remove(wishlist.items);
    }

    this.logger.log(`Wishlist vaciada para usuario ${userId}`);
  }

  /**
   * Verificar si un producto está en la wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
    });

    if (!wishlist) {
      return false;
    }

    const item = await this.wishlistItemRepo.findOne({
      where: {
        wishlist_id: wishlist.id,
        product_id: productId,
      },
    });

    return !!item;
  }

  /**
   * Mapear Wishlist a DTO
   */
  private mapWishlistToDto(wishlist: Wishlist): WishlistResponseDto {
    return {
      id: wishlist.id,
      items: wishlist.items?.map((item) => this.mapWishlistItemToDto(item)) || [],
      totalItems: wishlist.items?.length || 0,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    };
  }

  /**
   * Mapear WishlistItem a DTO
   */
  private mapWishlistItemToDto(item: WishlistItem): WishlistItemResponseDto {
    return {
      id: item.id,
      addedAt: item.addedAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        brand: item.product.brand,
        model: item.product.model,
        basePrice: Number(item.product.basePrice),
        baseStock: item.product.baseStock,
        imgUrls: item.product.imgUrls,
        featured: item.product.featured,
        isActive: item.product.isActive,
        category: item.product.category
          ? {
              id: item.product.category.id,
              name: item.product.category.categoryName,
            }
          : null,
      },
    };
  }
}
