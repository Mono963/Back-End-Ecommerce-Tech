import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { ProductDiscount } from './entities/product-discount.entity';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeUsage } from './entities/promo-code-usage.entity';
import { Product } from '../products/entities/products.entity';
import { AuthsModule } from '../auths/auths.module';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart.item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductDiscount, PromoCode, PromoCodeUsage, Product, Cart, CartItem]),
    forwardRef(() => AuthsModule),
  ],
  controllers: [DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
