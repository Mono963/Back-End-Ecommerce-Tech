import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repair } from './entities/repair.entity';
import { RepairsController } from './repairs.controller';
import { RepairsService } from './repairs.service';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Repair]), MailModule, JwtModule],
  controllers: [RepairsController],
  providers: [RepairsService],
})
export class RepairsModule {}
