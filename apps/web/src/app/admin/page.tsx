"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { subscribeAdmin } from "@/lib/supabase";

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  pendingVerifications: number;
  totalVendors: number;
  totalDeals: number;
  totalTransactions: number;
  totalRevenue: number;
  redemptionRate: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  // Real-time: auto-refresh stats when anything changes
  useEffect(() => {
    return subscribeAdmin({
      onDealChanged: loadStats,
      onPaymentCompleted: loadStats,
      onVoucherRedeemed: loadStats,
      onStudentChanged: loadStats,
    });
  }, []);

  async function loadStats() {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data.data);
    } catch {
      setStats(null);
    }
    setLoading(false);
  }

  function fmt(kobo: number): string {
    return `₦${(kobo / 100).toLocaleString("en-NG")}`;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Dashboard</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Real-time overview of BuzzPay operations</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--color-surface)" }}>
              <div className="skeleton w-16 h-6 mb-2" />
              <div className="skeleton w-24 h-3" />
            </div>
          ))
        ) : (
          <>
            <KPI label="Total Students" value={stats?.totalUsers ?? 0} color="primary" />
            <KPI label="Verified" value={stats?.verifiedUsers ?? 0} color="success" bar={stats ? stats.verifiedUsers / stats.totalUsers : 0} />
            <KPI label="Pending Review" value={stats?.pendingVerifications ?? 0} color="warning" urgent />
            <KPI label="Active Vendors" value={stats?.totalVendors ?? 0} color="info" />
            <KPI label="Active Deals" value={stats?.totalDeals ?? 0} color="primary" />
            <KPI label="Transactions" value={stats?.totalTransactions.toLocaleString() ?? "0"} color="success" />
            <KPI label="Revenue" value={fmt(stats?.totalRevenue ?? 0)} color="success" />
            <KPI label="Redemption Rate" value={`${stats?.redemptionRate ?? 0}%`} color="info" bar={(stats?.redemptionRate ?? 0) / 100} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
          QUICK ACTIONS
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QA href="/admin/students" label="Review Students" sub={`${stats?.pendingVerifications ?? 0} pending`} urgent={(stats?.pendingVerifications ?? 0) > 0} />
          <QA href="/admin/deals" label="Manage Deals" sub={`${stats?.totalDeals ?? 0} active`} />
          <QA href="/admin/vendors" label="View Vendors" sub={`${stats?.totalVendors ?? 0} vendors`} />
          <QA href="/admin/transactions" label="Transactions" sub={`${stats?.totalTransactions?.toLocaleString() ?? "0"} total`} />
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color, bar, urgent }: {
  label: string; value: string | number; color: string; bar?: number; urgent?: boolean;
}) {
  const colors: Record<string, { text: string; border: string }> = {
    primary: { text: "var(--color-primary)", border: "var(--color-primary-border)" },
    success: { text: "var(--color-success)", border: "var(--color-success-border)" },
    warning: { text: "var(--color-warning)", border: "var(--color-warning-border)" },
    error: { text: "var(--color-error)", border: "var(--color-error-border)" },
    info: { text: "var(--color-info)", border: "var(--color-info-border)" },
  };
  const c = colors[color] ?? colors.primary;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-surface)",
        border: urgent ? `1px solid ${c.border}` : "1px solid var(--color-border)",
      }}
    >
      <p className="text-[22px] font-bold" style={{ color: c.text }}>{value}</p>
      <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      {bar !== undefined && (
        <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "var(--color-surface-hover)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${bar * 100}%`, background: c.text }} />
        </div>
      )}
    </div>
  );
}

function QA({ href, label, sub, urgent }: { href: string; label: string; sub?: string; urgent?: boolean }) {
  return (
    <a
      href={href}
      className="rounded-xl p-4 transition-colors block cursor-pointer"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-light)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "var(--color-surface)"}
    >
      <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>{label}</p>
      {sub && (
        <p className="text-[11px] mt-0.5" style={{ color: urgent ? "var(--color-warning)" : "var(--color-text-muted)" }}>
          {sub}
        </p>
      )}
    </a>
  );
}
