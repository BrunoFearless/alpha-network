'use client';
import React, { forwardRef, ReactNode, CSSProperties, HTMLAttributes } from 'react';

export interface LiquidGlassBaseProps extends HTMLAttributes<HTMLElement> {
  elementType?: 'div' | 'button' | 'a' | 'span' | 'p';
  href?: string;
  target?: '_self' | '_blank' | '_parent' | '_top';
  rel?: string;
  download?: string | boolean;
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  innerShadowColor?: string;
  innerShadowBlur?: number;
  innerShadowSpread?: number;
  glassTintColor?: string;
  glassTintOpacity?: number;
  frostBlurRadius?: number;
  noiseFrequency?: number;
  noiseStrength?: number;
  reflectedColor?: string;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

function hexOrRgbToRgb(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const num = parseInt(fullHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return {
      r: parseInt(match[0], 10),
      g: parseInt(match[1], 10),
      b: parseInt(match[2], 10),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

export const LiquidGlassBase = forwardRef<HTMLElement, LiquidGlassBaseProps>(({
  elementType = 'div',
  href,
  target,
  rel,
  download,
  width,
  height,
  borderRadius = 28,
  innerShadowColor = 'rgba(255, 255, 255, 0.85)',
  innerShadowBlur = 12,
  innerShadowSpread = -3,
  glassTintColor = '#ffffff',
  glassTintOpacity = 0,
  frostBlurRadius = 0.5,
  noiseFrequency = 0.012,
  noiseStrength = 55,
  reflectedColor,
  children,
  style = {},
  className = '',
  ...restProps
}, ref) => {
  const rgb = hexOrRgbToRgb(glassTintColor);
  const filterId = React.useId().replace(/:/g, '') || 'liquid-distortion';

  const containerStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : '100%',
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : '100%',
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  const Component = elementType as any;
  const isInteractive = elementType === 'button' || elementType === 'a';

  return (
    <div style={containerStyle} className="liquid-glass-wrapper select-none">
      <Component
        ref={ref}
        href={href}
        target={target}
        rel={rel}
        download={download}
        className={`relative isolate flex items-center justify-center p-0 m-0 border-none bg-transparent outline-none overflow-hidden ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
          ...style,
        }}
        {...restProps}
      >
        {/* ── 1. Camada de Óptica & Refração (Backdrop Filter ultra-límpido com saturação óptica) ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            borderRadius: 'inherit',
            backdropFilter: `blur(${frostBlurRadius}px) saturate(240%) brightness(1.15) contrast(1.05)`,
            WebkitBackdropFilter: `blur(${frostBlurRadius}px) saturate(240%) brightness(1.15) contrast(1.05)`,
            backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glassTintOpacity / 100})`,
          }}
        />

        {/* ── 2. Ondulações Cáusticas de Água Líquida (Simulação de Refração Fluida estilo Gotícula) ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay"
          style={{
            borderRadius: 'inherit',
            backgroundImage: `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.7) 0%, transparent 45%),
                              radial-gradient(ellipse at 75% 75%, rgba(255,255,255,0.4) 0%, transparent 55%),
                              radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)`,
          }}
        />

        {/* ── 3. Menisco Óptico Duplo & Borda Biselada (Bevel Lens Meniscus) ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            borderRadius: 'inherit',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderTopColor: 'rgba(255, 255, 255, 0.45)',
            borderBottomColor: reflectedColor ? `${reflectedColor}80` : 'rgba(255, 255, 255, 0.12)',
            boxShadow: `
              inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.40),
              inset 0 -1px 2px 0 rgba(255, 255, 255, 0.15),
              inset 1px 0 1.5px 0 rgba(255, 255, 255, 0.15),
              inset -1px 0 1.5px 0 rgba(255, 255, 255, 0.15),
              inset 0 0 ${innerShadowBlur}px ${innerShadowSpread}px ${innerShadowColor},
              0 0 12px 1px ${reflectedColor ? `${reflectedColor}30` : 'rgba(255, 255, 255, 0.08)'}
            `,
          }}
        />

        {/* ── 4. Brilho Especular Convexo de Cúpula de Vidro (Gloss Dome Highlight) ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            borderRadius: 'inherit',
            background: `linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 30%, transparent 65%)`,
          }}
        />

        {/* ── 5. Crista Especular no Topo (Specular Light Arc) ── */}
        <div
          className="absolute top-[1.5px] left-[15%] right-[15%] h-[2px] rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 50%, transparent 100%)',
            filter: 'blur(0.5px)',
          }}
        />

        {/* ── 6. Franja Cáustica Inferior Refletida ── */}
        {reflectedColor && (
          <div
            className="absolute -bottom-1 left-3 right-3 h-3 rounded-full pointer-events-none blur-[4px] transition-all duration-300"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${reflectedColor} 50%, transparent 100%)`,
              opacity: 0.85,
            }}
          />
        )}

        {/* ── Conteúdo Central ── */}
        <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-auto">
          {children}
        </div>
      </Component>

      {/* SVG Displacement Map Filter */}
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={noiseFrequency}
              numOctaves={3}
              seed={92}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={noiseStrength}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
});

LiquidGlassBase.displayName = 'LiquidGlassBase';

export const LiquidGlassButton = forwardRef<HTMLElement, Omit<LiquidGlassBaseProps, 'elementType'>>((props, ref) => (
  <LiquidGlassBase ref={ref} elementType="button" {...props} />
));
LiquidGlassButton.displayName = 'LiquidGlassButton';

export const LiquidGlassContainer = forwardRef<HTMLElement, Omit<LiquidGlassBaseProps, 'elementType'>>((props, ref) => (
  <LiquidGlassBase ref={ref} elementType="div" {...props} />
));
LiquidGlassContainer.displayName = 'LiquidGlassContainer';

export const LiquidGlassLink = forwardRef<HTMLElement, Omit<LiquidGlassBaseProps, 'elementType'>>((props, ref) => (
  <LiquidGlassBase ref={ref} elementType="a" {...props} />
));
LiquidGlassLink.displayName = 'LiquidGlassLink';
