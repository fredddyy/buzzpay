"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getToken } from "@/lib/api";

interface VendorProfile {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  logoUrl: string | null;
  opensAt: string;
  closesAt: string;
  commissionRate: number;
}

export default function VendorProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    businessName: "", businessAddress: "", businessPhone: "",
    logoUrl: "", opensAt: "08:00", closesAt: "21:00",
  });

  useEffect(() => {
    if (!getToken()) { router.replace("/admin/login"); return; }
    loadProfile();
  }, [router]);

  async function loadProfile() {
    try {
      const res = await api.get("/vendor/profile");
      const data = res.data.data as VendorProfile;
      setProfile(data);
      setForm({
        businessName: data.businessName,
        businessAddress: data.businessAddress,
        businessPhone: data.businessPhone,
        logoUrl: data.logoUrl || "",
        opensAt: data.opensAt,
        closesAt: data.closesAt,
      });
    } catch {}
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/vendor/profile", form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-base)" }}><p style={{ color: "var(--color-text-muted)" }}>Loading...</p></div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 max-w-3xl mx-auto w-full" style={{ background: "var(--color-surface)" }}>
        <h1 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>Store Profile</h1>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Update your business details. Changes show on student app immediately.</p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-6 max-w-3xl mx-auto w-full">
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Business Name" value={form.businessName} onChange={v => setForm(f => ({ ...f, businessName: v }))}
              hint="Your store name as students see it" required />

            <Field label="Address" value={form.businessAddress} onChange={v => setForm(f => ({ ...f, businessAddress: v }))}
              hint="Where students come to pick up their order" required />

            <Field label="Phone Number" value={form.businessPhone} onChange={v => setForm(f => ({ ...f, businessPhone: v }))}
              hint="Students may call if they can't find your store" required />

            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Business Logo</label>
              {form.logoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={form.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover" style={{ border: "1px solid var(--color-border)" }} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}
                    className="text-[12px] font-semibold" style={{ color: "var(--color-error)" }}>Remove</button>
                </div>
              ) : (
                <label className="flex items-center justify-center py-4 rounded-xl cursor-pointer"
                  style={{ background: "var(--color-base)", border: "2px dashed var(--color-border)" }}>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--color-primary)" }}>📷 Upload logo</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async e => {
                      if (!e.target.files?.[0]) return;
                      try {
                        const fd = new FormData(); fd.append("image", e.target.files[0]); fd.append("folder", "buzzpay/logos");
                        const res = await api.post("/upload/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
                        setForm(f => ({ ...f, logoUrl: res.data.data.url }));
                      } catch { alert("Upload failed"); }
                    }} />
                </label>
              )}
            </div>

            <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <p className="text-[13px] font-bold mb-3" style={{ color: "var(--color-text)" }}>Opening Hours (WAT)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Opens At</label>
                  <input type="time" value={form.opensAt} onChange={e => setForm(f => ({ ...f, opensAt: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>Closes At</label>
                  <input type="time" value={form.closesAt} onChange={e => setForm(f => ({ ...f, closesAt: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                </div>
              </div>
            </div>

            {profile && (
              <div className="px-3 py-2.5 rounded-xl text-[12px]" style={{ background: "var(--color-base)", color: "var(--color-text-muted)" }}>
                Commission rate: {Math.round(profile.commissionRate * 100)}% — Contact admin to change this.
              </div>
            )}

            <button onClick={() => window.open('/api/vendor/qr-sticker', '_blank')}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: "var(--color-base)", color: "var(--color-primary)", border: "1px solid var(--color-border)" }}>
              🖨️ Print QR Sticker
            </button>

            {saved && (
              <div className="px-3 py-2.5 rounded-xl text-[12px] font-semibold" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
                ✓ Profile updated successfully
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--color-primary)", color: "white" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex max-w-3xl mx-auto w-full" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
        <button onClick={() => router.push("/scanner")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Scanner</button>
        <button onClick={() => router.push("/dashboard")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Dashboard</button>
        <button onClick={() => router.push("/vendor/deals")} className="flex-1 py-4 text-center text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>My Deals</button>
        <button className="flex-1 py-4 text-center text-xs font-bold" style={{ color: "var(--color-primary)" }}>Profile</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint, required = false }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase block mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        onFocus={e => e.target.style.borderColor = "var(--color-primary)"}
        onBlur={e => e.target.style.borderColor = "var(--color-border)"} />
      {hint && <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>{hint}</p>}
    </div>
  );
}
