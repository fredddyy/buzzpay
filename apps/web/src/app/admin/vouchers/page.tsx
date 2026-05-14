"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import SearchBar from "@/components/admin/SearchBar";
import FilterPills from "@/components/admin/FilterPills";
import Pagination from "@/components/admin/Pagination";
import { subscribeAdmin } from "@/lib/supabase";

interface Voucher {
  id: string;
  code: string;
  status: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  student: { user: { fullName: string } };
  deal: { title: string; vendor: { businessName: string } };
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Redeemed", value: "REDEEMED" },
  { label: "Expired", value: "EXPIRED" },
];

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (filter) params.set("status", filter);
      if (search) params.set("search", search);
      const res = await api.get(`/admin/vouchers?${params}`);
      setVouchers(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      setVouchers([]);
    }
    setLoading(false);
  }, [filter, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeAdmin({ onVoucherRedeemed: load }), [load]);

  function handleFilter(v: string) { setFilter(v); setPage(1); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  function time(d: string) {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  }

  function timeLeft(d: string) {
    const ms = new Date(d).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  const statusStyle = (s: string) => ({
    background: s === "ACTIVE" ? "var(--color-success-surface)" : s === "REDEEMED" ? "var(--color-info-surface)" : "var(--color-error-surface)",
    color: s === "ACTIVE" ? "var(--color-success)" : s === "REDEEMED" ? "var(--color-info)" : "var(--color-error)",
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Vouchers</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Redemption audit trail</p>
        </div>
        <FilterPills options={STATUS_FILTERS} selected={filter} onChange={handleFilter} />
      </div>

      <div className="mb-4 w-full sm:w-64">
        <SearchBar value={search} onChange={handleSearch} placeholder="Search code, student, or deal..." />
      </div>

      <div className="rounded-xl overflow-x-auto" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="min-w-[800px]">
        <div className="grid grid-cols-[80px_1fr_1fr_120px_80px_100px_120px] gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.05em" }}>
          <span>Code</span><span>Student</span><span>Deal</span><span>Vendor</span><span>Status</span><span>Expires</span><span className="text-right">Created</span>
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_1fr_120px_80px_100px_120px] gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
              {Array.from({ length: 7 }).map((_, j) => <div key={j} className="skeleton w-16 h-3 self-center" />)}
            </div>
          ))
        ) : vouchers.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{search || filter ? "No vouchers match your filters" : "No vouchers yet"}</p>
          </div>
        ) : (
          vouchers.map(v => (
            <div key={v.id} className="grid grid-cols-[80px_1fr_1fr_120px_80px_100px_120px] gap-3 px-4 py-3 items-center transition-colors"
              style={{ borderBottom: "1px solid var(--color-border)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span className="text-[12px] font-mono font-semibold" style={{ color: "var(--color-primary)" }}>{v.code}</span>
              <span className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{v.student.user.fullName}</span>
              <span className="text-[12px] truncate" style={{ color: "var(--color-text-secondary)" }}>{v.deal.title}</span>
              <span className="text-[12px] truncate" style={{ color: "var(--color-text-muted)" }}>{v.deal.vendor.businessName}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit" style={statusStyle(v.status)}>{v.status}</span>
              <span className="text-[12px] font-mono" style={{ color: v.status === "ACTIVE" ? "var(--color-warning)" : "var(--color-text-muted)" }}>
                {v.status === "ACTIVE" ? timeLeft(v.expiresAt) : "—"}
              </span>
              <span className="text-[11px] font-mono text-right" style={{ color: "var(--color-text-muted)" }}>{time(v.createdAt)}</span>
            </div>
          ))
        )}
        </div>
      </div>

      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
    </div>
  );
}
