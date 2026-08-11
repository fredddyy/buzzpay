"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface PendingPayout {
  vendorId: string;
  vendorName: string;
  pendingAmount: number;
  paymentCount: number;
  hasBankAccount: boolean;
  bankVerified: boolean;
  lastPayoutAt: string | null;
}

interface PayoutRecord {
  id: string;
  amount: number;
  status: string;
  voucherCount: number;
  paidAt: string | null;
  createdAt: string;
  vendor: { businessName: string };
}

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
  isVerified: boolean;
  vendor: { businessName: string };
}

export default function AdminPayoutsPage() {
  const [tab, setTab] = useState<"pending" | "history" | "banks">("pending");
  const [pending, setPending] = useState<PendingPayout[]>([]);
  const [history, setHistory] = useState<PayoutRecord[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pendingRes, historyRes, banksRes] = await Promise.all([
        api.get("/admin/payouts/pending"),
        api.get("/admin/payouts/history"),
        api.get("/admin/bank-accounts/pending"),
      ]);
      setPending(pendingRes.data.data || []);
      setHistory(historyRes.data.data || []);
      setBanks(banksRes.data.data || []);
    } catch {}
    setLoading(false);
  }

  async function triggerPayout(vendorId: string) {
    setTriggering(vendorId);
    try {
      await api.post("/admin/payouts/trigger", { vendorId });
      loadAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Payout failed";
      alert(msg);
    }
    setTriggering(null);
  }

  async function verifyBank(id: string) {
    try {
      await api.post(`/admin/bank-accounts/${id}/verify`);
      loadAll();
    } catch {}
  }

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }
  function date(iso: string) { return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" }); }

  function statusBadge(status: string) {
    const c: Record<string, { bg: string; fg: string }> = {
      PAID: { bg: "#E8F5E9", fg: "#2E7D32" },
      PROCESSING: { bg: "#FFF3E0", fg: "#E65100" },
      PENDING: { bg: "#E3F2FD", fg: "#1565C0" },
      FAILED: { bg: "#FEF2F2", fg: "#EF4444" },
    };
    const s = c[status] || c.PENDING;
    return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.fg }}>{status}</span>;
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Payouts</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Manage vendor payouts and bank accounts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "pending", label: `Pending (${pending.length})` },
          { key: "history", label: "History" },
          { key: "banks", label: `Banks (${banks.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{
              background: tab === t.key ? "var(--color-primary)" : "var(--color-surface)",
              color: tab === t.key ? "white" : "var(--color-text-muted)",
              border: tab === t.key ? "none" : "1px solid var(--color-border)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-10" style={{ color: "var(--color-text-muted)" }}>Loading...</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {/* Pending Payouts */}
          {tab === "pending" && (
            pending.length === 0 ? (
              <p className="text-center py-10 text-[13px]" style={{ color: "var(--color-text-muted)" }}>No pending payouts</p>
            ) : (
              pending.map(p => (
                <div key={p.vendorId} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{p.vendorName}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {p.paymentCount} payments · {p.lastPayoutAt ? `Last: ${date(p.lastPayoutAt)}` : "First payout"}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold" style={{ color: "var(--color-primary)" }}>{fmt(p.pendingAmount)}</p>
                  {p.bankVerified ? (
                    <button onClick={() => triggerPayout(p.vendorId)}
                      disabled={triggering === p.vendorId}
                      className="px-4 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-50"
                      style={{ background: "#22C55E", color: "white" }}>
                      {triggering === p.vendorId ? "Sending..." : "Pay Now"}
                    </button>
                  ) : (
                    <span className="text-[11px] px-3 py-1.5" style={{ color: "var(--color-text-muted)" }}>
                      {p.hasBankAccount ? "Bank not verified" : "No bank account"}
                    </span>
                  )}
                </div>
              ))
            )
          )}

          {/* History */}
          {tab === "history" && (
            history.length === 0 ? (
              <p className="text-center py-10 text-[13px]" style={{ color: "var(--color-text-muted)" }}>No payout history</p>
            ) : (
              history.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{p.vendor.businessName}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {date(p.createdAt)} · {p.voucherCount} vouchers
                      {p.paidAt && ` · Paid ${date(p.paidAt)}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{fmt(p.amount)}</p>
                  {statusBadge(p.status)}
                </div>
              ))
            )
          )}

          {/* Bank Accounts */}
          {tab === "banks" && (
            banks.length === 0 ? (
              <p className="text-center py-10 text-[13px]" style={{ color: "var(--color-text-muted)" }}>No pending bank verifications</p>
            ) : (
              banks.map(b => (
                <div key={b.id} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{b.vendor.businessName}</p>
                    <p className="text-[11px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                      {b.bankName} · ****{b.accountNumber.slice(-4)} · {b.accountName}
                    </p>
                  </div>
                  <button onClick={() => verifyBank(b.id)}
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold"
                    style={{ background: "var(--color-primary)", color: "white" }}>
                    Verify
                  </button>
                </div>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}
