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
import { RoleModule } from './module/role/role.module';

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
    UsersModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    FileModule,
    AuthsModule,
    CartModule,
    RoleModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RegisterDateMiddleware).forRoutes('*');
  }
}
