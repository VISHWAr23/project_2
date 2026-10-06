// User instruction: "[Image #8] this is the logo of our app use this is all the place where logo needed"
// Importers/callers: frontend/src/components/app-shell.tsx
// Affected API: Sidebar navigation component with official Image #8 BrandLogo and Theme switcher
// Data schemas: N/A (UI navigation component)

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { notificationsApi } from '@/lib/api/notifications';
import { BrandLogo } from '@/components/brand-logo';
import {
  LayoutDashboard,
  Users,
  MapPin,
  ShoppingBag,
  Receipt,
  Award,
  BarChart3,
  UserCheck,
  Bell,
  Building2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

interface NavGroup {
  label: string;
  items: {
    name: string;
    href: string;
    icon: React.ElementType;
    badge?: number | string;
    adminOnly?: boolean;
  }[];
}

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Live unread notifications count query
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Management',
      items: [
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Visits', href: '/visits', icon: MapPin },
        { name: 'Employees', href: '/employees', icon: UserCheck, adminOnly: true },
      ],
    },
    {
      label: 'Finance & Orders',
      items: [
        { name: 'Orders', href: '/orders', icon: ShoppingBag },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
        { name: 'Incentives', href: '/incentives', icon: Award },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { name: 'Reports', href: '/reports', icon: BarChart3 },
      ],
    },
    {
      label: 'System',
      items: [
        {
          name: 'Notifications',
          href: '/notifications',
          icon: Bell,
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        },
        {
          name: 'Company Overview',
          href: '/',
          icon: Building2,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border shrink-0">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <BrandLogo size="sm" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-base tracking-tight text-sidebar-foreground">
                Lathikka
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                {isAdmin ? 'Admin' : 'Ops'}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground -mt-0.5">
              Enterprise Sales OS
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {navGroups.map((group) => {
          // Filter out admin-only items if user is not admin
          const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold text-subtle-foreground uppercase tracking-wider">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                        active
                          ? 'bg-primary/15 text-primary font-semibold border border-primary/25 shadow-xs'
                          : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/70'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            'size-4 shrink-0 transition-colors',
                            active
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-sidebar-foreground'
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold rounded-full transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Theme Switcher in Sidebar */}
      <div className="px-4 py-3 border-t border-sidebar-border bg-sidebar-accent/20 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Appearance</span>
          <ThemeToggle variant="segmented" />
        </div>
      </div>
    </aside>
  );
}
