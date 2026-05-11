"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/api";
import Link from "next/link";

const NAV = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Students", href: "/admin/students", icon: "👨‍🎓" },
  { label: "Vendors", href: "/admin/vendors", icon: "🏪" },
  { label: "Deals", href: "/admin/deals", icon: "🎯" },
  { label: "Transactions", href: "/admin/transactions", icon: "💰" },
  { label: "Vouchers", href: "/admin/vouchers", icon: "🎟" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/admin/login"); return; }
    setReady(true);
  }, [router]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (!ready) return <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-xl font-extrabold text-[#6C4FFF]">BuzzPay</h1>
          <p className="text-xs text-gray-400">Admin Dashboard</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-[#6C4FFF]/5 text-[#6C4FFF] font-semibold"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => {
              localStorage.clear();
              router.replace("/admin/login");
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
