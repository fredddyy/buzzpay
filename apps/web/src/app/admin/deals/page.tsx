"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import SearchBar from "@/components/admin/SearchBar";
import FilterPills from "@/components/admin/FilterPills";
import Pagination from "@/components/admin/Pagination";
import { subscribeAdmin } from "@/lib/supabase";

interface Deal {
  id: string;
  title: string;
  category: string;
  vendorName: string;
  vendorId?: string;
  originalPrice: number;
  studentPrice: number;
  remainingQty: number;
  totalQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  featuredSection?: string;
  expiresAt: string;
  description?: string;
  imageUrl?: string;
  maxPerUser?: number;
  startsAt?: string;
  guestAccess?: boolean;
  dailyStart?: string | null;
  dailyEnd?: string | null;
  activeDays?: number[];
}

interface Vendor { id: string; businessName: string; }

const CATEGORIES = ["FOOD", "DRINKS", "SUBSCRIPTIONS", "TRANSPORT", "SHOPPING", "LIFESTYLE"];
const CATEGORY_FILTERS = [
  { label: "All", value: "" },
  ...CATEGORIES.map(c => ({ label: c.charAt(0) + c.slice(1).toLowerCase(), value: c })),
];
const STATUS_FILTERS = [
  { label: "Live", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Expired", value: "expired" },
  { label: "All", value: "" },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageStats, setPageStats] = useState<{ totalDeals: number; deadDeals: number; topDeals: { title: string; vendor: string; purchases: number }[]; categoryRevenue: { category: string; revenue: number; sales: number }[] } | null>(null);

  useEffect(() => {
    api.get("/admin/stats").then(r => setPageStats(r.data.data)).catch(() => {});
  }, []);
  const [modalDeal, setModalDeal] = useState<Deal | null | "new">(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      const res = await api.get(`/admin/deals?${params}`);
      setDeals(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      setDeals([]);
    }
    setLoading(false);
  }, [page, search, category, status]);

  useEffect(() => { load(); }, [load]);
  const [sectionPresets, setSectionPresets] = useState<{ name: string; preview: string; start: string; end: string; days: number[] }[]>([]);
  useEffect(() => { loadVendors(); loadSectionPresets(); }, []);
  useEffect(() => subscribeAdmin({ onDealChanged: load }), [load]);

  async function loadSectionPresets() {
    try {
      const seen = new Map<string, { name: string; preview: string; start: string; end: string; days: number[] }>();

      // 1. From existing deals — extract unique featuredSection names + their schedules
      const dealsRes = await api.get("/admin/deals?limit=100");
      for (const d of (dealsRes.data.data || [])) {
        if (d.featuredSection && !seen.has(d.featuredSection)) {
          seen.set(d.featuredSection, {
            name: d.featuredSection,
            preview: d.previewStart || "",
            start: d.dailyStart || "",
            end: d.dailyEnd || "",
            days: d.activeDays || [],
          });
        }
      }

      // 2. From campaigns
      const campRes = await api.get("/admin/campaigns");
      for (const c of (campRes.data.data || [])) {
        const name = c.featuredSection || c.name;
        if (!seen.has(name)) {
          seen.set(name, {
            name,
            preview: c.previewStart || "",
            start: c.dailyStart || "",
            end: c.dailyEnd || "",
            days: c.activeDays || [],
          });
        }
      }

      setSectionPresets(Array.from(seen.values()));
    } catch {}
  }

  async function loadVendors() {
    try {
      const res = await api.get("/admin/vendors");
      setVendors((res.data.data || []).map((v: any) => ({ id: v.id, businessName: v.businessName })));
    } catch {
      setVendors([]);
    }
  }

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }
  function stockPct(d: Deal) { return d.totalQuantity > 0 ? d.remainingQty / d.totalQuantity : 1; }
  function dealStatus(d: Deal): { label: string; type: "active" | "draft" | "expired" } {
    if (!d.isActive) return { label: "Draft", type: "draft" };
    if (new Date(d.expiresAt) <= new Date()) return { label: "Expired", type: "expired" };
    if (d.remainingQty <= 0) return { label: "Sold Out", type: "expired" };
    return { label: "Active", type: "active" };
  }

  function toggleCheck(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAllDeals() {
    setChecked(deals.length > 0 && checked.size === deals.length ? new Set() : new Set(deals.map(d => d.id)));
  }
  async function bulkDelete() {
    if (checked.size === 0 || !confirm(`Delete ${checked.size} deal(s) permanently?`)) return;
    setDeleting(true);
    for (const id of checked) {
      try { await api.delete(`/admin/deals/${id}`); } catch {}
    }
    setChecked(new Set());
    setDeleting(false);
    load();
  }

  async function deleteDeal(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const deal = deals.find(d => d.id === id);
    if (!deal) return;

    const s = dealStatus(deal);
    if (s.type === "active") {
      // Live deal — deactivate instead of delete
      if (!confirm('This deal is live. Deactivate it instead? (Students will no longer see it)')) return;
      setDeals(prev => prev.map(d => d.id === id ? { ...d, isActive: false } : d));
      try { await api.put(`/admin/deals/${id}/toggle`); } catch {}
      return;
    }
    if (s.type === "expired") {
      // Expired deal — just hide from list, don't delete (has transaction history)
      if (!confirm('Archive this expired deal? It will be deactivated but transaction history is preserved.')) return;
      setDeals(prev => prev.map(d => d.id === id ? { ...d, isActive: false } : d));
      try { await api.put(`/admin/deals/${id}/toggle`); } catch {}
      return;
    }
    // Draft deal — can delete
    if (!confirm('Delete this draft deal?')) return;
    setDeals(prev => prev.filter(d => d.id !== id));
    try { await api.delete(`/admin/deals/${id}`); } catch {}
  }

  async function toggleActive(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeals(prev => prev.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
    try { await api.put(`/admin/deals/${id}/toggle`); } catch {}
  }

  async function toggleFeatured(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeals(prev => prev.map(d => d.id === id ? { ...d, isFeatured: !d.isFeatured } : d));
    try { await api.put(`/admin/deals/${id}/feature`); } catch {}
  }

  function handleSaved(deal: Deal, isEdit: boolean) {
    if (isEdit) {
      setDeals(prev => prev.map(d => d.id === deal.id ? deal : d));
    } else {
      load();
    }
    setModalDeal(null);
  }

  const [cloneDeal, setCloneDeal] = useState<Deal | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleCategory(v: string) { setCategory(v); setPage(1); }
  function handleStatus(v: string) { setStatus(v); setPage(1); }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Deals</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Manage student deals and happy hour offers</p>
        </div>
        <button onClick={() => setModalDeal("new")}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold w-fit" style={{ background: "var(--color-primary)", color: "white" }}>
          + Create Deal
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="w-full sm:w-64">
          <SearchBar value={search} onChange={handleSearch} placeholder="Search deals or vendors..." />
        </div>
        <FilterPills options={CATEGORY_FILTERS} selected={category} onChange={handleCategory} />
        <FilterPills options={STATUS_FILTERS} selected={status} onChange={handleStatus} />
      </div>

      {/* Batch action bar */}
      {checked.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl"
          style={{ background: "var(--color-error-surface)", border: "1px solid var(--color-error-border)" }}>
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-error)" }}>
            {checked.size} deal{checked.size > 1 ? "s" : ""} selected
          </span>
          <button onClick={bulkDelete} disabled={deleting}
            className="ml-auto px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "var(--color-error)", color: "white" }}>
            {deleting ? "Deleting..." : "Delete Selected"}
          </button>
          <button onClick={() => setChecked(new Set())}
            className="px-2 py-1 rounded text-[11px]"
            style={{ color: "var(--color-text-muted)" }}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="grid grid-cols-[32px_1fr_90px_100px_110px_100px_80px_100px] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.05em" }}>
          <span className="flex items-center">
            <input type="checkbox" checked={deals.length > 0 && checked.size === deals.length}
              onChange={toggleAllDeals} className="accent-[#6C4FFF] w-3.5 h-3.5 cursor-pointer" />
          </span>
          <span>Deal</span><span>Category</span><span>Price</span><span>Schedule</span><span>Stock</span><span>Featured</span><span className="text-right">Status</span>
        </div>

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[32px_1fr_90px_100px_110px_100px_80px_100px] gap-4 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div /><div><div className="skeleton w-32 h-3 mb-1" /><div className="skeleton w-20 h-2.5" /></div>
              <div className="skeleton w-14 h-5 rounded-full self-center" />
              <div className="skeleton w-16 h-3 self-center" /><div className="skeleton w-14 h-3 self-center" /><div className="skeleton w-full h-1.5 rounded self-center" />
              <div className="skeleton w-8 h-4 rounded self-center" /><div className="skeleton w-14 h-6 rounded-full self-center ml-auto" />
            </div>
          ))
        ) : deals.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{search || category || status ? "No deals match your filters" : "No deals yet"}</p>
          </div>
        ) : (
          deals.map(d => (
            <div key={d.id}
              className="grid grid-cols-[32px_1fr_90px_100px_110px_100px_80px_100px] gap-4 px-4 py-3 items-center transition-colors cursor-pointer"
              style={{ borderBottom: "1px solid var(--color-border)" }}
              onClick={() => setModalDeal(d)}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span className="flex items-center" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={checked.has(d.id)}
                  onChange={() => { setChecked(prev => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; }); }}
                  className="accent-[#6C4FFF] w-3.5 h-3.5 cursor-pointer" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{d.title}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{d.vendorName}</span>
                  {d.featuredSection && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "var(--color-primary-surface)", color: "var(--color-primary)" }}>
                      {d.featuredSection}
                    </span>
                  )}
                  {d.dailyStart && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "var(--color-warning-surface, #FFF8E1)", color: "var(--color-warning, #F59E0B)" }}>
                      Happy Hour
                    </span>
                  )}
                  {(d as any).tags?.includes("referral-reward") && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "var(--color-info-surface)", color: "var(--color-info)" }}>
                      Referral
                    </span>
                  )}
                  {d.remainingQty <= 5 && d.remainingQty > 0 && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "var(--color-error-surface)", color: "var(--color-error)" }}>
                      Low Stock
                    </span>
                  )}
                  {(d as any).tags?.filter((t: string) => t !== "referral-reward").map((t: string) => (
                    <span key={t} className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "var(--color-info-surface)", color: "var(--color-info)" }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ background: "var(--color-surface-light)", color: "var(--color-text-secondary)" }}>
                {d.category}
              </span>
              <div>
                <span className="text-[13px] font-semibold" style={{ color: "var(--color-primary)" }}>{fmt(d.studentPrice)}</span>
                <span className="text-[11px] ml-1 line-through" style={{ color: "var(--color-text-muted)" }}>{fmt(d.originalPrice)}</span>
              </div>
              <div>
                {d.dailyStart && d.dailyEnd ? (
                  <div>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--color-primary)" }}>
                      {d.dailyStart}–{d.dailyEnd}
                    </span>
                    {d.activeDays && d.activeDays.length > 0 && d.activeDays.length < 7 && (
                      <div className="flex gap-0.5 mt-1">
                        {["S","M","T","W","T","F","S"].map((day, i) => (
                          <span key={i} className="text-[8px] w-3 h-3 rounded-full flex items-center justify-center font-bold"
                            style={{
                              background: d.activeDays!.includes(i) ? "var(--color-primary)" : "var(--color-surface-hover)",
                              color: d.activeDays!.includes(i) ? "white" : "var(--color-text-muted)",
                            }}>{day}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>All day</span>
                )}
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>
                  <span>{d.remainingQty}</span><span>{d.totalQuantity}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-hover)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${stockPct(d) * 100}%`,
                      background: stockPct(d) < 0.2 ? "var(--color-error)" : "var(--color-primary)",
                    }} />
                  </div>
                  {stockPct(d) <= 0.3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const qty = prompt(`Restock "${d.title}"\nCurrent: ${d.remainingQty}/${d.totalQuantity}\n\nAdd how many?`, "20");
                        if (!qty || isNaN(Number(qty))) return;
                        const add = parseInt(qty);
                        api.put(`/admin/deals/${d.id}`, {
                          totalQuantity: d.totalQuantity + add,
                          remainingQty: d.remainingQty + add,
                        }).then(() => loadDeals()).catch(() => alert("Restock failed"));
                      }}
                      title="Restock"
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors hover:opacity-80"
                      style={{ background: "var(--color-primary)", color: "white" }}
                    >+</button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => toggleFeatured(e, d.id)} className="text-[18px]">
                  {d.isFeatured ? "⭐" : "☆"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setCloneDeal(d); }}
                  title="Clone to vendors"
                  className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--color-text-muted)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m0 0a2.625 2.625 0 115.25 0H12m-3.75 0h3.75" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-end">
                {(() => {
                  const s = dealStatus(d);
                  const colors = {
                    active: { bg: "var(--color-success-surface)", fg: "var(--color-success)", border: "var(--color-success-border)" },
                    draft: { bg: "#FFF3E0", fg: "#E65100", border: "#FFCC80" },
                    expired: { bg: "var(--color-border)", fg: "var(--color-text-muted)", border: "var(--color-border)" },
                  };
                  const c = colors[s.type];
                  return (
                    <button onClick={(e) => toggleActive(e, d.id)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
                      {s.label}
                    </button>
                  );
                })()}
                <button onClick={(e) => deleteDeal(e, d.id)}
                  className="p-1 rounded opacity-30 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--color-error)" }} title="Delete deal">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />

      {cloneDeal && (
        <CloneModal
          deal={cloneDeal}
          vendors={vendors}
          onClose={() => setCloneDeal(null)}
          onCloned={() => { setCloneDeal(null); load(); }}
        />
      )}

      {modalDeal !== null && (
        <DealModal
          deal={modalDeal === "new" ? undefined : modalDeal}
          vendors={vendors}
          campaignPresets={sectionPresets}
          onClose={() => setModalDeal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────── */
/* Deal Modal — Create & Edit               */
/* ──────────────────────────────────────── */

const SECTION_PRESETS: { name: string; preview: string; start: string; end: string; days: number[] }[] = [
  { name: "Hot in Akoka", preview: "", start: "", end: "", days: [0,1,2,3,4,5,6] },
  { name: "Breakfast Rush", preview: "05:30", start: "07:00", end: "10:30", days: [1,2,3,4,5] },
  { name: "Lunch Special", preview: "10:00", start: "12:00", end: "15:30", days: [1,2,3,4,5] },
  { name: "Happy Hour", preview: "14:00", start: "16:00", end: "19:00", days: [1,2,3,4,5] },
  { name: "Night Owl", preview: "19:00", start: "21:00", end: "23:59", days: [0,1,2,3,4,5,6] },
  { name: "Weekend Buzz", preview: "08:00", start: "10:00", end: "22:00", days: [0,6] },
];
const DAY_LABELS = ["S","M","T","W","T","F","S"];

function DealModal({ deal, vendors, campaignPresets, onClose, onSaved }: {
  deal?: Deal;
  vendors: Vendor[];
  campaignPresets?: { name: string; preview: string; start: string; end: string; days: number[] }[];
  onClose: () => void;
  onSaved: (deal: Deal, isEdit: boolean) => void;
}) {
  const isEdit = !!deal;

  const [form, setForm] = useState({
    vendorId: deal?.vendorId || vendors[0]?.id || "",
    title: deal?.title || "",
    description: deal?.description || "",
    category: deal?.category || "FOOD",
    imageUrl: deal?.imageUrl || "",
    originalPrice: deal ? (deal.originalPrice / 100).toString() : "",
    studentPrice: deal ? (deal.studentPrice / 100).toString() : "",
    totalQuantity: deal?.totalQuantity?.toString() || "",
    maxPerUser: deal?.maxPerUser?.toString() || "1",
    startsAt: deal?.startsAt ? new Date(deal.startsAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    expiresAt: deal?.expiresAt ? new Date(deal.expiresAt).toISOString().slice(0, 16) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    isFeatured: deal?.isFeatured || false,
    guestAccess: deal?.guestAccess || false,
    tags: ((deal as any)?.tags || []) as string[],
    featuredSection: deal?.featuredSection || "",
    hasDailyWindow: (deal as any)?.dailyStart ? true : false,
    dailyStart: (deal as any)?.dailyStart || "08:00",
    dailyEnd: (deal as any)?.dailyEnd || "11:00",
    previewStart: (deal as any)?.previewStart || "06:00",
    activeDays: (deal as any)?.activeDays || [1, 2, 3, 4, 5],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.originalPrice || !form.studentPrice || !form.totalQuantity) {
      setError("Fill in all required fields"); return;
    }
    const origKobo = Math.round(parseFloat(form.originalPrice) * 100);
    const studKobo = Math.round(parseFloat(form.studentPrice) * 100);
    if (studKobo >= origKobo) { setError("Student price must be less than original price"); return; }

    setSaving(true); setError("");

    const payload = {
      vendorId: form.vendorId, title: form.title,
      description: form.description || form.title, category: form.category,
      imageUrl: form.imageUrl || undefined,
      originalPrice: origKobo, studentPrice: studKobo,
      totalQuantity: parseInt(form.totalQuantity),
      maxPerUser: parseInt(form.maxPerUser) || 1,
      startsAt: new Date(form.startsAt).toISOString(),
      expiresAt: new Date(form.expiresAt).toISOString(),
      isFeatured: form.isFeatured,
      featuredSection: form.isFeatured ? form.featuredSection : undefined,
      guestAccess: form.guestAccess,
      dailyStart: form.hasDailyWindow ? form.dailyStart : null,
      dailyEnd: form.hasDailyWindow ? form.dailyEnd : null,
      previewStart: form.hasDailyWindow ? form.previewStart : null,
      activeDays: form.hasDailyWindow ? form.activeDays : [],
      isRecurring: form.hasDailyWindow,
      tags: form.tags,
    };

    const vendor = vendors.find(v => v.id === form.vendorId);
    const resultDeal: Deal = {
      id: deal?.id || `d_${Date.now()}`,
      ...payload,
      vendorName: vendor?.businessName || "Unknown",
      remainingQty: isEdit ? (deal?.remainingQty ?? parseInt(form.totalQuantity)) : parseInt(form.totalQuantity),
      isActive: deal?.isActive ?? true,
    };

    try {
      if (isEdit) {
        await api.put(`/admin/deals/${deal!.id}`, payload);
      } else {
        const res = await api.post("/admin/deals", payload);
        resultDeal.id = res.data.data?.id || resultDeal.id;
      }
      onSaved(resultDeal, isEdit);
    } catch {
      setError("Failed to save deal. Check your connection.");
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--color-surface-light)", border: "1px solid var(--color-border)",
    color: "var(--color-text)", borderRadius: 10, padding: "10px 14px", fontSize: 13, width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
    color: "var(--color-text-muted)", marginBottom: 6, display: "block",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {isEdit ? "Edit Deal" : "Create Deal"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label style={labelStyle}>Vendor</label>
            <select value={form.vendorId} onChange={e => update("vendorId", e.target.value)} style={inputStyle}>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.businessName}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Deal Title *</label>
            <input value={form.title} onChange={e => update("title", e.target.value)}
              placeholder="e.g. Jollof Rice + Chicken Combo" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => update("description", e.target.value)}
              placeholder="Brief description" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.tags.includes("referral-reward")}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...form.tags, "referral-reward"]
                    : form.tags.filter((t: string) => t !== "referral-reward");
                  setForm(prev => ({ ...prev, tags: next }));
                }}
                className="rounded" />
              <span className="text-[13px]" style={{ color: "var(--color-text)" }}>Referral Reward</span>
            </label>
            <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Tagged deals appear in the &ldquo;Refer &amp; Earn&rdquo; section on mobile</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={e => update("category", e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Deal Image</label>
              <label className="block cursor-pointer">
                <div className="rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--color-surface-light)", border: "2px dashed var(--color-border)", height: form.imageUrl ? "auto" : 80 }}>
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="w-full object-cover" style={{ maxHeight: 120 }} />
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--color-text-muted)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Upload photo</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => update("imageUrl", ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Original Price (₦) *</label>
              <input type="number" step="0.01" value={form.originalPrice}
                onChange={e => update("originalPrice", e.target.value)} placeholder="2500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Student Price (₦) *</label>
              <input type="number" step="0.01" value={form.studentPrice}
                onChange={e => update("studentPrice", e.target.value)} placeholder="1800" style={inputStyle} />
            </div>
          </div>

          {form.originalPrice && form.studentPrice && parseFloat(form.studentPrice) < parseFloat(form.originalPrice) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
              style={{ background: "var(--color-success-surface)", color: "var(--color-success)" }}>
              <span>Students save ₦{(parseFloat(form.originalPrice) - parseFloat(form.studentPrice)).toLocaleString()}</span>
              <span className="ml-auto font-semibold">
                {Math.round(((parseFloat(form.originalPrice) - parseFloat(form.studentPrice)) / parseFloat(form.originalPrice)) * 100)}% off
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Total Quantity *</label>
              <input type="number" value={form.totalQuantity}
                onChange={e => update("totalQuantity", e.target.value)} placeholder="50" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Max Per User/Day</label>
              <input type="number" value={form.maxPerUser}
                onChange={e => update("maxPerUser", e.target.value)} placeholder="1" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Starts At</label>
              <input type="datetime-local" value={form.startsAt}
                onChange={e => update("startsAt", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Expires At</label>
              <input type="datetime-local" value={form.expiresAt}
                onChange={e => update("expiresAt", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Happy Hour Time Window */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              Happy Hour (optional)
            </label>
            <div className="flex gap-2">
              <input type="time" name="dailyStart" value={form.dailyStart || ""}
                onChange={e => setForm(prev => ({ ...prev, dailyStart: e.target.value, hasDailyWindow: !!e.target.value }))}
                className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                placeholder="Start" />
              <input type="time" name="dailyEnd" value={form.dailyEnd || ""}
                onChange={e => setForm(prev => ({ ...prev, dailyEnd: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                placeholder="End" />
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Set time window for happy hour deals (e.g. 08:00 – 09:00)</p>
          </div>

          {/* Featured toggle + section name */}
          <div className="rounded-xl p-4" style={{ background: "var(--color-surface-light)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => update("isFeatured", !form.isFeatured)}
                className="w-10 h-6 rounded-full transition-colors relative flex-shrink-0"
                style={{ background: form.isFeatured ? "var(--color-primary)" : "var(--color-surface-hover)" }}>
                <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                  style={{ left: form.isFeatured ? 22 : 4 }} />
              </button>
              <div>
                <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>Featured deal</span>
                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Show in a featured section on the student feed</p>
              </div>
            </div>

            {form.isFeatured && (
              <div className="mt-4 space-y-4">
                <div>
                  <label style={labelStyle}>Section Name</label>
                  <input value={form.featuredSection} onChange={e => update("featuredSection", e.target.value)}
                    placeholder="e.g. Hot in Akoka" style={inputStyle} />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(campaignPresets || []).map(s => (
                      <button key={s.name} type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            featuredSection: s.name,
                            hasDailyWindow: !!s.start,
                            dailyStart: s.start || prev.dailyStart,
                            dailyEnd: s.end || prev.dailyEnd,
                            previewStart: s.preview || prev.previewStart,
                            activeDays: s.days,
                          }));
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                        style={{
                          background: form.featuredSection === s.name ? "var(--color-primary-surface)" : "var(--color-surface-hover)",
                          color: form.featuredSection === s.name ? "var(--color-primary)" : "var(--color-text-muted)",
                          border: `1px solid ${form.featuredSection === s.name ? "var(--color-primary-border)" : "transparent"}`,
                        }}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg p-3" style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, hasDailyWindow: !prev.hasDailyWindow }))}
                      className="w-9 h-5 rounded-full transition-colors relative flex-shrink-0"
                      style={{ background: form.hasDailyWindow ? "var(--color-primary)" : "var(--color-surface-light)" }}>
                      <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all"
                        style={{ left: form.hasDailyWindow ? 18 : 3 }} />
                    </button>
                    <div>
                      <span className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>Limit to daily hours</span>
                      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Deal only visible during specific times each day</p>
                    </div>
                  </div>

                  {form.hasDailyWindow && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label style={{ ...labelStyle, fontSize: 10 }}>Preview From</label>
                          <input type="time" value={form.previewStart}
                            onChange={e => update("previewStart", e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 10 }}>Active From</label>
                          <input type="time" value={form.dailyStart}
                            onChange={e => update("dailyStart", e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 10 }}>To</label>
                          <input type="time" value={form.dailyEnd}
                            onChange={e => update("dailyEnd", e.target.value)} style={inputStyle} />
                        </div>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, fontSize: 10 }}>Active Days</label>
                        <div className="flex gap-1.5">
                          {DAY_LABELS.map((d, i) => {
                            const active = form.activeDays.includes(i);
                            return (
                              <button key={i} type="button"
                                onClick={() => {
                                  setForm(prev => ({
                                    ...prev,
                                    activeDays: active
                                      ? prev.activeDays.filter((x: number) => x !== i)
                                      : [...prev.activeDays, i],
                                  }));
                                }}
                                className="w-8 h-8 rounded-full text-[11px] font-semibold transition-colors"
                                style={{
                                  background: active ? "var(--color-primary)" : "var(--color-surface-light)",
                                  color: active ? "white" : "var(--color-text-muted)",
                                  border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                                }}>
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Guest access toggle */}
          <div className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: "var(--color-surface-light)", border: "1px solid var(--color-border)" }}>
            <button type="button" onClick={() => update("guestAccess", !form.guestAccess)}
              className="w-10 h-6 rounded-full transition-colors relative flex-shrink-0"
              style={{ background: form.guestAccess ? "var(--color-success)" : "var(--color-surface-hover)" }}>
              <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                style={{ left: form.guestAccess ? 22 : 4 }} />
            </button>
            <div>
              <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>Open to unverified students</span>
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Allow guests to browse and buy without student verification</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px]"
              style={{ background: "var(--color-error-surface)", color: "var(--color-error)", border: "1px solid var(--color-error-border)" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
              style={{ background: "var(--color-surface-light)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
              style={{ background: "var(--color-primary)", color: "white" }}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────── */
/* Clone Modal — Clone deal to vendors      */
/* ──────────────────────────────────────── */

function CloneModal({ deal, vendors, onClose, onCloned }: {
  deal: Deal;
  vendors: Vendor[];
  onClose: () => void;
  onCloned: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cloning, setCloning] = useState(false);
  const [done, setDone] = useState(0);

  // Exclude the deal's own vendor
  const available = vendors.filter(v => v.id !== deal.vendorId);

  function toggleVendor(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === available.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map(v => v.id)));
    }
  }

  async function clone() {
    if (selected.size === 0) return;
    setCloning(true);
    setDone(0);

    for (const vendorId of selected) {
      try {
        await api.post("/admin/deals", {
          vendorId,
          title: deal.title,
          description: deal.description,
          category: deal.category,
          imageUrl: deal.imageUrl,
          originalPrice: deal.originalPrice,
          studentPrice: deal.studentPrice,
          totalQuantity: deal.totalQuantity,
          maxPerUser: deal.maxPerUser,
          startsAt: deal.startsAt,
          expiresAt: deal.expiresAt,
          isFeatured: deal.isFeatured,
          featuredSection: deal.featuredSection,
          guestAccess: deal.guestAccess,
          dailyStart: deal.dailyStart,
          dailyEnd: deal.dailyEnd,
          activeDays: deal.activeDays,
        });
        setDone(prev => prev + 1);
      } catch {}
    }

    setCloning(false);
    onCloned();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Clone Deal</h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Clone &ldquo;{deal.title}&rdquo; to other vendors
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Source deal info */}
        <div className="rounded-xl p-3 mb-4 flex items-center gap-3"
          style={{ background: "var(--color-surface-light)", border: "1px solid var(--color-border)" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ background: "var(--color-primary-surface)" }}>
            📋
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-text)" }}>{deal.title}</p>
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              {deal.vendorName} &middot; ₦{(deal.studentPrice / 100).toLocaleString()}
              {deal.featuredSection && ` · ${deal.featuredSection}`}
              {deal.dailyStart && ` · ${deal.dailyStart}–${deal.dailyEnd}`}
            </p>
          </div>
        </div>

        {/* Vendor selection */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
            Select Vendors ({selected.size}/{available.length})
          </p>
          <button onClick={selectAll} className="text-[11px] font-semibold" style={{ color: "var(--color-primary)" }}>
            {selected.size === available.length ? "Deselect All" : "Select All"}
          </button>
        </div>

        <div className="space-y-1 mb-4 max-h-[240px] overflow-y-auto">
          {available.map(v => (
            <button key={v.id} onClick={() => toggleVendor(v.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
              style={{
                background: selected.has(v.id) ? "var(--color-primary-surface)" : "var(--color-surface-light)",
                border: `1px solid ${selected.has(v.id) ? "var(--color-primary-border)" : "var(--color-border)"}`,
              }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{
                  background: selected.has(v.id) ? "var(--color-primary)" : "var(--color-surface-hover)",
                  color: selected.has(v.id) ? "white" : "var(--color-text-muted)",
                }}>
                {selected.has(v.id) ? "✓" : v.businessName.charAt(0)}
              </div>
              <span className="text-[13px] font-medium truncate"
                style={{ color: selected.has(v.id) ? "var(--color-primary)" : "var(--color-text)" }}>
                {v.businessName}
              </span>
            </button>
          ))}
          {available.length === 0 && (
            <p className="text-center text-[13px] py-8" style={{ color: "var(--color-text-muted)" }}>
              No other vendors to clone to
            </p>
          )}
        </div>

        {/* Progress */}
        {cloning && (
          <div className="mb-4">
            <div className="flex justify-between text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>
              <span>Cloning...</span>
              <span>{done}/{selected.size}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-hover)" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${(done / selected.size) * 100}%`,
                background: "var(--color-primary)",
              }} />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
            style={{ background: "var(--color-surface-light)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
            Cancel
          </button>
          <button onClick={clone} disabled={cloning || selected.size === 0}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "white" }}>
            {cloning ? `Cloning ${done}/${selected.size}...` : `Clone to ${selected.size} Vendor${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
