/**
 * Push notification service — wraps fcmService for backward compatibility.
 */
import { fcmService } from './fcm.service.js';

export const pushService = {
  async send(userId: string, title: string, body: string, data?: Record<string, string>) {
    await fcmService.sendToUser(userId, title, body, data);
  },

  async verificationApproved(studentUserId: string) {
    await fcmService.verificationApproved(studentUserId);
  },

  async verificationRejected(studentUserId: string, reason: string) {
    await fcmService.verificationRejected(studentUserId, reason);
  },

  async voucherRedeemedNotification(studentUserId: string, dealTitle: string) {
    await fcmService.voucherRedeemed(studentUserId, dealTitle, '');
  },

  async settlementNotification(vendorUserId: string, amount: number) {
    const formatted = `₦${(amount / 100).toLocaleString('en-NG')}`;
    await fcmService.sendToUser(vendorUserId, 'Settlement Processed', `Your settlement of ${formatted} has been sent to your bank account.`, { type: 'settlement' });
  },
};
