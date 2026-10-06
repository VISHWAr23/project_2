// User instruction: "Consistent currency formatting across all views: INR currency (₹), formatted correctly without currency mismatch or NaN values"
// Importers/callers: frontend/src/app/orders/page.tsx, frontend/src/app/orders/[id]/page.tsx, frontend/src/app/incentives/page.tsx, frontend/src/app/incentives/[id]/page.tsx, frontend/src/app/expenses/page.tsx, frontend/src/app/expenses/[id]/page.tsx, frontend/src/app/reports/page.tsx, frontend/src/app/dashboard/page.tsx
// Affected API: CurrencyDisplay UI helper component
// Data schemas: N/A (UI formatting component)

import * as React from 'react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface CurrencyDisplayProps {
  amount: number | string | null | undefined;
  className?: string;
  symbolClassName?: string;
  fractionDigits?: number;
  colored?: boolean;
}

export function CurrencyDisplay({
  amount,
  className,
  symbolClassName,
  colored = false,
}: CurrencyDisplayProps) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const validNum = typeof num === 'number' && !isNaN(num) ? num : 0;

  const formatted = formatCurrency(validNum);

  const isPositive = validNum > 0;
  const isNegative = validNum < 0;

  return (
    <span
      className={cn(
        'font-mono tracking-tight inline-flex items-baseline gap-0.5',
        colored && isPositive && 'text-emerald-400',
        colored && isNegative && 'text-rose-400',
        className
      )}
    >
      <span className={cn('text-[0.9em] font-sans opacity-90', symbolClassName)}>
        {formatted}
      </span>
    </span>
  );
}
