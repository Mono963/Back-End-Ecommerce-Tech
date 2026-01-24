import { Module, Global, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { N8nService } from './n8n.service';
import n8nConfig from '../../config/N8N.config';
import { ProductsModule } from '../products/products.module';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(n8nConfig),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    forwardRef(() => ProductsModule),
  ],
  providers: [N8nService],
  exports: [N8nService],
})
export class N8nModule {}
