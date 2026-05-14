import { dealRepository } from '../repositories/deal.repository.js';
import { AppError } from '../middleware/error.js';
import type { DealFilterInput } from '@buzzpay/shared';
import type { DealCategory } from '@prisma/client';

function isVendorOpen(opensAt: string, closesAt: string): boolean {
  const now = new Date();
  // WAT = UTC+1
  const watHours = (now.getUTCHours() + 1) % 24;
  const watMinutes = now.getUTCMinutes();
  const currentMinutes = watHours * 60 + watMinutes;

  const [openH, openM] = opensAt.split(':').map(Number);
  const [closeH, closeM] = closesAt.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }
  // Wraps midnight (e.g. 22:00 - 02:00)
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

function mapDeal(d: any) {
  const open = isVendorOpen(d.vendor.opensAt, d.vendor.closesAt);
  return {
    id: d.id,
    vendorId: d.vendorId,
    vendorName: d.vendor.businessName,
    vendorLogo: d.vendor.logoUrl,
    vendorIsOpen: open,
    vendorOpensAt: d.vendor.opensAt,
    vendorClosesAt: d.vendor.closesAt,
    title: d.title,
    description: d.description,
    category: d.category,
    imageUrl: d.imageUrl,
    originalPrice: d.originalPrice,
    studentPrice: d.studentPrice,
    savings: d.originalPrice - d.studentPrice,
    totalQuantity: d.totalQuantity,
    remainingQty: d.remainingQty,
    maxPerUser: d.maxPerUser,
    startsAt: d.startsAt.toISOString(),
    expiresAt: d.expiresAt.toISOString(),
    isActive: d.isActive,
    isFeatured: d.isFeatured,
    guestAccess: d.guestAccess ?? false,
    dailyStart: d.dailyStart ?? null,
    dailyEnd: d.dailyEnd ?? null,
    activeDays: d.activeDays ?? [],
    featuredSection: d.featuredSection ?? null,
  };
}

export const dealService = {
  async list(params: DealFilterInput) {
    const { deals, total } = await dealRepository.findActive({
      category: params.category as DealCategory | undefined,
      search: params.search,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    });

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    return {
      deals: deals.map(mapDeal),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async happyHour() {
    // Find deals with daily windows that are currently active
    const allDeals = await dealRepository.findActive({ page: 1, limit: 100 });
    const now = new Date();
    // WAT = UTC+1
    const watHours = (now.getUTCHours() + 1) % 24;
    const watMinutes = now.getUTCMinutes();
    const currentMinutes = watHours * 60 + watMinutes;
    const currentDay = ((now.getUTCDay() + (now.getUTCHours() + 1 >= 24 ? 1 : 0)) % 7);

    const happyHourDeals = allDeals.deals.filter((d: any) => {
      if (!d.dailyStart || !d.dailyEnd) return false;

      // Check active days (empty = every day)
      if (d.activeDays && d.activeDays.length > 0 && !d.activeDays.includes(currentDay)) return false;

      const [startH, startM] = d.dailyStart.split(':').map(Number);
      const [endH, endM] = d.dailyEnd.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });

    return happyHourDeals.map(mapDeal).map((d: any) => ({
      ...d,
      // Add minutes remaining in today's window for countdown
      minutesRemaining: (() => {
        if (!d.dailyEnd) return 0;
        const [endH, endM] = d.dailyEnd.split(':').map(Number);
        return (endH * 60 + endM) - currentMinutes;
      })(),
    }));
  },

  async upcoming() {
    const allDeals = await dealRepository.findActive({ page: 1, limit: 100 });
    const now = new Date();
    const watHours = (now.getUTCHours() + 1) % 24;
    const watMinutes = now.getUTCMinutes();
    const currentMinutes = watHours * 60 + watMinutes;
    const currentDay = ((now.getUTCDay() + (now.getUTCHours() + 1 >= 24 ? 1 : 0)) % 7);

    const upcomingDeals = allDeals.deals.filter((d: any) => {
      if (!d.dailyStart || !d.dailyEnd) return false;
      if (d.activeDays && d.activeDays.length > 0 && !d.activeDays.includes(currentDay)) return false;

      const [startH, startM] = d.dailyStart.split(':').map(Number);
      const startMinutes = startH * 60 + startM;

      // Not active yet, but starts within 2 hours
      return startMinutes > currentMinutes && (startMinutes - currentMinutes) <= 120;
    });

    return upcomingDeals.map(mapDeal).map((d: any) => ({
      ...d,
      startsInMinutes: (() => {
        if (!d.dailyStart) return 0;
        const [h, m] = d.dailyStart.split(':').map(Number);
        return (h * 60 + m) - currentMinutes;
      })(),
    }));
  },

  async featured() {
    const deals = await dealRepository.findFeatured();
    return deals.map(mapDeal);
  },

  async getById(id: string) {
    const deal = await dealRepository.findById(id);
    if (!deal) {
      throw new AppError(404, 'Deal not found');
    }

    return {
      ...mapDeal(deal),
      vendorAddress: (deal.vendor as any).businessAddress,
    };
  },
};
