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
    return prisma.payment.create({
      data: {
        user: { connect: { id: data.userId } },
        deal: { connect: { id: data.dealId } },
        amount: data.amount,
        commission: data.commission,
        vendorAmount: data.vendorAmount,
        paystackReference: data.paystackReference,
        paystackAccessCode: data.paystackAccessCode,
      },
    });
  },

  async createCartPayment(data: {
    userId: string;
    vendorId: string;
    amount: number;
    commission: number;
    vendorAmount: number;
    paystackReference: string;
    paystackAccessCode: string;
    items: { dealId: string; quantity: number; unitPrice: number }[];
  }) {
    return prisma.payment.create({
      data: {
        user: { connect: { id: data.userId } },
        vendor: { connect: { id: data.vendorId } },
        amount: data.amount,
        commission: data.commission,
        vendorAmount: data.vendorAmount,
        paystackReference: data.paystackReference,
        paystackAccessCode: data.paystackAccessCode,
        orderItems: {
          create: data.items.map(item => ({
            dealId: item.dealId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.unitPrice * item.quantity,
          })),
        },
      },
      include: { orderItems: true },
    });
  },

  async findByReference(reference: string) {
    return prisma.payment.findUnique({
      where: { paystackReference: reference },
      include: {
        deal: { include: { vendor: true } },
        orderItems: { include: { deal: { include: { vendor: true } } } },
        vendor: true,
      },
    });
  },

  async markSuccess(id: string, metadata: unknown) {
    return prisma.payment.update({
      where: { id },
      data: { status: 'SUCCESS', paidAt: new Date(), metadata: metadata as object },
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

    // Count from both legacy single-deal payments and cart order items
    const [legacyCount, cartCount] = await Promise.all([
      prisma.payment.count({
        where: {
          userId,
          dealId,
          status: { in: ['PENDING', 'SUCCESS'] },
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.orderItem.count({
        where: {
          dealId,
          payment: {
            userId,
            status: { in: ['PENDING', 'SUCCESS'] },
            createdAt: { gte: startOfDay },
          },
        },
      }),
    ]);

    return legacyCount + cartCount;
  },

  async findPendingExpired(olderThanMinutes: number = 30) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return prisma.payment.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      include: {
        orderItems: true,
      },
    });
  },
};
