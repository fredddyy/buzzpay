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
      include: { vendor: { select: { businessName: true, logoUrl: true, businessAddress: true, opensAt: true, closesAt: true } } },
    });
  },

  async decrementQuantity(id: string) {
    return prisma.deal.update({
      where: { id },
      data: { remainingQty: { decrement: 1 } },
    });
  },

  async incrementQuantity(id: string) {
    return prisma.deal.update({
      where: { id },
      data: { remainingQty: { increment: 1 } },
    });
  },
};
