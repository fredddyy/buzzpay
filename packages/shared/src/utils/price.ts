/**
 * Format kobo amount to Naira string
 * e.g., 150000 -> "₦1,500"
 */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Calculate savings between original and student price
 */
export function calculateSavings(originalKobo: number, studentKobo: number): number {
  return originalKobo - studentKobo;
}

/**
 * Calculate discount percentage
 */
export function discountPercent(originalKobo: number, studentKobo: number): number {
  if (originalKobo === 0) return 0;
  return Math.round(((originalKobo - studentKobo) / originalKobo) * 100);
}

/**
 * Convert Naira to kobo
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Convert kobo to Naira
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
