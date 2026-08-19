"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/api";
import Link from "next/link";

const NAV = [
  { label: "Overview", href: "/admin", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Students", href: "/admin/students", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" },
  { label: "Vendors", href: "/admin/vendors", icon: "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64" },
  { label: "Deals", href: "/admin/deals", icon: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" },
  { label: "Transactions", href: "/admin/transactions", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375" },
  { label: "Vouchers", href: "/admin/vouchers", icon: "M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" },
  { label: "Payouts", href: "/admin/payouts", icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/admin/login"); return; }
    setReady(true);
  }, [router, pathname]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (!ready) return (
    <div className="h-screen flex items-center justify-center" style={{ background: "var(--color-base)" }}>
      <div className="skeleton w-24 h-6" />
    </div>
  );

  const sidebar = (
    <>
      {/* Logo */}
      <div className="px-3 py-3.5 border-b flex items-center gap-2" style={{ borderColor: "var(--color-border)" }}>
        <img src="/icon.png" alt="B" className="w-7 h-7 flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>BuzzPay</h1>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Admin</p>
          </div>
        )}
        {/* Close button — mobile only */}
        <button className="ml-auto p-1 rounded-md lg:hidden" onClick={() => setMobileOpen(false)}
          style={{ color: "var(--color-text-muted)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                background: active ? "var(--color-primary-surface)" : "transparent",
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
              }}
              onMouseEnter={(e) => !active && (e.currentTarget.style.background = "var(--color-surface-hover)")}
              onMouseLeave={(e) => !active && (e.currentTarget.style.background = active ? "var(--color-primary-surface)" : "transparent")}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-1.5 py-2 border-t flex items-center gap-1" style={{ borderColor: "var(--color-border)" }}>
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hidden lg:block"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" : "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"} />
          </svg>
        </button>
        {!collapsed && (
          <button onClick={() => { localStorage.clear(); router.replace("/admin/login"); }}
            className="ml-auto text-[11px] px-2 py-1 rounded transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-error)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}>
            Log out
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen" style={{ background: "var(--color-base)" }}>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 lg:hidden flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <button onClick={() => setMobileOpen(true)} className="p-1" style={{ color: "var(--color-text-secondary)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <img src="/icon.png" alt="B" className="w-6 h-6" />
        <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>BuzzPay Admin</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}
          style={{ background: "rgba(0,0,0,0.5)" }} />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col transition-all duration-200 border-r"
        style={{ width: collapsed ? 48 : 200, background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        {sidebar}
      </aside>

      {/* Mobile sidebar — slide in */}
      <aside className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-200 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: 240, background: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}>
        {sidebar}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-[52px] lg:pt-0" style={{ background: "var(--color-base)" }}>
        {children}
      </main>
    </div>
  );
}
