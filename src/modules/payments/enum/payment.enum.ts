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
