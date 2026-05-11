"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Student {
  id: string;
  userId: string;
  university: string;
  verificationStatus: string;
  studentIdImageUrl: string | null;
  schoolEmail: string | null;
  schoolEmailVerified: boolean;
  createdAt: string;
  user: { fullName: string; email: string; phone: string };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { loadStudents(); }, [filter]);

  async function loadStudents() {
    setLoading(true);
    try {
      const url = filter === "ALL" ? "/admin/students/pending" : `/admin/students/pending?status=${filter}`;
      const res = await api.get(url);
      setStudents(res.data.data || []);
    } catch {
      // Mock data
      setStudents([
        { id: "s1", userId: "u1", university: "UNILAG", verificationStatus: "PENDING", studentIdImageUrl: null, schoolEmail: "ada@unilag.edu.ng", schoolEmailVerified: true, createdAt: new Date().toISOString(), user: { fullName: "Ada Obi", email: "ada@gmail.com", phone: "+2348012345678" } },
        { id: "s2", userId: "u2", university: "YABATECH", verificationStatus: "PENDING", studentIdImageUrl: "https://via.placeholder.com/300x200", schoolEmail: null, schoolEmailVerified: false, createdAt: new Date().toISOString(), user: { fullName: "Chidi Nwankwo", email: "chidi@yahoo.com", phone: "+2348098765432" } },
        { id: "s3", userId: "u3", university: "LASU", verificationStatus: "PENDING", studentIdImageUrl: null, schoolEmail: "tope@lasu.edu.ng", schoolEmailVerified: true, createdAt: new Date().toISOString(), user: { fullName: "Tope Bakare", email: "tope@gmail.com", phone: "+2348055555555" } },
      ]);
    }
    setLoading(false);
  }

  async function approve(studentId: string) {
    setActing(studentId);
    try {
      await api.post(`/admin/students/${studentId}/approve`);
    } catch { /* ignore */ }
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setActing(null);
  }

  async function reject(studentId: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setActing(studentId);
    try {
      await api.post(`/admin/students/${studentId}/reject`, { reason });
    } catch { /* ignore */ }
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setActing(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Students</h1>
          <p className="text-sm text-gray-400">Review and manage student verifications</p>
        </div>
        <div className="flex gap-2">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                filter === f ? "bg-[#6C4FFF] text-white" : "bg-white text-gray-500 border border-gray-200"
              }`}>
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No {filter.toLowerCase()} students</p>
          <p className="text-gray-300 text-sm mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-5 flex items-start gap-4">
              {/* ID Preview */}
              <div className="w-20 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                {s.studentIdImageUrl ? (
                  <img src={s.studentIdImageUrl} alt="ID" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No ID</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-sm">{s.user.fullName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    s.verificationStatus === "PENDING" ? "bg-orange-50 text-orange-600"
                    : s.verificationStatus === "APPROVED" ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                  }`}>
                    {s.verificationStatus}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{s.user.email} · {s.user.phone}</p>
                <p className="text-xs text-gray-400">{s.university} · {s.schoolEmail ? `✅ ${s.schoolEmail}` : "No school email"}</p>
              </div>

              {/* Actions */}
              {s.verificationStatus === "PENDING" && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(s.id)} disabled={acting === s.id}
                    className="px-4 py-2 rounded-full bg-green-500 text-white text-xs font-bold disabled:opacity-50">
                    ✅ Approve
                  </button>
                  <button onClick={() => reject(s.id)} disabled={acting === s.id}
                    className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-bold disabled:opacity-50">
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
