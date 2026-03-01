import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import n8nConfig from '../../config/N8N.config';
import { N8nProductSearchResponse } from './interface/n8n.interface';
import { ProductsService } from '../products/products.service';

@Injectable()
export class N8nService {
  constructor(
    @Inject(n8nConfig.KEY)
    private readonly config: ConfigType<typeof n8nConfig>,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
  ) {}

  get isEnabled(): boolean {
    return this.config.enabled && !!this.config.webhookUrl;
  }

  async callWebhook<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    if (!this.isEnabled) {
      throw new Error('n8n is not enabled');
    }

    const url = `${this.config.webhookUrl}/${endpoint}`;

    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.post<T>(url, data, {
        timeout: this.config.timeout,
      }),
    );

    return response.data;
  }

  async productSearch(query: string): Promise<N8nProductSearchResponse> {
    const candidates = await this.productsService.searchProducts(query, 30);

    return await this.callWebhook('product-search', {
      query,
      candidates,
    });
  }
}
