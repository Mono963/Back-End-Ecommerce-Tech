import { CreatePreferenceDto, PaymentStatusDto, PreferenceResponseDto } from '../dto/create-payment.dto';
import { IMercadoPagoError, IWebhookNotificationInterface } from '../interface/payment.interface';

export function isMercadoPagoError(error: unknown): error is IMercadoPagoError {
  return error instanceof Error && ('response' in error || 'status' in error);
}

export interface IPaymentService {
  createPreferencePayment(userId: string, dto: CreatePreferenceDto): Promise<PreferenceResponseDto>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusDto>;
  handleWebhook(notification: IWebhookNotificationInterface): Promise<void>;
}

export function isWebhookNotification(obj: unknown): obj is IWebhookNotificationInterface {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;

  return typeof o.type === 'string' && typeof o.data === 'object' && o.data !== null;
}
