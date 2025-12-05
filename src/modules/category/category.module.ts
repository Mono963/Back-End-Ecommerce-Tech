import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Category } from './entities/category.entity';
import { CategoriesController } from './category.controller';
import { CategoriesService } from './category.service';

import { AuthsModule } from '../auths/auths.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), forwardRef(() => AuthsModule)],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
