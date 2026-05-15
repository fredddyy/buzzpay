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

function getWatTime() {
  const now = new Date();
  const watHours = (now.getUTCHours() + 1) % 24;
  const watMinutes = now.getUTCMinutes();
  const currentMinutes = watHours * 60 + watMinutes;
  const currentDay = ((now.getUTCDay() + (now.getUTCHours() + 1 >= 24 ? 1 : 0)) % 7);
  return { currentMinutes, currentDay };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Compute deal lifecycle status:
 * - "preview": visible but not purchasable (previewStart <= now < dailyStart)
 * - "active": live and purchasable (dailyStart <= now < dailyEnd)
 * - "ended": daily window passed for today
 * - "upcoming": starts within 2 hours
 * - "available": no daily window, always active
 */
function computeDealStatus(d: any): { status: string; canRedeem: boolean; minutesRemaining: number; startsInMinutes: number } {
  const { currentMinutes, currentDay } = getWatTime();

  // No daily window → always available
  if (!d.dailyStart || !d.dailyEnd) {
    return { status: 'available', canRedeem: true, minutesRemaining: 0, startsInMinutes: 0 };
  }

  // Check active days
  if (d.activeDays && d.activeDays.length > 0 && !d.activeDays.includes(currentDay)) {
    return { status: 'ended', canRedeem: false, minutesRemaining: 0, startsInMinutes: 0 };
  }

  const startMin = toMinutes(d.dailyStart);
  const endMin = toMinutes(d.dailyEnd);
  const previewMin = d.previewStart ? toMinutes(d.previewStart) : startMin - 120; // default: 2h before

  if (currentMinutes >= startMin && currentMinutes < endMin) {
    return { status: 'active', canRedeem: true, minutesRemaining: endMin - currentMinutes, startsInMinutes: 0 };
  }

  if (currentMinutes >= previewMin && currentMinutes < startMin) {
    return { status: 'preview', canRedeem: false, minutesRemaining: 0, startsInMinutes: startMin - currentMinutes };
  }

  if (currentMinutes < previewMin && (startMin - currentMinutes) <= 120) {
    return { status: 'upcoming', canRedeem: false, minutesRemaining: 0, startsInMinutes: startMin - currentMinutes };
  }

  if (currentMinutes >= endMin) {
    return { status: 'ended', canRedeem: false, minutesRemaining: 0, startsInMinutes: 0 };
  }

  return { status: 'available', canRedeem: true, minutesRemaining: 0, startsInMinutes: 0 };
}

function mapDeal(d: any) {
  const open = isVendorOpen(d.vendor.opensAt, d.vendor.closesAt);
  const lifecycle = computeDealStatus(d);

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
    previewStart: d.previewStart ?? null,
    activeDays: d.activeDays ?? [],
    isRecurring: d.isRecurring ?? false,
    featuredSection: d.featuredSection ?? null,
    tags: d.tags ?? [],
    // Computed lifecycle
    dealStatus: lifecycle.status,
    canRedeem: lifecycle.canRedeem,
    minutesRemaining: lifecycle.minutesRemaining,
    startsInMinutes: lifecycle.startsInMinutes,
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

      // Already active? Skip (it's in happy hour, not upcoming)
      const [endH, endM] = d.dailyEnd.split(':').map(Number);
      const endMinutes = endH * 60 + endM;
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return false;

      // In preview state (previewStart <= now < dailyStart) — always show
      if (d.previewStart) {
        const [prevH, prevM] = d.previewStart.split(':').map(Number);
        const previewMinutes = prevH * 60 + prevM;
        if (currentMinutes >= previewMinutes && currentMinutes < startMinutes) return true;
      }

      // Not in preview but starts within 2 hours
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

  async collections() {
    const allDeals = await dealRepository.findActive({ page: 1, limit: 100 });
    const tagMap = new Map<string, any[]>();

    for (const d of allDeals.deals) {
      if (!d.tags || d.tags.length === 0) continue;
      for (const tag of d.tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag)!.push(d);
      }
    }

    // Only return collections with 2+ deals
    const collections = Array.from(tagMap.entries())
      .filter(([, deals]) => deals.length >= 2)
      .map(([tag, deals]) => ({
        tag,
        title: tag.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        deals: deals.map(mapDeal),
      }));

    return collections;
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
