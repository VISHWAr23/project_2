// User instruction: "Phase 9: Dashboard - Create reusable Indian currency and date formatting utilities"
// Importers/callers: frontend/src/app/dashboard/page.tsx, other frontend components
// Affected API: None (UI formatting helpers)
// Data schemas: None

/**
 * Formats a number as Indian Currency (INR).
 * Example: 50000 -> ₹50,000
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }

  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

/**
 * Formats a Date object or ISO string into a human-readable date.
 * Example: '2026-03-29T10:00:00Z' -> '29 Mar 2026'
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Formats a Date object or ISO string into date and time.
 * Example: '2026-03-29T10:30:00Z' -> '29 Mar 2026, 10:30 AM'
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  } catch {
    return '-';
  }
}

/**
 * Formats a number with Indian thousand separators.
 * Example: 1000000 -> 10,00,000
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0';
  }
  return new Intl.NumberFormat('en-IN').format(Number(value));
}
