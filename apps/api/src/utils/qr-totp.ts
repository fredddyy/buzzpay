import crypto from 'crypto';

const QR_WINDOW_SECONDS = 60; // QR refreshes every 60 seconds

/**
 * Generate a random secret for a voucher's rotating QR
 */
export function generateQrSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the current time window index
 */
function getTimeWindow(offsetWindows = 0): number {
  return Math.floor(Date.now() / (QR_WINDOW_SECONDS * 1000)) + offsetWindows;
}

/**
 * Generate a TOTP-style code for a given voucher ID + secret + time window
 * This is what gets encoded into the QR code
 */
export function generateRotatingCode(voucherId: string, secret: string, windowOffset = 0): string {
  const window = getTimeWindow(windowOffset);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${voucherId}:${window}`);
  return hmac.digest('hex').slice(0, 16); // 16-char hex code
}

/**
 * Build the full QR payload that the student app displays
 * Format: bp://<voucherId>/<rotatingCode>/<windowTimestamp>
 */
export function buildQrPayload(voucherId: string, secret: string): string {
  const code = generateRotatingCode(voucherId, secret);
  const window = getTimeWindow();
  return `bp://${voucherId}/${code}/${window}`;
}

/**
 * Validate a scanned QR payload from a vendor's scanner
 * Accepts current window and previous window (to handle scan delay)
 */
export function validateQrPayload(
  payload: string,
  secret: string
): { valid: boolean; voucherId: string | null; reason?: string } {
  const match = payload.match(/^bp:\/\/([^/]+)\/([a-f0-9]{16})\/(\d+)$/);
  if (!match) {
    return { valid: false, voucherId: null, reason: 'Invalid QR format' };
  }

  const [, voucherId, scannedCode, windowStr] = match;
  const scannedWindow = parseInt(windowStr);
  const currentWindow = getTimeWindow();

  // Allow current window and 1 previous window (up to 2 minutes tolerance)
  for (let offset = 0; offset >= -2; offset--) {
    const expectedCode = generateRotatingCode(voucherId, secret, offset);
    if (scannedCode === expectedCode && Math.abs(currentWindow + offset - scannedWindow) <= 2) {
      return { valid: true, voucherId };
    }
  }

  return { valid: false, voucherId, reason: 'QR code expired — ask student to refresh' };
}
