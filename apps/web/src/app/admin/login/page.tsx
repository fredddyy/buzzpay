"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { setToken } from "@/lib/api";

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
      if (user.role !== "ADMIN") {
        setError("Admin access only.");
        setLoading(false);
        return;
      }
      setToken(tokens.accessToken);
      router.replace("/admin");
    } catch {
      setError("Invalid credentials");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-[#6C4FFF]">BuzzPay</h1>
          <p className="text-sm text-gray-400 mt-1">Admin Dashboard</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email" placeholder="Admin email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 focus:border-[#6C4FFF] focus:ring-2 focus:ring-[#6C4FFF]/20 outline-none text-sm"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-gray-200 focus:border-[#6C4FFF] focus:ring-2 focus:ring-[#6C4FFF]/20 outline-none text-sm"
          />
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#6C4FFF] text-white font-bold text-sm shadow-lg shadow-[#6C4FFF]/30 disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
