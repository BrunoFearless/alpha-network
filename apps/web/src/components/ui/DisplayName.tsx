import React from 'react';

// Tipagem baseada nos campos criados na base de dados (UserProfile)
export interface DisplayNameProfile {
  username?: string;
  displayName?: string | null;
  nameFont?: string | null;
  nameEffect?: string | null;
  nameColor?: string | null;
}

interface DisplayNameProps {
  profile?: DisplayNameProfile | null;
  fallbackName: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  /** Cor base (usado no fallback, hover ou cor default) */
  baseColor?: string;
}

export const FONT_OPTIONS = [
  { id: 'padrao', label: 'Padrão', value: 'inherit' },
  { id: 'elegante', label: 'Luxo', value: "'Playfair Display', serif" },
  { id: 'cosmica', label: 'Futurista', value: "'Orbitron', sans-serif" },
  { id: 'divertida', label: 'Divertida', value: "'Fredoka', cursive" },
  { id: 'impacto', label: 'Brutal', value: "'Bebas Neue', sans-serif" },
  { id: 'poesia', label: 'Poesia', value: "'Dancing Script', cursive" },
  { id: 'tecnologia', label: 'Tech', value: "'JetBrains Mono', monospace" },
  { id: 'fantasia', label: 'Fantasia', value: 'Papyrus, fantasy' },
];

export const EFFECT_OPTIONS = [
  { id: 'solido', label: 'Sólido' },
  { id: 'fluido', label: '💧 Líquido' },
  { id: 'neon', label: '🌟 Neon Pulsar' },
  { id: 'arco-iris', label: '🌈 Arco-íris' },
  { id: 'glitch', label: '👾 Glitch' },
  { id: 'fogo', label: '🔥 Fogo' },
  { id: 'diamante', label: '💎 Diamante' },
  { id: 'matrix', label: '📟 Hacker' },
  { id: 'holograma', label: '📡 Holograma' },
];

export const COLOR_OPTIONS = [
  '#A5E600', // Alpha Accent
  '#F0B132', // Amarelo Gold
  '#ED4245', // Vermelho
  '#EB459E', // Rosa
  '#9B59B6', // Roxo
  '#3498DB', // Azul Claro
  '#00B0F4', // Cyan
  '#57F287', // Verde
  '#FFFFFF', // Branco
  '#95A5A6', // Cinzento
];

export function DisplayName({ profile, fallbackName, style, className, onClick, baseColor }: DisplayNameProps) {
  const name = profile?.displayName || profile?.username || fallbackName;
  const font = profile?.nameFont || 'inherit';
  const effect = profile?.nameEffect || 'solido';
  const color = profile?.nameColor || baseColor || 'inherit';

  const baseStyle: React.CSSProperties = {
    fontFamily: font,
    display: 'inline-block',
    // Limites lógicos para garantir que não quebra inteiramente a UI
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...style,
  };

  // Aplicação do estilo Efeito
  let effectStyle: React.CSSProperties = { color };

  switch (effect) {
    case 'fluido':
      effectStyle = {
        background: `linear-gradient(90deg, ${color}, #fff, ${color})`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'rainbow-text 3s linear infinite',
      };
      break;
    case 'neon':
      effectStyle = {
        color: '#fff',
        // Usamos uma variável CSS para a animação conseguir usar a cor dinâmica
        // @ts-ignore
        '--neon-color': color,
        animation: 'neon-pulse 2s ease-in-out infinite',
      };
      break;
    case 'arco-iris':
      effectStyle = {
        background: 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'rainbow-text 3s linear infinite',
      };
      break;
    case 'glitch':
      effectStyle = {
        color: '#fff',
        position: 'relative',
        animation: 'glitch-anim 0.4s infinite alternate-reverse',
      };
      break;
    case 'fogo':
      effectStyle = {
        color: '#fff',
        animation: 'fire-glow 1.5s ease-in-out infinite',
        fontWeight: 'bold',
      };
      break;
    case 'diamante':
      effectStyle = {
        background: `linear-gradient(90deg, ${color} 0%, rgba(255,255,255,0.8) 50%, ${color} 100%)`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shine-sweep 2.5s infinite linear',
        fontWeight: 'bold',
      };
      break;
    case 'matrix':
      effectStyle = {
        color: '#00ff00',
        fontFamily: "'JetBrains Mono', monospace",
        animation: 'matrix-flicker 2s infinite',
        textShadow: '0 0 8px #00ff00',
      };
      break;
    case 'holograma':
      effectStyle = {
        color: color,
        opacity: 0.9,
        animation: 'holographic-shift 4s infinite linear, matrix-flicker 3s infinite',
        textShadow: `0 0 10px ${color}`,
      };
      break;
    case 'solido':
    default:
      effectStyle = { color };
      break;
  }

  return (
    <span
      className={className}
      style={{ ...baseStyle, ...effectStyle }}
      onClick={onClick}
    >
      {name}
    </span>
  );
}
