import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Users } from './entities/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthsModule } from '../auths/auths.module';
import { MailModule } from '../mail/mail.module';
import { RolesModule } from '../roles/roles.module';
import { Review } from '../review/entities/review.entity';
import { Order } from '../orders/entities/order.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users, Review, Order, Wishlist]),
    forwardRef(() => AuthsModule),
    MailModule,
    RolesModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
