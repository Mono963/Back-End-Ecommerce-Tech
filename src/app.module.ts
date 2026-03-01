import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RegisterDateMiddleware } from './middlewares/registerDate.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from './config/env.validation';
import typeOrmConfig from './config/typeorm.config';
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
import { N8nModule } from './modules/N8N/n8n.module';
import { CacheModule } from '@nestjs/cache-manager';
import { cacheConfig } from './config/cache.config';
import { PaymentsModule } from './modules/payments/payment.module';
import { MercadoPagoModule } from './modules/mercadopago/mercadopago.module';
import { MailModule } from './modules/mail/mail.module';
import { ContactModule } from './modules/contact/contact.module';
import { getBullImports } from './infra/bull.bootstrap';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsletterModule } from './modules/newsLetters/newsletter.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeOrmConfig],
      envFilePath: ['.env', '.env.development', '.env.local'],
      validate,
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

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: cacheConfig,
    }),

    ...getBullImports(),

    ScheduleModule.forRoot(),

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
    N8nModule,
    PaymentsModule,
    MercadoPagoModule,
    MailModule,
    ContactModule,
    NewsletterModule,
    DiscountsModule,
    HealthModule,
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
