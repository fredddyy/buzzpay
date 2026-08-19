"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import api, { getToken } from "@/lib/api";

interface RedemptionResult {
  success: boolean;
  dealTitle?: string;
  studentName?: string;
  amount?: number;
  error?: string;
}

export default function ScannerPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [vendorName, setVendorName] = useState("Vendor");
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setVendorName(localStorage.getItem("vendor_name") || "Vendor");
    // Load offline queue
    const queue = JSON.parse(localStorage.getItem("offline_scans") || "[]");
    setOfflineQueue(queue);
    // Sync if online
    if (queue.length > 0 && navigator.onLine) syncOfflineQueue(queue);
  }, []);

  useEffect(() => {
    if (!getToken()) router.replace("/");
  }, [router]);

  const startScanner = useCallback(async () => {
    setResult(null);
    setShowManual(false);
    setScanning(true);

    await new Promise((r) => setTimeout(r, 500));

    const el = document.getElementById("qr-reader");
    if (!el) { setScanning(false); return; }

    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* ignore */ }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try { await scanner.stop(); } catch { /* ignore */ }
          scannerRef.current = null;
          setScanning(false);
          await redeemVoucher(decodedText);
        },
        () => {}
      );
    } catch {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    startScanner();
    loadTodayCount();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [startScanner]);

  async function loadTodayCount() {
    try {
      const res = await api.get("/vendor/stats");
      setTodayCount(res.data.data?.todayScans || 0);
    } catch {
      // ignore
    }
  }

  async function redeemVoucher(qrData: string) {
    // If offline, queue the scan
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("offline_scans") || "[]");
      queue.push(qrData);
      localStorage.setItem("offline_scans", JSON.stringify(queue));
      setOfflineQueue(queue);
      setResult({
        success: true,
        dealTitle: "Queued for sync",
        studentName: "Offline mode",
        amount: 0,
      });
      return;
    }

    try {
      let res;
      if (qrData.startsWith("bp://")) {
        res = await api.post("/vouchers/redeem-rotating", { qrPayload: qrData });
      } else {
        res = await api.post("/vouchers/redeem", { qrData });
      }
      const data = res.data.data;
      setResult({
        success: true,
        dealTitle: data.dealTitle,
        studentName: data.studentName,
        amount: data.amount,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Invalid voucher";
      setResult({ success: false, error: message });
    }
  }

  async function syncOfflineQueue(queue?: string[]) {
    const scans = queue || JSON.parse(localStorage.getItem("offline_scans") || "[]");
    if (scans.length === 0) return;
    setSyncing(true);

    const remaining: string[] = [];
    for (const qrData of scans) {
      try {
        if (qrData.startsWith("bp://")) {
          await api.post("/vouchers/redeem-rotating", { qrPayload: qrData });
        } else {
          await api.post("/vouchers/redeem", { qrData });
        }
      } catch {
        remaining.push(qrData);
      }
    }

    localStorage.setItem("offline_scans", JSON.stringify(remaining));
    setOfflineQueue(remaining);
    setSyncing(false);
  }

  async function handleManualSubmit() {
    const code = manualCode.trim().toUpperCase();
    if (code.length < 6) return;
    setManualLoading(true);
    await redeemVoucher(code);
    setManualLoading(false);
  }

  function confirmRedemption() {
    setConfirming(true);
    setTodayCount((c) => c + 1);
    setTimeout(() => {
      setConfirming(false);
      startScanner();
    }, 1500);
  }

  function formatNaira(kobo: number): string {
    return `₦${(kobo / 100).toLocaleString("en-NG")}`;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <img src="/logo.png" alt="BuzzPay" className="h-8" />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{vendorName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManual(!showManual)}
            className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: showManual ? "var(--color-primary)" : "var(--color-border-light, #f3f3f6)", color: showManual ? "white" : "var(--color-text-muted)" }}
          >
            {showManual ? "Camera" : "Enter Code"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--color-border-light, #f3f3f6)", color: "var(--color-text-muted)" }}
          >
            Today: {todayCount}{offlineQueue.length > 0 ? ` · ${offlineQueue.length} queued` : ""}
          </button>
        </div>
      </div>

      {/* Scanner / Manual / Result */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {!result && !showManual && (
          <>
            <div
              id="qr-reader"
              className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden"
              style={{ background: "#000" }}
            />
            <p className="text-sm mt-4 font-medium" style={{ color: "var(--color-text-muted)" }}>
              {scanning ? "Point camera at student's QR code" : "Starting camera..."}
            </p>
          </>
        )}

        {/* Manual Code Entry */}
        {!result && showManual && (
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-primary)", opacity: 0.1 }}>
                <svg className="w-8 h-8" style={{ color: "var(--color-primary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold" style={{ color: "var(--color-text)" }}>Enter Voucher Code</h2>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Type the 8-character code shown on the student&apos;s phone</p>
            </div>

            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. BZ7742XP"
              maxLength={10}
              className="w-full px-5 py-4 rounded-2xl text-center text-2xl font-bold tracking-[0.3em] outline-none"
              style={{
                background: "var(--color-surface)",
                border: "2px solid var(--color-border)",
                color: "var(--color-text)",
                letterSpacing: "0.2em",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--color-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--color-border)"}
              autoFocus
            />

            <button
              onClick={handleManualSubmit}
              disabled={manualCode.trim().length < 6 || manualLoading}
              className="w-full py-4 rounded-2xl text-base font-bold mt-4 transition disabled:opacity-40"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              {manualLoading ? "Verifying..." : "Redeem"}
            </button>
          </div>
        )}

        {/* ✅ VALID */}
        {result?.success && (
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#ECFDF5" }}>
              <svg className="w-10 h-10" style={{ color: "#22C55E" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: "var(--color-text)" }}>Valid Voucher</h2>
            <p className="mb-6" style={{ color: "var(--color-text-muted)" }}>Ready to redeem</p>

            <div className="rounded-2xl p-5 text-left mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Deal</span>
                <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{result.dealTitle}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Student</span>
                <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{result.studentName}</span>
              </div>
              {result.amount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Amount</span>
                  <span className="text-sm font-extrabold" style={{ color: "var(--color-primary)" }}>
                    {formatNaira(result.amount)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={confirmRedemption}
              disabled={confirming}
              className="w-full py-4 rounded-2xl font-bold text-base transition disabled:opacity-50"
              style={{ background: "#22C55E", color: "white" }}
            >
              {confirming ? "Confirmed! ✓" : "Confirm Redemption"}
            </button>
          </div>
        )}

        {/* ❌ INVALID */}
        {result && !result.success && (
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#FEF2F2" }}>
              <svg className="w-10 h-10" style={{ color: "#EF4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold mb-1" style={{ color: "var(--color-text)" }}>Invalid</h2>
            <p className="mb-6" style={{ color: "var(--color-text-muted)" }}>{result.error}</p>

            <button
              onClick={startScanner}
              className="w-full py-4 rounded-2xl font-bold text-base transition"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              Scan Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
        <button className="flex-1 py-4 text-center text-xs font-bold" style={{ color: "var(--color-primary)" }}>
          Scanner
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex-1 py-4 text-center text-xs font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}
