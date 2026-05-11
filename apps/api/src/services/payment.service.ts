import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { paymentRepository } from '../repositories/payment.repository.js';
import { voucherRepository } from '../repositories/voucher.repository.js';
import { dealRepository } from '../repositories/deal.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { paystackService } from './paystack.service.js';
import { AppError } from '../middleware/error.js';
import { VOUCHER_EXPIRY_HOURS, VOUCHER_CODE_LENGTH } from '@buzzpay/shared';

export const paymentService = {
  async initialize(userId: string, dealId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, 'User not found');

    const deal = await dealRepository.findById(dealId);
    if (!deal) throw new AppError(404, 'Deal not found');
    if (!deal.isActive) throw new AppError(400, 'Deal is no longer active');
    if (deal.remainingQty <= 0) throw new AppError(400, 'Deal is sold out');
    if (new Date() > deal.expiresAt) throw new AppError(400, 'Deal has expired');

    // Check per-user daily limit
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
    };
  },

  async handleWebhook(event: string, data: any) {
    if (event !== 'charge.success') return;

    const reference = data.reference as string;
    const payment = await paymentRepository.findByReference(reference);
    if (!payment) return;
    if (payment.status === 'SUCCESS') return; // idempotent

    // Mark payment success
    await paymentRepository.markSuccess(payment.id, data);

    // Check if voucher already exists (idempotency)
    const existingVoucher = await voucherRepository.findByPaymentId(payment.id);
    if (existingVoucher) return;

    // Get student record
    const user = await userRepository.findById(payment.userId);
    if (!user?.student) return;

    // Generate voucher
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VOUCHER_EXPIRY_HOURS);

    await voucherRepository.create({
      studentId: user.student.id,
      dealId: payment.dealId,
      paymentId: payment.id,
      code: nanoid(VOUCHER_CODE_LENGTH).toUpperCase(),
      qrData: uuidv4(),
      expiresAt,
    });

    // Decrement deal quantity
    await dealRepository.decrementQuantity(payment.dealId);
  },

  async verifyPayment(reference: string) {
    const payment = await paymentRepository.findByReference(reference);
    if (!payment) throw new AppError(404, 'Payment not found');

    if (payment.status === 'PENDING') {
      // Poll Paystack as fallback
      const result = await paystackService.verifyTransaction(reference);
      if (result.status === 'success') {
        await this.handleWebhook('charge.success', result);
      }
    }

    // Reload payment
    const updated = await paymentRepository.findByReference(reference);
    return { status: updated?.status };
  },
};
