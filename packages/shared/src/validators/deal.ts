import { z } from 'zod';
import { DEAL_CATEGORIES } from '../constants/categories.js';

export const dealFilterSchema = z.object({
  category: z.enum(DEAL_CATEGORIES).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createDealSchema = z.object({
  vendorId: z.string().cuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(DEAL_CATEGORIES),
  originalPrice: z.number().int().positive(),   // in kobo
  studentPrice: z.number().int().positive(),     // in kobo
  totalQuantity: z.number().int().min(1),
  maxPerUser: z.number().int().min(1).default(1),
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
}).refine(data => data.studentPrice < data.originalPrice, {
  message: 'Student price must be less than original price',
  path: ['studentPrice'],
});

export type DealFilterInput = z.infer<typeof dealFilterSchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
