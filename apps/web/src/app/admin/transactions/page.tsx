"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import SearchBar from "@/components/admin/SearchBar";
import FilterPills from "@/components/admin/FilterPills";
import Pagination from "@/components/admin/Pagination";
import { subscribeAdmin } from "@/lib/supabase";

interface Tx {
  id: string;
  amount: number;
  commission: number;
  vendorAmount: number;
  status: string;
  paystackReference: string;
  paidAt: string | null;
  createdAt: string;
  user: { fullName: string };
  deal: { title: string };
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Success", value: "SUCCESS" },
  { label: "Pending", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
];

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await api.get(`/admin/transactions?${params}`);
      setTxs(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      setTxs([]);
    }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeAdmin({ onPaymentCompleted: load }), [load]);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleStatus(v: string) { setStatus(v); setPage(1); }

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }
  function time(d: string) {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  }

  const statusStyle = (s: string) => ({
    background: s === "SUCCESS" ? "var(--color-success-surface)" : s === "PENDING" ? "var(--color-warning-surface)" : "var(--color-error-surface)",
    color: s === "SUCCESS" ? "var(--color-success)" : s === "PENDING" ? "var(--color-warning)" : "var(--color-error)",
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Transactions</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Payment log and revenue tracking</p>
        </div>
        <FilterPills options={STATUS_FILTERS} selected={status} onChange={handleStatus} />
      </div>

      <div className="mb-4 w-full sm:w-64">
        <SearchBar value={search} onChange={handleSearch} placeholder="Search student, deal, or ref..." />
      </div>

      <div className="rounded-xl overflow-x-auto" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="min-w-[800px]">
        <div className="grid grid-cols-[1fr_1fr_90px_90px_90px_80px_130px] gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.05em" }}>
          <span>Student</span><span>Deal</span><span>Amount</span><span>Commission</span><span>Vendor</span><span>Status</span><span className="text-right">Date</span>
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_90px_90px_90px_80px_130px] gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
              {Array.from({ length: 7 }).map((_, j) => <div key={j} className="skeleton w-16 h-3 self-center" />)}
            </div>
          ))
        ) : txs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{search || status ? "No transactions match your filters" : "No transactions yet"}</p>
          </div>
        ) : (
          txs.map(tx => (
            <div key={tx.id} className="grid grid-cols-[1fr_1fr_90px_90px_90px_80px_130px] gap-3 px-4 py-3 items-center transition-colors"
              style={{ borderBottom: "1px solid var(--color-border)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{tx.user.fullName}</span>
              <span className="text-[12px] truncate" style={{ color: "var(--color-text-secondary)" }}>{tx.deal.title}</span>
              <span className="text-[13px] font-semibold font-mono" style={{ color: "var(--color-text)" }}>{fmt(tx.amount)}</span>
              <span className="text-[12px] font-mono" style={{ color: "var(--color-success)" }}>{fmt(tx.commission)}</span>
              <span className="text-[12px] font-mono" style={{ color: "var(--color-text-secondary)" }}>{fmt(tx.vendorAmount)}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={statusStyle(tx.status)}>{tx.status}</span>
              <span className="text-[11px] font-mono text-right" style={{ color: "var(--color-text-muted)" }}>{time(tx.createdAt)}</span>
            </div>
          ))
        )}
        </div>
      </div>

      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
    </div>
  );
}
