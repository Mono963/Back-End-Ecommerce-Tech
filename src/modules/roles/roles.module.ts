import { Module, forwardRef } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { AuthsModule } from '../auths/auths.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), forwardRef(() => AuthsModule)],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, RolesModule],
})
export class RolesModule {}
