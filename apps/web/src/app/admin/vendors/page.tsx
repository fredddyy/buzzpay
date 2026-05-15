"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import SearchBar from "@/components/admin/SearchBar";
import FilterPills from "@/components/admin/FilterPills";
import Pagination from "@/components/admin/Pagination";
import QrManagement from "@/components/admin/QrManagement";

interface Vendor {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  isActive: boolean;
  opensAt: string;
  closesAt: string;
  commissionRate: number;
  dealCount: number;
  isTrending: boolean;
  totalSales: number;
  pendingPayout: number;
  redemptionRate: number;
  campus: string;
  bankName?: string;
  accountNumber?: string;
  user: { fullName: string; email: string };
}

const CAMPUSES = ["UNILAG - Akoka", "YABATECH - Yaba", "LASU - Ojo", "FUTA - Akure"];
const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Vendor | null | "new">(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await api.get(`/admin/vendors?${params}`);
      setVendors(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      setVendors([]);
    }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleStatus(v: string) { setStatus(v); setPage(1); }

  async function toggleActive(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setVendors(prev => prev.map(v => v.id === id ? { ...v, isActive: !v.isActive } : v));
    try { await api.put(`/admin/vendors/${id}`, { isActive: !vendors.find(v => v.id === id)?.isActive }); } catch {}
  }

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }

  function toggleCheck(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (checked.size === vendors.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(vendors.map(v => v.id)));
    }
  }

  async function exportQrPosters() {
    if (checked.size === 0) return;
    setExporting(true);

    const QRCode = (await import("qrcode")).default;
    const selectedVendors = vendors.filter(v => checked.has(v.id));

    const pages = await Promise.all(selectedVendors.map(async (v) => {
      const qrDataUrl = await QRCode.toDataURL(`https://buzzpay.ng/v/${v.id}`, {
        width: 400, margin: 2, color: { dark: "#6C4FFF" },
      });
      return `
        <div class="poster">
          <div class="logo">B</div>
          <h1>Pay with <span>BuzzPay</span> here</h1>
          <div class="qr"><img src="${qrDataUrl}" alt="QR" /></div>
          <div class="vendor-name">${v.businessName}</div>
          <div class="cta">Save up to 30% on your next meal</div>
          <div class="footer">buzzpay.ng</div>
        </div>
      `;
    }));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BuzzPay QR Posters</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Nunito', sans-serif; }
      .poster { width: 148mm; min-height: 210mm; background: white; padding: 32px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; page-break-after: always; margin: 0 auto; }
      .poster:last-child { page-break-after: auto; }
      .logo { width: 48px; height: 48px; background: #6C4FFF; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 800; }
      h1 { font-size: 28px; color: #1a1a2e; font-weight: 800; }
      h1 span { color: #6C4FFF; }
      .qr { padding: 16px; border: 3px solid #6C4FFF; border-radius: 20px; }
      .qr img { width: 200px; height: 200px; }
      .vendor-name { font-size: 20px; color: #6C4FFF; font-weight: 800; }
      .cta { font-size: 16px; color: #333; font-weight: 700; background: #f0edff; padding: 12px 24px; border-radius: 12px; }
      .footer { font-size: 11px; color: #bbb; }
    </style></head><body>${pages.join("")}</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.addEventListener("load", () => win.print());
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    setExporting(false);
  }

  function handleSaved(vendor: Vendor, isEdit: boolean) {
    if (isEdit) {
      setVendors(prev => prev.map(v => v.id === vendor.id ? vendor : v));
    } else {
      load();
    }
    setSelected(null);
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Vendors</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Manage campus vendor partners</p>
        </div>
        <button onClick={() => setSelected("new")}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold w-fit"
          style={{ background: "var(--color-primary)", color: "white" }}>
          + Add Vendor
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="w-full sm:w-64">
          <SearchBar value={search} onChange={handleSearch} placeholder="Search vendors..." />
        </div>
        <FilterPills options={STATUS_FILTERS} selected={status} onChange={handleStatus} />
      </div>

      {/* Batch action bar */}
      {checked.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl"
          style={{ background: "var(--color-primary-surface)", border: "1px solid var(--color-primary-border)" }}>
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-primary)" }}>
            {checked.size} vendor{checked.size > 1 ? "s" : ""} selected
          </span>
          <button onClick={exportQrPosters} disabled={exporting}
            className="ml-auto px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: "var(--color-primary)", color: "white" }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? "Exporting..." : "Export QR Posters"}
          </button>
          <button onClick={() => setChecked(new Set())}
            className="px-2 py-1 rounded text-[11px]"
            style={{ color: "var(--color-text-muted)" }}>
            Clear
          </button>
        </div>
      )}

      <div className="rounded-xl overflow-x-auto" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[32px_1fr_120px_90px_80px_80px_60px_80px_80px] gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.05em" }}>
            <span className="flex items-center">
              <input type="checkbox" checked={vendors.length > 0 && checked.size === vendors.length}
                onChange={toggleAll} className="accent-[#6C4FFF] w-3.5 h-3.5 cursor-pointer" />
            </span>
            <span>Vendor</span><span>Location</span><span>Hours</span><span>Rate</span><span>Sales</span><span>Trend</span><span>Redeem</span><span className="text-right">Status</span>
          </div>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[32px_1fr_120px_90px_80px_80px_60px_80px_80px] gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div />{Array.from({ length: 8 }).map((_, j) => <div key={j} className="skeleton w-16 h-3 self-center" />)}
              </div>
            ))
          ) : vendors.length === 0 ? (
            <div className="py-16 text-center col-span-full">
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{search || status ? "No vendors match your filters" : "No vendors yet"}</p>
            </div>
          ) : (
            vendors.map(v => (
              <div key={v.id}
                className="grid grid-cols-[32px_1fr_120px_90px_80px_80px_60px_80px_80px] gap-3 px-4 py-3 items-center transition-colors cursor-pointer"
                style={{ borderBottom: "1px solid var(--color-border)" }}
                onClick={() => setSelected(v)}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span className="flex items-center" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={checked.has(v.id)}
                    onChange={() => {
                      setChecked(prev => { const n = new Set(prev); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n; });
                    }}
                    className="accent-[#6C4FFF] w-3.5 h-3.5 cursor-pointer" />
                </span>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden"
                    style={{ background: "var(--color-info-surface)", color: "var(--color-info)" }}>
                    {(v as any).logoUrl
                      ? <img src={(v as any).logoUrl} alt="" className="w-full h-full object-cover" />
                      : v.businessName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{v.businessName}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>{v.user.email}</p>
                  </div>
                </div>
                <span className="text-[12px] truncate" style={{ color: "var(--color-text-secondary)" }}>{v.businessAddress}</span>
                <span className="text-[12px] font-mono" style={{ color: "var(--color-text-secondary)" }}>{v.opensAt}–{v.closesAt}</span>
                <span className="text-[12px] font-mono" style={{ color: "var(--color-text-secondary)" }}>{(v.commissionRate * 100).toFixed(0)}%</span>
                <span className="text-[12px] font-mono font-semibold" style={{ color: "var(--color-success)" }}>{fmt(v.totalSales)}</span>
                <button onClick={async (e) => { e.stopPropagation(); setVendors(prev => prev.map(x => x.id === v.id ? { ...x, isTrending: !x.isTrending } : x)); try { await api.put(`/admin/vendors/${v.id}/trending`); } catch {} }}
                  className="text-[16px]" title={v.isTrending ? "Remove trending" : "Set trending"}>
                  {v.isTrending ? "🔥" : "○"}
                </button>
                <span className="text-[12px] font-semibold" style={{ color: v.redemptionRate >= 85 ? "var(--color-success)" : "var(--color-warning)" }}>{v.redemptionRate}%</span>
                <div className="flex justify-end">
                  <button onClick={(e) => toggleActive(e, v.id)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    style={{
                      background: v.isActive ? "var(--color-success-surface)" : "var(--color-error-surface)",
                      color: v.isActive ? "var(--color-success)" : "var(--color-error)",
                      border: `1px solid ${v.isActive ? "var(--color-success-border)" : "var(--color-error-border)"}`,
                    }}>
                    {v.isActive ? "Active" : "Suspended"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />

      {selected !== null && (
        <VendorModal
          vendor={selected === "new" ? undefined : selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function VendorModal({ vendor, onClose, onSaved }: {
  vendor?: Vendor;
  onClose: () => void;
  onSaved: (vendor: Vendor, isEdit: boolean) => void;
}) {
  const isEdit = !!vendor;
  const [form, setForm] = useState({
    businessName: vendor?.businessName || "",
    logoUrl: (vendor as any)?.logoUrl || "",
    businessAddress: vendor?.businessAddress || "",
    businessPhone: vendor?.businessPhone || "",
    campus: vendor?.campus || "UNILAG - Akoka",
    opensAt: vendor?.opensAt || "08:00",
    closesAt: vendor?.closesAt || "21:00",
    commissionRate: vendor ? (vendor.commissionRate * 100).toString() : "10",
    email: vendor?.user?.email || "",
    ownerName: vendor?.user?.fullName || "",
    bankName: vendor?.bankName || "",
    accountNumber: vendor?.accountNumber || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, val: string) { setForm(prev => ({ ...prev, [key]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName || !form.businessPhone) { setError("Business name and phone required"); return; }
    setSaving(true); setError("");

    const result: Vendor = {
      id: vendor?.id || `v_${Date.now()}`,
      businessName: form.businessName, businessAddress: form.businessAddress,
      businessPhone: form.businessPhone, campus: form.campus,
      opensAt: form.opensAt, closesAt: form.closesAt,
      commissionRate: parseFloat(form.commissionRate) / 100,
      isActive: vendor?.isActive ?? true,
      isTrending: vendor?.isTrending ?? false,
      dealCount: vendor?.dealCount ?? 0,
      totalSales: vendor?.totalSales ?? 0,
      pendingPayout: vendor?.pendingPayout ?? 0,
      redemptionRate: vendor?.redemptionRate ?? 0,
      bankName: form.bankName, accountNumber: form.accountNumber,
      user: { fullName: form.ownerName, email: form.email },
    };

    try {
      if (isEdit) { await api.put(`/admin/vendors/${vendor!.id}`, form); }
      else { const res = await api.post("/admin/vendors", form); result.id = res.data.data?.id || result.id; }
      onSaved(result, isEdit);
    } catch {
      setError("Failed to save vendor. Check your connection.");
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
  const sectionLabel = (text: string) => (
    <p className="text-[11px] font-semibold uppercase tracking-wider mt-2 mb-3 pt-4 border-t"
      style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em", borderColor: "var(--color-border)" }}>
      {text}
    </p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {isEdit ? vendor.businessName : "Add Vendor"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isEdit && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <MiniStat label="Total Sales" value={`₦${((vendor?.totalSales ?? 0) / 100).toLocaleString()}`} color="var(--color-success)" />
            <MiniStat label="Pending Payout" value={`₦${((vendor?.pendingPayout ?? 0) / 100).toLocaleString()}`} color="var(--color-warning)" />
            <MiniStat label="Redemption Rate" value={`${vendor?.redemptionRate ?? 0}%`} color={vendor && vendor.redemptionRate >= 85 ? "var(--color-success)" : "var(--color-warning)"} />
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {/* Vendor Logo */}
          <div className="flex items-center gap-4 mb-1">
            <label className="cursor-pointer">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ background: "var(--color-surface-light)", border: form.logoUrl ? "none" : "2px dashed var(--color-border)" }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--color-text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z" />
                  </svg>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => update("logoUrl", ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
            </label>
            <div>
              <p className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>Vendor Logo</p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Shown in trending circles on student app</p>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Business Name *</label>
            <input value={form.businessName} onChange={e => update("businessName", e.target.value)}
              placeholder="e.g. Mama Nkechi Kitchen" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Owner Name</label>
              <input value={form.ownerName} onChange={e => update("ownerName", e.target.value)}
                placeholder="Contact person" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input value={form.email} onChange={e => update("email", e.target.value)}
                placeholder="vendor@email.com" style={inputStyle} />
            </div>
          </div>

          {sectionLabel("Location & Hours")}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Campus</label>
              <select value={form.campus} onChange={e => update("campus", e.target.value)} style={inputStyle}>
                {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input value={form.businessPhone} onChange={e => update("businessPhone", e.target.value)}
                placeholder="+234..." style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input value={form.businessAddress} onChange={e => update("businessAddress", e.target.value)}
              placeholder="Shop location on campus" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Opens At</label>
              <input type="time" value={form.opensAt} onChange={e => update("opensAt", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Closes At</label>
              <input type="time" value={form.closesAt} onChange={e => update("closesAt", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {sectionLabel("Financials")}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>Commission %</label>
              <input type="number" step="1" value={form.commissionRate}
                onChange={e => update("commissionRate", e.target.value)} placeholder="10" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bank</label>
              <input value={form.bankName} onChange={e => update("bankName", e.target.value)}
                placeholder="GTBank" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Account #</label>
              <input value={form.accountNumber} onChange={e => update("accountNumber", e.target.value)}
                placeholder="012****890" style={inputStyle} />
            </div>
          </div>

          {/* QR Management — edit only */}
          {isEdit && vendor && (
            <QrManagement vendorId={vendor.id} vendorName={vendor.businessName} />
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px]"
              style={{ background: "var(--color-error-surface)", color: "var(--color-error)", border: "1px solid var(--color-error-border)" }}>
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
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--color-surface-light)", border: "1px solid var(--color-border)" }}>
      <p className="text-[15px] font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
    </div>
  );
}
