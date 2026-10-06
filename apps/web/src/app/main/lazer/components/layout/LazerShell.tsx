'use client';

import React from 'react';

interface LazerShellProps {
  /** Controls height/overflow — use 'full' for immersive views (music, watch, art, messages),
   *  'auto' for scrollable content views (feed, explore, notifications, friends). */
  variant?: 'full' | 'auto';
  /** Max-width constraint for narrower content columns (e.g. art view). */
  maxWidth?: string;
  /** Additional className appended to the outer wrapper. */
  className?: string;
  /** 'dark' (default) or 'light' — selects the correct glass-panel preset. */
  themeMode?: 'dark' | 'light';
  children: React.ReactNode;
}

/**
 * LazerShell — unified liquid-glass container used by every Lazer "mode" panel.
 *
 * Structure:
 *   <outer>          — controls height & centering
 *     <glass-card>   — rounded, bordered, glass-blurred surface
 *       {children}
 *     </glass-card>
 *   </outer>
 *
 * On mobile the shell is full-viewport-height with no rounding; on md+ it
 * has a 20px vertical margin (calc(100vh - 40px)) and the 3rem border-radius
 * of the design system.
 */
export function LazerShell({
  variant = 'full',
  maxWidth,
  className = '',
  themeMode = 'dark',
  children,
}: LazerShellProps) {
  const isFull = variant === 'full';
  const panelClass = themeMode === 'light' ? 'glass-panel-light' : 'glass-panel-dark';

  const outerHeight = isFull ? 'h-full' : 'min-h-full';
  const outerOverflow = isFull ? 'overflow-hidden' : 'overflow-visible';
  const maxWClass = maxWidth ? `max-w-[${maxWidth}] mx-auto` : '';

  return (
    <div
      className={`w-full ${outerHeight} ${outerOverflow} flex flex-col font-['Nunito',sans-serif] animate-in fade-in duration-500 ${maxWClass} ${className}`.trim()}
    >
      <div
        className={`flex-1 border-0 md:border md:border-white/[0.08] rounded-none md:rounded-[3rem] flex flex-col ${isFull ? 'overflow-hidden' : 'overflow-visible'} relative z-10 ${panelClass} min-h-0 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}
