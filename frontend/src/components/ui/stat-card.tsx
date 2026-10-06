// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
// Importers/callers: frontend/src/app/dashboard/page.tsx, frontend/src/app/reports/page.tsx, frontend/src/app/visits/page.tsx, frontend/src/app/orders/page.tsx, frontend/src/app/expenses/page.tsx, frontend/src/app/incentives/page.tsx, frontend/src/app/employees/page.tsx, frontend/src/app/customers/page.tsx
// Affected API: Shared StatCard presentation component
// Data schemas: StatCardProps

'use client';

import * as React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: string | number;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
    isPositive?: boolean;
  };
  variant?:
    | 'default'
    | 'gold'
    | 'emerald'
    | 'blue'
    | 'rose'
    | 'amber'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple';
  className?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  action,
  onClick,
}: StatCardProps) {
  // Normalize legacy and alias variants
  const normalizedVariant: 'default' | 'gold' | 'emerald' | 'blue' | 'rose' | 'amber' =
    variant === 'primary' || variant === 'purple'
      ? 'gold'
      : variant === 'success'
      ? 'emerald'
      : variant === 'warning'
      ? 'amber'
      : variant === 'danger'
      ? 'rose'
      : variant === 'info'
      ? 'blue'
      : variant;

  const variantStyles = {
    default: {
      iconBg: 'bg-muted text-muted-foreground border-border',
      border: 'border-border/80 hover:border-border',
      glow: '',
    },
    gold: {
      iconBg: 'bg-primary/10 text-primary border-primary/20',
      border: 'border-primary/20 hover:border-primary/40',
      glow: 'shadow-[0_0_24px_-8px_rgba(212,175,55,0.15)]',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      glow: 'shadow-[0_0_24px_-8px_rgba(16,185,129,0.15)]',
    },
    blue: {
      iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      border: 'border-sky-500/20 hover:border-sky-500/40',
      glow: 'shadow-[0_0_24px_-8px_rgba(14,165,233,0.15)]',
    },
    rose: {
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      border: 'border-rose-500/20 hover:border-rose-500/40',
      glow: 'shadow-[0_0_24px_-8px_rgba(244,63,94,0.15)]',
    },
    amber: {
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      glow: 'shadow-[0_0_24px_-8px_rgba(245,158,11,0.15)]',
    },
  };

  const currentVariant = variantStyles[normalizedVariant] || variantStyles.default;
  const secondaryText = subtitle || description;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-card border p-4 sm:p-5 transition-all duration-200 card-hover',
        onClick && 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]',
        currentVariant.border,
        currentVariant.glow,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {action}
          {Icon && (
            <div
              className={cn(
                'size-8 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105',
                currentVariant.iconBg
              )}
            >
              <Icon className="size-4 shrink-0" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
          {value}
        </div>
      </div>

      {(secondaryText || trend) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs flex-wrap">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-medium text-[11px]',
                trend.direction === 'up' || trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : trend.direction === 'down' || trend.isPositive === false
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              )}
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="size-3" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="size-3" />
              ) : (
                <Minus className="size-3" />
              )}
              {trend.value}
            </span>
          )}
          {secondaryText && <span className="text-muted-foreground truncate">{secondaryText}</span>}
        </div>
      )}
    </div>
  );
}
