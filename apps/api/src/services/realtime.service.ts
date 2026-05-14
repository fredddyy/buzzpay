/**
 * Supabase Realtime broadcast via WebSocket client (not HTTP API).
 * Uses the same channel mechanism as Flutter clients — guaranteed delivery.
 */

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

let supabase: SupabaseClient | null = null;
const channels = new Map<string, RealtimeChannel>();

function getClient(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key, {
    realtime: { transport: ws as any },
  });
  return supabase;
}

function getChannel(name: string): RealtimeChannel | null {
  const client = getClient();
  if (!client) return null;

  if (!channels.has(name)) {
    const ch = client.channel(name, { config: { broadcast: { self: false } } });
    ch.subscribe((status) => {
      console.log(`[Realtime] server channel '${name}' → ${status}`);
    });
    channels.set(name, ch);
  }
  return channels.get(name)!;
}

export const realtimeService = {
  async broadcast(channel: string, event: string, payload: Record<string, unknown>) {
    const ch = getChannel(channel);
    if (!ch) return;

    try {
      await ch.send({ type: 'broadcast', event, payload });
      console.log(`[Realtime] ${channel}:${event} sent`);
    } catch (err) {
      console.error(`[Realtime] broadcast failed:`, err);
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
      vendorId, amount,
      message: `Your settlement of ₦${(amount / 100).toLocaleString()} has been processed via Paystack`,
      timestamp: Date.now(),
    });
  },

  // ─── Students ─────────────────────────────────────────
  async studentVerificationChanged(userId: string, studentId: string, status: string) {
    await this.broadcast(`student:${userId}`, 'verification_change', { studentId, userId, status, timestamp: Date.now() });
    await this.broadcast('deals', 'verification_change', { studentId, userId, status, timestamp: Date.now() });
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
