import { prisma } from '@buzzpay/db';

export const paymentRepository = {
  async create(data: {
    userId: string;
    dealId: string;
    amount: number;
    commission: number;
    vendorAmount: number;
    paystackReference: string;
    paystackAccessCode: string;
  }) {
    return prisma.payment.create({ data });
  },

  async findByReference(reference: string) {
    return prisma.payment.findUnique({
      where: { paystackReference: reference },
      include: { deal: { include: { vendor: true } } },
    });
  },

  async markSuccess(id: string, metadata: any) {
    return prisma.payment.update({
      where: { id },
      data: { status: 'SUCCESS', paidAt: new Date(), metadata },
    });
  },

  async markFailed(id: string) {
    return prisma.payment.update({
      where: { id },
      data: { status: 'FAILED' },
    });
  },

  async countUserDealToday(userId: string, dealId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return prisma.payment.count({
      where: {
        userId,
        dealId,
        status: { in: ['PENDING', 'SUCCESS'] },
        createdAt: { gte: startOfDay },
      },
    });
  },
};
