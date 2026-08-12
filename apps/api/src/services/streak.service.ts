import { prisma } from '@buzzpay/db';

export const streakService = {
  /** Call after a successful payment to update the user's streak */
  async recordPurchase(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const streak = await prisma.userStreak.findUnique({ where: { userId } });

    if (!streak) {
      // First purchase ever
      await prisma.userStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, lastPurchaseDate: today },
      });
      return { currentStreak: 1, isNew: true };
    }

    const lastDate = streak.lastPurchaseDate ? new Date(streak.lastPurchaseDate) : null;
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    // Already purchased today — no streak change
    if (lastDate && lastDate.getTime() === today.getTime()) {
      return { currentStreak: streak.currentStreak, isNew: false };
    }

    let newStreak: number;
    if (lastDate && lastDate.getTime() === yesterday.getTime()) {
      // Consecutive day — increment streak
      newStreak = streak.currentStreak + 1;
    } else {
      // Streak broken — reset to 1
      newStreak = 1;
    }

    const newLongest = Math.max(streak.longestStreak, newStreak);

    await prisma.userStreak.update({
      where: { userId },
      data: { currentStreak: newStreak, longestStreak: newLongest, lastPurchaseDate: today },
    });

    return { currentStreak: newStreak, isNew: true, milestone: newStreak === 3 || newStreak === 5 || newStreak === 7 };
  },

  /** Get user's current streak */
  async getStreak(userId: string) {
    const streak = await prisma.userStreak.findUnique({ where: { userId } });
    if (!streak) return { currentStreak: 0, longestStreak: 0 };

    // Check if streak is still active (last purchase was today or yesterday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastDate = streak.lastPurchaseDate ? new Date(streak.lastPurchaseDate) : null;
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    const isActive = lastDate && (lastDate.getTime() === today.getTime() || lastDate.getTime() === yesterday.getTime());

    return {
      currentStreak: isActive ? streak.currentStreak : 0,
      longestStreak: streak.longestStreak,
      isActive: !!isActive,
      purchasedToday: lastDate?.getTime() === today.getTime(),
    };
  },
};
