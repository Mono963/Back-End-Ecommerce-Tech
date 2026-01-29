import { CreatePreferenceDto } from '../../payments/dto/create-payment.dto';

export interface CreatePreferenceOptions {
  userId: string;
  orderId: string;
  dto: CreatePreferenceDto;
}
