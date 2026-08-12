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
  signupsToday: number;
  signupsThisWeek: number;
  buyersThisWeek: number;
  repeatBuyers: number;
  firstPurchaseRate: number;
  repeatRate: number;
  topDeals: { dealId: string; title: string; vendor: string; purchases: number }[];
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  avgOrderValue: number;
  topVendors: { vendorId: string; name: string; revenue: number; sales: number }[];
  deadDeals: number;
  categoryRevenue: { category: string; revenue: number; sales: number }[];
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
            <KPI label="Total Students" value={stats?.totalUsers ?? 0} color="primary" href="/admin/students" />
            <KPI label="Verified" value={stats?.verifiedUsers ?? 0} color="success" bar={stats ? stats.verifiedUsers / stats.totalUsers : 0} href="/admin/students" />
            <KPI label="Pending Review" value={stats?.pendingVerifications ?? 0} color="warning" urgent href="/admin/students" />
            <KPI label="Active Vendors" value={stats?.totalVendors ?? 0} color="info" href="/admin/vendors" />
            <KPI label="Active Deals" value={stats?.totalDeals ?? 0} color="primary" href="/admin/deals" />
            <KPI label="Transactions" value={stats?.totalTransactions.toLocaleString() ?? "0"} color="success" href="/admin/transactions" />
            <KPI label="Revenue" value={fmt(stats?.totalRevenue ?? 0)} color="success" href="/admin/transactions" />
            <KPI label="Redemption Rate" value={`${stats?.redemptionRate ?? 0}%`} color="info" bar={(stats?.redemptionRate ?? 0) / 100} href="/admin/vouchers" />
          </>
        )}
      </div>

      {/* Growth Metrics */}
      {!loading && stats && (
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
            GROWTH THIS WEEK
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KPI label="Signups Today" value={stats.signupsToday} color="primary" href="/admin/students" />
            <KPI label="Signups This Week" value={stats.signupsThisWeek} color="primary" href="/admin/students" />
            <KPI label="First Purchase Rate" value={`${stats.firstPurchaseRate}%`} color={stats.firstPurchaseRate > 30 ? "success" : "warning"} bar={stats.firstPurchaseRate / 100} href="/admin/transactions" />
            <KPI label="Repeat Buyers (7d)" value={`${stats.repeatBuyers} (${stats.repeatRate}%)`} color={stats.repeatRate > 20 ? "success" : "warning"} bar={stats.repeatRate / 100} href="/admin/transactions" />
          </div>

          {stats.topDeals.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <a href="/admin/deals" className="text-[12px] font-semibold mb-3 block hover:underline" style={{ color: "var(--color-text)" }}>Top Deals This Week →</a>
              {stats.topDeals.map((d, i) => (
                <div key={d.dealId} className="flex items-center gap-3 py-2" style={{ borderBottom: i < stats.topDeals.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                  <span className="text-[13px] font-bold w-6" style={{ color: "var(--color-primary)" }}>#{i + 1}</span>
                  <div className="flex-1">
                    <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{d.title}</span>
                    <span className="text-[11px] ml-2" style={{ color: "var(--color-text-muted)" }}>{d.vendor}</span>
                  </div>
                  <span className="text-[13px] font-bold" style={{ color: "var(--color-success)" }}>{d.purchases} sold</span>
                </div>
              ))}
            </div>
          )}

          {/* Revenue Breakdown + Top Vendors + Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Revenue */}
            <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <a href="/admin/transactions" className="text-[12px] font-semibold mb-3 block hover:underline" style={{ color: "var(--color-text)" }}>Revenue →</a>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Today</span><span className="text-[13px] font-bold" style={{ color: "var(--color-success)" }}>{fmt(stats.revenueToday)}</span></div>
                <div className="flex justify-between"><span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>This Week</span><span className="text-[13px] font-bold" style={{ color: "var(--color-success)" }}>{fmt(stats.revenueThisWeek)}</span></div>
                <div className="flex justify-between"><span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>This Month</span><span className="text-[13px] font-bold" style={{ color: "var(--color-success)" }}>{fmt(stats.revenueThisMonth)}</span></div>
                <div className="flex justify-between pt-2" style={{ borderTop: "1px solid var(--color-border)" }}><span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Avg Order</span><span className="text-[13px] font-bold" style={{ color: "var(--color-primary)" }}>{fmt(stats.avgOrderValue)}</span></div>
                {stats.deadDeals > 0 && <div className="flex justify-between"><span className="text-[12px]" style={{ color: "var(--color-error)" }}>Dead Deals (no sales)</span><span className="text-[13px] font-bold" style={{ color: "var(--color-error)" }}>{stats.deadDeals}</span></div>}
              </div>
            </div>

            {/* Top Vendors */}
            <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <a href="/admin/vendors" className="text-[12px] font-semibold mb-3 block hover:underline" style={{ color: "var(--color-text)" }}>Top Vendors →</a>
              {(stats.topVendors ?? []).filter(v => v.sales > 0).length === 0
                ? <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>No sales yet</p>
                : (stats.topVendors ?? []).filter(v => v.sales > 0).map((v, i) => (
                <div key={v.vendorId} className="flex items-center gap-2 py-1.5" style={{ borderBottom: i < stats.topVendors.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                  <span className="text-[11px] font-bold w-5" style={{ color: "var(--color-primary)" }}>#{i + 1}</span>
                  <span className="text-[12px] font-medium flex-1" style={{ color: "var(--color-text)" }}>{v.name}</span>
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{v.sales} sales</span>
                  <span className="text-[12px] font-bold" style={{ color: "var(--color-success)" }}>{fmt(v.revenue)}</span>
                </div>
              ))}
            </div>

            {/* Category Breakdown */}
            <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <a href="/admin/deals" className="text-[12px] font-semibold mb-3 block hover:underline" style={{ color: "var(--color-text)" }}>By Category →</a>
              {(stats.categoryRevenue ?? []).filter(c => c.sales > 0).length === 0
                ? <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>No sales yet</p>
                : (stats.categoryRevenue ?? []).filter(c => c.sales > 0).map(c => (
                <div key={c.category} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <span className="text-[12px] font-medium flex-1" style={{ color: "var(--color-text)" }}>{c.category}</span>
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{c.sales} sales</span>
                  <span className="text-[12px] font-bold" style={{ color: "var(--color-success)" }}>{fmt(c.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

function KPI({ label, value, color, bar, urgent, href }: {
  label: string; value: string | number; color: string; bar?: number; urgent?: boolean; href?: string;
}) {
  const colors: Record<string, { text: string; border: string }> = {
    primary: { text: "var(--color-primary)", border: "var(--color-primary-border)" },
    success: { text: "var(--color-success)", border: "var(--color-success-border)" },
    warning: { text: "var(--color-warning)", border: "var(--color-warning-border)" },
    error: { text: "var(--color-error)", border: "var(--color-error-border)" },
    info: { text: "var(--color-info)", border: "var(--color-info-border)" },
  };
  const c = colors[color] ?? colors.primary;

  const content = (
    <div
      className={`rounded-xl p-4 ${href ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
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

  return href ? <a href={href}>{content}</a> : content;
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
