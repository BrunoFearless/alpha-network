/* ═══════════════════════════════════════════
   LIQUID GLASS — Core CSS
   Compatível com Chrome 76+, Safari 9+, Edge 79+
═══════════════════════════════════════════ */

.glass {
  /* 1. CAMADA DE COR BASE
     Branco semi-transparente — quanto mais baixo o alpha,
     mais "puro" o vidro. Entre 0.15 e 0.25 é o sweet spot. */
  background: rgba(255, 255, 255, 0.22);

  /* 2. O CORAÇÃO DO LIQUID GLASS
     - blur(40px)      → desfoca o que está atrás
     - saturate(220%)  → intensifica as cores refratadas (efeito prisma)
     - brightness(1.06)→ leve claridade, como luz passando pelo vidro */
  backdrop-filter: blur(40px) saturate(220%) brightness(1.06);
  -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(1.06);

  /* 3. BORDA DE VIDRO
     Branca e translúcida — simula a espessura da superfície */
  border: 1px solid rgba(255, 255, 255, 0.55);

  /* 4. SOMBRAS EM CAMADAS
     - externa → profundidade e elevação
     - inset top → reflexo de luz na borda superior (crucial!)
     - inset bottom → sombra sutil na borda inferior */
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.80),
    inset 0 -1px 0 rgba(0, 0, 0, 0.04);
}




/* ═══════════════════════════════════════════
   VARIAÇÕES — Ajuste por contexto de fundo
═══════════════════════════════════════════ */

/* Fundo ESCURO (sala, noite, dark mode) */
.glass-dark {
  background: rgba(255, 248, 240, 0.07); /* tint quente levíssimo */
  backdrop-filter: blur(40px) saturate(180%) brightness(1.10);
  -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(1.10);
  border: 1px solid rgba(255, 240, 220, 0.14);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.13),
    inset 0 -1px 0 rgba(0, 0, 0, 0.10);
}

/* Fundo COLORIDO (arco-íris, gradientes vibrantes) */
.glass-colorful {
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(40px) saturate(220%) brightness(1.06);
  -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(1.06);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.80),
    inset 0 -1px 0 rgba(0, 0, 0, 0.04);
}

/* Fundo com FOTO (imagem real) */
.glass-photo {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(36px) saturate(180%) brightness(1.05);
  -webkit-backdrop-filter: blur(36px) saturate(180%) brightness(1.05);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.70),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05);
}




/* ═══════════════════════════════════════════
   ANIMAÇÃO — Shimmer de "vidro vivo"
   Pulsa levemente como luz atravessando o material
═══════════════════════════════════════════ */

@keyframes liquid-shimmer {
  0%, 100% { filter: brightness(1) saturate(1); }
  50%       { filter: brightness(1.04) saturate(1.10); }
}

.glass {
  animation: liquid-shimmer 5s ease-in-out infinite;
}




/* ═══════════════════════════════════════════
   COMPONENTE React/TSX — Pronto para uso
═══════════════════════════════════════════ */

type GlassVariant = 'light' | 'dark' | 'colorful' | 'photo';

const glassStyles: Record<GlassVariant, React.CSSProperties> = {
  light: {
    background: 'rgba(255, 255, 255, 0.22)',
    backdropFilter: 'blur(40px) saturate(220%) brightness(1.06)',
    WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(1.06)',
    border: '1px solid rgba(255, 255, 255, 0.55)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.80), inset 0 -1px 0 rgba(0,0,0,0.04)',
  },
  dark: {
    background: 'rgba(255, 248, 240, 0.07)',
    backdropFilter: 'blur(40px) saturate(180%) brightness(1.10)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%) brightness(1.10)',
    border: '1px solid rgba(255, 240, 220, 0.14)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.10)',
  },
  colorful: {
    background: 'rgba(255, 255, 255, 0.22)',
    backdropFilter: 'blur(40px) saturate(220%) brightness(1.06)',
    WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(1.06)',
    border: '1px solid rgba(255, 255, 255, 0.55)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.80), inset 0 -1px 0 rgba(0,0,0,0.04)',
  },
  photo: {
    background: 'rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(36px) saturate(180%) brightness(1.05)',
    WebkitBackdropFilter: 'blur(36px) saturate(180%) brightness(1.05)',
    border: '1px solid rgba(255, 255, 255, 0.45)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -1px 0 rgba(0,0,0,0.05)',
  },
};

export function GlassPanel({
  children,
  variant = 'light',
  style,
  className,
}: {
  children: React.ReactNode;
  variant?: GlassVariant;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ ...glassStyles[variant], ...style }}
    >
      {children}
    </div>
  );
}