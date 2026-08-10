import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { prisma } from '@buzzpay/db';

const projectId = process.env.FCM_PROJECT_ID;
const clientEmail = process.env.FCM_CLIENT_EMAIL;
const rawKey = process.env.FCM_PRIVATE_KEY;

let initialized = false;

function ensureInitialized() {
  if (initialized) return true;
  if (!projectId || !clientEmail || !rawKey) return false;

  try {
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
    initialized = true;
    console.log('[FCM] Firebase Admin initialized');
    return true;
  } catch (err) {
    console.error('[FCM] Init error:', err instanceof Error ? err.message : err);
    return false;
  }
}

ensureInitialized();

export const fcmService = {
  get isConfigured() {
    return initialized || ensureInitialized();
  },

  async registerToken(userId: string, token: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
  },

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    if (!this.isConfigured) {
      console.log(`[FCM] Not configured — skipping push to ${userId}: ${title}`);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) {
      console.log(`[FCM] No token for user ${userId}`);
      return;
    }

    try {
      await getMessaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: { channelId: 'buzzpay_default', sound: 'default' },
        },
      });
      console.log(`[FCM] Sent to ${userId}: ${title}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[FCM] Send error: ${msg}`);
      if (msg.includes('not-registered') || msg.includes('invalid-registration')) {
        await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
      }
    }
  },

  async paymentSuccess(userId: string, dealTitle: string, amount: number) {
    const naira = `₦${(amount / 100).toLocaleString('en-NG')}`;
    await this.sendToUser(userId, 'Payment Received! ✅', `Your ${dealTitle} voucher (${naira}) is ready.`, { type: 'payment_success' });
  },

  async voucherRedeemed(userId: string, dealTitle: string, vendorName: string) {
    await this.sendToUser(userId, 'Voucher Redeemed! 🎉', `${dealTitle} redeemed at ${vendorName}. Enjoy!`, { type: 'voucher_redeemed' });
  },

  async verificationApproved(userId: string) {
    await this.sendToUser(userId, 'You\'re Verified! 🎓', 'Your student ID was approved. Unlock all exclusive deals now!', { type: 'verification_approved' });
  },

  async verificationRejected(userId: string, reason?: string) {
    await this.sendToUser(userId, 'Verification Update', reason || 'Your verification was not approved. Please resubmit.', { type: 'verification_rejected' });
  },

  async dealDropping(userId: string, dealTitle: string, time: string) {
    await this.sendToUser(userId, `${dealTitle} is dropping! 🔥`, `Available at ${time}. Be quick — limited stock!`, { type: 'deal_dropping' });
  },
};
