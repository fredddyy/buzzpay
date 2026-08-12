import { prisma } from '@buzzpay/db';
import { customAlphabet } from 'nanoid';
import { fcmService } from './fcm.service.js';
import { v4 as uuidv4 } from 'uuid';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export const referralService = {
  /** Generate a referral code for a user (called on signup) */
  async generateCode(userId: string): Promise<string> {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (existing?.referralCode) return existing.referralCode;

    let code = generateCode();
    // Retry if collision (unlikely with 6 chars)
    for (let i = 0; i < 3; i++) {
      try {
        await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
        return code;
      } catch {
        code = generateCode();
      }
    }
    return code;
  },

  /** Apply a referral code when a new user signs up */
  async applyCode(newUserId: string, code: string) {
    const referrer = await prisma.user.findFirst({ where: { referralCode: code.toUpperCase() } });
    if (!referrer) throw new Error('Invalid referral code');
    if (referrer.id === newUserId) throw new Error('Cannot refer yourself');

    const user = await prisma.user.findUnique({ where: { id: newUserId }, select: { referredById: true } });
    if (user?.referredById) throw new Error('Already used a referral code');

    await prisma.user.update({
      where: { id: newUserId },
      data: { referredById: referrer.id },
    });

    return { referrerName: referrer.fullName };
  },

  /** Called after a user's first successful purchase — check if referrer earns reward */
  async onFirstPurchase(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true, student: { select: { id: true, referralFirstPurchaseDone: true } } },
    });

    if (!user?.referredById) return; // No referrer
    if (!user.student) return;
    if ((user.student as any).referralFirstPurchaseDone) return; // Already counted

    // Mark first purchase done
    await prisma.student.update({
      where: { id: user.student.id },
      data: { referralFirstPurchaseDone: true } as any,
    });

    // Increment referrer's count
    const referrer = await prisma.user.update({
      where: { id: user.referredById },
      data: { referralCount: { increment: 1 } },
    });

    // Check if referrer hit the threshold (3 referrals = free meal)
    if (referrer.referralCount >= 3 && referrer.referralCount % 3 === 0) {
      await this.grantFreeMeal(referrer.id, referrer.referralCount);
    }

    // Notify referrer
    fcmService.sendToUser(user.referredById, '🎉 Referral success!',
      `Your friend just made their first purchase! ${3 - (referrer.referralCount % 3)} more until your free meal.`,
      { type: 'referral_progress' }).catch(() => {});
  },

  /** Notify referrer they can pick their free meal */
  async grantFreeMeal(userId: string, totalReferrals: number) {
    // Don't auto-create voucher — let student choose from available rewards
    fcmService.sendToUser(userId, '🎉 FREE MEAL unlocked!',
      `You referred ${totalReferrals} friends! Pick your free meal now — tap to choose!`,
      { type: 'referral_reward_pick' }).catch(() => {});
  },

  /** Get available reward deals for the student to choose from */
  async getRewardOptions() {
    const deals = await prisma.deal.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        remainingQty: { gt: 0 },
        tags: { has: 'referral-reward' },
      },
      include: { vendor: { select: { businessName: true, logoUrl: true, businessAddress: true } } },
      take: 5,
    });

    return deals.map(d => ({
      id: d.id,
      title: d.title,
      vendorName: d.vendor.businessName,
      vendorLogo: d.vendor.logoUrl,
      vendorAddress: d.vendor.businessAddress,
      imageUrl: d.imageUrl,
      originalPrice: d.originalPrice,
      studentPrice: d.studentPrice,
    }));
  },

  /** Student picks their free meal — create the voucher */
  async claimReward(userId: string, dealId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { student: true } });
    if (!user?.student) throw new Error('Not a student');

    // Check they have unclaimed rewards
    const rewardsEarned = Math.floor(user.referralCount / 3);
    const rewardsClaimed = await prisma.voucher.count({
      where: { studentId: user.student.id, paymentId: '' },
    });

    if (rewardsClaimed >= rewardsEarned) throw new Error('No unclaimed rewards');

    // Verify deal is a reward deal
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, tags: { has: 'referral-reward' }, isActive: true, remainingQty: { gt: 0 } },
    });
    if (!deal) throw new Error('This deal is not available as a reward');

    const voucherCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const voucher = await prisma.voucher.create({
      data: {
        studentId: user.student.id,
        dealId: deal.id,
        paymentId: '',
        code: voucherCode(8),
        qrData: uuidv4(),
        expiresAt,
      },
    });

    fcmService.sendToUser(userId, '🎁 Free meal claimed!',
      `Your free ${deal.title} voucher is ready. Show QR at the vendor!`,
      { type: 'referral_claimed' }).catch(() => {});

    return { voucherId: voucher.id, code: voucher.code, dealTitle: deal.title };
  },

  /** Get referral stats for a user */
  async getStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referralCount: true },
    });

    if (!user) return null;

    // Generate code if doesn't exist
    let code = user.referralCode;
    if (!code) {
      code = await this.generateCode(userId);
    }

    const untilReward = 3 - (user.referralCount % 3);

    return {
      code,
      referralCount: user.referralCount,
      untilReward: untilReward === 3 && user.referralCount > 0 ? 0 : untilReward,
      rewardsEarned: Math.floor(user.referralCount / 3),
      maxReferrals: 60, // 20 free meals max
    };
  },
};
