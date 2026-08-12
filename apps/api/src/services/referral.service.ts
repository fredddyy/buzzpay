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

  /** Grant free meal voucher to referrer */
  async grantFreeMeal(userId: string, totalReferrals: number) {
    // Find the admin-configured reward deal
    // Look for a deal tagged with 'referral-reward' or use the most popular deal
    const rewardDeal = await prisma.deal.findFirst({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        remainingQty: { gt: 0 },
        tags: { has: 'referral-reward' },
      },
    }) || await prisma.deal.findFirst({
      where: { isActive: true, expiresAt: { gt: new Date() }, remainingQty: { gt: 0 }, category: 'FOOD' },
      orderBy: { remainingQty: 'desc' },
    });

    if (!rewardDeal) return; // No reward deal available

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { student: true } });
    if (!user?.student) return;

    // Create a free voucher (no payment)
    const voucherCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to redeem

    await prisma.voucher.create({
      data: {
        studentId: user.student.id,
        dealId: rewardDeal.id,
        paymentId: '', // No payment — it's a reward
        code: voucherCode(8),
        qrData: uuidv4(),
        expiresAt,
      },
    });

    fcmService.sendToUser(userId, '🎉 FREE MEAL unlocked!',
      `You referred ${totalReferrals} friends! Your free ${rewardDeal.title} voucher is ready. Check your vouchers tab!`,
      { type: 'referral_reward' }).catch(() => {});
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
