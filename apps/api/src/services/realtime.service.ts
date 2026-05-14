/**
 * Supabase Realtime broadcast service.
 * Every data mutation broadcasts here so all connected apps stay in sync.
 */

function getConfig() {
  return {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_KEY || '',
  };
}

export const realtimeService = {
  async broadcast(channel: string, event: string, payload: Record<string, unknown>) {
    const { url, key } = getConfig();
    if (!url || !key) return;

    try {
      await fetch(`${url}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          messages: [{
            topic: `realtime:${channel}`,
            event,
            payload,
          }],
        }),
      });
    } catch {
      // Non-critical
    }
  },

  // ─── Deals ────────────────────────────────────────────
  async dealChanged(dealId: string, action: 'created' | 'updated' | 'deleted') {
    await this.broadcast('deals', 'deal_change', { dealId, action, timestamp: Date.now() });
  },

  async stockChanged(dealId: string, remainingQty: number) {
    await this.broadcast('deals', 'stock_change', { dealId, remainingQty, timestamp: Date.now() });
  },

  // ─── Vendors ──────────────────────────────────────────
  async vendorChanged(vendorId: string, action: 'created' | 'updated' | 'suspended' | 'activated') {
    await this.broadcast('vendors', 'vendor_change', { vendorId, action, timestamp: Date.now() });
    await this.broadcast(`vendor:${vendorId}`, 'vendor_change', { vendorId, action, timestamp: Date.now() });
  },

  async settlementProcessed(vendorId: string, amount: number) {
    await this.broadcast(`vendor:${vendorId}`, 'settlement', {
      vendorId,
      amount,
      message: `Your settlement of ₦${(amount / 100).toLocaleString()} has been processed via Paystack`,
      timestamp: Date.now(),
    });
  },

  // ─── Students ─────────────────────────────────────────
  async studentVerificationChanged(userId: string, studentId: string, status: string) {
    await this.broadcast(`student:${userId}`, 'verification_change', { studentId, status, timestamp: Date.now() });
    await this.broadcast('admin', 'student_change', { studentId, status, timestamp: Date.now() });
  },

  // ─── Vouchers ─────────────────────────────────────────
  async voucherStatusChanged(studentUserId: string, voucherId: string, status: string) {
    await this.broadcast(`student:${studentUserId}`, 'voucher_update', { voucherId, status, timestamp: Date.now() });
  },

  async voucherRedeemed(voucherId: string, dealId: string, vendorId: string) {
    await this.broadcast('admin', 'voucher_redeemed', { voucherId, dealId, timestamp: Date.now() });
    await this.broadcast(`vendor:${vendorId}`, 'redemption', { voucherId, dealId, timestamp: Date.now() });
  },

  // ─── Payments ─────────────────────────────────────────
  async paymentCompleted(paymentId: string, dealId: string, amount: number) {
    await this.broadcast('admin', 'payment_completed', { paymentId, dealId, amount, timestamp: Date.now() });
  },
};
