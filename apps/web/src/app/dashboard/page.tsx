"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getToken, clearToken } from "@/lib/api";

interface Redemption {
  voucherId: string;
  dealTitle: string;
  studentName: string;
  amount: number;
  redeemedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorName, setVendorName] = useState("Vendor");

  useEffect(() => {
    setVendorName(localStorage.getItem("vendor_name") || "Vendor");
  }, []);

  useEffect(() => {
    if (!getToken()) { router.replace("/"); return; }
    loadData();
  }, [router]);

  async function loadData() {
    try {
      const res = await api.get("/vendor/redemptions");
      setRedemptions(res.data.data || []);
    } catch {
      // Mock data for demo
      setRedemptions([
        { voucherId: "1", dealTitle: "Jollof Rice + Chicken", studentName: "Tunde B.", amount: 180000, redeemedAt: new Date().toISOString() },
        { voucherId: "2", dealTitle: "Shawarma Special", studentName: "Ada O.", amount: 150000, redeemedAt: new Date().toISOString() },
        { voucherId: "3", dealTitle: "Iced Coffee + Pastry", studentName: "Chidi N.", amount: 100000, redeemedAt: new Date().toISOString() },
      ]);
    }
    setLoading(false);
  }

  function formatNaira(kobo: number): string {
    return `₦${(kobo / 100).toLocaleString("en-NG")}`;
  }

  const todayTotal = redemptions.reduce((sum, r) => sum + r.amount, 0);

  function logout() {
    clearToken();
    localStorage.removeItem("vendor_refresh");
    localStorage.removeItem("vendor_name");
    router.replace("/");
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-extrabold">{vendorName}</h1>
            <p className="text-xs text-gray-400">Today&apos;s Overview</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-400 font-medium"
          >
            Log out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#6C4FFF]/5 rounded-2xl p-4">
            <p className="text-2xl font-extrabold">{redemptions.length}</p>
            <p className="text-xs text-gray-400 mt-1">Today</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-2xl font-extrabold text-green-600">
              {formatNaira(todayTotal)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Revenue</p>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4">
            <p className="text-2xl font-extrabold text-orange-500">
              {formatNaira(Math.round(todayTotal * 0.9))}
            </p>
            <p className="text-xs text-gray-400 mt-1">Your Payout</p>
          </div>
        </div>
      </div>

      {/* Redemption list */}
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Recent Redemptions
          </h2>

          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400">No redemptions today</p>
              <p className="text-xs text-gray-300 mt-1">
                Scan a student&apos;s QR to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.map((r, i) => (
                <div
                  key={r.voucherId + i}
                  className="bg-white rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{r.dealTitle}</p>
                    <p className="text-xs text-gray-400">{r.studentName}</p>
                  </div>
                  <p className="text-sm font-extrabold text-[#6C4FFF]">
                    {formatNaira(r.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex border-t border-gray-100 bg-white">
        <button
          onClick={() => router.push("/scanner")}
          className="flex-1 py-4 text-center text-xs font-semibold text-gray-400"
        >
          Scanner
        </button>
        <button className="flex-1 py-4 text-center text-xs font-bold text-[#6C4FFF]">
          Dashboard
        </button>
      </div>
    </div>
  );
}
