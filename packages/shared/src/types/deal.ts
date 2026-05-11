import type { DealCategory } from '../constants/categories.js';

export interface Deal {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorLogo: string | null;
  title: string;
  description: string;
  category: DealCategory;
  imageUrl: string | null;
  originalPrice: number;   // in kobo
  studentPrice: number;    // in kobo
  savings: number;          // in kobo (originalPrice - studentPrice)
  totalQuantity: number;
  remainingQty: number;
  maxPerUser: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface DealListParams {
  category?: DealCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DealListResponse {
  deals: Deal[];
  total: number;
  page: number;
  totalPages: number;
}
