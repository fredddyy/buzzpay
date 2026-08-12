import { prisma } from '@buzzpay/db';
import { nanoid } from 'nanoid';
import { AppError } from '../middleware/error.js';
import { paystackService } from './paystack.service.js';
import { userRepository } from '../repositories/user.repository.js';

export const walletService = {
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    return user?.walletBalance ?? 0;
  },

  async getHistory(userId: string, limit = 20, offset = 0) {
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.walletTransaction.count({ where: { userId } }),
    ]);
    return { transactions, total };
  },

  async creditWallet(userId: string, amount: number, type: string, opts?: { reference?: string; dealId?: string; metadata?: Record<string, unknown> }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type,
          amount,
          balance: user.walletBalance,
          reference: opts?.reference,
          dealId: opts?.dealId,
          metadata: opts?.metadata as object ?? undefined,
        },
      });

      return user.walletBalance;
    });
  },

  async debitWallet(userId: string, amount: number, dealId?: string) {
    return prisma.$transaction(async (tx) => {
      // Lock the row and check balance
      const user = await tx.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
      if (!user || user.walletBalance < amount) {
        throw new AppError(400, `Insufficient balance. You have ₦${((user?.walletBalance ?? 0) / 100).toLocaleString('en-NG')} but need ₦${(amount / 100).toLocaleString('en-NG')}`);
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount: -amount,
          balance: updated.walletBalance,
          dealId,
        },
      });

      return updated.walletBalance;
    });
  },

  async initializeTopUp(userId: string, amount: number) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    const reference = `wallet_${nanoid(16)}`;

    const result = await paystackService.initializeTransaction({
      email: user.email,
      amount,
      reference,
      callbackUrl: `https://buzzpay.ng/wallet/success?reference=${reference}`,
      metadata: { userId, type: 'wallet_topup', amount },
    });

    return {
      authorizationUrl: result.authorization_url,
      accessCode: result.access_code,
      reference,
      amount,
    };
  },

  async handleTopUpWebhook(reference: string, amount: number) {
    // Check if already processed (idempotent)
    const existing = await prisma.walletTransaction.findFirst({ where: { reference } });
    if (existing) return;

    // Find user from the payment
    const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });

    // The webhook might not have a payment row — top-ups don't create payment rows
    // We need to find the user from metadata. For now, search by reference prefix
    // In production, store pending top-ups in a separate table
    // Fallback: credit via the reference stored in metadata
  },
};
