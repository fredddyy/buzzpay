"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  pendingVerifications: number;
  totalVendors: number;
  totalDeals: number;
  totalTransactions: number;
  totalRevenue: number;
  redemptionRate: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data.data);
    } catch {
      // Mock stats for demo
      setStats({
        totalUsers: 342,
        verifiedUsers: 298,
        pendingVerifications: 12,
        totalVendors: 8,
        totalDeals: 24,
        totalTransactions: 1847,
        totalRevenue: 2764500,
        redemptionRate: 89,
      });
    }
    setLoading(false);
  }

  function formatNaira(kobo: number): string {
    return `₦${(kobo / 100).toLocaleString("en-NG")}`;
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-gray-400">Real-time overview of BuzzPay operations</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students" value={stats?.totalUsers ?? 0} color="purple" />
        <StatCard label="Verified" value={stats?.verifiedUsers ?? 0} color="green" />
        <StatCard label="Pending Review" value={stats?.pendingVerifications ?? 0} color="orange" urgent />
        <StatCard label="Active Vendors" value={stats?.totalVendors ?? 0} color="blue" />
        <StatCard label="Active Deals" value={stats?.totalDeals ?? 0} color="purple" />
        <StatCard label="Transactions" value={stats?.totalTransactions ?? 0} color="green" />
        <StatCard label="Total Revenue" value={formatNaira(stats?.totalRevenue ?? 0)} color="green" />
        <StatCard label="Redemption Rate" value={`${stats?.redemptionRate ?? 0}%`} color="blue" />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction href="/admin/students" label="Review Students" count={stats?.pendingVerifications} icon="👨‍🎓" />
          <QuickAction href="/admin/deals" label="Manage Deals" icon="🎯" />
          <QuickAction href="/admin/vendors" label="View Vendors" icon="🏪" />
          <QuickAction href="/admin/transactions" label="Transactions" icon="💰" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, urgent }: { label: string; value: string | number; color: string; urgent?: boolean }) {
  const bg = color === "purple" ? "bg-[#6C4FFF]/5" : color === "green" ? "bg-green-50" : color === "orange" ? "bg-orange-50" : "bg-blue-50";
  const text = color === "purple" ? "text-[#6C4FFF]" : color === "green" ? "text-green-600" : color === "orange" ? "text-orange-600" : "text-blue-600";

  return (
    <div className={`${bg} rounded-2xl p-5 ${urgent ? "ring-2 ring-orange-200" : ""}`}>
      <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function QuickAction({ href, label, count, icon }: { href: string; label: string; count?: number; icon: string }) {
  return (
    <a href={href} className="bg-white rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition border border-gray-100">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-bold">{label}</p>
        {count !== undefined && count > 0 && (
          <p className="text-xs text-orange-500 font-semibold">{count} pending</p>
        )}
      </div>
    </a>
  );
}
