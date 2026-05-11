"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Deal {
  id: string;
  title: string;
  vendorName: string;
  category: string;
  originalPrice: number;
  studentPrice: number;
  totalQuantity: number;
  remainingQty: number;
  isActive: boolean;
  isFeatured: boolean;
  expiresAt: string;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDeals(); }, []);

  async function loadDeals() {
    try {
      const res = await api.get("/admin/deals");
      setDeals(res.data.data || []);
    } catch {
      setDeals([
        { id: "d1", title: "Jollof Rice + Chicken Combo", vendorName: "Mama Nkechi Kitchen", category: "FOOD", originalPrice: 250000, studentPrice: 180000, totalQuantity: 50, remainingQty: 8, isActive: true, isFeatured: true, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() },
        { id: "d2", title: "Shawarma Special", vendorName: "Mama Nkechi Kitchen", category: "FOOD", originalPrice: 200000, studentPrice: 150000, totalQuantity: 40, remainingQty: 5, isActive: true, isFeatured: true, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() },
        { id: "d3", title: "Iced Coffee + Pastry", vendorName: "ChillZone Cafe", category: "DRINKS", originalPrice: 150000, studentPrice: 100000, totalQuantity: 25, remainingQty: 3, isActive: true, isFeatured: true, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() },
        { id: "d4", title: "Game Pass (2 Hours)", vendorName: "ChillZone Cafe", category: "LIFESTYLE", originalPrice: 200000, studentPrice: 130000, totalQuantity: 15, remainingQty: 15, isActive: false, isFeatured: false, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() },
      ]);
    }
    setLoading(false);
  }

  function formatNaira(kobo: number): string {
    return `₦${(kobo / 100).toLocaleString("en-NG")}`;
  }

  async function toggleActive(deal: Deal) {
    try { await api.put(`/admin/deals/${deal.id}`, { isActive: !deal.isActive }); } catch {}
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, isActive: !d.isActive } : d));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Deals</h1>
          <p className="text-sm text-gray-400">Create and manage student deals</p>
        </div>
        <button className="px-5 py-2.5 rounded-full bg-[#6C4FFF] text-white text-sm font-bold shadow-lg shadow-[#6C4FFF]/20">
          + New Deal
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Deal</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Vendor</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <p className="font-bold">{deal.title}</p>
                    <p className="text-xs text-gray-400">{deal.category}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{deal.vendorName}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-[#6C4FFF]">{formatNaira(deal.studentPrice)}</p>
                    <p className="text-xs text-gray-400 line-through">{formatNaira(deal.originalPrice)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold ${deal.remainingQty <= 5 ? "text-red-500" : "text-gray-600"}`}>
                      {deal.remainingQty}/{deal.totalQuantity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      deal.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {deal.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => toggleActive(deal)}
                      className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                      {deal.isActive ? "Pause" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
