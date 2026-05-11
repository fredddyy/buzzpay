import { prisma } from '@buzzpay/db';
import type { VoucherStatus } from '@prisma/client';

export const voucherRepository = {
  async create(data: {
    studentId: string;
    dealId: string;
    paymentId: string;
    code: string;
    qrData: string;
    expiresAt: Date;
  }) {
    return prisma.voucher.create({
      data,
      include: { deal: { include: { vendor: true } } },
    });
  },

  async findByPaymentId(paymentId: string) {
    return prisma.voucher.findUnique({ where: { paymentId } });
  },

  async findByQrData(qrData: string) {
    return prisma.voucher.findUnique({
      where: { qrData },
      include: { deal: { include: { vendor: true } }, student: { include: { user: true } } },
    });
  },

  async findByCode(code: string) {
    return prisma.voucher.findUnique({
      where: { code },
      include: { deal: { include: { vendor: true } }, student: { include: { user: true } } },
    });
  },

  async findByStudent(studentId: string, params: { status?: VoucherStatus; page: number; limit: number }) {
    const where = {
      studentId,
      ...(params.status && { status: params.status }),
    };

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        include: { deal: { include: { vendor: { select: { businessName: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.voucher.count({ where }),
    ]);

    return { vouchers, total };
  },

  async findById(id: string) {
    return prisma.voucher.findUnique({
      where: { id },
      include: { deal: { include: { vendor: { select: { businessName: true, logoUrl: true } } } } },
    });
  },

  async markRedeemed(id: string, byCode: boolean) {
    return prisma.voucher.update({
      where: { id },
      data: { status: 'REDEEMED', redeemedAt: new Date(), redeemedByCode: byCode },
    });
  },

  async expireOverdue() {
    return prisma.voucher.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  },
};
