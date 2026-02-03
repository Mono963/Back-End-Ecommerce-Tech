import { forwardRef, Module } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { UsersModule } from '../users/users.module';
import { AuthsModule } from '../auths/auths.module';

@Module({
  imports: [forwardRef(() => UsersModule), forwardRef(() => AuthsModule)],
  providers: [NewsletterService],
  controllers: [NewsletterController],
  exports: [NewsletterService],
})
export class NewsletterModule {}
