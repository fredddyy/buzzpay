import { prisma } from '@buzzpay/db';
import { fcmService } from './fcm.service.js';

export const loyaltyService = {
  /** Increment stamp when a voucher is redeemed */
  async addStamp(studentId: string, vendorId: string, userId: string) {
    const card = await prisma.loyaltyCard.upsert({
      where: { studentId_vendorId: { studentId, vendorId } },
      create: { studentId, vendorId, stamps: 1, target: 5 },
      update: { stamps: { increment: 1 } },
    });

    // Check if they hit the target
    if (card.stamps >= card.target) {
      // Reset stamps, increment rewards
      await prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { stamps: 0, rewardsUsed: { increment: 1 } },
      });

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { businessName: true } });
      fcmService.sendToUser(userId, '🎉 Free deal unlocked!', `You've earned a free deal at ${vendor?.businessName ?? 'your favorite vendor'}! Check your loyalty card.`, { type: 'loyalty_reward' }).catch(() => {});

      return { stamps: 0, target: card.target, rewardEarned: true };
    }

    return { stamps: card.stamps, target: card.target, rewardEarned: false, remaining: card.target - card.stamps };
  },

  /** Get all loyalty cards for a student */
  async getCards(studentId: string) {
    return prisma.loyaltyCard.findMany({
      where: { studentId },
      include: { vendor: { select: { businessName: true, logoUrl: true } } },
      orderBy: { stamps: 'desc' },
    });
  },

  /** Get loyalty card for a specific vendor */
  async getCard(studentId: string, vendorId: string) {
    return prisma.loyaltyCard.findUnique({
      where: { studentId_vendorId: { studentId, vendorId } },
    });
  },
};
