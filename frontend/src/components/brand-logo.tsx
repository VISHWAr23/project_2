// User instruction: "[Image #8] this is the logo of our app use this is all the place where logo needed"
// Importers/callers: frontend/src/components/sidebar.tsx, frontend/src/components/navbar.tsx, frontend/src/app/page.tsx, frontend/src/app/login/page.tsx, frontend/src/components/app-shell.tsx
// Affected API: Shared BrandLogo component for presenting Image #8 official medical/leaf logo across the app
// Data schemas: BrandLogoProps { size, className, imageClassName, showText, textClassName, subtitle, alt }

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
  alt?: string;
}

const sizeMap = {
  xs: { box: 'size-6 rounded-md p-0.5', img: 20 },
  sm: { box: 'size-8 rounded-lg p-1', img: 28 },
  md: { box: 'size-10 rounded-xl p-1', img: 36 },
  lg: { box: 'size-12 rounded-2xl p-1.5', img: 44 },
  xl: { box: 'size-16 rounded-2xl p-2', img: 60 },
};

export function BrandLogo({
  size = 'md',
  className,
  imageClassName,
  showText = false,
  textClassName,
  subtitle,
  alt = 'Shri Lathikka Surgicals Logo',
}: BrandLogoProps) {
  const currentSize = sizeMap[size] || sizeMap.md;

  const logoIcon = (
    <div
      className={cn(
        'relative bg-white shadow-xs ring-1 ring-border/80 flex items-center justify-center shrink-0 overflow-hidden transition-transform',
        currentSize.box,
        className
      )}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={currentSize.img}
        height={currentSize.img}
        className={cn('w-full h-full object-contain', imageClassName)}
        priority
      />
    </div>
  );

  if (!showText) {
    return logoIcon;
  }

  return (
    <div className="flex items-center gap-3 select-none">
      {logoIcon}
      <div className={cn('flex flex-col', textClassName)}>
        <div className="flex items-center gap-2">
          <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-foreground">
            Shri Lathikka Surgicals
          </span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
            EST. 2006
          </span>
        </div>
        {subtitle && (
          <span className="text-[11px] text-muted-foreground -mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
