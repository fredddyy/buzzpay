"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  featuredSection: string | null;
  dailyStart: string | null;
  dailyEnd: string | null;
  previewStart: string | null;
  activeDays: number[];
  status: string;
  publishedAt: string | null;
  dealCount: number;
  createdAt: string;
}

interface CampaignDeal {
  id: string;
  title: string;
  vendorId: string;
  vendorName?: string;
  category: string;
  originalPrice: number;
  studentPrice: number;
  totalQuantity: number;
  isActive: boolean;
}

interface Vendor { id: string; businessName: string; }

const CATEGORIES = ["FOOD", "DRINKS", "SUBSCRIPTIONS", "TRANSPORT", "SHOPPING", "LIFESTYLE"];
const SECTION_PRESETS = [
  { name: "Breakfast Rush", preview: "05:30", start: "07:00", end: "10:30", days: [1,2,3,4,5] },
  { name: "Lunch Special", preview: "10:00", start: "12:00", end: "15:30", days: [1,2,3,4,5] },
  { name: "Happy Hour", preview: "14:00", start: "16:00", end: "19:00", days: [1,2,3,4,5] },
  { name: "Night Owl", preview: "19:00", start: "21:00", end: "23:59", days: [0,1,2,3,4,5,6] },
  { name: "Weekend Buzz", preview: "08:00", start: "10:00", end: "22:00", days: [0,6] },
];
const DAY_LABELS = ["S","M","T","W","T","F","S"];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [campaignDeals, setCampaignDeals] = useState<CampaignDeal[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, vendRes] = await Promise.all([
        api.get("/admin/campaigns"),
        api.get("/admin/vendors"),
      ]);
      setCampaigns(campRes.data.data || []);
      setVendors((vendRes.data.data || []).map((v: any) => ({ id: v.id, businessName: v.businessName })));
    } catch { setCampaigns([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadCampaignDeals(id: string) {
    try {
      const res = await api.get(`/admin/deals?limit=100`);
      const all = res.data.data || [];
      setCampaignDeals(all.filter((d: any) => d.campaignId === id));
    } catch { setCampaignDeals([]); }
  }

  async function publish(id: string) {
    try {
      await api.post(`/admin/campaigns/${id}/publish`);
      load();
      if (selected?.id === id) setSelected({ ...selected!, status: "PUBLISHED" });
    } catch {}
  }

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Campaigns</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Batch-create deals for multiple vendors and publish all at once
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
          style={{ background: "var(--color-primary)", color: "white" }}>
          + New Campaign
        </button>
      </div>

      {/* Campaign list */}
      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="skeleton w-40 h-4 mb-2" /><div className="skeleton w-24 h-3" />
            </div>
          ))
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>No campaigns yet</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Create one to batch-publish deals across vendors</p>
          </div>
        ) : (
          campaigns.map(c => (
            <div key={c.id}
              className="rounded-xl p-4 cursor-pointer transition-colors"
              style={{ background: selected?.id === c.id ? "var(--color-primary-surface)" : "var(--color-surface)", border: `1px solid ${selected?.id === c.id ? "var(--color-primary-border)" : "var(--color-border)"}` }}
              onClick={() => { setSelected(c); loadCampaignDeals(c.id); }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>{c.name}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: c.status === "PUBLISHED" ? "var(--color-success-surface)" : "var(--color-warning-surface)",
                        color: c.status === "PUBLISHED" ? "var(--color-success)" : "var(--color-warning)",
                      }}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {c.featuredSection && <span>{c.featuredSection}</span>}
                    {c.dailyStart && <span className="font-mono">{c.dailyStart}–{c.dailyEnd}</span>}
                    <span>{c.dealCount} deal{c.dealCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                    style={{ background: "var(--color-surface-hover)", color: "var(--color-text-muted)" }}>
                    Edit
                  </button>
                  {c.status === "DRAFT" && (
                    <button onClick={(e) => { e.stopPropagation(); publish(c.id); }}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                      style={{ background: "var(--color-success)", color: "white" }}>
                      Publish All
                    </button>
                  )}
                </div>
                <button onClick={async (e) => { e.stopPropagation(); if (!confirm(`Delete "${c.name}"? Deals will be kept.`)) return; try { await api.delete(`/admin/campaigns/${c.id}`); } catch {} setCampaigns(prev => prev.filter(x => x.id !== c.id)); if (selected?.id === c.id) { setSelected(null); setCampaignDeals([]); } }}
                  className="p-1 rounded opacity-30 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--color-error)" }} title="Delete campaign">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected campaign detail */}
      {selected && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
              {selected.name} — Deals
            </h2>
            <div className="flex gap-2">
              <button onClick={async () => {
                try { const r = await api.post(`/admin/campaigns/${selected.id}/sync`); alert(`Synced ${r.data.data.updated} deals with campaign schedule`); loadCampaignDeals(selected.id); load(); } catch { alert('Sync failed'); }
              }}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ background: "var(--color-warning-surface)", color: "var(--color-warning)", border: "1px solid var(--color-warning-border)" }}>
                Sync Schedule
              </button>
              <button onClick={() => {}}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ background: "var(--color-primary-surface)", color: "var(--color-primary)", border: "1px solid var(--color-primary-border)" }}>
                + Add Deal
              </button>
            </div>
          </div>

          {campaignDeals.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>No deals in this campaign yet</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="grid grid-cols-[1fr_90px_100px_80px_80px_80px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <span>Deal</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span><span className="text-right">Actions</span>
              </div>
              {campaignDeals.map(d => (
                <div key={d.id} className="grid grid-cols-[1fr_90px_100px_80px_80px_80px] gap-3 px-4 py-3 items-center"
                  style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{d.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{d.vendorName || d.vendorId}</p>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{d.category}</span>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--color-primary)" }}>{fmt(d.studentPrice)}</span>
                  <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{d.totalQuantity}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                    style={{
                      background: d.isActive ? "var(--color-success-surface)" : "var(--color-warning-surface)",
                      color: d.isActive ? "var(--color-success)" : "var(--color-warning)",
                    }}>
                    {d.isActive ? "Live" : "Draft"}
                  </span>
                  <div className="flex gap-1 justify-end">
                    {!d.isActive && (
                      <button onClick={async () => {
                        try { await api.put(`/admin/deals/${d.id}/toggle`); loadCampaignDeals(selected!.id); } catch {}
                      }} className="px-2 py-1 rounded text-[10px] font-semibold"
                        style={{ background: "var(--color-success-surface)", color: "var(--color-success)" }}>Activate</button>
                    )}
                    <a href={`/admin/deals`} className="px-2 py-1 rounded text-[10px] font-semibold"
                      style={{ background: "var(--color-surface-hover)", color: "var(--color-text-muted)" }}>Edit</a>
                    <button onClick={async () => {
                      if (!confirm(`Remove "${d.title}" from this campaign?`)) return;
                      try { await api.put(`/admin/deals/${d.id}`, { campaignId: null }); loadCampaignDeals(selected!.id); load(); } catch {}
                    }} className="px-2 py-1 rounded text-[10px] font-semibold" style={{ color: "var(--color-error)" }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create campaign modal */}
      {creating && (
        <CreateCampaignModal
          onClose={() => setCreating(false)}
          onCreated={(campaign) => {
            setCreating(false);
            setCampaigns(prev => [campaign, ...prev]);
            setSelected(campaign);
            setCampaignDeals([]);
          }}
        />
      )}

      {/* Edit campaign modal */}
      {editing && (
        <CreateCampaignModal
          initial={editing}
          onClose={() => setEditing(null)}
          onCreated={(updated) => {
            setEditing(null);
            setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
            if (selected?.id === updated.id) setSelected(updated);
          }}
        />
      )}

      {/* Add deal to campaign */}
      {selected && (
        <AddDealPanel
          campaign={selected}
          vendors={vendors}
          onAdded={() => { load(); loadCampaignDeals(selected.id); }}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────── */
/* Create Campaign Modal                    */
/* ──────────────────────────────────────── */

function CreateCampaignModal({ onClose, onCreated, initial }: {
  onClose: () => void;
  onCreated: (campaign: Campaign) => void;
  initial?: Campaign | null;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [featuredSection, setFeaturedSection] = useState(initial?.featuredSection || "");
  const [dailyStart, setDailyStart] = useState(initial?.dailyStart || "08:00");
  const [dailyEnd, setDailyEnd] = useState(initial?.dailyEnd || "11:00");
  const [previewStart, setPreviewStart] = useState(initial?.previewStart || "06:00");
  const [activeDays, setActiveDays] = useState<number[]>(initial?.activeDays || [1,2,3,4,5]);
  const [saving, setSaving] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: "var(--color-surface-light)", border: "1px solid var(--color-border)",
    color: "var(--color-text)", borderRadius: 10, padding: "10px 14px", fontSize: 13, width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
    color: "var(--color-text-muted)", marginBottom: 6, display: "block",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { name, featuredSection: featuredSection || name, dailyStart, dailyEnd, previewStart, activeDays };
      if (isEdit && initial) {
        await api.put(`/admin/campaigns/${initial.id}`, payload);
        onCreated({ ...initial, ...payload, dealCount: initial.dealCount });
      } else {
        const res = await api.post("/admin/campaigns", payload);
        onCreated({ ...res.data.data, dealCount: 0 });
      }
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>{isEdit ? "Edit Campaign" : "New Campaign"}</h2>
          <button onClick={onClose} className="p-1" style={{ color: "var(--color-text-muted)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label style={labelStyle}>Campaign Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Breakfast Rush Monday" style={inputStyle} />
          </div>

          {/* Preset pills */}
          <div>
            <label style={labelStyle}>Quick Setup</label>
            <div className="flex flex-wrap gap-1.5">
              {SECTION_PRESETS.map(s => (
                <button key={s.name} type="button"
                  onClick={() => { setName(s.name); setFeaturedSection(s.name); setDailyStart(s.start); setDailyEnd(s.end); setPreviewStart(s.preview); setActiveDays(s.days); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                  style={{
                    background: name === s.name ? "var(--color-primary-surface)" : "var(--color-surface-hover)",
                    color: name === s.name ? "var(--color-primary)" : "var(--color-text-muted)",
                    border: `1px solid ${name === s.name ? "var(--color-primary-border)" : "transparent"}`,
                  }}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Section Name on Feed</label>
            <input value={featuredSection} onChange={e => setFeaturedSection(e.target.value)}
              placeholder="How it appears to students" style={inputStyle} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={{ ...labelStyle, fontSize: 10 }}>Preview From</label>
              <input type="time" value={previewStart} onChange={e => setPreviewStart(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 10 }}>Active From</label>
              <input type="time" value={dailyStart} onChange={e => setDailyStart(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 10 }}>Ends At</label>
              <input type="time" value={dailyEnd} onChange={e => setDailyEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ ...labelStyle, fontSize: 10 }}>Active Days</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((d, i) => {
                const active = activeDays.includes(i);
                return (
                  <button key={i} type="button"
                    onClick={() => setActiveDays(active ? activeDays.filter(x => x !== i) : [...activeDays, i])}
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
              style={{ background: "var(--color-surface-light)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
              style={{ background: "var(--color-primary)", color: "white" }}>
              {saving ? "Saving..." : isEdit ? "Update Campaign" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────── */
/* Add Deal to Campaign Panel               */
/* ──────────────────────────────────────── */

function AddDealPanel({ campaign, vendors, onAdded }: {
  campaign: Campaign;
  vendors: Vendor[];
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<"new" | "existing">("existing");
  const [vendorId, setVendorId] = useState(vendors[0]?.id || "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("FOOD");
  const [originalPrice, setOriginalPrice] = useState("");
  const [studentPrice, setStudentPrice] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("50");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [existingDeals, setExistingDeals] = useState<{ id: string; title: string; vendorName: string; studentPrice: number }[]>([]);
  const [selectedDealId, setSelectedDealId] = useState("");

  const inputStyle: React.CSSProperties = {
    background: "var(--color-surface-light)", border: "1px solid var(--color-border)",
    color: "var(--color-text)", borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none",
  };

  // Load existing deals when switching to "existing" mode
  useEffect(() => {
    if (mode === "existing") {
      api.get("/admin/deals?limit=100").then(r => {
        const deals = (r.data.data || []).filter((d: { campaignId: string | null }) => !d.campaignId);
        setExistingDeals(deals.map((d: { id: string; title: string; vendorName: string; studentPrice: number }) => ({
          id: d.id, title: d.title, vendorName: d.vendorName, studentPrice: d.studentPrice,
        })));
      }).catch(() => {});
    }
  }, [mode]);

  async function addExisting() {
    if (!selectedDealId) return;
    setSaving(true); setMessage("");
    try {
      await api.post(`/admin/campaigns/${campaign.id}/deals`, { existingDealId: selectedDealId });
      const deal = existingDeals.find(d => d.id === selectedDealId);
      setMessage(`Added "${deal?.title}" to campaign`);
      setSelectedDealId("");
      onAdded();
    } catch {
      setMessage("Failed to add deal");
    }
    setSaving(false);
  }

  async function addNew() {
    if (!title || !originalPrice || !studentPrice) return;
    setSaving(true); setMessage("");
    try {
      const now = new Date();
      await api.post(`/admin/campaigns/${campaign.id}/deals`, {
        vendorId, title, category,
        originalPrice: Math.round(parseFloat(originalPrice) * 100),
        studentPrice: Math.round(parseFloat(studentPrice) * 100),
        totalQuantity: parseInt(totalQuantity) || 50,
        startsAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 86400000).toISOString(),
      });
      setMessage(`Added "${title}" for ${vendors.find(v => v.id === vendorId)?.businessName}`);
      setTitle(""); setOriginalPrice(""); setStudentPrice("");
      onAdded();
    } catch {
      setMessage("Failed to add deal");
    }
    setSaving(false);
  }

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)", letterSpacing: "0.05em" }}>
          Add Deal to &quot;{campaign.name}&quot;
        </p>
        <div className="flex gap-1">
          <button onClick={() => setMode("existing")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: mode === "existing" ? "var(--color-primary)" : "var(--color-surface-hover)", color: mode === "existing" ? "white" : "var(--color-text-muted)" }}>
            Existing Deal
          </button>
          <button onClick={() => setMode("new")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: mode === "new" ? "var(--color-primary)" : "var(--color-surface-hover)", color: mode === "new" ? "white" : "var(--color-text-muted)" }}>
            New Deal
          </button>
        </div>
      </div>

      {mode === "existing" ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Select an existing deal</label>
            <select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)} style={inputStyle}>
              <option value="">Choose a deal...</option>
              {existingDeals.map(d => (
                <option key={d.id} value={d.id}>{d.title} — {d.vendorName} (₦{d.studentPrice / 100})</option>
              ))}
            </select>
          </div>
          <button onClick={addExisting} disabled={saving || !selectedDealId}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "white" }}>
            {saving ? "..." : "Add"}
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-[1fr_1fr_80px_80px_80px_60px_auto] gap-2 items-end">
        <div>
          <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Vendor</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={inputStyle}>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.businessName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Deal Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Egg Wrap" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Price (₦)</label>
          <input type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="1000" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Student (₦)</label>
          <input type="number" value={studentPrice} onChange={e => setStudentPrice(e.target.value)} placeholder="700" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>Qty</label>
          <input type="number" value={totalQuantity} onChange={e => setTotalQuantity(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={addNew} disabled={saving || !title}
          className="px-3 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "var(--color-primary)", color: "white" }}>
          {saving ? "..." : "Add"}
        </button>
      </div>
      )}
      {message && (
        <p className="text-[11px] mt-2" style={{ color: message.startsWith("Failed") ? "var(--color-error)" : "var(--color-success)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
