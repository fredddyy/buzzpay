"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface ReferralData {
  topReferrers: { name: string; code: string; count: number; rewardsEarned: number }[];
  totalReferred: number;
  rewardsGiven: number;
}

interface RewardDeal {
  id: string;
  title: string;
  studentPrice: number;
  vendor: { businessName: string };
}

interface Deal {
  id: string;
  title: string;
  vendorName: string;
  studentPrice: number;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [rewardDeal, setRewardDeal] = useState<RewardDeal | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [refRes, rewardRes, dealsRes] = await Promise.all([
        api.get("/admin/referrals"),
        api.get("/admin/referrals/reward-deal"),
        api.get("/admin/deals?limit=50&status=active"),
      ]);
      setData(refRes.data.data);
      setRewardDeal(rewardRes.data.data);
      setDeals((dealsRes.data.data || []).map((d: Deal) => ({ id: d.id, title: d.title, vendorName: d.vendorName, studentPrice: d.studentPrice })));
    } catch {}
    setLoading(false);
  }

  async function setReward() {
    if (!selectedDealId) return;
    setSaving(true);
    try {
      await api.post("/admin/referrals/set-reward", { dealId: selectedDealId });
      loadAll();
    } catch { alert("Failed to set reward"); }
    setSaving(false);
  }

  function fmt(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG")}`; }

  if (loading) return <div className="p-6"><p style={{ color: "var(--color-text-muted)" }}>Loading...</p></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Referrals</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Track referral performance and set the free meal reward</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-[22px] font-bold" style={{ color: "var(--color-primary)" }}>{data?.totalReferred ?? 0}</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Users Referred</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-[22px] font-bold" style={{ color: "var(--color-success)" }}>{data?.rewardsGiven ?? 0}</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Free Meals Given</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-[22px] font-bold" style={{ color: "var(--color-info)" }}>{data?.topReferrers?.length ?? 0}</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Active Referrers</p>
        </div>
      </div>

      {/* Reward Deal Setting */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--color-text)" }}>🎁 Free Meal Reward</p>
        <p className="text-[12px] mb-4" style={{ color: "var(--color-text-muted)" }}>
          This is the deal students receive free when they invite 3 friends. Change monthly to keep it exciting.
        </p>

        {rewardDeal ? (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: "var(--color-primary-surface)", border: "1px solid var(--color-primary-border)" }}>
            <span className="text-[13px] font-bold" style={{ color: "var(--color-primary)" }}>Current:</span>
            <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{rewardDeal.title}</span>
            <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{rewardDeal.vendor.businessName}</span>
            <span className="text-[12px] font-bold" style={{ color: "var(--color-success)" }}>{fmt(rewardDeal.studentPrice)}</span>
          </div>
        ) : (
          <div className="p-3 rounded-xl mb-4" style={{ background: "var(--color-warning-surface)", border: "1px solid var(--color-warning-border)" }}>
            <p className="text-[12px] font-semibold" style={{ color: "var(--color-warning)" }}>No reward deal set! Referrals won&apos;t generate free meals until you set one.</p>
          </div>
        )}

        <div className="flex gap-2">
          <select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--color-base)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            <option value="">Select a deal as reward...</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>{d.title} — {d.vendorName} ({fmt(d.studentPrice)})</option>
            ))}
          </select>
          <button onClick={setReward} disabled={saving || !selectedDealId}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "white" }}>
            {saving ? "..." : "Set as Reward"}
          </button>
        </div>
      </div>

      {/* Top Referrers */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>Top Referrers</p>
        </div>
        {!data?.topReferrers?.length ? (
          <p className="text-center py-8 text-[13px]" style={{ color: "var(--color-text-muted)" }}>No referrals yet</p>
        ) : (
          data.topReferrers.map((r, i) => (
            <div key={r.code} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <span className="text-[13px] font-bold w-6" style={{ color: "var(--color-primary)" }}>#{i + 1}</span>
              <div className="flex-1">
                <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{r.name}</p>
                <p className="text-[11px] font-mono" style={{ color: "var(--color-text-muted)" }}>{r.code}</p>
              </div>
              <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{r.count} referrals</span>
              <span className="text-[12px] font-bold" style={{ color: "var(--color-success)" }}>{r.rewardsEarned} 🎁</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
