export interface IMercadoPagoPaymentInfo {
  id: number | string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payment_type_id: string;
  payment_method_id: string;
  date_approved: string | null;
  external_reference: string;
}

export interface IWebhookNotificationInterface {
  id?: number;
  live_mode?: boolean;
  type: string;
  date_created?: string;
  application_id?: number;
  user_id?: string;
  version?: number;
  api_version?: string;
  action?: string;
  data: {
    id: string;
  };
}

export interface IPaymentCompleted {
  id: string;
  payment_id: string;
  user_id: string;
  order_id: string;
  status: string;
  status_detail: string;
  amount: number;
  currency_id: string;
  payment_type_id: string;
  payment_method_id: string;
  date_approved: Date | null;
  createdAt: Date;
}

export interface IMercadoPagoError extends Error {
  message: string;
  response?: {
    data: unknown;
    status?: number;
  };
  status?: number;
}

export interface ICreatePreference {
  orderId: string;
  message?: string;
  currency?: string;
}

export interface IPreferenceResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export interface IPaymentStatus {
  id: string | number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  date_approved: string;
}

export interface IPaymentResponse {
  id: string;
  paymentId: string;
  status: string;
  statusDetail: string;
  amount: number;
  currencyId: string;
  paymentTypeId: string;
  paymentMethodId: string;
  dateApproved: Date | null;
  orderId: string;
  userId: string;
  createdAt: Date;
}

export interface IMyPaymentResponse {
  id: string;
  paymentId: string;
  status: string;
  statusDetail: string;
  amount: number;
  currencyId: string;
  paymentTypeId: string;
  paymentMethodId: string;
  dateApproved: Date | null;
  createdAt: Date;
}
