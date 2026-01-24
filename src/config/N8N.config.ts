import { registerAs } from '@nestjs/config';

export default registerAs('n8n', () => ({
  webhookUrl: process.env.N8N_WEBHOOK_URL,
  timeout: Number(process.env.N8N_TIMEOUT) || 30000,
  enabled: process.env.N8N_ENABLED === 'true',
}));
