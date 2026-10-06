// User instruction: "[Image #8] this is the logo of our app use this is all the place where logo needed"
// Importers/callers: frontend/src/app/layout.tsx
// Affected API: AppShell layout container with official BrandLogo on loading screens and responsive navigation
// Data schemas: { children: React.ReactNode }

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { BrandLogo } from '@/components/brand-logo';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingRoute = pathname === '/';
  const isAuthRoute = pathname === '/login';
  const isStandalonePublicRoute = isLandingRoute || isAuthRoute;

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isStandalonePublicRoute) {
        router.replace('/login');
      } else if (isAuthenticated && isAuthRoute) {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, isStandalonePublicRoute, isAuthRoute, router]);

  // Polished loading state while checking authentication
  if (isLoading && !isStandalonePublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <BrandLogo size="lg" className="shadow-lg animate-pulse" />
          <div className="flex items-center gap-2 text-primary font-medium text-xs">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // Prevent flash of protected content before redirect
  if (!isAuthenticated && !isStandalonePublicRoute) {
    return null;
  }

  if (isStandalonePublicRoute) {
    return <main className="min-h-screen bg-background text-foreground">{children}</main>;
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 border-r border-sidebar-border bg-sidebar z-30">
        <Sidebar className="h-full border-r-0" />
      </aside>

      {/* Mobile Drawer Navigation Backdrop & Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sidebar Content */}
          <div className="relative flex flex-col w-4/5 max-w-xs h-full bg-sidebar border-r border-sidebar-border shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="size-8 rounded-lg bg-sidebar-accent/80 text-muted-foreground hover:text-foreground flex items-center justify-center border border-sidebar-border"
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} className="h-full border-r-0" />
          </div>
        </div>
      )}

      {/* Main Content Area (Header + Routed Page) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
