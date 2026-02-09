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
   * Get or create user wishlist
   */
  private async getOrCreateWishlist(userId: string): Promise<Wishlist> {
    let wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
      relations: ['items', 'items.product', 'items.product.category'],
    });

    if (!wishlist) {
      wishlist = this.wishlistRepo.create({ user_id: userId });
      wishlist = await this.wishlistRepo.save(wishlist);
      this.logger.log(`Wishlist created for user ${userId}`);
    }

    return wishlist;
  }

  /**
   * Get full user wishlist
   */
  async getWishlist(userId: string): Promise<WishlistResponseDto> {
    const wishlist = await this.getOrCreateWishlist(userId);

    return this.mapWishlistToDto(wishlist);
  }

  /**
   * Get wishlist summary (for navbar)
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

  async addToWishlist(userId: string, productId: string): Promise<WishlistItemResponseDto> {
    const product = await this.productRepo.findOne({
      where: { id: productId, isActive: true },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found or is inactive`);
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    const existingItem = await this.wishlistItemRepo.findOne({
      where: {
        wishlist_id: wishlist.id,
        product_id: productId,
      },
    });

    if (existingItem) {
      throw new BadRequestException('This product is already in your wishlist');
    }

    const wishlistItem = this.wishlistItemRepo.create({
      wishlist_id: wishlist.id,
      product_id: productId,
    });

    const savedItem = await this.wishlistItemRepo.save(wishlistItem);

    this.logger.log(`Product ${productId} added to user ${userId} wishlist`);

    const itemWithProduct = await this.wishlistItemRepo.findOne({
      where: { id: savedItem.id },
      relations: ['product', 'product.category'],
    });

    return this.mapWishlistItemToDto(itemWithProduct);
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    const item = await this.wishlistItemRepo.findOne({
      where: {
        wishlist_id: wishlist.id,
        product_id: productId,
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in wishlist');
    }

    await this.wishlistItemRepo.remove(item);

    this.logger.log(`Product ${productId} removed from user ${userId} wishlist`);
  }

  /**
   * Clear wishlist
   */
  async clearWishlist(userId: string): Promise<void> {
    const wishlist = await this.wishlistRepo.findOne({
      where: { user_id: userId },
      relations: ['items'],
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    if (wishlist.items && wishlist.items.length > 0) {
      await this.wishlistItemRepo.remove(wishlist.items);
    }

    this.logger.log(`Wishlist cleared for user ${userId}`);
  }

  /**
   * Check if a product is in the wishlist
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
   * Map wishlist to DTO
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
   * Map wishlist item to DTO
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
              name: item.product.category.category_name,
            }
          : null,
      },
    };
  }
}
