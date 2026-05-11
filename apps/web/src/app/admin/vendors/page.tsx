"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Vendor {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  isActive: boolean;
  commissionRate: number;
  opensAt: string;
  closesAt: string;
  user: { fullName: string; email: string };
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadVendors(); }, []);

  async function loadVendors() {
    try {
      const res = await api.get("/admin/vendors");
      setVendors(res.data.data || []);
    } catch {
      setVendors([
        { id: "v1", businessName: "Mama Nkechi Kitchen", businessAddress: "Shop 5, UNILAG Main Gate", businessPhone: "+2348011111111", isActive: true, commissionRate: 0.10, opensAt: "07:00", closesAt: "21:00", user: { fullName: "Mama Nkechi", email: "mama@buzzpay.ng" } },
        { id: "v2", businessName: "ChillZone Cafe", businessAddress: "12 University Road, Akoka", businessPhone: "+2348022222222", isActive: true, commissionRate: 0.12, opensAt: "10:00", closesAt: "22:00", user: { fullName: "ChillZone Manager", email: "chill@buzzpay.ng" } },
      ]);
    }
    setLoading(false);
  }

  async function toggleActive(vendor: Vendor) {
    try { await api.put(`/admin/vendors/${vendor.id}`, { isActive: !vendor.isActive }); } catch {}
    setVendors((prev) => prev.map((v) => v.id === vendor.id ? { ...v, isActive: !v.isActive } : v));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Vendors</h1>
          <p className="text-sm text-gray-400">Manage vendor partners</p>
        </div>
        <button className="px-5 py-2.5 rounded-full bg-[#6C4FFF] text-white text-sm font-bold shadow-lg shadow-[#6C4FFF]/20">
          + Add Vendor
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {vendors.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base">{v.businessName}</h3>
                  <p className="text-xs text-gray-400">{v.businessAddress}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  v.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                }`}>
                  {v.isActive ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Hours</p>
                  <p className="text-sm font-semibold">{v.opensAt} – {v.closesAt}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Commission</p>
                  <p className="text-sm font-semibold">{(v.commissionRate * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Contact</p>
                  <p className="text-sm font-semibold truncate">{v.user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">Edit</button>
                <button onClick={() => toggleActive(v)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    v.isActive ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                  }`}>
                  {v.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
