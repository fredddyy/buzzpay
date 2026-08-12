import { prisma } from '@buzzpay/db';

export const analyticsService = {
  async track(event: string, data?: { userId?: string; dealId?: string; vendorId?: string; metadata?: Record<string, unknown> }) {
    try {
      await prisma.analyticsEvent.create({
        data: {
          event,
          userId: data?.userId,
          dealId: data?.dealId,
          vendorId: data?.vendorId,
          metadata: data?.metadata as object ?? undefined,
        },
      });
    } catch {
      // Non-blocking — analytics should never crash the app
    }
  },

  async getStats(days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: since } },
      _count: true,
    });
    return events.map(e => ({ event: e.event, count: e._count }));
  },

  async getTopDeals(days: number = 7, limit: number = 10) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const views = await prisma.analyticsEvent.groupBy({
      by: ['dealId'],
      where: { event: 'deal_viewed', createdAt: { gte: since }, dealId: { not: null } },
      _count: true,
      orderBy: { _count: { dealId: 'desc' } },
      take: limit,
    });
    return views;
  },
};
