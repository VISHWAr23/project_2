// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
// Importers/callers: frontend/src/app/customers/page.tsx, frontend/src/app/customers/[id]/page.tsx, frontend/src/app/dashboard/page.tsx, frontend/src/app/visits/page.tsx, frontend/src/app/orders/page.tsx, frontend/src/app/expenses/page.tsx, frontend/src/app/incentives/page.tsx, frontend/src/app/employees/page.tsx, frontend/src/app/notifications/page.tsx
// Affected API: Shared EmptyState presentation component
// Data schemas: EmptyStateProps

import * as React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  action?: { label: string; onClick: () => void | Promise<unknown> } | React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = FolderSearch,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  action,
  className,
  children,
}: EmptyStateProps) {
  const isActionElement = React.isValidElement(action);
  const actionObj = !isActionElement && action && typeof action === 'object' && 'label' in action
    ? (action as { label: string; onClick: () => void | Promise<unknown> })
    : undefined;

  const resolvedActionLabel = actionLabel || actionObj?.label;
  const resolvedOnAction = onAction || actionObj?.onClick;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border bg-card/40 backdrop-blur-xs',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
      {isActionElement ? (
        <div className="mt-5">{action}</div>
      ) : resolvedActionLabel && resolvedOnAction ? (
        <Button
          onClick={() => {
            void resolvedOnAction();
          }}
          className="mt-5 text-xs sm:text-sm font-medium shadow-xs"
          size="sm"
        >
          {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
          {resolvedActionLabel}
        </Button>
      ) : null}
    </div>
  );
}
