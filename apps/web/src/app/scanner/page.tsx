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

  // Check auth + load name
  useEffect(() => {
    setVendorName(localStorage.getItem("vendor_name") || "Vendor");
  }, []);

  useEffect(() => {
    if (!getToken()) router.replace("/");
  }, [router]);

  const startScanner = useCallback(async () => {
    setResult(null);
    setScanning(true);

    // Wait for DOM element to exist
    await new Promise((r) => setTimeout(r, 500));

    const el = document.getElementById("qr-reader");
    if (!el) { setScanning(false); return; }

    try {
      // Clean up any previous instance
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
          await verifyAndRedeem(decodedText);
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
      const res = await api.get("/vendor/redemptions");
      setTodayCount(res.data.data?.length || 0);
    } catch {
      // ignore
    }
  }

  async function verifyAndRedeem(qrData: string) {
    try {
      const res = await api.post(`/vouchers/verify`, { qrData });
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

  async function confirmRedemption() {
    setConfirming(true);
    // Redemption already happened on scan — this is just the vendor's confirmation tap
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
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-lg font-extrabold text-[#6C4FFF]">BuzzPay</h1>
          <p className="text-xs text-gray-400">{vendorName}</p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-full bg-gray-100 text-xs font-semibold text-gray-600"
        >
          Today: {todayCount}
        </button>
      </div>

      {/* Scanner or Result */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {!result && (
          <>
            <div
              id="qr-reader"
              className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden bg-black"
            />
            <p className="text-sm text-gray-400 mt-4 font-medium">
              {scanning ? "Point camera at student's QR code" : "Starting camera..."}
            </p>
          </>
        )}

        {/* ✅ VALID */}
        {result?.success && (
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold mb-1">Valid Voucher</h2>
            <p className="text-gray-500 mb-6">Ready to redeem</p>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-400">Deal</span>
                <span className="text-sm font-bold">{result.dealTitle}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-400">Student</span>
                <span className="text-sm font-bold">{result.studentName}</span>
              </div>
              {result.amount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Amount</span>
                  <span className="text-sm font-extrabold text-[#6C4FFF]">
                    {formatNaira(result.amount)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={confirmRedemption}
              disabled={confirming}
              className="w-full py-4 rounded-full bg-green-500 text-white font-bold text-base shadow-lg shadow-green-500/30 transition disabled:opacity-50"
            >
              {confirming ? "Confirmed!" : "Confirm Redemption"}
            </button>
          </div>
        )}

        {/* ❌ INVALID */}
        {result && !result.success && (
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold mb-1">Invalid</h2>
            <p className="text-gray-500 mb-6">{result.error}</p>

            <button
              onClick={startScanner}
              className="w-full py-4 rounded-full bg-[#6C4FFF] text-white font-bold text-base shadow-lg shadow-[#6C4FFF]/30 transition"
            >
              Scan Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex border-t border-gray-100 bg-white">
        <button className="flex-1 py-4 text-center text-xs font-bold text-[#6C4FFF]">
          Scanner
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex-1 py-4 text-center text-xs font-semibold text-gray-400"
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}
