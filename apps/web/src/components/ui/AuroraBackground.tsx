'use client';
import React, { useEffect, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AuroraTheme = 'ALPHA' | 'CRIMSON' | 'AQUA' | 'VOID' | string;

interface ThemeConfig {
  orbs: string[];
  particle: string;
}

const THEMES: Record<string, ThemeConfig> = {
  ALPHA: {
    orbs: [
      'rgba(201, 168, 76, 0.25)', // Gold
      'rgba(112, 96, 200, 0.22)', // Violet
      'rgba(192, 40, 122, 0.18)', // Rose
      'rgba(201, 168, 76, 0.15)', // Gold Soft
      'rgba(40, 80, 200, 0.12)',  // Blue
      'rgba(201, 168, 76, 0.10)', // Gold Accent
    ],
    particle: 'rgba(201, 168, 76, 0.4)'
  },
  CRIMSON: {
    orbs: [
      'rgba(153, 27, 27, 0.25)', // Deep Red
      'rgba(234, 88, 12, 0.22)', // Orange
      'rgba(201, 168, 76, 0.18)', // Gold
      'rgba(153, 27, 27, 0.15)', // Red Soft
      'rgba(69, 10, 10, 0.12)',  // Maroon
      'rgba(153, 27, 27, 0.10)', // Red Accent
    ],
    particle: 'rgba(153, 27, 27, 0.4)'
  },
  AQUA: {
    orbs: [
      'rgba(6, 182, 212, 0.25)', // Cyan
      'rgba(37, 99, 235, 0.22)', // Blue
      'rgba(13, 148, 136, 0.18)', // Teal
      'rgba(6, 182, 212, 0.15)', // Cyan Soft
      'rgba(23, 37, 84, 0.12)',  // Navy
      'rgba(6, 182, 212, 0.10)', // Cyan Accent
    ],
    particle: 'rgba(6, 182, 212, 0.4)'
  },
  VOID: {
    orbs: [
      'rgba(126, 34, 206, 0.25)', // Purple
      'rgba(30, 27, 75, 0.22)',  // Midnight
      'rgba(148, 163, 184, 0.18)', // Silver
      'rgba(126, 34, 206, 0.15)', // Purple Soft
      'rgba(2, 6, 23, 0.12)',    // Black
      'rgba(126, 34, 206, 0.10)', // Purple Accent
    ],
    particle: 'rgba(126, 34, 206, 0.4)'
  }
};

function hexToRgba(hex: string, alpha: number) {
  let r = 0, g = 0, b = 0;
  if (!hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: React.ReactNode;
  theme?: AuroraTheme;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  o: number;
}

/**
 * AuroraBackground - Premium Orb Style + Particle Constellation (Theme-aware)
 */
export const AuroraBackground = ({
  className,
  children,
  theme = 'ALPHA',
  ...props
}: AuroraBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determine config
  let config = THEMES[theme as string];
  if (!config && theme?.startsWith('#')) {
    config = {
      orbs: [
        hexToRgba(theme, 0.25),
        hexToRgba(theme, 0.22),
        hexToRgba(theme, 0.18),
        hexToRgba(theme, 0.15),
        hexToRgba(theme, 0.12),
        hexToRgba(theme, 0.10),
      ],
      particle: hexToRgba(theme, 0.4)
    };
  }
  if (!config) config = THEMES.ALPHA;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    // Initialize particles
    const particleCount = 45; 
    const pts: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0005,
      vy: (Math.random() - 0.5) * 0.0005,
      r: Math.random() * 1.2 + 0.4,
      o: Math.random() * 0.4 + 0.1,
    }));

    const handleResize = () => {
      if (!canvas) return;
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      
      const particleColorBase = config.particle.replace('0.4)', ''); // Get the base "rgba(r, g, b, "

      pts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 1; else if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; else if (p.y > 1) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${particleColorBase}${p.o})`;
        ctx.fill();
      });
      
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const dx = (a.x - b.x) * W;
          const dy = (a.y - b.y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x * W, a.y * H);
            ctx.lineTo(b.x * W, b.y * H);
            ctx.strokeStyle = `${particleColorBase}${0.1 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, config]); // Re-run if theme changes

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#05060b]",
        className
      )}
      {...props}
    >
      {/* 1. Aurora Orbs Layer */}
      <div className="absolute inset-0 z-0 transition-opacity duration-1000">
        <div className="aorb" style={{ width: '900px', height: '900px', top: '-300px', left: '-250px', background: `radial-gradient(circle, ${config.orbs[0]} 0%, transparent 70%)`, animation: 'd1 36s ease-in-out infinite' }} />
        <div className="aorb" style={{ width: '1100px', height: '750px', bottom: '-300px', right: '-300px', background: `radial-gradient(circle, ${config.orbs[1]} 0%, transparent 70%)`, animation: 'd2 44s ease-in-out infinite' }} />
        <div className="aorb" style={{ width: '700px', height: '700px', top: '35%', left: '28%', background: `radial-gradient(circle, ${config.orbs[2]} 0%, transparent 70%)`, animation: 'd3 54s ease-in-out infinite' }} />
        <div className="aorb" style={{ width: '600px', height: '600px', top: '60%', right: '5%', background: `radial-gradient(circle, ${config.orbs[3]} 0%, transparent 70%)`, animation: 'd4 32s ease-in-out infinite' }} />
        <div className="aorb" style={{ width: '500px', height: '950px', top: '8%', right: '18%', background: `radial-gradient(circle, ${config.orbs[4]} 0%, transparent 70%)`, animation: 'd5 60s ease-in-out infinite' }} />
        <div className="aorb" style={{ width: '650px', height: '450px', bottom: '8%', left: '15%', background: `radial-gradient(circle, ${config.orbs[5]} 0%, transparent 70%)`, animation: 'd6 40s ease-in-out infinite' }} />
      </div>

      {/* 2. Dot Grid Texture */}
      <div className="dotgrid" />

      {/* 3. Particle Constellation Layer */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10"
      />

      {children && (
        <div className="relative z-20 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
};
