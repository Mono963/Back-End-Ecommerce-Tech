import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { MailProcessor } from './mail.processor';
import { MailQueueService } from './mail-queue.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'mail',
    }),
  ],
  providers: [MailService, MailProcessor, MailQueueService],
  exports: [MailService, MailQueueService, BullModule],
})
export class MailModule {}
