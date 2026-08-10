import { prisma } from '@buzzpay/db';
import type { DealCategory } from '@prisma/client';

export const dealRepository = {
  async findActive(params: {
    category?: DealCategory;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where = {
      isActive: true,
      expiresAt: { gt: new Date() },
      startsAt: { lte: new Date() },
      remainingQty: { gt: 0 },
      dailyStart: null as string | null, // Exclude time-window deals from main feed
      ...(params.category && { category: params.category }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' as const } },
          { description: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: { vendor: { select: { businessName: true, logoUrl: true, opensAt: true, closesAt: true } } },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.deal.count({ where }),
    ]);

    return { deals, total };
  },

  async findWithDailyWindow(limit: number = 100) {
    return prisma.deal.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        remainingQty: { gt: 0 },
        dailyStart: { not: null },
      },
      include: { vendor: { select: { businessName: true, logoUrl: true, opensAt: true, closesAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findFeatured(limit: number = 10) {
    return prisma.deal.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        expiresAt: { gt: new Date() },
        startsAt: { lte: new Date() },
        remainingQty: { gt: 0 },
      },
      include: { vendor: { select: { businessName: true, logoUrl: true, opensAt: true, closesAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findExpiringSoon(withinMinutes: number = 60) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinMinutes * 60 * 1000);

    return prisma.deal.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        remainingQty: { gt: 0 },
        expiresAt: { gt: now, lte: cutoff },
      },
      include: { vendor: { select: { businessName: true, logoUrl: true, opensAt: true, closesAt: true } } },
      orderBy: { expiresAt: 'asc' },
      take: 10,
    });
  },

  async findById(id: string) {
    return prisma.deal.findUnique({
      where: { id },
      include: { vendor: { select: { businessName: true, logoUrl: true, businessAddress: true, opensAt: true, closesAt: true, commissionRate: true, userId: true } } },
    });
  },

  async decrementQuantity(id: string, amount: number = 1) {
    return prisma.deal.update({
      where: { id },
      data: { remainingQty: { decrement: amount } },
    });
  },

  async incrementQuantity(id: string, amount: number = 1) {
    return prisma.deal.update({
      where: { id },
      data: { remainingQty: { increment: amount } },
    });
  },

  /** Atomically decrement stock — returns null if insufficient */
  async decrementQuantityAtomic(id: string, amount: number) {
    const result = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Deal"
      SET "remainingQty" = "remainingQty" - ${amount}
      WHERE id = ${id} AND "remainingQty" >= ${amount}
      RETURNING id
    `;
    return result.length > 0;
  },

  async stockCheck(dealIds: string[]) {
    return prisma.deal.findMany({
      where: { id: { in: dealIds } },
      select: { id: true, remainingQty: true, isActive: true, studentPrice: true, expiresAt: true },
    });
  },
};
