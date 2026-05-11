import { voucherRepository } from '../repositories/voucher.repository.js';
import { AppError } from '../middleware/error.js';
import type { VoucherStatus } from '@prisma/client';

export const voucherService = {
  async listForStudent(studentId: string, params: { status?: string; page: number; limit: number }) {
    const { vouchers, total } = await voucherRepository.findByStudent(studentId, {
      status: params.status as VoucherStatus | undefined,
      page: params.page,
      limit: params.limit,
    });

    return {
      vouchers: vouchers.map((v) => ({
        id: v.id,
        code: v.code,
        qrData: v.qrData,
        status: v.status,
        expiresAt: v.expiresAt.toISOString(),
        redeemedAt: v.redeemedAt?.toISOString() ?? null,
        createdAt: v.createdAt.toISOString(),
        deal: {
          title: v.deal.title,
          imageUrl: v.deal.imageUrl,
          vendorName: v.deal.vendor.businessName,
          studentPrice: v.deal.studentPrice,
        },
      })),
      total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit),
    };
  },

  async getById(id: string, studentId?: string) {
    const voucher = await voucherRepository.findById(id);
    if (!voucher) throw new AppError(404, 'Voucher not found');
    if (studentId && voucher.studentId !== studentId) {
      throw new AppError(403, 'Not your voucher');
    }

    return {
      id: voucher.id,
      code: voucher.code,
      qrData: voucher.qrData,
      status: voucher.status,
      expiresAt: voucher.expiresAt.toISOString(),
      redeemedAt: voucher.redeemedAt?.toISOString() ?? null,
      createdAt: voucher.createdAt.toISOString(),
      deal: {
        title: voucher.deal.title,
        imageUrl: voucher.deal.imageUrl,
        vendorName: voucher.deal.vendor.businessName,
        studentPrice: voucher.deal.studentPrice,
      },
    };
  },

  async redeemByQr(qrData: string, vendorUserId: string) {
    const voucher = await voucherRepository.findByQrData(qrData);
    if (!voucher) throw new AppError(404, 'Invalid QR code');
    if (voucher.status === 'REDEEMED') throw new AppError(400, 'Voucher already redeemed');
    if (voucher.status === 'EXPIRED' || voucher.expiresAt < new Date()) {
      throw new AppError(400, 'Voucher has expired');
    }
    if (voucher.deal.vendor.userId !== vendorUserId) {
      throw new AppError(403, 'This voucher is not for your business');
    }

    await voucherRepository.markRedeemed(voucher.id, false);
    return {
      voucherId: voucher.id,
      dealTitle: voucher.deal.title,
      studentName: voucher.student.user.fullName,
      amount: voucher.deal.studentPrice,
    };
  },

  async expireOverdue() {
    const result = await voucherRepository.expireOverdue();
    return result.count;
  },
};
