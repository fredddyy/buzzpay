export const VOUCHER_EXPIRY_HOURS = 24;
export const VOUCHER_CODE_LENGTH = 8;
export const DAILY_CODE_LENGTH = 6;

export const VOUCHER_STATUSES = ['ACTIVE', 'REDEEMED', 'EXPIRED'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const;
