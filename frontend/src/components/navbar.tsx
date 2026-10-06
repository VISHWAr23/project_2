// User instruction: "[Image #8] this is the logo of our app use this is all the place where logo needed"
// Importers/callers: frontend components
// Affected API: Navigation bar with official Image #8 BrandLogo
// Data schemas: N/A

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { notificationsApi } from '@/lib/api/notifications';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
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
  LogOut,
  Menu,
  X,
  Shield,
  Briefcase,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  // Real-time unread notifications count query
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Visits', href: '/visits', icon: MapPin },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Incentives', href: '/incentives', icon: Award },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ name: 'Employees', href: '/employees', icon: UserCheck }] : []),
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  if (!user) return null;

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
    <header className="sticky top-0 z-40 border-b border-border/80 glass-header shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Desktop Navigation */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <BrandLogo size="sm" />
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-foreground">
                    Lathikka
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                    {isAdmin ? 'Admin' : 'Field Ops'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground -mt-0.5">Marketing Management</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-primary/15 text-primary border border-primary/25 font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                    }`}
                  >
                    <Icon className={`size-3.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications Button */}
            <Link href="/notifications">
              <Button
                variant={pathname.startsWith('/notifications') ? 'secondary' : 'ghost'}
                size="sm"
                className="relative gap-1.5 text-xs text-foreground font-medium h-9 px-3 rounded-lg"
                title="Notifications"
              >
                <Bell className="size-4 text-muted-foreground" />
                <span className="hidden md:inline">Alerts</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-rose-600 rounded-full animate-pulse shadow-2xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-border/80">
              <div className="size-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-xs text-foreground leading-tight max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-0.5 text-primary font-medium">
                      <Shield className="size-2.5" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Briefcase className="size-2.5" /> Field Exec
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-xs h-9 px-3 rounded-lg hover:text-destructive hover:border-destructive/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-border space-y-1">
            <div className="px-3 py-2 sm:hidden border-b border-border/60 mb-2 flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {user.role}
              </span>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/15 text-primary font-semibold border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
