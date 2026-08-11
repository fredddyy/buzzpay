import { prisma } from '@buzzpay/db';
import { nanoid } from 'nanoid';
import { paystackService } from './paystack.service.js';
import { fcmService } from './fcm.service.js';

export const payoutService = {
  /** Calculate pending payout for a vendor (payments not yet included in any payout) */
  async calculatePending(vendorId: string) {
    // Get all SUCCESS payments for this vendor that aren't in any payout
    const result = await prisma.$queryRaw<{ total: bigint; count: bigint }[]>`
      SELECT COALESCE(SUM(p."vendorAmount"), 0) as total, COUNT(*) as count
      FROM "Payment" p
      WHERE p.status = 'SUCCESS'
      AND (p."vendorId" = ${vendorId} OR p."dealId" IN (SELECT id FROM "Deal" WHERE "vendorId" = ${vendorId}))
      AND p.id NOT IN (SELECT "paymentId" FROM "PayoutItem")
    `;
    return {
      amount: Number(result[0]?.total ?? 0),
      paymentCount: Number(result[0]?.count ?? 0),
    };
  },

  /** Create a payout and initiate Paystack transfer */
  async createPayout(vendorId: string) {
    // Check bank account
    const bankAccount = await prisma.vendorBankAccount.findUnique({ where: { vendorId } });
    if (!bankAccount) throw new Error('Vendor has no bank account registered');
    if (!bankAccount.isVerified) throw new Error('Bank account not verified by admin');

    // Calculate pending amount
    const { amount, paymentCount } = await this.calculatePending(vendorId);
    if (amount <= 0) throw new Error('No pending payout');

    // Get unpaid payments
    const payments = await prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        OR: [
          { vendorId },
          { deal: { vendorId } },
        ],
        payoutItems: { none: {} },
      },
      select: { id: true, vendorAmount: true },
    });

    const reference = `payout_${nanoid(16)}`;

    // Create Paystack transfer recipient if not exists
    let recipientCode = bankAccount.recipientCode;
    if (!recipientCode) {
      const recipient = await paystackService.createTransferRecipient(
        bankAccount.accountNumber,
        bankAccount.bankCode,
        bankAccount.accountName,
      );
      recipientCode = recipient.recipient_code;
      await prisma.vendorBankAccount.update({
        where: { id: bankAccount.id },
        data: { recipientCode },
      });
    }

    // Create payout record with items
    const payout = await prisma.payout.create({
      data: {
        vendorId,
        amount,
        periodStart: new Date(Math.min(...payments.map(p => Date.now()))),
        periodEnd: new Date(),
        voucherCount: paymentCount,
        status: 'PROCESSING',
        reference,
        items: {
          create: payments.map(p => ({
            paymentId: p.id,
            amount: p.vendorAmount,
          })),
        },
      },
    });

    // Initiate Paystack transfer
    try {
      const transfer = await paystackService.initiateTransfer(
        amount,
        recipientCode,
        reference,
      );
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          paystackTransferCode: transfer.transfer_code,
          paystackTransferId: String(transfer.id),
        },
      });
    } catch (err) {
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'FAILED', failureReason: err instanceof Error ? err.message : 'Transfer failed' },
      });
      throw err;
    }

    return payout;
  },

  /** Handle Paystack transfer webhook */
  async handleTransferWebhook(event: string, data: { reference: string; status: string; reason?: string }) {
    if (event !== 'transfer.success' && event !== 'transfer.failed' && event !== 'transfer.reversed') return;

    const payout = await prisma.payout.findUnique({ where: { reference: data.reference } });
    if (!payout) return;
    if (payout.status === 'PAID') return; // idempotent

    if (event === 'transfer.success') {
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
      // Notify vendor
      const vendor = await prisma.vendor.findUnique({ where: { id: payout.vendorId } });
      if (vendor) {
        const naira = `₦${(payout.amount / 100).toLocaleString('en-NG')}`;
        fcmService.sendToUser(vendor.userId, 'Payout Received! 💰', `${naira} has been sent to your bank account.`, { type: 'payout_success' }).catch(() => {});
      }
    } else {
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: 'FAILED', failureReason: data.reason || 'Transfer failed' },
      });
    }
  },

  /** List pending payouts for admin */
  async listPending() {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      include: { user: { select: { fullName: true } }, bankAccount: true },
    });

    const results = [];
    for (const vendor of vendors) {
      const { amount, paymentCount } = await this.calculatePending(vendor.id);
      if (amount <= 0) continue;

      const lastPayout = await prisma.payout.findFirst({
        where: { vendorId: vendor.id, status: 'PAID' },
        orderBy: { paidAt: 'desc' },
      });

      results.push({
        vendorId: vendor.id,
        vendorName: vendor.businessName,
        pendingAmount: amount,
        paymentCount,
        hasBankAccount: !!vendor.bankAccount,
        bankVerified: vendor.bankAccount?.isVerified ?? false,
        lastPayoutAt: lastPayout?.paidAt ?? null,
      });
    }

    return results;
  },

  /** Payout history for a vendor */
  async vendorHistory(vendorId: string, limit = 20, offset = 0) {
    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payout.count({ where: { vendorId } }),
    ]);
    return { payouts, total };
  },

  /** Weekly auto-payout for all vendors */
  async processWeeklyPayouts() {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true, bankAccount: { isVerified: true } },
    });

    let success = 0;
    let failed = 0;

    for (const vendor of vendors) {
      try {
        const { amount } = await this.calculatePending(vendor.id);
        if (amount <= 0) continue;
        await this.createPayout(vendor.id);
        success++;
      } catch (err) {
        console.error(`[Payout] Failed for vendor ${vendor.id}:`, err instanceof Error ? err.message : err);
        failed++;
      }
    }

    return { success, failed };
  },
};
