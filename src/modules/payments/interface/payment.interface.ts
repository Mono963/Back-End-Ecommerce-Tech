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

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  AUTHORIZED = 'authorized',
  IN_PROCESS = 'in_process',
  IN_MEDIATION = 'in_mediation',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  CHARGED_BACK = 'charged_back',
}

export enum PaymentStatusDetail {
  ACCREDITED = 'accredited',

  PENDING_CONTINGENCY = 'pending_contingency',
  PENDING_REVIEW_MANUAL = 'pending_review_manual',
  PENDING_WAITING_PAYMENT = 'pending_waiting_payment',
  PENDING_WAITING_TRANSFER = 'pending_waiting_transfer',

  CC_REJECTED_CALL_FOR_AUTHORIZE = 'cc_rejected_call_for_authorize',
  CC_REJECTED_CARD_DISABLED = 'cc_rejected_card_disabled',
  CC_REJECTED_INSUFFICIENT_AMOUNT = 'cc_rejected_insufficient_amount',
  CC_REJECTED_MAX_ATTEMPTS = 'cc_rejected_max_attempts',
  CC_REJECTED_OTHER_REASON = 'cc_rejected_other_reason',

  REJECTED_BY_REGULATIONS = 'rejected_by_regulations',
  REJECTED_HIGH_RISK = 'rejected_high_risk',
  REJECTED_BY_BANK = 'rejected_by_bank',
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
