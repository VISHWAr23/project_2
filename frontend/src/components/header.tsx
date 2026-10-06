// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
// Importers/callers: frontend/src/components/app-shell.tsx
// Affected API: Header component with ThemeToggle and mobile triggers
// Data schemas: N/A (UI component)

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { notificationsApi } from '@/lib/api/notifications';
import {
  Bell,
  Menu,
  ShoppingBag,
  MapPin,
  LogOut,
  Shield,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  className?: string;
}

export function Header({ onToggleMobileMenu, className }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Live notifications query
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/visits')) return 'Field Visits';
    if (path.startsWith('/orders')) return 'Orders & Invoices';
    if (path.startsWith('/expenses')) return 'Expense Claims';
    if (path.startsWith('/incentives')) return 'Commission & Incentives';
    if (path.startsWith('/reports')) return 'Analytics & Reports';
    if (path.startsWith('/employees')) return 'Team & Employees';
    if (path.startsWith('/notifications')) return 'Notifications & Alerts';
    return 'Lathikka';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-16 glass-header border-b border-border/80 px-4 sm:px-6 flex items-center justify-between gap-4 select-none',
        className
      )}
    >
      {/* Left Area: Mobile Menu Toggle + Current Section Context */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleMobileMenu}
          className="lg:hidden text-muted-foreground hover:text-foreground"
          aria-label="Open navigation drawer"
        >
          <Menu className="size-5" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground font-heading">
            {getPageTitle(pathname)}
          </span>
        </div>
      </div>

      {/* Right Area: Quick Action + Alerts + Theme Toggle + User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action Link based on context */}
        {!isAdmin && (
          <Link href="/visits" className="hidden md:inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-primary border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            >
              <MapPin className="size-3.5" />
              <span>Log Visit</span>
            </Button>
          </Link>
        )}

        <Link href="/orders" className="hidden sm:inline-flex">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-foreground hover:bg-muted"
          >
            <ShoppingBag className="size-3.5 text-muted-foreground" />
            <span>New Order</span>
          </Button>
        </Link>

        {/* Notifications Icon Button */}
        <Link href="/notifications">
          <Button
            variant={pathname.startsWith('/notifications') ? 'secondary' : 'ghost'}
            size="sm"
            className="relative gap-1.5 text-xs text-foreground font-medium h-9 px-2.5 sm:px-3 rounded-lg"
            title="Notifications & Activity"
          >
            <Bell className="size-4 text-muted-foreground" />
            <span className="hidden md:inline">Alerts</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-rose-600 rounded-full animate-pulse shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* Theme Switcher Toggle */}
        <ThemeToggle />

        {/* User Profile in Header */}
        {user && (
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border/80">
            <div className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg border border-border/60 bg-muted/40">
              <div className="size-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="hidden sm:flex flex-col min-w-0 pr-1 text-left">
                <span className="font-semibold text-xs text-foreground truncate max-w-[130px] leading-tight">
                  {user.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate leading-none">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-0.5 text-primary font-medium">
                      <Shield className="size-2.5" /> Administrator
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-emerald-500 font-medium">
                      <Briefcase className="size-2.5" /> Field Exec
                    </span>
                  )}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={logout}
              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
