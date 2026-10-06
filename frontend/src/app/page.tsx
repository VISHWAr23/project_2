// User instruction: "[Image #8] this is the logo of our app use this is all the place where logo needed"
// Importers/callers: Next.js root route (frontend/src/app/page.tsx)
// Affected API: Public Landing Page (Image #4 inspired design with official Image #8 BrandLogo)
// Data schemas: UI presentation, useAuth state, operational showcase cards

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Users,
  MapPin,
  Sparkles,
  ShoppingBag,
  Award,
  Receipt,
  Boxes,
  ScrollText,
  PackageCheck,
  Stethoscope,
  HeartHandshake,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  FileSpreadsheet,
  BarChart3,
  Cpu,
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary relative overflow-x-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 dark:bg-primary/5 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-500/5 blur-[160px] rounded-full pointer-events-none -z-10" />

      {/* Top Header Navigation */}
      <header className="w-full border-b border-border/80 glass-header px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-50">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-foreground">
                Shri Lathikka Surgicals
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                EST. 2006
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3 text-primary shrink-0" />
              <span className="truncate">Samsigapuram, Rajapalayam, Tamil Nadu</span>
            </div>
          </div>
        </div>

        {/* Status + Navigation + Actions Right */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* System Online Live Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/80 shadow-2xs text-xs font-medium text-foreground">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <Activity className="size-3.5 text-primary" />
            <span>System Online</span>
          </div>

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Portal Button */}
          <Link href={isAuthenticated ? '/dashboard' : '/login'}>
            <Button
              size="sm"
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <span>{isAuthenticated ? 'Dashboard' : 'Portal Login'}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-16">

        {/* SECTION 1: HERO SHOWCASE (Image #4 Layout) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Narrative Block */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>Enterprise Sales & Operations OS</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tight text-foreground leading-[1.15]">
                Precision Surgical Supplies & Field Operations
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Empowering healthcare supply chains with real-time field sales tracking, automated hospital order workflows, expense governance, and manufacturing analytics.
              </p>
            </div>

            {/* Quick Feature Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Real-Time Visit Logging & GPS</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Instant Order & Invoice Generation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Automated Commission Calculation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Role-Based Secure Multi-Tenant</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-4">
              <Link href={isAuthenticated ? '/dashboard' : '/login'}>
                <Button
                  size="lg"
                  className="h-12 px-6 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gold-glow"
                >
                  <span>{isAuthenticated ? 'Open Control Center' : 'Access Employee Portal'}</span>
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </Link>
              <a
                href="#modules"
                className="px-5 py-3 rounded-xl border border-border/80 bg-card/60 hover:bg-card text-xs font-semibold text-foreground transition-colors inline-flex items-center gap-2"
              >
                <Layers className="size-3.5 text-primary" />
                <span>Explore Modules</span>
              </a>
            </div>
          </div>

          {/* Right Image #4 Style Operations Showcase Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-border/90 bg-card/90 backdrop-blur-xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              {/* Subtle top ambient glow inside card */}
              <div className="absolute top-0 right-0 size-48 bg-primary/10 blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base font-heading text-foreground">
                      Operations Control Hub
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Shri Lathikka Surgicals — Rajapalayam Plant
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Central Operational Metrics (Image #4 Inspiration) */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-background/80 border border-border/70 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Field Operations</span>
                    <Users className="size-4 text-primary" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-heading text-foreground">
                    Active
                  </div>
                  <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                    <span>●</span> Real-time field coverage
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-background/80 border border-border/70 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Order Processing</span>
                    <ShoppingBag className="size-4 text-amber-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-heading text-foreground">
                    Automated
                  </div>
                  <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                    <span>●</span> Instant dispatch generation
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-background/80 border border-border/70 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Hospital Accounts</span>
                    <Stethoscope className="size-4 text-purple-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-heading text-foreground">
                    Verified
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clinical & pharmacy network
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-background/80 border border-border/70 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Financial Audits</span>
                    <Receipt className="size-4 text-emerald-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-heading text-foreground">
                    Reconciled
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Claims & commission payouts
                  </p>
                </div>
              </div>

              {/* Bottom Quick Status List inside card */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Cpu className="size-4 text-primary" />
                  <span className="text-foreground font-medium">System Version</span>
                </div>
                <span className="font-mono text-muted-foreground">v2.6 Enterprise Edition</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: PLATFORM MODULES (Image #4 Detail) */}
        <section id="modules" className="space-y-6 pt-6 border-t border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Layers className="size-4" />
              <span>Core System Modules</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">
              Integrated Enterprise Field & Operations Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
              Engineered specifically for medical & surgical distribution workflows, field force tracking, and financial reconciliation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Module 1 */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs card-hover space-y-3">
              <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                <Users className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Hospital & Customer Directory</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comprehensive CRM for tracking hospital accounts, purchase authorities, specialized clinical departments, and order history.
              </p>
            </div>

            {/* Module 2 */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs card-hover space-y-3">
              <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <MapPin className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Field Visits & Sales Activity</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Live field representative visit logging with geo-coordinates, client discussion notes, sample delivery confirmation, and schedule tracking.
              </p>
            </div>

            {/* Module 3 */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs card-hover space-y-3">
              <div className="size-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ShoppingBag className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Order & Invoice Management</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                End-to-end sales order entry, automated tax computations, dispatch notes, invoice tracking, and customer balance visibility.
              </p>
            </div>

            {/* Module 4 */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs card-hover space-y-3">
              <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Receipt className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Expense Claims & Approvals</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Field travel allowances, client hospitality, receipt documentation, and streamlined management approval workflows.
              </p>
            </div>

            {/* Module 5 */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs card-hover space-y-3">
              <div className="size-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <Award className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Performance & Incentives</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transparent sales tier incentive structures, target tracking, automated commission calculation, and payout status.
              </p>
            </div>

            {/* Module 6 */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs card-hover space-y-3">
              <div className="size-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <BarChart3 className="size-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Analytics & Executive Reports</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Monthly revenue distribution, regional sales performance, top hospital clients, and executive exportable spreadsheets.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: Bottom Company Banner & Direct Access */}
        <section className="rounded-3xl bg-gradient-to-br from-card via-muted/30 to-card border border-border/80 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Building2 className="size-4" />
              <span>Shri Lathikka Surgicals — Rajapalayam</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
              Dedicated Enterprise Portal for Authorized Staff
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Serving hospitals and healthcare providers with reliable surgical supplies. Sign in with your assigned company credentials to manage sales, orders, and operations.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
            <Link href={isAuthenticated ? '/dashboard' : '/login'} className="w-full">
              <Button
                size="lg"
                className="w-full h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gold-glow"
              >
                <span>Access Operations Portal</span>
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/80 px-4 sm:px-8 py-5 bg-muted/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 Shri Lathikka Surgicals, Rajapalayam, Tamil Nadu. All rights reserved.</p>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <ScrollText className="size-3.5 text-primary" />
            <span>Enterprise Operations & Field Management OS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
