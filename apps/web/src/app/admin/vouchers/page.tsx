"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface VoucherRow {
  id: string;
  code: string;
  status: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  student: { user: { fullName: string } };
  deal: { title: string; vendor: { businessName: string } };
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => { loadVouchers(); }, [statusFilter]);

  async function loadVouchers() {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await api.get(`/admin/vouchers${params}`);
      setVouchers(res.data.data || []);
    } catch {
      setVouchers([
        { id: "v1", code: "BZ7742XP", status: "ACTIVE", expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(), redeemedAt: null, createdAt: new Date().toISOString(), student: { user: { fullName: "Tunde Bakare" } }, deal: { title: "Jollof Rice + Chicken", vendor: { businessName: "Mama Nkechi Kitchen" } } },
        { id: "v2", code: "BZ9921KM", status: "ACTIVE", expiresAt: new Date(Date.now() + 2 * 3600000).toISOString(), redeemedAt: null, createdAt: new Date().toISOString(), student: { user: { fullName: "Tunde Bakare" } }, deal: { title: "Shawarma Special", vendor: { businessName: "Mama Nkechi Kitchen" } } },
        { id: "v3", code: "BZ1122AB", status: "REDEEMED", expiresAt: new Date(Date.now() - 12 * 3600000).toISOString(), redeemedAt: new Date(Date.now() - 12 * 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString(), student: { user: { fullName: "Ada Obi" } }, deal: { title: "Smoothie Bowl", vendor: { businessName: "ChillZone Cafe" } } },
        { id: "v4", code: "BZ8844ZZ", status: "EXPIRED", expiresAt: new Date(Date.now() - 86400000).toISOString(), redeemedAt: null, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), student: { user: { fullName: "Chidi N." } }, deal: { title: "Fried Rice + Turkey", vendor: { businessName: "Mama Nkechi Kitchen" } } },
      ]);
    }
    setLoading(false);
  }

  function formatDate(d: string): string {
    return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function timeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  const filtered = statusFilter === "ALL" ? vouchers : vouchers.filter((v) => v.status === statusFilter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Vouchers</h1>
          <p className="text-sm text-gray-400">Track all voucher activity</p>
        </div>
        <div className="flex gap-2">
          {["ALL", "ACTIVE", "REDEEMED", "EXPIRED"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full text-xs font-semibold ${
                statusFilter === s ? "bg-[#6C4FFF] text-white" : "bg-white text-gray-500 border border-gray-200"
              }`}>
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Code</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Deal</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Time Left</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4 font-mono font-bold text-[#6C4FFF]">{v.code}</td>
                  <td className="px-5 py-4">{v.student.user.fullName}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{v.deal.title}</p>
                    <p className="text-xs text-gray-400">{v.deal.vendor.businessName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      v.status === "ACTIVE" ? "bg-green-50 text-green-600"
                      : v.status === "REDEEMED" ? "bg-blue-50 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                    }`}>{v.status}</span>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {v.status === "ACTIVE" ? (
                      <span className="text-orange-500 font-semibold">{timeLeft(v.expiresAt)}</span>
                    ) : v.status === "REDEEMED" ? (
                      <span className="text-gray-400">Redeemed {v.redeemedAt ? formatDate(v.redeemedAt) : ""}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(v.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
