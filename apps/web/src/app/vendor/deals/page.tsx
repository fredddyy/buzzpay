"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api, { getToken } from "@/lib/api";

interface Deal {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string | null;
  originalPrice: number;
  studentPrice: number;
  totalQuantity: number;
  remainingQty: number;
  maxPerUser: number;
  startsAt: string;
  expiresAt: string;
  dailyStart: string | null;
  dailyEnd: string | null;
  featuredSection: string | null;
  tags: string[];
  status: string;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES = ["FOOD", "DRINKS", "SUBSCRIPTIONS", "TRANSPORT", "SHOPPING", "LIFESTYLE"];

const EMPTY_FORM = {
  title: "", description: "", category: "FOOD", imageUrl: "",
  originalPrice: "", studentPrice: "", totalQuantity: "",
  maxPerUser: "1", startsAt: "", expiresAt: "",
  dailyStart: "", dailyEnd: "", featuredSection: "", tags: "",
};

export default function VendorDealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace("/admin/login"); return; }
    load();
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/vendor/my-deals");
      setDeals(res.data.data || []);
    } catch {
      setDeals([]);
    }
    setLoading(false);
  }, []);

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }

  const [uploading, setUploading] = useState(false);
  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", "buzzpay/deals");
      const res = await api.post("/upload/image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, imageUrl: res.data.data.url }));
    } catch { alert("Upload failed"); }
    setUploading(false);
  }

  function statusBadge(status: string) {
    const styles: Record<string, { bg: string; color: string }> = {
      DRAFT: { bg: "#FFF3E0", color: "#E65100" },
      LIVE: { bg: "#E8F5E9", color: "#2E7D32" },
      EXPIRED: { bg: "#FAFAFA", color: "#9E9E9E" },
    };
    const s = styles[status] || styles.DRAFT;
    return (
      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  }

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(deal: Deal) {
    setEditId(deal.id);
    setForm({
      title: deal.title,
      description: deal.description,
      category: deal.category,
      imageUrl: deal.imageUrl || "",
      originalPrice: String(deal.originalPrice / 100),
      studentPrice: String(deal.studentPrice / 100),
      totalQuantity: String(deal.totalQuantity),
      maxPerUser: String(deal.maxPerUser),
      startsAt: deal.startsAt.slice(0, 16),
      expiresAt: deal.expiresAt.slice(0, 16),
      dailyStart: deal.dailyStart || "",
      dailyEnd: deal.dailyEnd || "",
      featuredSection: deal.featuredSection || "",
      tags: deal.tags.join(", "),
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      imageUrl: form.imageUrl || null,
      originalPrice: Math.round(Number(form.originalPrice) * 100),
      studentPrice: Math.round(Number(form.studentPrice) * 100),
      totalQuantity: Number(form.totalQuantity),
      maxPerUser: Number(form.maxPerUser) || 1,
      startsAt: new Date(form.startsAt).toISOString(),
      expiresAt: new Date(form.expiresAt).toISOString(),
      dailyStart: form.dailyStart || null,
      dailyEnd: form.dailyEnd || null,
      featuredSection: form.featuredSection || null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };

    try {
      if (editId) {
        await api.put(`/vendor/deals/${editId}`, payload);
      } else {
        await api.post("/vendor/deals", payload);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to save deal";
      setError(msg);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this draft deal?")) return;
    try {
      await api.delete(`/vendor/deals/${id}`);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Cannot delete";
      alert(msg);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto w-full" style={{ background: "var(--color-surface)" }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>My Deals</h1>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Create and manage your deals</p>
          </div>
          <button onClick={openCreate}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-primary)", color: "white" }}>
            + New Deal
          </button>
        </div>
      </div>

      {/* Deals list */}
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-4 max-w-3xl mx-auto w-full">
          {loading ? (
            <div className="text-center py-10" style={{ color: "var(--color-text-muted)" }}>Loading...</div>
          ) : deals.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>No deals yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Create your first deal to start selling</p>
              <button onClick={openCreate} className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--color-primary)", color: "white" }}>
                Create Deal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => (
                <div key={deal.id} className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>{deal.title}</span>
                        {statusBadge(deal.status)}
                      </div>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{deal.category} · {fmt(deal.studentPrice)} <span style={{ textDecoration: "line-through" }}>{fmt(deal.originalPrice)}</span></p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                        Stock: {deal.remainingQty}/{deal.totalQuantity}
                        {deal.dailyStart && ` · ${deal.dailyStart}–${deal.dailyEnd}`}
                        {deal.featuredSection && ` · ${deal.featuredSection}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {deal.status === "DRAFT" && (
                        <>
                          <button onClick={() => openEdit(deal)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>Edit</button>
                          <button onClick={() => handleDelete(deal.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ color: "#EF4444" }}>Delete</button>
                        </>
                      )}
                      {deal.status === "LIVE" && (
                        <span className="text-[11px] font-medium px-3 py-1.5" style={{ color: "var(--color-text-muted)" }}>Admin managed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{editId ? "Edit Deal" : "New Deal"}</h2>
              <button onClick={() => setShowForm(false)} className="text-sm" style={{ color: "var(--color-text-muted)" }}>Cancel</button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl text-[13px]" style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section 1: What are you selling? */}
              <SectionLabel title="What are you selling?" />

              <Field label="Deal Name" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))}
                placeholder="e.g. Jollof Rice + Chicken Combo" required
                hint="Keep it short and clear. Students see this on their feed." />

              <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))}
                placeholder="e.g. A plate of jollof rice with a big chicken piece and plantain"
                hint="Describe what the student gets. Be specific about portions or what's included." />

              <div>
                <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
                <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Choose the best category so students can find your deal easily.</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Product Photo</label>
                {form.imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                    <img src={form.imageUrl} alt="Deal" className="w-full h-32 object-cover" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ background: "rgba(0,0,0,0.6)" }}>×</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-6 rounded-xl cursor-pointer"
                    style={{ background: "var(--color-base)", border: "2px dashed var(--color-border)" }}>
                    <span className="text-[13px] font-semibold" style={{ color: uploading ? "var(--color-text-muted)" : "var(--color-primary)" }}>
                      {uploading ? "Uploading..." : "📷 Tap to upload photo"}
                    </span>
                    <span className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>JPG, PNG — max 5MB. Deals with photos get 3x more sales.</span>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); }} />
                  </label>
                )}
              </div>

              {/* Section 2: Pricing */}
              <SectionLabel title="How much?" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Normal Price (₦)" value={form.originalPrice} onChange={v => setForm(f => ({ ...f, originalPrice: v }))}
                  placeholder="2000" type="number" required
                  hint="Your regular price without discount" />
                <Field label="Student Price (₦)" value={form.studentPrice} onChange={v => setForm(f => ({ ...f, studentPrice: v }))}
                  placeholder="1500" type="number" required
                  hint="Discounted price for students" />
              </div>

              {Number(form.originalPrice) > 0 && Number(form.studentPrice) > 0 && Number(form.studentPrice) < Number(form.originalPrice) && (
                <div className="px-3 py-2 rounded-xl text-[12px] font-semibold" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
                  Students save ₦{Number(form.originalPrice) - Number(form.studentPrice)} ({Math.round((1 - Number(form.studentPrice) / Number(form.originalPrice)) * 100)}% off)
                </div>
              )}

              {Number(form.studentPrice) >= Number(form.originalPrice) && Number(form.studentPrice) > 0 && (
                <div className="px-3 py-2 rounded-xl text-[12px] font-semibold" style={{ background: "#FEF2F2", color: "#EF4444" }}>
                  Student price must be lower than the normal price
                </div>
              )}

              {/* Section 3: Stock */}
              <SectionLabel title="How many?" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="How many available?" value={form.totalQuantity} onChange={v => setForm(f => ({ ...f, totalQuantity: v }))}
                  placeholder="50" type="number" required
                  hint="Total units you can sell today" />
                <Field label="Limit per student" value={form.maxPerUser} onChange={v => setForm(f => ({ ...f, maxPerUser: v }))}
                  placeholder="2" type="number"
                  hint="Max a single student can buy per day" />
              </div>

              {/* Section 4: When */}
              <SectionLabel title="When is this deal available?" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Available From</label>
                  <input type="datetime-local" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                  <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>When students can start buying</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Ends On</label>
                  <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} required
                    min={form.startsAt || undefined}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                  <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>When deal expires (can&apos;t buy after this)</p>
                </div>
              </div>

              {form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt) && (
                <div className="px-3 py-2 rounded-xl text-[12px] font-semibold" style={{ background: "#FEF2F2", color: "#EF4444" }}>
                  End date must be after start date
                </div>
              )}

              {/* Section 5: Rush Hour (optional) */}
              <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                <SectionLabel title="Rush Hour Deal? (optional)" />
                <p className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                  Set a daily time window if this deal is only available during specific hours (e.g. lunch rush 12-2PM).
                  Leave blank if the deal is available all day.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Opens At (daily)</label>
                    <input type="time" value={form.dailyStart} onChange={e => setForm(f => ({ ...f, dailyStart: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                    <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>e.g. 12:00 PM</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Closes At (daily)</label>
                    <input type="time" value={form.dailyEnd} onChange={e => setForm(f => ({ ...f, dailyEnd: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                    <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>e.g. 2:00 PM</p>
                  </div>
                </div>

                {form.dailyStart && !form.dailyEnd && (
                  <div className="px-3 py-2 rounded-xl text-[12px] mt-2" style={{ background: "#FFF3E0", color: "#E65100" }}>
                    You set an opening time but no closing time. Please set both or leave both empty.
                  </div>
                )}

                <div className="mt-2">
                  <Field label="Rush Hour Name (optional)" value={form.featuredSection} onChange={v => setForm(f => ({ ...f, featuredSection: v }))}
                    placeholder="e.g. Lunch Rush, Breakfast Special"
                    hint="Deals with the same name from different vendors are grouped together on the student app." />
                </div>
              </div>

              {/* Section 6: Tags */}
              <Field label="Tags (optional)" value={form.tags} onChange={v => setForm(f => ({ ...f, tags: v }))}
                placeholder="e.g. jollof, rice, chicken, lunch"
                hint="Help students find your deal. Separate tags with commas." />

              {/* Warnings */}
              {editId && (
                <div className="px-3 py-2.5 rounded-xl text-[12px]" style={{ background: "#FFF3E0", color: "#E65100" }}>
                  ⚠️ Editing will send the deal back for admin review before it goes live again.
                </div>
              )}

              <div className="px-3 py-2.5 rounded-xl text-[12px]" style={{ background: "#E3F2FD", color: "#1565C0" }}>
                ℹ️ After submitting, our team will review your deal. Once approved, it will appear on the student app. This usually takes less than 1 hour.
              </div>

              <button type="submit"
                disabled={saving || Number(form.studentPrice) >= Number(form.originalPrice) || (form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt)) || (form.dailyStart && !form.dailyEnd)}
                className="w-full py-3.5 rounded-xl text-sm font-semibold mt-2 disabled:opacity-40 transition"
                style={{ background: "var(--color-primary)", color: "white" }}>
                {saving ? "Submitting..." : editId ? "Update & Submit for Review" : "Submit for Review"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex max-w-3xl mx-auto w-full" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
        <button onClick={() => router.push("/scanner")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Scanner</button>
        <button onClick={() => router.push("/dashboard")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Dashboard</button>
        <button className="flex-1 py-4 text-center text-xs font-bold" style={{ color: "var(--color-primary)" }}>My Deals</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        onFocus={e => e.target.style.borderColor = "var(--color-primary)"}
        onBlur={e => e.target.style.borderColor = "var(--color-border)"} />
      {hint && <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>{hint}</p>}
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <p className="text-[13px] font-bold pt-1" style={{ color: "var(--color-text)" }}>{title}</p>;
}
