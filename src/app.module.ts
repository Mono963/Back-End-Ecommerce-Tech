import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RegisterDateMiddleware } from './middlewares/registerDate.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import typeOrmConfig from './config/typeorm';
import { DataSourceOptions } from 'typeorm';
import { CategoriesModule } from './modules/category/category.module';
import { FileModule } from './modules/file/file.module';
import { AuthsModule } from './modules/auths/auths.module';
import { UsersModule } from './modules/users/users.module';
import { CartModule } from './modules/cart/cart.module';
import { RolesModule } from './modules/roles/roles.module';
import { SeedsModule } from './seeds/seedUser/seeds.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './config/throttler.config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { ReviewModule } from './modules/review/review.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeOrmConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<DataSourceOptions>('typeorm');
        if (!config) {
          throw new Error('TypeORM config is missing');
        }
        return config;
      },
    }),
    ThrottlerModule.forRoot(throttlerConfig),
    UsersModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    FileModule,
    AuthsModule,
    CartModule,
    RolesModule,
    SeedsModule,
    ReviewModule,
    WishlistModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RegisterDateMiddleware).forRoutes('*');
  }
}
