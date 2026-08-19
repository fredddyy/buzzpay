"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { setTokens } from "@/lib/api";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      const { tokens, user } = res.data.data;
      if (user.role !== "ADMIN" && user.role !== "VENDOR") {
        setError("Admin or vendor access only.");
        setLoading(false);
        return;
      }
      setTokens(tokens.accessToken, tokens.refreshToken);
      localStorage.setItem("vendor_name", user.fullName || "Vendor");
      localStorage.setItem("user_role", user.role);
      router.replace(user.role === "VENDOR" ? "/scanner" : "/admin");
    } catch {
      setError("Invalid email or password");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-base)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/icon.png" alt="BuzzPay" className="w-14 h-14 mx-auto mb-4" />
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>BuzzPay</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--color-text-muted)" }}>Admin Dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5"
              style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
              Email
            </label>
            <input
              type="email" placeholder="admin@buzzpay.ng" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--color-border)"}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5"
              style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
              Password
            </label>
            <input
              type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--color-border)"}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px]"
              style={{ background: "var(--color-error-surface)", color: "var(--color-error)", border: "1px solid var(--color-error-border)" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-50 mt-2"
            style={{ background: "var(--color-primary)", color: "white" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-[11px] mt-8" style={{ color: "var(--color-text-muted)" }}>
          BuzzPay Admin v1.0.0
        </p>
      </div>
    </div>
  );
}
