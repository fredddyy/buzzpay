export type VoucherStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED';

export interface Voucher {
  id: string;
  studentId: string;
  dealId: string;
  paymentId: string;
  code: string;         // 8-char alphanumeric backup code
  qrData: string;       // UUID for QR (separate from code)
  status: VoucherStatus;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  deal: {
    title: string;
    imageUrl: string | null;
    vendorName: string;
    studentPrice: number;
  };
}

export interface VoucherListParams {
  status?: VoucherStatus;
  page?: number;
  limit?: number;
}
