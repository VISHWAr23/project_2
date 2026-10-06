// User instruction: "[Image #8] this is the logo of our app use this is all the place where logo needed"
// Importers/callers: Next.js /login route (frontend/src/app/login/page.tsx)
// Affected API: Authentication login presentation with official Image #8 BrandLogo
// Data schemas: LoginFormValues (email, password)

'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/brand-logo';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  Shield,
  Building2,
} from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email address is required' })
    .email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // If already authenticated, redirect to dashboard immediately
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setServerError(null);
      await login(data);
      router.replace('/dashboard');
    } catch (err: unknown) {
      let errorMessage = 'Invalid email or password. Please try again.';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setServerError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-primary/20 selection:text-primary overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 size-[450px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-32 size-[450px] rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-[140px] pointer-events-none -z-10" />

      {/* Top Header Navigation */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 max-w-4xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 group px-3 py-1.5 rounded-xl bg-card/80 border border-border/80 backdrop-blur-md text-xs font-semibold hover:border-primary/50 transition-colors"
        >
          <ArrowLeft className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-foreground">Company Overview</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Dual-Column Geometric Card Frame (Image #6 Style) */}
      <div className="w-full max-w-3xl pt-12 sm:pt-0">
        <div className="rounded-3xl border border-border/90 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative">

          {/* Left Geometric Brand Banner with Layered Ribbons & Protruding Active Tab */}
          <div className="lg:col-span-5 bg-gradient-to-br from-card via-muted/30 to-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-border/80 min-h-[220px] lg:min-h-[460px]">
            {/* Geometric Diagonal Ribbons (Brand Amber & Dark Hues) */}
            <div className="absolute -top-12 -left-12 w-56 h-28 bg-primary/15 -rotate-45 transform origin-top-left pointer-events-none blur-sm" />
            <div className="absolute top-1/3 -right-16 w-48 h-24 bg-gradient-to-l from-amber-500/20 via-primary/10 to-transparent -rotate-12 pointer-events-none rounded-3xl" />
            <div className="absolute -bottom-16 -left-10 w-64 h-32 bg-gradient-to-tr from-amber-600/15 via-primary/10 to-transparent rotate-12 pointer-events-none rounded-3xl" />

            {/* Connecting Protruding Tab on the edge (Image #6 signature) */}
            <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 size-6 rotate-45 bg-card border-t border-r border-border/80 z-10" />

            {/* Top Brand Block */}
            <div className="relative z-10 space-y-4">
              <BrandLogo size="lg" className="shadow-md" />

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-heading leading-tight">
                  Shri Lathikka
                </h1>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary font-heading leading-tight">
                  Surgicals
                </h2>
                <p className="text-xs text-muted-foreground pt-1">
                  Enterprise Operations & Sales Portal
                </p>
              </div>
            </div>

            {/* Bottom Status Tag */}
            <div className="relative z-10 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Secure Portal
              </span>
              <span className="font-mono text-[10px]">v2.6 Enterprise</span>
            </div>
          </div>

          {/* Right Form Column (Clean Image #6 Layout with Circular User Avatar) */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-card">
            <div>
              {/* Floating Circular User Icon */}
              <div className="flex flex-col items-center text-center space-y-2 pb-5 border-b border-border/70">
                <div className="size-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg ring-4 ring-primary/20">
                  <User className="size-7 stroke-[2.5]" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-lg sm:text-xl font-bold font-heading text-foreground tracking-tight">
                    Sign In to Account
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Enter your authorized credentials to access the workspace
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-5">
                {serverError && (
                  <div className="flex items-start gap-2.5 p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span className="leading-snug">{serverError}</span>
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary" />
                    Company Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@lathikka.com"
                      disabled={isSubmitting}
                      {...register('email')}
                      className={`h-11 px-3.5 text-sm bg-background border-border/80 rounded-xl focus-visible:ring-primary ${
                        errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] font-medium text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Lock className="size-3.5 text-primary" />
                      Security Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      {...register('password')}
                      className={`h-11 px-3.5 pr-10 text-sm bg-background border-border/80 rounded-xl focus-visible:ring-primary ${
                        errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] font-medium text-destructive">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit Pill Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-full font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gold-glow transition-all mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Bottom Security Footer */}
            <div className="pt-6 text-center border-t border-border/60 mt-4">
              <p className="text-[11px] text-muted-foreground">
                Authorized Personnel Only • Shri Lathikka Surgicals © 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
