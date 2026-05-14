"use client";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gbhoekuodlbjgczajgrw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SLsfOk9rCcMmDAZDbcDIeA_zdYWt19G";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Hook-style helper to subscribe to admin-relevant real-time channels.
 * Call in useEffect, returns cleanup function.
 */
export function subscribeAdmin(callbacks: {
  onDealChanged?: () => void;
  onPaymentCompleted?: () => void;
  onVoucherRedeemed?: () => void;
  onStudentChanged?: () => void;
}): () => void {
  const adminChannel = supabase.channel("admin");
  const dealsChannel = supabase.channel("deals");

  dealsChannel
    .on("broadcast", { event: "deal_change" }, () => callbacks.onDealChanged?.())
    .on("broadcast", { event: "stock_change" }, () => callbacks.onDealChanged?.())
    .subscribe();

  adminChannel
    .on("broadcast", { event: "payment_completed" }, () => callbacks.onPaymentCompleted?.())
    .on("broadcast", { event: "voucher_redeemed" }, () => callbacks.onVoucherRedeemed?.())
    .on("broadcast", { event: "student_change" }, () => callbacks.onStudentChanged?.())
    .subscribe();

  return () => {
    dealsChannel.unsubscribe();
    adminChannel.unsubscribe();
  };
}
