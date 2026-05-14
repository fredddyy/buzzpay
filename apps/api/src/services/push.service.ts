/**
 * Push notification service via Supabase Edge Functions + FCM.
 *
 * Setup:
 * 1. Add Firebase to your Flutter apps (google-services.json / GoogleService-Info.plist)
 * 2. Create a Supabase Edge Function for sending FCM push
 * 3. Store FCM device tokens in a `device_tokens` table
 * 4. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 *
 * For now, this logs notifications to console and stores them in DB
 * for in-app display. Push delivery activates once Supabase + FCM are configured.
 */

import { prisma } from '@buzzpay/db';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const pushService = {
  /**
   * Send a push notification to a user.
   * Falls back to console log if Supabase/FCM not configured.
   */
  async send(userId: string, title: string, body: string, data?: Record<string, string>) {
    console.log(`[PUSH] → ${userId}: ${title} — ${body}`);

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ userId, title, body, data }),
        });
      } catch {
        // Non-critical
      }
    }
  },

  /** Notify vendor their payout was processed */
  async settlementNotification(vendorUserId: string, amount: number) {
    const formatted = `₦${(amount / 100).toLocaleString('en-NG')}`;
    await this.send(
      vendorUserId,
      'Settlement Processed',
      `Your settlement of ${formatted} has been sent to your bank account via Paystack.`,
      { type: 'settlement', amount: String(amount) },
    );
  },

  /** Notify student their voucher was redeemed */
  async voucherRedeemedNotification(studentUserId: string, dealTitle: string) {
    await this.send(
      studentUserId,
      'Voucher Redeemed',
      `Your voucher for "${dealTitle}" was just scanned and redeemed.`,
      { type: 'voucher_redeemed' },
    );
  },

  /** Notify student their verification was approved */
  async verificationApproved(studentUserId: string) {
    await this.send(
      studentUserId,
      'Verification Approved',
      'Your student ID has been verified! You now have access to all exclusive deals.',
      { type: 'verification_approved' },
    );
  },

  /** Notify student their verification was rejected */
  async verificationRejected(studentUserId: string, reason: string) {
    await this.send(
      studentUserId,
      'Verification Update',
      `Your verification was not approved: ${reason}. You can resubmit your student ID.`,
      { type: 'verification_rejected' },
    );
  },
};
