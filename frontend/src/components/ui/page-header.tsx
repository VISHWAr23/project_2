// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
// Importers/callers: frontend/src/app/dashboard/page.tsx, frontend/src/app/customers/page.tsx, frontend/src/app/customers/[id]/page.tsx, frontend/src/app/employees/page.tsx, frontend/src/app/employees/[id]/page.tsx, frontend/src/app/visits/page.tsx, frontend/src/app/orders/page.tsx, frontend/src/app/orders/[id]/page.tsx, frontend/src/app/incentives/page.tsx, frontend/src/app/incentives/[id]/page.tsx, frontend/src/app/expenses/page.tsx, frontend/src/app/expenses/[id]/page.tsx, frontend/src/app/reports/page.tsx, frontend/src/app/notifications/page.tsx
// Affected API: PageHeader reusable layout component
// Data schemas: PageHeaderProps, BreadcrumbItem

'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
  backHref?: string;
  backButton?: {
    label?: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  children,
  backHref,
  backButton,
  className,
}: PageHeaderProps) {
  const resolvedBackHref = backHref || backButton?.href;

  return (
    <div className={cn('flex flex-col gap-4 pb-6 border-b border-border/60', className)}>
      {/* Breadcrumbs / Back navigation */}
      {(breadcrumbs || resolvedBackHref || backButton?.onClick) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {resolvedBackHref ? (
            <Link href={resolvedBackHref}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground -ml-1.5 gap-1"
                title={backButton?.label || "Go back"}
              >
                <ArrowLeft className="size-3.5" />
                {backButton?.label && <span>{backButton.label}</span>}
              </Button>
            </Link>
          ) : backButton?.onClick ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={backButton.onClick}
              className="h-7 px-2 text-muted-foreground hover:text-foreground -ml-1.5 gap-1"
              title={backButton?.label || "Go back"}
            >
              <ArrowLeft className="size-3.5" />
              {backButton?.label && <span>{backButton.label}</span>}
            </Button>
          ) : null}

          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 overflow-x-auto py-0.5" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label + idx}>
                    {idx > 0 && <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />}
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-foreground transition-colors font-medium whitespace-nowrap"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          'whitespace-nowrap',
                          isLast ? 'text-foreground font-semibold' : 'font-medium'
                        )}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>
      )}

      {/* Main Title, Badge & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action buttons / filter slots */}
        {children && (
          <div className="flex items-center gap-2.5 flex-wrap sm:shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
