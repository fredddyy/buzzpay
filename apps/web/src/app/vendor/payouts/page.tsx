"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getToken } from "@/lib/api";

interface BankAccount {
  id: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  isVerified: boolean;
}

interface PendingInfo {
  pendingAmount: number;
  lastPayoutAt: string | null;
  bankAccountVerified: boolean;
  nextPayoutWindow: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  voucherCount: number;
  paidAt: string | null;
  createdAt: string;
}

const BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank" },
  { code: "050", name: "Ecobank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank" },
  { code: "214", name: "FCMB" },
  { code: "058", name: "GTBank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Parallex Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC" },
  { code: "068", name: "Standard Chartered" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "UBA" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "50211", name: "Kuda Bank" },
];

export default function VendorPayoutsPage() {
  const router = useRouter();
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [pending, setPending] = useState<PendingInfo | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({ accountNumber: "", bankCode: "", accountName: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace("/admin/login"); return; }
    loadAll();
  }, [router]);

  async function loadAll() {
    setLoading(true);
    try {
      const [bankRes, pendingRes, historyRes] = await Promise.all([
        api.get("/vendor/bank-account"),
        api.get("/vendor/payouts/pending"),
        api.get("/vendor/payouts/history"),
      ]);
      setBankAccount(bankRes.data.data);
      setPending(pendingRes.data.data);
      setPayouts(historyRes.data.data?.payouts || []);
    } catch {}
    setLoading(false);
  }

  async function saveBankAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const bank = BANKS.find(b => b.code === bankForm.bankCode);
    try {
      await api.post("/vendor/bank-account", {
        accountNumber: bankForm.accountNumber,
        bankCode: bankForm.bankCode,
        bankName: bank?.name || bankForm.bankCode,
        accountName: bankForm.accountName,
      });
      setSaved(true);
      setShowBankForm(false);
      loadAll();
    } catch {}
    setSaving(false);
  }

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }
  function date(iso: string) { return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }

  function statusBadge(status: string) {
    const colors: Record<string, { bg: string; fg: string }> = {
      PAID: { bg: "#E8F5E9", fg: "#2E7D32" },
      PROCESSING: { bg: "#FFF3E0", fg: "#E65100" },
      PENDING: { bg: "#E3F2FD", fg: "#1565C0" },
      FAILED: { bg: "#FEF2F2", fg: "#EF4444" },
    };
    const c = colors[status] || colors.PENDING;
    return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.fg }}>{status}</span>;
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-base)" }}><p style={{ color: "var(--color-text-muted)" }}>Loading...</p></div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto w-full" style={{ background: "var(--color-surface)" }}>
        <h1 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>Payouts</h1>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Your earnings and payout history</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-5 py-6 max-w-3xl mx-auto w-full space-y-4">

          {/* Pending Amount Card */}
          {pending && (
            <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <p className="text-xs font-semibold uppercase" style={{ color: "var(--color-text-muted)" }}>Pending Payout</p>
              <p className="text-3xl font-extrabold mt-1" style={{ color: "var(--color-primary)" }}>{fmt(pending.pendingAmount)}</p>
              <div className="flex items-center gap-3 mt-3">
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Next payout: {pending.nextPayoutWindow}
                </p>
                {pending.lastPayoutAt && (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Last: {date(pending.lastPayoutAt)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bank Account */}
          <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Bank Account</p>
              <button onClick={() => { setShowBankForm(!showBankForm); if (bankAccount) setBankForm({ accountNumber: bankAccount.accountNumber, bankCode: bankAccount.bankCode, accountName: bankAccount.accountName }); }}
                className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>
                {bankAccount ? "Update" : "Add Bank"}
              </button>
            </div>

            {bankAccount ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Bank</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{bankAccount.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Account</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: "var(--color-text)" }}>{bankAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Name</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{bankAccount.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Status</span>
                  {bankAccount.isVerified
                    ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#E8F5E9", color: "#2E7D32" }}>Verified</span>
                    : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FFF3E0", color: "#E65100" }}>Pending verification</span>
                  }
                </div>
                {!bankAccount.isVerified && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                    Our team will verify your bank details within 24 hours. Payouts are enabled after verification.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Add your bank account to receive payouts. Payouts are sent every Friday.
              </p>
            )}

            {/* Bank Form */}
            {showBankForm && (
              <form onSubmit={saveBankAccount} className="mt-4 space-y-3 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                <div>
                  <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Bank</label>
                  <select value={bankForm.bankCode} onChange={e => setBankForm(f => ({ ...f, bankCode: e.target.value }))} required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                    <option value="">Select bank...</option>
                    {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Account Number</label>
                  <input type="text" value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="0123456789" maxLength={10} required pattern="[0-9]{10}"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                    style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                  <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>10-digit NUBAN account number</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Account Name</label>
                  <input type="text" value={bankForm.accountName} onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))}
                    placeholder="Name on the account" required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                </div>
                {saved && <p className="text-[12px] font-semibold" style={{ color: "#2E7D32" }}>Bank account saved!</p>}
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-primary)", color: "white" }}>
                  {saving ? "Saving..." : "Save Bank Account"}
                </button>
              </form>
            )}
          </div>

          {/* Payout History */}
          <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-sm font-bold mb-3" style={{ color: "var(--color-text)" }}>Payout History</p>
            {payouts.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "var(--color-text-muted)" }}>No payouts yet. Your first payout will appear here after Friday.</p>
            ) : (
              <div className="space-y-3">
                {payouts.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{fmt(p.amount)}</p>
                      <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{date(p.createdAt)} · {p.voucherCount} vouchers</p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex max-w-3xl mx-auto w-full" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
        <button onClick={() => router.push("/scanner")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Scanner</button>
        <button onClick={() => router.push("/dashboard")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Dashboard</button>
        <button onClick={() => router.push("/vendor/deals")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>My Deals</button>
        <button className="flex-1 py-4 text-center text-xs font-bold" style={{ color: "var(--color-primary)" }}>Payouts</button>
        <button onClick={() => router.push("/vendor/profile")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Profile</button>
      </div>
    </div>
  );
}
