import { z } from 'zod';
import { VOUCHER_STATUSES } from '../constants/voucher.js';

export const voucherFilterSchema = z.object({
  status: z.enum(VOUCHER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const redeemByQrSchema = z.object({
  qrData: z.string().uuid('Invalid QR data'),
});

export const redeemByCodeSchema = z.object({
  voucherCode: z.string().length(8, 'Voucher code must be 8 characters'),
  dailyCode: z.string().length(6, 'Daily code must be 6 characters'),
});

export type VoucherFilterInput = z.infer<typeof voucherFilterSchema>;
