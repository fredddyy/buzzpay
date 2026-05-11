export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  userId: string;
  dealId: string;
  amount: number;         // in kobo
  commission: number;     // in kobo
  vendorAmount: number;   // in kobo
  paystackReference: string;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface InitializePaymentRequest {
  dealId: string;
}

export interface InitializePaymentResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}
