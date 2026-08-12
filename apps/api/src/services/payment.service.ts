import { v4 as uuidv4 } from 'uuid';
import { nanoid, customAlphabet } from 'nanoid';
const voucherCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
import { paymentRepository } from '../repositories/payment.repository.js';
import { voucherRepository } from '../repositories/voucher.repository.js';
import { dealRepository } from '../repositories/deal.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { paystackService } from './paystack.service.js';
import { AppError } from '../middleware/error.js';
import { realtimeService } from './realtime.service.js';
import { fcmService } from './fcm.service.js';
import { streakService } from './streak.service.js';
import { analyticsService } from './analytics.service.js';
import { VOUCHER_EXPIRY_HOURS, VOUCHER_CODE_LENGTH } from '@buzzpay/shared';

export const paymentService = {
  // ── Legacy single-deal checkout ──
  async initialize(userId: string, dealId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    const deal = await dealRepository.findById(dealId);
    if (!deal) throw new AppError(404, 'Deal not found');
    if (!deal.isActive) throw new AppError(400, 'Deal is no longer active');
    if (deal.remainingQty <= 0) throw new AppError(400, 'Deal is sold out');
    if (new Date() > deal.expiresAt) throw new AppError(400, 'Deal has expired');

    const todayCount = await paymentRepository.countUserDealToday(userId, dealId);
    if (todayCount >= deal.maxPerUser) {
      throw new AppError(400, `You can only purchase this deal ${deal.maxPerUser} time(s) per day`);
    }

    const commission = Math.round(deal.studentPrice * deal.vendor.commissionRate);
    const vendorAmount = deal.studentPrice - commission;
    const reference = `bp_${nanoid(16)}`;

    const paystackResult = await paystackService.initializeTransaction({
      email: user.email,
      amount: deal.studentPrice,
      reference,
      callbackUrl: `https://buzzpay.ng/payment/success?reference=${reference}`,
      metadata: { dealId, userId, dealTitle: deal.title },
    });

    await paymentRepository.create({
      userId,
      dealId,
      amount: deal.studentPrice,
      commission,
      vendorAmount,
      paystackReference: reference,
      paystackAccessCode: paystackResult.access_code,
    });

    return {
      authorizationUrl: paystackResult.authorization_url,
      accessCode: paystackResult.access_code,
      reference,
      amount: deal.studentPrice,
    };
  },

  // ── Cart checkout (multi-deal, single vendor) ──
  async cartCheckout(userId: string, vendorId: string, items: { dealId: string; quantity: number }[]) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    // Load and validate all deals
    const dealIds = items.map(i => i.dealId);
    const deals = await Promise.all(dealIds.map(id => dealRepository.findById(id)));
    const dealMap = new Map(deals.filter(Boolean).map(d => [d!.id, d!]));

    const errors: { dealId: string; error: string }[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const deal = dealMap.get(item.dealId);
      if (!deal) { errors.push({ dealId: item.dealId, error: 'Deal not found' }); continue; }
      if (deal.vendorId !== vendorId) { errors.push({ dealId: item.dealId, error: 'Deal does not belong to this vendor' }); continue; }
      if (!deal.isActive) { errors.push({ dealId: item.dealId, error: 'Deal is no longer active' }); continue; }
      if (deal.remainingQty < item.quantity) { errors.push({ dealId: item.dealId, error: `Only ${deal.remainingQty} left` }); continue; }
      if (new Date() > deal.expiresAt) { errors.push({ dealId: item.dealId, error: 'Deal has expired' }); continue; }

      const todayCount = await paymentRepository.countUserDealToday(userId, item.dealId);
      if (todayCount + item.quantity > deal.maxPerUser) {
        errors.push({ dealId: item.dealId, error: `Limit ${deal.maxPerUser} per day (you have ${todayCount})` });
        continue;
      }

      totalAmount += deal.studentPrice * item.quantity;
    }

    if (errors.length > 0) {
      throw new AppError(409, 'Some items have issues', { items: errors });
    }

    // Atomically reserve stock for each deal
    for (const item of items) {
      const reserved = await dealRepository.decrementQuantityAtomic(item.dealId, item.quantity);
      if (!reserved) {
        // Rollback any already-reserved items
        const idx = items.indexOf(item);
        for (let i = 0; i < idx; i++) {
          await dealRepository.incrementQuantity(items[i].dealId, items[i].quantity);
        }
        const deal = dealMap.get(item.dealId)!;
        throw new AppError(409, `${deal.title} just sold out`, { items: [{ dealId: item.dealId, error: 'Sold out' }] });
      }
    }

    // Calculate commission using vendor's rate
    const vendor = deals[0]!.vendor;
    const commission = Math.round(totalAmount * vendor.commissionRate);
    const vendorAmount = totalAmount - commission;
    const reference = `bp_cart_${nanoid(16)}`;

    const paystackResult = await paystackService.initializeTransaction({
      email: user.email,
      amount: totalAmount,
      reference,
      callbackUrl: `https://buzzpay.ng/payment/success?reference=${reference}`,
      metadata: { vendorId, userId, itemCount: items.length, type: 'cart' },
    });

    await paymentRepository.createCartPayment({
      userId,
      vendorId,
      amount: totalAmount,
      commission,
      vendorAmount,
      paystackReference: reference,
      paystackAccessCode: paystackResult.access_code,
      items: items.map(item => ({
        dealId: item.dealId,
        quantity: item.quantity,
        unitPrice: dealMap.get(item.dealId)!.studentPrice,
      })),
    });

    return {
      authorizationUrl: paystackResult.authorization_url,
      accessCode: paystackResult.access_code,
      reference,
      vendorId,
      totalAmount,
      itemCount: items.length,
    };
  },

  // ── Webhook handler (supports both legacy and cart payments) ──
  async handleWebhook(event: string, data: unknown) {
    if (event !== 'charge.success') return;

    const webhookData = data as { reference: string };
    const reference = webhookData.reference;
    const payment = await paymentRepository.findByReference(reference);
    if (!payment) return;
    if (payment.status === 'SUCCESS') return; // idempotent

    await paymentRepository.markSuccess(payment.id, data);

    // Check if vouchers already exist (idempotency)
    const existingCount = await voucherRepository.countByPaymentId(payment.id);

    const user = await userRepository.findById(payment.userId);
    if (!user?.student) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VOUCHER_EXPIRY_HOURS);

    if (payment.orderItems && payment.orderItems.length > 0) {
      // Cart payment — generate vouchers for each order item × quantity
      const expectedTotal = payment.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
      if (existingCount >= expectedTotal) return; // already generated

      for (const orderItem of payment.orderItems) {
        for (let i = 0; i < orderItem.quantity; i++) {
          await voucherRepository.create({
            studentId: user.student.id,
            dealId: orderItem.dealId,
            paymentId: payment.id,
            code: voucherCode(VOUCHER_CODE_LENGTH),
            qrData: uuidv4(),
            expiresAt,
          });
        }
        realtimeService.dealChanged(orderItem.dealId, 'updated');
        realtimeService.stockChanged(orderItem.dealId, -orderItem.quantity);
      }
    } else if (payment.dealId) {
      // Legacy single-deal payment
      if (existingCount > 0) return;

      await voucherRepository.create({
        studentId: user.student.id,
        dealId: payment.dealId,
        paymentId: payment.id,
        code: voucherCode(VOUCHER_CODE_LENGTH),
        qrData: uuidv4(),
        expiresAt,
      });

      await dealRepository.decrementQuantity(payment.dealId);
      realtimeService.dealChanged(payment.dealId, 'updated');
      realtimeService.stockChanged(payment.dealId, -1);
    }

    realtimeService.paymentCompleted(payment.id, payment.dealId ?? '', payment.amount);
    realtimeService.voucherStatusChanged(user.id, payment.id, 'ACTIVE');

    // Analytics
    analyticsService.track('payment_completed', { userId: payment.userId, dealId: payment.dealId ?? undefined, metadata: { amount: payment.amount } });

    // Update streak
    const streakResult = await streakService.recordPurchase(payment.userId);
    if (streakResult.milestone) {
      fcmService.sendToUser(payment.userId, `🔥 ${streakResult.currentStreak}-day streak!`, `You've bought deals ${streakResult.currentStreak} days in a row. Keep it up!`, { type: 'streak_milestone' }).catch(() => {});
    }

    // Push notification
    const dealTitle = payment.orderItems?.length
      ? payment.orderItems.map((oi: { deal: { title: string } }) => oi.deal.title).join(', ')
      : payment.deal?.title ?? 'Deal';
    fcmService.paymentSuccess(payment.userId, dealTitle, payment.amount).catch(() => {});
  },

  async verifyPayment(reference: string) {
    const payment = await paymentRepository.findByReference(reference);
    if (!payment) throw new AppError(404, 'Payment not found');

    if (payment.status === 'PENDING') {
      const result = await paystackService.verifyTransaction(reference);
      if (result.status === 'success') {
        await this.handleWebhook('charge.success', result);
      }
    } else if (payment.status === 'SUCCESS') {
      const existingCount = await voucherRepository.countByPaymentId(payment.id);
      if (existingCount === 0) {
        // Create missing vouchers
        const user = await userRepository.findById(payment.userId);
        if (user?.student) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + VOUCHER_EXPIRY_HOURS);

          if (payment.orderItems && payment.orderItems.length > 0) {
            for (const orderItem of payment.orderItems) {
              for (let i = 0; i < orderItem.quantity; i++) {
                await voucherRepository.create({
                  studentId: user.student.id,
                  dealId: orderItem.dealId,
                  paymentId: payment.id,
                  code: voucherCode(VOUCHER_CODE_LENGTH),
                  qrData: uuidv4(),
                  expiresAt,
                });
              }
            }
          } else if (payment.dealId) {
            await voucherRepository.create({
              studentId: user.student.id,
              dealId: payment.dealId,
              paymentId: payment.id,
              code: voucherCode(VOUCHER_CODE_LENGTH),
              qrData: uuidv4(),
              expiresAt,
            });
            await dealRepository.decrementQuantity(payment.dealId);
          }
        }
      }
    }

    const updated = await paymentRepository.findByReference(reference);
    return { status: updated?.status };
  },

  // ── Release stock from abandoned payments ──
  async releaseAbandonedStock() {
    const expired = await paymentRepository.findPendingExpired(30);
    let released = 0;

    for (const payment of expired) {
      if (payment.orderItems.length > 0) {
        // Cart payment — release stock for each order item
        for (const item of payment.orderItems) {
          await dealRepository.incrementQuantity(item.dealId, item.quantity);
        }
      }
      // Note: legacy single-deal payments don't reserve stock upfront
      await paymentRepository.markFailed(payment.id);
      released++;
    }

    return released;
  },
};
