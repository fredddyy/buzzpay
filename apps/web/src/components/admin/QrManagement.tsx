"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import QRCode from "qrcode";

interface QrCode {
  id: string;
  serialNumber: string;
  vendorId: string | null;
  assignedAt: string | null;
  isActive: boolean;
}

interface QrManagementProps {
  vendorId: string;
  vendorName: string;
}

export default function QrManagement({ vendorId, vendorName }: QrManagementProps) {
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualSerial, setManualSerial] = useState("");
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const loadQrCodes = useCallback(async () => {
    try {
      const res = await api.get(`/admin/vendors/${vendorId}/qr`);
      setQrCodes(res.data.data || []);
    } catch {
      setQrCodes([]);
    }
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { loadQrCodes(); }, [loadQrCodes]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  async function linkSerial(serial: string) {
    if (!serial.trim()) return;
    setLinking(true);
    setMessage(null);
    try {
      await api.patch(`/admin/vendors/${vendorId}/qr/link`, { serialNumber: serial.trim().toUpperCase() });
      setMessage({ type: "success", text: `Sticker ${serial.toUpperCase()} linked successfully` });
      setManualSerial("");
      loadQrCodes();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to link sticker";
      setMessage({ type: "error", text: msg });
    }
    setLinking(false);
  }

  async function unlinkQr(id: string) {
    try {
      await api.delete(`/admin/qr/${id}`);
      setQrCodes(prev => prev.filter(q => q.id !== id));
      setMessage({ type: "success", text: "Sticker unlinked" });
    } catch {
      setMessage({ type: "error", text: "Failed to unlink" });
    }
  }

  async function startScanner() {
    setScanning(true);
    setMessage(null);

    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");

    // Wait for container to render
    await new Promise(r => setTimeout(r, 100));

    if (!scannerContainerRef.current) return;

    const scanner = new Html5Qrcode("qr-scanner-region");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Extract serial from scanned data
          const serial = decodedText.replace(/^https?:\/\/[^/]+\/qr\//, "").trim();
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          linkSerial(serial);
        },
        () => {} // ignore scan failures
      );
    } catch {
      setMessage({ type: "error", text: "Camera not available. Use manual entry." });
      setScanning(false);
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function downloadPoster() {
    const serial = qrCodes.find(q => q.isActive)?.serialNumber || vendorId;
    const qrDataUrl = await QRCode.toDataURL(`https://buzzpay.ng/qr/${serial}`, {
      width: 400, margin: 2, color: { dark: "#6C4FFF" },
    });

    // Build a printable HTML poster
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>BuzzPay - ${vendorName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Nunito', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f8f7ff; }
        .poster { width: 148mm; min-height: 210mm; background: white; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 4px 24px rgba(108,79,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
        .logo { width: 48px; height: 48px; background: #6C4FFF; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 800; margin: 0 auto; }
        h1 { font-size: 28px; color: #1a1a2e; font-weight: 800; line-height: 1.2; }
        h1 span { color: #6C4FFF; }
        .qr { padding: 16px; background: white; border: 3px solid #6C4FFF; border-radius: 20px; display: inline-block; }
        .qr img { width: 200px; height: 200px; display: block; }
        .vendor-name { font-size: 20px; color: #6C4FFF; font-weight: 800; }
        .serial { font-size: 14px; color: #999; font-family: monospace; letter-spacing: 2px; }
        .cta { font-size: 16px; color: #333; font-weight: 700; background: #f0edff; padding: 12px 24px; border-radius: 12px; }
        .footer { font-size: 11px; color: #bbb; }
        @media print { body { background: white; } .poster { box-shadow: none; } }
      </style>
      </head>
      <body>
        <div class="poster">
          <div class="logo">B</div>
          <h1>Pay with <span>BuzzPay</span> here</h1>
          <div class="qr"><img src="${qrDataUrl}" alt="QR Code" /></div>
          <div class="vendor-name">${vendorName}</div>
          <div class="serial">${serial}</div>
          <div class="cta">Save up to 30% on your next meal</div>
          <div class="footer">buzzpay.ng</div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => { win.print(); });
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const activeQr = qrCodes.find(q => q.isActive);

  const inputStyle: React.CSSProperties = {
    background: "var(--color-surface-light)", border: "1px solid var(--color-border)",
    color: "var(--color-text)", borderRadius: 10, padding: "10px 14px", fontSize: 13, width: "100%", outline: "none",
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider pt-4 border-t"
        style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em", borderColor: "var(--color-border)" }}>
        QR Code Management
      </p>

      {/* Status message */}
      {message && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
          style={{
            background: message.type === "success" ? "var(--color-success-surface)" : "var(--color-error-surface)",
            color: message.type === "success" ? "var(--color-success)" : "var(--color-error)",
            border: `1px solid ${message.type === "success" ? "var(--color-success-border)" : "var(--color-error-border)"}`,
          }}>
          {message.type === "success" ? "✓" : "!"} {message.text}
        </div>
      )}

      {/* Active linked sticker */}
      {activeQr ? (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "var(--color-success-surface)", border: "1px solid var(--color-success-border)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: "var(--color-success)", color: "white" }}>
            ✓
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-success)" }}>Sticker Linked</p>
            <p className="text-[12px] font-mono" style={{ color: "var(--color-text-secondary)" }}>{activeQr.serialNumber}</p>
            {activeQr.assignedAt && (
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Linked {new Date(activeQr.assignedAt).toLocaleDateString("en-NG")}
              </p>
            )}
          </div>
          <button onClick={() => unlinkQr(activeQr.id)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
            style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
            Unlink
          </button>
        </div>
      ) : (
        <div className="rounded-xl p-4 text-center"
          style={{ background: "var(--color-surface-light)", border: "1px dashed var(--color-border)" }}>
          <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>No sticker linked to this vendor</p>
        </div>
      )}

      {/* Link sticker controls */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>LINK A STICKER</p>

        {/* Camera scanner */}
        {scanning ? (
          <div>
            <div id="qr-scanner-region" ref={scannerContainerRef}
              className="rounded-xl overflow-hidden mb-2"
              style={{ border: "2px solid var(--color-primary)" }} />
            <button onClick={stopScanner}
              className="w-full py-2 rounded-lg text-[12px] font-semibold"
              style={{ background: "var(--color-error-surface)", color: "var(--color-error)", border: "1px solid var(--color-error-border)" }}>
              Cancel Scan
            </button>
          </div>
        ) : (
          <button onClick={startScanner}
            className="w-full py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2"
            style={{ background: "var(--color-primary-surface)", color: "var(--color-primary)", border: "1px solid var(--color-primary-border)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z" />
            </svg>
            Scan Pre-printed Sticker
          </button>
        )}

        {/* Manual entry */}
        <div className="flex gap-2">
          <input
            value={manualSerial}
            onChange={e => setManualSerial(e.target.value.toUpperCase())}
            placeholder="e.g. BZ-9942XP"
            style={inputStyle}
            onKeyDown={e => { if (e.key === "Enter") linkSerial(manualSerial); }}
          />
          <button onClick={() => linkSerial(manualSerial)} disabled={linking || !manualSerial.trim()}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold flex-shrink-0 disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "white" }}>
            {linking ? "..." : "Link"}
          </button>
        </div>
      </div>

      {/* Download Print Kit */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>PRINT KIT</p>
        <button onClick={downloadPoster}
          className="w-full py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2"
          style={{ background: "var(--color-surface-light)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download QR Poster
        </button>
      </div>

      {/* QR History */}
      {!loading && qrCodes.length > 1 && (
        <div>
          <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
            HISTORY ({qrCodes.length} stickers)
          </p>
          <div className="space-y-1">
            {qrCodes.map(q => (
              <div key={q.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px]"
                style={{ background: "var(--color-surface-light)" }}>
                <span className="font-mono font-semibold" style={{ color: q.isActive ? "var(--color-primary)" : "var(--color-text-muted)" }}>
                  {q.serialNumber}
                </span>
                <span style={{ color: q.isActive ? "var(--color-success)" : "var(--color-text-muted)" }}>
                  {q.isActive ? "Active" : "Unlinked"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
