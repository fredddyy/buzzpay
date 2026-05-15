import { voucherRepository } from '../repositories/voucher.repository.js';
import { AppError } from '../middleware/error.js';
import { buildQrPayload, validateQrPayload, generateQrSecret } from '../utils/qr-totp.js';
import { realtimeService } from './realtime.service.js';
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
        qrSecret: (v as any).qrSecret ?? null, // include secret for offline rotating QR
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

  async redeemByCode(code: string, vendorUserId: string) {
    const voucher = await voucherRepository.findByCode(code);
    if (!voucher) throw new AppError(404, 'Invalid voucher code');
    if (voucher.status === 'REDEEMED') throw new AppError(400, 'Voucher already redeemed');
    if (voucher.status === 'EXPIRED' || voucher.expiresAt < new Date()) {
      throw new AppError(400, 'Voucher has expired');
    }
    if (voucher.deal.vendor.userId !== vendorUserId) {
      throw new AppError(403, 'This voucher is not for your business');
    }

    await voucherRepository.markRedeemed(voucher.id, true);
    realtimeService.voucherRedeemed(voucher.id, voucher.dealId, voucher.deal.vendor.id);
    realtimeService.voucherStatusChanged(voucher.student.user.id, voucher.id, 'REDEEMED');
    return {
      voucherId: voucher.id,
      dealTitle: voucher.deal.title,
      studentName: voucher.student.user.fullName,
      amount: voucher.deal.studentPrice,
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
    realtimeService.voucherRedeemed(voucher.id, voucher.dealId, voucher.deal.vendor.id);
    realtimeService.voucherStatusChanged(voucher.student.user.id, voucher.id, 'REDEEMED');
    return {
      voucherId: voucher.id,
      dealTitle: voucher.deal.title,
      studentName: voucher.student.user.fullName,
      amount: voucher.deal.studentPrice,
    };
  },

  /**
   * Get a fresh rotating QR payload for a voucher.
   * Generates a qrSecret on first call if one doesn't exist.
   */
  async getRotatingQr(voucherId: string, studentId: string) {
    const voucher = await voucherRepository.findById(voucherId);
    if (!voucher) throw new AppError(404, 'Voucher not found');
    if (voucher.studentId !== studentId) throw new AppError(403, 'Not your voucher');
    if (voucher.status !== 'ACTIVE') throw new AppError(400, 'Voucher is not active');
    if (voucher.expiresAt < new Date()) throw new AppError(400, 'Voucher expired');

    let secret = (voucher as any).qrSecret as string | null;
    if (!secret) {
      secret = generateQrSecret();
      await voucherRepository.setQrSecret(voucherId, secret);
    }

    const payload = buildQrPayload(voucherId, secret);
    return {
      payload,
      expiresInSeconds: 60 - (Math.floor(Date.now() / 1000) % 60),
      voucherId,
    };
  },

  /**
   * Validate a rotating QR scanned by a vendor.
   * Checks TOTP window, voucher status, and vendor ownership.
   */
  async redeemByRotatingQr(qrPayload: string, vendorUserId: string) {
    // Parse & extract voucher ID
    const match = qrPayload.match(/^bp:\/\/([^/]+)\//);
    if (!match) throw new AppError(400, 'Invalid QR format');

    const voucherId = match[1];
    const voucher = await voucherRepository.findById(voucherId);
    if (!voucher) throw new AppError(404, 'Voucher not found');

    const secret = (voucher as any).qrSecret as string | null;
    if (!secret) throw new AppError(400, 'QR not initialized for this voucher');

    // Validate TOTP
    const result = validateQrPayload(qrPayload, secret);
    if (!result.valid) {
      throw new AppError(400, result.reason || 'Invalid QR code');
    }

    // Business checks
    if (voucher.status === 'REDEEMED') throw new AppError(400, 'Voucher already redeemed');
    if (voucher.status === 'EXPIRED' || voucher.expiresAt < new Date()) {
      throw new AppError(400, 'Voucher has expired');
    }

    // Vendor ownership check
    const fullVoucher = await voucherRepository.findByQrData(voucher.qrData);
    if (fullVoucher && fullVoucher.deal.vendor.userId !== vendorUserId) {
      throw new AppError(403, 'This voucher is not for your business');
    }

    await voucherRepository.markRedeemed(voucher.id, false);
    if (fullVoucher) {
      realtimeService.voucherRedeemed(voucher.id, voucher.dealId, fullVoucher.deal.vendor.id);
      realtimeService.voucherStatusChanged(fullVoucher.student.user.id, voucher.id, 'REDEEMED');
    }
    return {
      voucherId: voucher.id,
      dealTitle: voucher.deal.title,
      studentName: fullVoucher?.student.user.fullName ?? 'Student',
      amount: voucher.deal.studentPrice,
    };
  },

  async expireOverdue() {
    const result = await voucherRepository.expireOverdue();
    return result.count;
  },
};
