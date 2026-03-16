export interface ICreateRefund {
  orderId: string;
  reason: string;
  description: string;
}

export interface IAdminRefundAction {
  adminResponse: string;
}
