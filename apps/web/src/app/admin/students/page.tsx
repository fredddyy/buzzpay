"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import SearchBar from "@/components/admin/SearchBar";
import FilterPills from "@/components/admin/FilterPills";
import Pagination from "@/components/admin/Pagination";
import { subscribeAdmin } from "@/lib/supabase";

interface Student {
  id: string;
  userId: string;
  university: string;
  verificationStatus: string;
  studentIdImageUrl: string | null;
  schoolEmail: string | null;
  schoolEmailVerified: boolean;
  rejectionReason: string | null;
  createdAt: string;
  user: { fullName: string; email: string; phone: string };
}

const STATUS_FILTERS = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Student | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", filter);
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      const res = await api.get(`/admin/students/pending?${params}`);
      setStudents(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      setStudents([]);
    }
    setLoading(false);
  }, [filter, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeAdmin({ onStudentChanged: load }), [load]);

  function handleFilter(v: string) { setFilter(v); setPage(1); setSelected(null); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }

  async function revoke(id: string) {
    const reason = prompt("Reason for revoking verification (optional):");
    setActing(id);
    try { await api.post(`/admin/students/${id}/revoke`, { reason }); } catch {}
    setStudents(prev => prev.filter(s => s.id !== id));
    setMeta(prev => ({ ...prev, total: prev.total - 1 }));
    setActing(null);
    if (selected?.id === id) setSelected(null);
  }

  async function approve(id: string) {
    setActing(id);
    try { await api.post(`/admin/students/${id}/approve`); } catch {}
    setStudents(prev => prev.filter(s => s.id !== id));
    setMeta(prev => ({ ...prev, total: prev.total - 1 }));
    setActing(null);
    if (selected?.id === id) setSelected(null);
  }

  async function reject(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setActing(id);
    try { await api.post(`/admin/students/${id}/reject`, { reason }); } catch {}
    setStudents(prev => prev.filter(s => s.id !== id));
    setMeta(prev => ({ ...prev, total: prev.total - 1 }));
    setActing(null);
    if (selected?.id === id) setSelected(null);
  }

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <div className="flex h-full">
      <div className={`flex-1 p-4 lg:p-6 transition-all ${selected ? "lg:mr-[360px]" : ""}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Students</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Review and manage student verifications</p>
          </div>
          <FilterPills options={STATUS_FILTERS} selected={filter} onChange={handleFilter} />
        </div>

        <div className="mb-4 w-full sm:w-64">
          <SearchBar value={search} onChange={handleSearch} placeholder="Search name, email, phone..." />
        </div>

        <div className="rounded-xl overflow-x-auto" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="min-w-[640px]">
          <div className="grid grid-cols-[1fr_100px_140px_80px_120px] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.05em" }}>
            <span>Student</span><span>Campus</span><span>Verification</span><span>Time</span><span className="text-right">Actions</span>
          </div>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_140px_80px_120px] gap-4 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-3"><div className="skeleton w-8 h-8 rounded-full" /><div><div className="skeleton w-24 h-3 mb-1.5" /><div className="skeleton w-32 h-2.5" /></div></div>
                <div className="skeleton w-16 h-3 self-center" /><div className="skeleton w-20 h-5 rounded-full self-center" /><div className="skeleton w-12 h-3 self-center" /><div className="skeleton w-16 h-7 rounded-lg self-center ml-auto" />
              </div>
            ))
          ) : students.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>{search ? "No students match your search" : `No ${filter.toLowerCase()} students`}</p>
              {!search && <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>All caught up!</p>}
            </div>
          ) : (
            students.map(s => (
              <div key={s.id}
                className="grid grid-cols-[1fr_100px_140px_80px_120px] gap-4 px-4 py-3 items-center transition-colors cursor-pointer"
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  background: selected?.id === s.id ? "var(--color-primary-surface)" : "transparent",
                }}
                onClick={() => { setSelected(s); setAdminNotes(""); }}
                onMouseEnter={e => { if (selected?.id !== s.id) e.currentTarget.style.background = "var(--color-surface-hover)"; }}
                onMouseLeave={e => { if (selected?.id !== s.id) e.currentTarget.style.background = "transparent"; }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: "var(--color-primary-surface)", color: "var(--color-primary)" }}>
                    {s.user.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{s.user.fullName}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>{s.user.email}</p>
                  </div>
                </div>
                <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>{s.university}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: s.verificationStatus === "PENDING" ? "var(--color-warning-surface)" : s.verificationStatus === "APPROVED" ? "var(--color-success-surface)" : "var(--color-error-surface)",
                      color: s.verificationStatus === "PENDING" ? "var(--color-warning)" : s.verificationStatus === "APPROVED" ? "var(--color-success)" : "var(--color-error)",
                    }}>
                    {s.verificationStatus}
                  </span>
                  {s.schoolEmailVerified && (
                    <span className="text-[10px] cursor-help" style={{ color: "var(--color-success)" }} title={`Verified: ${s.schoolEmail}`}>✓ .edu</span>
                  )}
                  {s.studentIdImageUrl && (
                    <span className="text-[10px]" style={{ color: "var(--color-info)" }} title="ID uploaded">📎</span>
                  )}
                </div>
                <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{timeAgo(s.createdAt)}</span>
                <div className="flex gap-1.5 justify-end">
                  {s.verificationStatus === "PENDING" && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); approve(s.id); }} disabled={acting === s.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                        style={{ background: "var(--color-success-surface)", color: "var(--color-success)", border: "1px solid var(--color-success-border)" }}>
                        Approve
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); reject(s.id); }} disabled={acting === s.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                        style={{ background: "var(--color-surface-light)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
                        Reject
                      </button>
                    </>
                  )}
                  {s.verificationStatus === "APPROVED" && (
                    <button onClick={(e) => { e.stopPropagation(); revoke(s.id); }} disabled={acting === s.id}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                      style={{ background: "var(--color-warning-surface)", color: "var(--color-warning)", border: "1px solid var(--color-warning-border)" }}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          </div>
        </div>

        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
      </div>

      {/* ──── SIDE PANEL ──── */}
      {selected && (
        <div className="fixed right-0 top-0 h-full w-full lg:w-[360px] overflow-y-auto border-l z-40"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>Student Details</h3>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: "var(--color-primary-surface)", color: "var(--color-primary)" }}>
                {selected.user.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>{selected.user.fullName}</p>
                <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{selected.university}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <InfoRow label="Email" value={selected.user.email} />
              <InfoRow label="Phone" value={selected.user.phone} mono />
              <InfoRow label="Status" value={selected.verificationStatus}
                color={selected.verificationStatus === "PENDING" ? "var(--color-warning)" : selected.verificationStatus === "APPROVED" ? "var(--color-success)" : "var(--color-error)"} />
              <InfoRow label="School Email" value={selected.schoolEmail || "Not provided"}
                extra={selected.schoolEmailVerified ? "✓ Verified" : undefined} />
              <InfoRow label="Submitted" value={new Date(selected.createdAt).toLocaleString("en-NG")} />
              {selected.rejectionReason && <InfoRow label="Rejection Reason" value={selected.rejectionReason} color="var(--color-error)" />}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
                UPLOADED DOCUMENT
              </p>
              {selected.studentIdImageUrl ? (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
                  <img src={selected.studentIdImageUrl} alt="Student ID" className="w-full object-cover" style={{ maxHeight: 240 }} />
                  <div className="flex gap-2 p-2" style={{ background: "var(--color-surface-light)" }}>
                    <a href={selected.studentIdImageUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-colors"
                      style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
                      Open Full Size
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl py-8 text-center" style={{ background: "var(--color-surface-light)", border: "1px solid var(--color-border)" }}>
                  <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>No document uploaded</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
                ADMIN NOTES
              </p>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this student..."
                rows={3}
                className="w-full rounded-xl text-[13px] outline-none resize-none"
                style={{
                  background: "var(--color-surface-light)", border: "1px solid var(--color-border)",
                  color: "var(--color-text)", padding: "10px 14px",
                }}
                onFocus={e => e.target.style.borderColor = "var(--color-primary)"}
                onBlur={e => e.target.style.borderColor = "var(--color-border)"} />
            </div>

            {selected.verificationStatus === "PENDING" && (
              <div className="flex gap-2">
                <button onClick={() => approve(selected.id)} disabled={acting === selected.id}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-success)", color: "white" }}>
                  Approve
                </button>
                <button onClick={() => reject(selected.id)} disabled={acting === selected.id}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-surface-light)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                  Reject
                </button>
              </div>
            )}
            {selected.verificationStatus === "APPROVED" && (
              <button onClick={() => revoke(selected.id)} disabled={acting === selected.id}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-50"
                style={{ background: "var(--color-warning-surface)", color: "var(--color-warning)", border: "1px solid var(--color-warning-border)" }}>
                Revoke Verification
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, color, extra }: {
  label: string; value: string; mono?: boolean; color?: string; extra?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[12px] flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <div className="text-right">
        <span className={`text-[12px] font-medium ${mono ? "font-mono" : ""}`}
          style={{ color: color || "var(--color-text)" }}>{value}</span>
        {extra && <span className="text-[10px] ml-1.5" style={{ color: "var(--color-success)" }}>{extra}</span>}
      </div>
    </div>
  );
}
