import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Product } from '../products/Entities/products.entity';
import { Users } from '../users/Entities/users.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Wishlist, WishlistItem, Product, Users]), JwtModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
