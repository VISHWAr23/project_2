// User instruction: "NOW I ONLY WANT TWO THINGS: 1. Make the ENTIRE APPLICATION fully responsive and mobile-friendly. 2. Add a proper Light Theme + Dark Theme with a theme switcher."
// Importers/callers: frontend/src/components/header.tsx, frontend/src/components/sidebar.tsx, frontend/src/components/navbar.tsx
// Affected API: Theme context (useTheme)
// Data schemas: UI theme selector (Light, Dark, System)

'use client';

import * as React from 'react';
import { useTheme } from '@/providers/theme-provider';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'segmented';
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex items-center p-1 rounded-lg bg-muted border border-border text-muted-foreground gap-1',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center justify-center size-7 rounded-md transition-all',
            theme === 'light'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'hover:text-foreground'
          )}
          title="Light Theme"
          aria-label="Light Theme"
        >
          <Sun className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center justify-center size-7 rounded-md transition-all',
            theme === 'dark'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'hover:text-foreground'
          )}
          title="Dark Theme"
          aria-label="Dark Theme"
        >
          <Moon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center justify-center size-7 rounded-md transition-all',
            theme === 'system'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'hover:text-foreground'
          )}
          title="System Theme"
          aria-label="System Theme"
        >
          <Laptop className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to change)`}
        aria-label="Toggle theme selection"
        aria-expanded={menuOpen}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="size-4 transition-transform duration-200 rotate-0" />
        ) : (
          <Sun className="size-4 transition-transform duration-200 rotate-0 text-amber-500" />
        )}
      </Button>

      {menuOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-popover border border-border shadow-xl p-1 z-50 animate-in fade-in-0 zoom-in-95">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setMenuOpen(false);
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
              theme === 'light'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-popover-foreground hover:bg-muted'
            )}
          >
            <Sun className="size-3.5 text-amber-500" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setMenuOpen(false);
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
              theme === 'dark'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-popover-foreground hover:bg-muted'
            )}
          >
            <Moon className="size-3.5 text-blue-400" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setMenuOpen(false);
            }}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
              theme === 'system'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-popover-foreground hover:bg-muted'
            )}
          >
            <Laptop className="size-3.5 text-muted-foreground" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
}
