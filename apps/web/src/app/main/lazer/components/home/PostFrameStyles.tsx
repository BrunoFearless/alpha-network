import React from 'react';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';

export type FrameStyleId = 'standard' | 'glass' | 'editorial' | 'cyber' | 'cinema' | 'retro' | 'cosmos' | 'manga';

export interface FrameStyleConfig {
  id: FrameStyleId;
  name: string;
  tagline: string;
  defaultWatermark: string;
  defaultColor: string;
  iconName: string;
}

export const FRAME_STYLES: FrameStyleConfig[] = [
  {
    id: 'standard',
    name: 'Padrão Fluido',
    tagline: 'Texto limpo e moderno sem moldura',
    defaultWatermark: '',
    defaultColor: '#ffffff',
    iconName: 'sparkles',
  },
  {
    id: 'glass',
    name: 'Cápsula Glass',
    tagline: 'Vidro líquido translúcido minimalista',
    defaultWatermark: 'VIBE',
    defaultColor: '#00f2ff',
    iconName: 'glass',
  },
  {
    id: 'editorial',
    name: 'Editorial & Revista',
    tagline: 'Diagramação elegante estilo imprensa',
    defaultWatermark: 'EDITORIAL',
    defaultColor: '#f59e0b',
    iconName: 'book',
  },
  {
    id: 'cyber',
    name: 'Cyber & Games',
    tagline: 'Moldura holográfica neon tech',
    defaultWatermark: 'GAMING',
    defaultColor: '#10b981',
    iconName: 'terminal',
  },
  {
    id: 'cinema',
    name: 'Cinema 21:9',
    tagline: 'Enquadramento dramático com spotlight',
    defaultWatermark: 'CINEMA',
    defaultColor: '#ec4899',
    iconName: 'film',
  },
  {
    id: 'retro',
    name: 'Retro Pop',
    tagline: 'Vibração Synthwave & cores dinâmicas',
    defaultWatermark: 'RETRO',
    defaultColor: '#a855f7',
    iconName: 'disc',
  },
  {
    id: 'manga',
    name: 'Mangá & Anime',
    tagline: 'Aspas tradicionais e kanji de fundo',
    defaultWatermark: '覚醒',
    defaultColor: '#ef4444',
    iconName: 'quote',
  },
  {
    id: 'cosmos',
    name: 'Cosmos & Universo',
    tagline: 'Galáxias, nebulosas e estrelas cadentes',
    defaultWatermark: 'COSMOS',
    defaultColor: '#818cf8',
    iconName: 'cosmos',
  },
];

export const WATERMARK_SUGGESTIONS = [
  // Gerais & Lifestyle
  'VIBE',
  'LEGEND',
  'CHILL',
  'ALPHA',
  'FOCUS',
  'GOAT',
  // Cinema & Séries
  'CINEMA',
  'SCENE',
  'DIRECTOR',
  'EPIC',
  // Gaming & Tech
  'GAMING',
  'LEVEL UP',
  'BOSS',
  'VICTORY',
  'GG',
  // Música & Som
  'TRACK',
  'BEAT',
  'SOUND',
  'ACOUSTIC',
  // Cosmos & Universo
  'COSMOS',
  'GALAXY',
  'NEBULA',
  'STARDUST',
  'ORBIT',
  'VOID',
  'NOVA',
  'PULSAR',
  // Anime & Manga
  '覚醒',
  '伝説',
  '魂',
  '希望',
  '無敵',
];

export type WatermarkAnimId = 'none' | 'flame' | 'blossom' | 'pulse' | 'float' | 'cyber' | 'wave' | 'breathe' | 'vortex';

export interface WatermarkAnimConfig {
  id: WatermarkAnimId;
  name: string;
  tagline: string;
  emoji: string;
}

export const WATERMARK_ANIMATIONS: WatermarkAnimConfig[] = [
  { id: 'none', name: 'Estático', tagline: 'Marca d\'água suave estática', emoji: '✦' },
  { id: 'flame', name: 'Chamas Vivas', tagline: 'Fogo oscilante e brasas térmicas', emoji: '🔥' },
  { id: 'blossom', name: 'Florescer', tagline: 'Pétalas flutuantes e desabrochar', emoji: '🌸' },
  { id: 'pulse', name: 'Pulso & Shockwave', tagline: 'Ondas sônicas e shockwave rítmico', emoji: '⚡' },
  { id: 'float', name: 'Levitação 3D', tagline: 'Gravidade zero e poeira estelar', emoji: '✨' },
  { id: 'cyber', name: 'Scanline Cyber', tagline: 'Laser holográfico e glitch tech', emoji: '👾' },
  { id: 'wave', name: 'Maré Fluida', tagline: 'Ondulação líquida orgânica', emoji: '🌊' },
  { id: 'breathe', name: 'Respiração Zen', tagline: 'Aura mística e glow etéreo', emoji: '🔮' },
  { id: 'vortex', name: 'Vórtice Espiral', tagline: 'Rotação cósmica e órbita 360°', emoji: '🌀' },
];

export interface ParsedPostMeta {
  cleanContent: string;
  frameStyle: FrameStyleId;
  watermark: string | null;
  watermarkAnim?: WatermarkAnimId;
  bgm: { id: string; title: string; artist: string } | null;
}

/**
 * Parses post content metadata:
 * - Supports new: [frame:STYLE:WATERMARK:ANIM] or [frame:STYLE:WATERMARK] or [frame:STYLE]
 * - Fully supports legacy: [manga-quote:KANJI] or [manga-quote]
 * - Supports BGM: [bgm:id:title:artist]
 */
export function parsePostMetadata(rawContent: string): ParsedPostMeta {
  if (!rawContent) {
    return { cleanContent: '', frameStyle: 'standard', watermark: null, watermarkAnim: 'none', bgm: null };
  }

  let content = rawContent;
  let frameStyle: FrameStyleId = 'standard';
  let watermark: string | null = null;
  let watermarkAnim: WatermarkAnimId = 'none';
  let bgm: { id: string; title: string; artist: string } | null = null;

  // 1. Check for [frame:STYLE:WATERMARK:ANIM] tag
  const frameMatch = content.match(/\[frame:([a-z0-9_-]+)(?::([^:\]]*))?(?::([^\]]*))?\]/i);
  if (frameMatch) {
    const rawStyle = frameMatch[1].toLowerCase() as FrameStyleId;
    const knownStyle = FRAME_STYLES.some(s => s.id === rawStyle);
    frameStyle = knownStyle ? rawStyle : 'glass';
    watermark = frameMatch[2] ? decodeURIComponent(frameMatch[2]).trim() : null;
    const rawAnim = frameMatch[3]?.toLowerCase();
    const knownAnim = WATERMARK_ANIMATIONS.some(a => a.id === rawAnim);
    watermarkAnim = knownAnim ? (rawAnim as WatermarkAnimId) : 'none';
    content = content.replace(frameMatch[0], '').trim();
  } else {
    // 2. Check for legacy [manga-quote:KANJI] tag
    const quoteMatch = content.match(/\[manga-quote(?::([^\]]+))?\]/);
    if (quoteMatch) {
      frameStyle = 'manga';
      watermark = quoteMatch[1] || '覚醒';
      content = content.replace(quoteMatch[0], '').trim();
    }
  }

  // 3. Check for BGM tag
  const bgmMatch = content.match(/\[bgm:([^:]+):([^:]+):([^\]]+)\]/);
  if (bgmMatch) {
    bgm = { id: bgmMatch[1], title: bgmMatch[2], artist: bgmMatch[3] };
    content = content.replace(bgmMatch[0], '').trim();
  }

  return { cleanContent: content, frameStyle, watermark, watermarkAnim, bgm };
}

/**
 * Encodes frame style, watermark and animation into tag string
 */
export function buildFrameTag(style: FrameStyleId, watermark?: string, anim?: WatermarkAnimId): string {
  if (style === 'standard') return '';
  const cleanWatermark = watermark ? encodeURIComponent(watermark.trim()) : '';
  const cleanAnim = anim && anim !== 'none' ? `:${anim}` : '';
  return `[frame:${style}${cleanWatermark ? `:${cleanWatermark}` : (cleanAnim ? ':' : '')}${cleanAnim}]\n`;
}

interface WatermarkRendererProps {
  text: string;
  anim?: WatermarkAnimId;
  activeColor: string;
  className?: string;
  style?: React.CSSProperties;
  emojiSize?: number;
}

const WATERMARK_KEYFRAMES = `
@keyframes alphaFlameSway {
  0%, 100% { transform: translateY(0) scale(1) skewX(0deg); filter: drop-shadow(0 -3px 8px currentColor); }
  25% { transform: translateY(-4px) scale(1.03, 0.98) skewX(-2.5deg); filter: drop-shadow(0 -6px 14px currentColor); }
  50% { transform: translateY(-8px) scale(0.98, 1.04) skewX(2.5deg); filter: drop-shadow(0 -10px 20px currentColor); }
  75% { transform: translateY(-3px) scale(1.02, 1) skewX(-1deg); filter: drop-shadow(0 -5px 12px currentColor); }
}
@keyframes alphaFlameSpark {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  30% { opacity: 0.9; }
  100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
}
@keyframes alphaBlossomBloom {
  0%, 100% { transform: scale(0.96) rotate(0deg); filter: drop-shadow(0 0 8px currentColor); }
  50% { transform: scale(1.06) rotate(2.5deg); filter: drop-shadow(0 0 20px currentColor); }
}
@keyframes alphaPetalDrift {
  0% { transform: translateY(-16px) rotate(0deg) scale(0.6); opacity: 0; }
  25% { opacity: 0.85; }
  75% { opacity: 0.85; }
  100% { transform: translateY(36px) rotate(160deg) scale(1); opacity: 0; }
}
@keyframes alphaHeartbeatPulse {
  0%, 100% { transform: scale(1); opacity: 0.08; }
  14% { transform: scale(1.12); opacity: 0.22; filter: drop-shadow(0 0 16px currentColor); }
  28% { transform: scale(1.02); opacity: 0.12; }
  42% { transform: scale(1.16); opacity: 0.28; filter: drop-shadow(0 0 25px currentColor); }
  70% { transform: scale(1); opacity: 0.08; }
}
@keyframes alphaShockwaveRing {
  0% { transform: scale(0.7); opacity: 0.65; }
  100% { transform: scale(1.45); opacity: 0; }
}
@keyframes alphaFloatLevitate {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(-1.5deg); filter: drop-shadow(0 10px 20px currentColor); }
}
@keyframes alphaStardustTwinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1.3); }
}
@keyframes alphaCyberGlitch {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-1.5px, 1px); }
  40% { transform: translate(1.5px, -1px); }
  60% { transform: translate(-1px, 0.5px); }
  80% { transform: translate(1px, -0.5px); }
}
@keyframes alphaCyberScanline {
  0% { top: -20%; opacity: 0; }
  25% { opacity: 0.8; }
  75% { opacity: 0.8; }
  100% { top: 120%; opacity: 0; }
}
@keyframes alphaWaveUndulate {
  0%, 100% { transform: translateY(0) skewX(0deg); }
  25% { transform: translateY(-5px) skewX(2deg); }
  50% { transform: translateY(2px) skewX(-1.5deg); }
  75% { transform: translateY(-3px) skewX(1deg); }
}
@keyframes alphaWaveRipple {
  0% { transform: scaleX(0.75) scaleY(0.7); opacity: 0.55; }
  100% { transform: scaleX(1.35) scaleY(1.3); opacity: 0; }
}
@keyframes alphaBreatheGlow {
  0%, 100% { transform: scale(0.95); opacity: 0.07; filter: drop-shadow(0 0 6px currentColor); }
  50% { transform: scale(1.08); opacity: 0.22; filter: drop-shadow(0 0 28px currentColor); }
}
@keyframes alphaVortexOrbit {
  0% { transform: rotate(0deg) scale(0.96); }
  50% { transform: rotate(180deg) scale(1.05); }
  100% { transform: rotate(360deg) scale(0.96); }
}
`;

export function WatermarkRenderer({
  text,
  anim = 'none',
  activeColor,
  className = '',
  style = {},
  emojiSize = 64,
}: WatermarkRendererProps) {
  if (!text) return null;

  const getAnimStyle = (animType?: WatermarkAnimId): React.CSSProperties => {
    switch (animType) {
      case 'flame':
        return { animation: 'alphaFlameSway 3s ease-in-out infinite' };
      case 'blossom':
        return { animation: 'alphaBlossomBloom 4.5s ease-in-out infinite' };
      case 'pulse':
        return { animation: 'alphaHeartbeatPulse 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' };
      case 'float':
        return { animation: 'alphaFloatLevitate 4s ease-in-out infinite' };
      case 'cyber':
        return { animation: 'alphaCyberGlitch 3.5s steps(2, start) infinite' };
      case 'wave':
        return { animation: 'alphaWaveUndulate 3.8s ease-in-out infinite' };
      case 'breathe':
        return { animation: 'alphaBreatheGlow 4s ease-in-out infinite' };
      case 'vortex':
        return { animation: 'alphaVortexOrbit 12s linear infinite' };
      default:
        return {};
    }
  };

  return (
    <div
      className={`select-none pointer-events-none transition-colors duration-300 z-0 max-w-[70%] sm:max-w-[60%] overflow-hidden truncate whitespace-nowrap text-right ${className}`}
      style={{
        color: activeColor,
        ...style,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: WATERMARK_KEYFRAMES }} />

      {/* Ambient Animation Effects */}
      {anim === 'flame' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0.2, 0.5, 0.8, 0.35].map((pos, i) => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${pos * 100}%`,
                bottom: '15%',
                width: `${4 + i * 1.5}px`,
                height: `${4 + i * 1.5}px`,
                background: activeColor,
                boxShadow: `0 0 10px ${activeColor}`,
                animation: `alphaFlameSpark 1.6s cubic-bezier(0.2, 0.8, 0.4, 1) infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
        </div>
      )}

      {anim === 'blossom' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0.15, 0.45, 0.75, 0.9].map((pos, i) => (
            <svg
              key={i}
              className="absolute pointer-events-none opacity-60"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              style={{
                left: `${pos * 100}%`,
                top: '10%',
                fill: activeColor,
                animation: `alphaPetalDrift 3.2s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
              }}
            >
              <path d="M12 2C8 6 4 10 4 14a8 8 0 0 0 16 0c0-4-4-8-8-12z" />
            </svg>
          ))}
        </div>
      )}

      {anim === 'pulse' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[0, 1].map(i => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: '130px',
                height: '70px',
                border: `1.5px solid ${activeColor}`,
                animation: `alphaShockwaveRing 2.2s cubic-bezier(0.1, 0.7, 0.1, 1) infinite`,
                animationDelay: `${i * 1.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {anim === 'float' && (
        <div className="absolute inset-0 pointer-events-none">
          {[
            { top: '15%', left: '20%', delay: '0s' },
            { top: '75%', left: '80%', delay: '1s' },
            { top: '30%', left: '85%', delay: '2s' },
          ].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                top: s.top,
                left: s.left,
                width: '3.5px',
                height: '3.5px',
                background: activeColor,
                boxShadow: `0 0 8px ${activeColor}`,
                animation: `alphaStardustTwinkle 2s ease-in-out infinite`,
                animationDelay: s.delay,
              }}
            />
          ))}
        </div>
      )}

      {anim === 'cyber' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-x-0 h-[2px] pointer-events-none"
            style={{
              background: `linear-gradient(to right, transparent, ${activeColor}, transparent)`,
              boxShadow: `0 0 10px ${activeColor}`,
              animation: `alphaCyberScanline 3s linear infinite`,
            }}
          />
        </div>
      )}

      {anim === 'wave' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: '150px',
              height: '45px',
              border: `1.5px solid ${activeColor}`,
              animation: `alphaWaveRipple 3s ease-out infinite`,
            }}
          />
        </div>
      )}

      {anim === 'breathe' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-36 h-24 rounded-full blur-xl pointer-events-none"
            style={{
              background: activeColor,
              opacity: 0.14,
              animation: `alphaBreatheGlow 4s ease-in-out infinite`,
            }}
          />
        </div>
      )}

      {anim === 'vortex' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-32 h-32 rounded-full border border-dashed pointer-events-none opacity-25"
            style={{
              borderColor: activeColor,
              animation: `alphaVortexOrbit 12s linear infinite`,
            }}
          />
        </div>
      )}

      {/* Main Animated Watermark Body (supports text & animated emojis) */}
      <div style={getAnimStyle(anim)} className="inline-flex items-center justify-end text-right">
        <EmojiRenderer content={text} emojiSize={emojiSize} />
      </div>
    </div>
  );
}

interface ExpandableBodyProps {
  body: string;
  activeColor: string;
  isLight: boolean;
  fontFamily?: string;
  fontStyleClass?: string;
  collapsible?: boolean;
}

function ExpandableBody({
  body,
  activeColor,
  isLight,
  fontFamily,
  fontStyleClass = '',
  collapsible = true,
}: ExpandableBodyProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!body) return null;

  // Long text threshold: > 160 chars or > 3 lines
  const linesCount = body.split('\n').length;
  const isLong = collapsible && (body.length > 160 || linesCount > 3);

  return (
    <div className={`relative z-10 w-full min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word] ${fontStyleClass}`}>
      <div
        className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] ${
          isLight ? 'text-black/85' : 'text-white/85'
        } ${isLong && !isExpanded ? 'line-clamp-4 overflow-hidden' : ''}`}
        style={fontFamily ? { fontFamily } : undefined}
      >
        <EmojiRenderer content={body} emojiSize={18} />
      </div>

      {isLong && (
        <div className="flex items-center pt-2 mt-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm select-none"
            style={{
              background: `${activeColor}18`,
              color: activeColor,
              border: `1px solid ${activeColor}40`,
            }}
          >
            <span>{isExpanded ? 'Ver menos' : 'Ver mais'}</span>
            <span className={`text-[9px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

interface PostFrameRendererProps {
  content: string;
  frameStyle?: FrameStyleId;
  watermark?: string | null;
  watermarkAnim?: WatermarkAnimId;
  postTitleFont?: string | null;
  postTitleColor?: string | null;
  isLight?: boolean;
  themeColor?: string;
  fontsList?: Array<{ id: string; label: string; family: string }>;
  collapsible?: boolean;
}

export function PostFrameRenderer({
  content,
  frameStyle = 'standard',
  watermark,
  watermarkAnim = 'none',
  postTitleFont,
  postTitleColor,
  isLight = false,
  themeColor = '#00f2ff',
  fontsList,
  collapsible = true,
}: PostFrameRendererProps) {
  if (!content) return null;

  // Split title and body with intelligent fallback for single long paragraphs or long initial lines
  let title = '';
  let body = '';
  const lines = content.split('\n');
  if (lines.length > 1) {
    if (lines[0].length > 120) {
      const firstLine = lines[0];
      const match = firstLine.match(/^([^.!?]{20,90}[.!?])\s*(.*)$/s);
      if (match) {
        title = match[1];
        body = [match[2], ...lines.slice(1)].filter(Boolean).join('\n');
      } else {
        const spaceIdx = firstLine.indexOf(' ', 70);
        if (spaceIdx !== -1 && spaceIdx < 110) {
          title = firstLine.slice(0, spaceIdx);
          body = [firstLine.slice(spaceIdx + 1), ...lines.slice(1)].join('\n');
        } else {
          title = firstLine.slice(0, 80) + '...';
          body = [firstLine.slice(80), ...lines.slice(1)].join('\n');
        }
      }
    } else {
      title = lines[0];
      body = lines.slice(1).join('\n');
    }
  } else if (content.length > 130) {
    // Intelligent split for long single-paragraph posts
    const match = content.match(/^([^.!?\n]{20,90}[.!?])\s*(.*)$/s);
    if (match) {
      title = match[1];
      body = match[2];
    } else {
      const spaceIdx = content.indexOf(' ', 70);
      if (spaceIdx !== -1 && spaceIdx < 110) {
        title = content.slice(0, spaceIdx);
        body = content.slice(spaceIdx + 1);
      } else {
        title = content.slice(0, 80) + '...';
        body = content.slice(80);
      }
    }
  } else {
    title = content;
    body = '';
  }

  // Font fallback
  const fontData = fontsList?.find(f => f.id === postTitleFont) || {
    id: 'default',
    family: "'Nunito', sans-serif",
  };

  // Color synchronization: watermark, borders and badges adapt dynamically to user's titleColor
  const activeColor = postTitleColor || themeColor || '#00f2ff';
  const displayWatermark = watermark || (FRAME_STYLES.find(s => s.id === frameStyle)?.defaultWatermark ?? '');

  // 1. STANDARD (Clean text flow)
  if (frameStyle === 'standard') {
    return (
      <div className="relative flex flex-col overflow-hidden my-1 w-full min-w-0 break-words">
        {displayWatermark && (
          <WatermarkRenderer
            text={displayWatermark}
            anim={watermarkAnim}
            activeColor={activeColor}
            className="absolute right-1 -bottom-2 text-6xl sm:text-7xl md:text-8xl font-black tracking-widest uppercase opacity-[0.06] text-right pointer-events-none select-none z-0"
          />
        )}
        <div
          className="font-black text-[22px] sm:text-[24px] xl:text-[28px] leading-[1.08] tracking-tight uppercase mb-2 relative z-10 break-words [overflow-wrap:anywhere] [word-break:break-word]"
          style={{ fontFamily: fontData.family, color: activeColor }}
        >
          <EmojiRenderer content={title} emojiSize={28} />
        </div>
        <ExpandableBody
          body={body}
          activeColor={activeColor}
          isLight={isLight}
          collapsible={collapsible}
          fontStyleClass={isLight ? 'text-black font-medium' : 'text-white/70'}
        />
      </div>
    );
  }

  // 2. GLASS STUDIO (Capsule Liquid Glass)
  if (frameStyle === 'glass') {
    return (
      <div
        className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden my-2.5 border transition-all duration-300 w-full min-w-0 break-words"
        style={{
          background: isLight
            ? `linear-gradient(135deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.45))`
            : `linear-gradient(135deg, ${activeColor}0c, rgba(255, 255, 255, 0.03))`,
          borderColor: isLight ? 'rgba(0, 0, 0, 0.08)' : `${activeColor}30`,
          borderTopColor: isLight ? 'rgba(255, 255, 255, 0.9)' : `${activeColor}55`,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          boxShadow: isLight
            ? `0 8px 30px -4px ${activeColor}15, inset 0 1px 1px rgba(255, 255, 255, 0.9)`
            : `0 12px 36px -6px ${activeColor}20, inset 0 1px 1px rgba(255, 255, 255, 0.15)`,
        }}
      >
        {/* Dynamic Watermark synchronized with activeColor */}
        {displayWatermark && (
          <WatermarkRenderer
            text={displayWatermark}
            anim={watermarkAnim}
            activeColor={activeColor}
            className="absolute right-2 -bottom-2 text-6xl sm:text-7xl md:text-8xl font-black tracking-widest uppercase opacity-[0.07] text-right pointer-events-none select-none z-0"
          />
        )}

        {/* Header Chip */}
        <div className="flex items-center gap-2 mb-2.5 relative z-10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300"
            style={{
              background: `${activeColor}18`,
              color: activeColor,
              border: `1px solid ${activeColor}35`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeColor }} />
            <span>✦ {displayWatermark || 'VIBE'} ✦</span>
          </span>
        </div>

        {/* Title */}
        <div
          className="font-extrabold text-[20px] sm:text-[22px] xl:text-[25px] leading-snug tracking-tight mb-2 transition-colors duration-300 relative z-10 break-words [overflow-wrap:anywhere] [word-break:break-word]"
          style={{ fontFamily: fontData.family, color: activeColor }}
        >
          <EmojiRenderer content={title} emojiSize={25} />
        </div>

        {/* Body */}
        <ExpandableBody
          body={body}
          activeColor={activeColor}
          isLight={isLight}
          collapsible={collapsible}
        />
      </div>
    );
  }

  // 3. EDITORIAL & REVISTA (Magazine Press)
  if (frameStyle === 'editorial') {
    return (
      <div
        className="relative px-4 sm:px-6 py-4 my-2.5 rounded-xl overflow-hidden transition-all duration-300 w-full min-w-0 break-words"
        style={{
          background: isLight
            ? `linear-gradient(to bottom, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.005))`
            : `linear-gradient(to bottom, ${activeColor}08, rgba(255, 255, 255, 0.01))`,
          borderTop: `2px solid ${activeColor}80`,
          borderBottom: `2px solid ${activeColor}80`,
        }}
      >
        {/* Subtle decorative inner rule */}
        <div
          className="absolute inset-x-4 top-1.5 h-[1px] opacity-40 transition-colors duration-300"
          style={{ background: activeColor }}
        />
        <div
          className="absolute inset-x-4 bottom-1.5 h-[1px] opacity-40 transition-colors duration-300"
          style={{ background: activeColor }}
        />

        {/* Watermark in elegant serif background */}
        {displayWatermark && (
          <WatermarkRenderer
            text={displayWatermark}
            anim={watermarkAnim}
            activeColor={activeColor}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-5xl sm:text-7xl md:text-8xl font-black italic tracking-[0.25em] uppercase font-serif opacity-[0.06] text-right pointer-events-none select-none z-0"
          />
        )}

        {/* Magazine Header */}
        <div
          className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] mb-2 transition-colors duration-300 relative z-10"
          style={{ color: activeColor }}
        >
          <span>EDITION · {displayWatermark || 'MAGAZINE'}</span>
          <span className="opacity-60 text-[9px]">ALPHA ENTERTAINMENT</span>
        </div>

        {/* Title enclosed in stylized quotation marks */}
        <div
          className="font-serif font-black text-[21px] sm:text-[23px] xl:text-[26px] leading-tight tracking-tight mb-2 transition-colors duration-300 relative z-10 break-words [overflow-wrap:anywhere] [word-break:break-word]"
          style={{ fontFamily: fontData.family, color: activeColor }}
        >
          “ <EmojiRenderer content={title} emojiSize={26} /> ”
        </div>

        {/* Body */}
        <ExpandableBody
          body={body}
          activeColor={activeColor}
          isLight={isLight}
          collapsible={collapsible}
          fontStyleClass="font-serif italic"
        />
      </div>
    );
  }

  // 4. CYBER & GAMES (Holo Grid)
  if (frameStyle === 'cyber') {
    return (
      <div
        className="relative p-4 sm:p-5 my-2.5 rounded-xl overflow-hidden border transition-all duration-300 w-full min-w-0 break-words"
        style={{
          borderColor: `${activeColor}40`,
          background: isLight
            ? `linear-gradient(135deg, ${activeColor}10, rgba(255, 255, 255, 0.7))`
            : `linear-gradient(135deg, ${activeColor}12, rgba(0, 0, 0, 0.3))`,
          boxShadow: `0 0 24px -6px ${activeColor}25`,
        }}
      >
        {/* Futuristic Corner Brackets */}
        <span className="absolute top-1 left-1.5 text-xs font-mono font-black" style={{ color: activeColor }}>┌</span>
        <span className="absolute top-1 right-1.5 text-xs font-mono font-black" style={{ color: activeColor }}>┐</span>
        <span className="absolute bottom-1 left-1.5 text-xs font-mono font-black" style={{ color: activeColor }}>└</span>
        <span className="absolute bottom-1 right-1.5 text-xs font-mono font-black" style={{ color: activeColor }}>┘</span>

        {/* Watermark */}
        {displayWatermark && (
          <WatermarkRenderer
            text={displayWatermark}
            anim={watermarkAnim}
            activeColor={activeColor}
            className="absolute right-2 -bottom-2 text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-widest uppercase opacity-[0.08] text-right pointer-events-none select-none z-0"
          />
        )}

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-2 font-mono text-[10px] font-black uppercase tracking-wider relative z-10" style={{ color: activeColor }}>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black" style={{ background: `${activeColor}25` }}>
            {'// SYS'}
          </span>
          <span>{displayWatermark || 'GAMING'} · OVERDRIVE</span>
        </div>

        {/* Title */}
        <div
          className="font-black text-[20px] sm:text-[22px] xl:text-[25px] leading-tight tracking-tight uppercase mb-2 transition-colors duration-300 font-mono relative z-10 break-words [overflow-wrap:anywhere] [word-break:break-word]"
          style={{ fontFamily: fontData.family, color: activeColor }}
        >
          [ <EmojiRenderer content={title} emojiSize={24} /> ]
        </div>

        {/* Body */}
        <ExpandableBody
          body={body}
          activeColor={activeColor}
          isLight={isLight}
          collapsible={collapsible}
        />
      </div>
    );
  }

  // 5. CINEMA 21:9 (Letterbox Cinephile)
  if (frameStyle === 'cinema') {
    return (
      <div
        className="relative p-4 sm:p-6 my-2.5 rounded-2xl overflow-hidden transition-all duration-300 border w-full min-w-0 break-words"
        style={{
          borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
          background: isLight
            ? `radial-gradient(circle at 50% 30%, ${activeColor}15, rgba(255, 255, 255, 0.75))`
            : `radial-gradient(circle at 50% 30%, ${activeColor}18, rgba(10, 10, 15, 0.8))`,
          boxShadow: `0 10px 30px -10px ${activeColor}30`,
        }}
      >
        {/* Letterbox Matte Accent Bars */}
        <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, transparent, ${activeColor}80, transparent)` }} />
        <div className="absolute bottom-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, transparent, ${activeColor}80, transparent)` }} />

        {/* Watermark */}
        {displayWatermark && (
          <WatermarkRenderer
            text={displayWatermark}
            anim={watermarkAnim}
            activeColor={activeColor}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-6xl sm:text-7xl md:text-8xl font-black tracking-[0.3em] uppercase opacity-[0.07] text-right pointer-events-none select-none z-0"
          />
        )}

        {/* Cinema Metadata Badge */}
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-[0.25em] relative z-10" style={{ color: activeColor }}>
          <span className="w-2 h-2 rounded-full" style={{ background: activeColor }} />
          <span>▸ 24FPS · {displayWatermark || 'SCENE'}</span>
        </div>

        {/* Title */}
        <div
          className="font-black text-[22px] sm:text-[24px] xl:text-[27px] leading-tight tracking-wider uppercase mb-2 transition-colors duration-300 relative z-10 break-words [overflow-wrap:anywhere] [word-break:break-word]"
          style={{ fontFamily: fontData.family, color: activeColor }}
        >
          <EmojiRenderer content={title} emojiSize={26} />
        </div>

        {/* Body */}
        <ExpandableBody
          body={body}
          activeColor={activeColor}
          isLight={isLight}
          collapsible={collapsible}
          fontStyleClass="tracking-wide"
        />
      </div>
    );
  }

  // 6. RETRO POP (Synthwave & Pop Vibes)
  if (frameStyle === 'retro') {
    return (
      <div
        className="relative p-4 sm:p-5 my-2.5 rounded-2xl overflow-hidden border transition-all duration-300 w-full min-w-0 break-words"
        style={{
          borderColor: `${activeColor}45`,
          background: isLight
            ? `linear-gradient(135deg, ${activeColor}15, rgba(236, 72, 153, 0.08))`
            : `linear-gradient(135deg, ${activeColor}15, rgba(236, 72, 153, 0.12), rgba(0,0,0,0.4))`,
          boxShadow: `0 8px 30px -8px ${activeColor}30`,
        }}
      >
        {/* Retro Watermark */}
        {displayWatermark && (
          <WatermarkRenderer
            text={displayWatermark}
            anim={watermarkAnim}
            activeColor={activeColor}
            className="absolute right-2 -bottom-2 text-6xl sm:text-7xl md:text-8xl font-black italic tracking-widest uppercase opacity-[0.08] text-right pointer-events-none select-none z-0"
          />
        )}

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-[0.25em] relative z-10" style={{ color: activeColor }}>
          <span>◈ CASSETTE · {displayWatermark || 'POP'} ◈</span>
        </div>

        {/* Title */}
        <div
          className="font-black text-[21px] sm:text-[23px] xl:text-[26px] leading-snug tracking-tight mb-2 transition-colors duration-300 relative z-10 break-words [overflow-wrap:anywhere] [word-break:break-word]"
          style={{ fontFamily: fontData.family, color: activeColor }}
        >
          ★ <EmojiRenderer content={title} emojiSize={26} /> ★
        </div>

        {/* Body */}
        <ExpandableBody
          body={body}
          activeColor={activeColor}
          isLight={isLight}
          collapsible={collapsible}
        />
      </div>
    );
  }

  // 8. COSMOS & UNIVERSO (Galaxy / Deep Space)
  if (frameStyle === 'cosmos') {
    // Simulate a starfield: a handful of tiny star positions baked as a CSS radial-gradient mosaic
    const stars = [
      { top: '8%',  left: '12%', size: 1.5, opacity: 0.7 },
      { top: '15%', left: '78%', size: 1,   opacity: 0.5 },
      { top: '22%', left: '45%', size: 2,   opacity: 0.6 },
      { top: '35%', left: '92%', size: 1,   opacity: 0.4 },
      { top: '48%', left: '6%',  size: 1.5, opacity: 0.6 },
      { top: '55%', left: '60%', size: 1,   opacity: 0.5 },
      { top: '62%', left: '30%', size: 2.5, opacity: 0.8 },
      { top: '75%', left: '85%', size: 1,   opacity: 0.45 },
      { top: '85%', left: '20%', size: 1.5, opacity: 0.55 },
      { top: '92%', left: '55%', size: 1,   opacity: 0.4 },
      { top: '18%', left: '25%', size: 1,   opacity: 0.35 },
      { top: '70%', left: '70%', size: 1.5, opacity: 0.6 },
    ];

    return (
      <div
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden my-2.5 border transition-all duration-500 w-full min-w-0 break-words"
        style={{
          border: `1px solid ${activeColor}30`,
          borderTop: `1.5px solid ${activeColor}55`,
          background: isLight
            ? `radial-gradient(ellipse at 30% 20%, ${activeColor}18 0%, rgba(255,255,255,0.85) 55%), radial-gradient(ellipse at 80% 80%, ${activeColor}10 0%, transparent 60%)`
            : `radial-gradient(ellipse at 30% 20%, ${activeColor}22 0%, rgba(5,5,18,0.95) 55%), radial-gradient(ellipse at 80% 80%, ${activeColor}14 0%, rgba(2,2,12,0.98) 60%)`,
          boxShadow: `0 0 0 1px ${activeColor}12, 0 8px 40px -8px ${activeColor}35, inset 0 0 60px ${activeColor}06`,
        }}
      >
        {/* ── Aurora strip at top ──────────────────────────────── */}
        <div
          className="absolute top-0 inset-x-0 h-[3px] pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${activeColor}90, #ec489980, ${activeColor}90, transparent)`,
            filter: `blur(1px)`,
          }}
        />
        {/* Aurora outer glow */}
        <div
          className="absolute top-0 inset-x-0 h-8 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, ${activeColor}18, transparent)`,
          }}
        />

        {/* ── Simulated star field ─────────────────────────────── */}
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none select-none"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              height: `${s.size}px`,
              background: i % 3 === 0 ? activeColor : i % 3 === 1 ? '#ffffff' : '#ec4899',
              opacity: s.opacity,
              boxShadow: `0 0 ${s.size * 3}px ${s.size}px ${i % 3 === 0 ? activeColor : '#ffffff'}55`,
            }}
          />
        ))}

        {/* ── Constellation connector SVG (top-right decorative) ── */}
        <svg
          className="absolute top-3 right-3 pointer-events-none select-none"
          width="72" height="48"
          viewBox="0 0 72 48"
          style={{ opacity: 0.35 }}
        >
          {/* Nodes */}
          <circle cx="8"  cy="8"  r="2"   fill={activeColor} />
          <circle cx="36" cy="4"  r="1.5" fill="#ffffff" />
          <circle cx="64" cy="14" r="2"   fill={activeColor} />
          <circle cx="52" cy="32" r="1.5" fill="#ec4899" />
          <circle cx="20" cy="40" r="2"   fill="#ffffff" />
          <circle cx="4"  cy="32" r="1.5" fill={activeColor} />
          {/* Connectors */}
          <line x1="8"  y1="8"  x2="36" y2="4"  stroke={activeColor} strokeWidth="0.6" strokeDasharray="2 3" />
          <line x1="36" y1="4"  x2="64" y2="14" stroke="#ffffff"    strokeWidth="0.6" strokeDasharray="2 3" />
          <line x1="64" y1="14" x2="52" y2="32" stroke={activeColor} strokeWidth="0.6" strokeDasharray="2 3" />
          <line x1="52" y1="32" x2="20" y2="40" stroke="#ec4899"    strokeWidth="0.6" strokeDasharray="2 3" />
          <line x1="20" y1="40" x2="4"  y2="32" stroke="#ffffff"    strokeWidth="0.6" strokeDasharray="2 3" />
          <line x1="4"  y1="32" x2="8"  y2="8"  stroke={activeColor} strokeWidth="0.6" strokeDasharray="2 3" />
        </svg>

        {/* ── Nebula watermark ─────────────────────────────────── */}
        {displayWatermark && (
          <WatermarkRenderer
            text={displayWatermark}
            anim={watermarkAnim}
            activeColor={activeColor}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-black uppercase tracking-[0.35em] whitespace-nowrap text-5xl sm:text-7xl md:text-8xl opacity-[0.06] text-right pointer-events-none select-none z-0"
            style={{ textShadow: `0 0 40px ${activeColor}` }}
            emojiSize={72}
          />
        )}

        {/* ── Inner content ─────────────────────────────────────── */}
        <div className="relative z-10 p-4 sm:p-5 w-full min-w-0">
          {/* Header: coordinate badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-colors duration-300"
              style={{
                color: activeColor,
                borderColor: `${activeColor}40`,
                background: isLight ? `${activeColor}12` : `${activeColor}18`,
              }}
            >
              {/* Star glyph */}
              <svg width="9" height="9" viewBox="0 0 24 24" fill={activeColor}>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              <span>✦ {displayWatermark || 'COSMOS'} ✦</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill={activeColor}>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </span>
            <div className="flex-1 h-[1px] opacity-25" style={{ background: `linear-gradient(to right, ${activeColor}, transparent)` }} />
          </div>

          {/* Title — stellar glow */}
          <div
            className="font-black text-[21px] sm:text-[23px] xl:text-[26px] leading-snug tracking-tight mb-2.5 transition-colors duration-300 break-words [overflow-wrap:anywhere] [word-break:break-word]"
            style={{
              fontFamily: fontData.family,
              color: activeColor,
              textShadow: `0 0 18px ${activeColor}80, 0 0 40px ${activeColor}30`,
            }}
          >
            <EmojiRenderer content={title} emojiSize={26} />
          </div>

          {/* Body */}
          <ExpandableBody
            body={body}
            activeColor={activeColor}
            isLight={isLight}
            collapsible={collapsible}
            fontStyleClass={isLight ? 'text-black/85' : 'text-white/80'}
          />

          {/* Footer coordinate bar */}
          <div
            className="flex items-center gap-2 mt-3 pt-2.5 border-t"
            style={{ borderColor: `${activeColor}20` }}
          >
            <div className="flex items-center gap-[3px]">
              {[0.3, 0.6, 1, 0.7, 0.4].map((h, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full transition-colors duration-300"
                  style={{ height: `${h * 10}px`, background: activeColor, opacity: 0.6 }}
                />
              ))}
            </div>
            <span
              className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 font-mono"
              style={{ color: activeColor }}
            >
              α·{(displayWatermark || 'COSMOS').slice(0, 6).toUpperCase()} · ∞
            </span>
          </div>
        </div>

        {/* ── Aurora strip at bottom ───────────────────────────── */}
        <div
          className="absolute bottom-0 inset-x-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${activeColor}60, #ec489960, ${activeColor}60, transparent)`,
          }}
        />
      </div>
    );
  }

  // 7. MANGA & ANIME (Classic Shonen Quote)
  return (
    <div
      className="relative pl-4 pr-3 py-3 border-l-[3.5px] rounded-r-2xl overflow-hidden my-2 border border-white/5 transition-all duration-300 w-full min-w-0 break-words"
      style={{
        borderLeftColor: activeColor,
        background: `linear-gradient(to right, ${activeColor}14, transparent)`,
      }}
    >
      {/* Giant Kanji / Watermark with Style Tint */}
      {displayWatermark && (
        <WatermarkRenderer
          text={displayWatermark}
          anim={watermarkAnim}
          activeColor={activeColor}
          className="absolute right-1 -top-3 text-7xl md:text-8xl font-black font-['Noto_Sans_JP',sans-serif] tracking-widest opacity-[0.09] text-right pointer-events-none select-none z-0"
        />
      )}
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 opacity-90 transition-colors duration-300 relative z-10" style={{ color: activeColor }}>
        <span>❝ MANGA QUOTE · {displayWatermark || '覚醒'} ❞</span>
      </div>
      <div
        className="font-extrabold text-[20px] xl:text-[24px] leading-snug tracking-tight mb-1.5 transition-colors duration-300 relative z-10 break-words [overflow-wrap:anywhere] [word-break:break-word]"
        style={{ fontFamily: fontData.family, color: activeColor }}
      >
        「 <EmojiRenderer content={title} emojiSize={24} /> 」
      </div>
      <ExpandableBody
        body={body}
        activeColor={activeColor}
        isLight={isLight}
        collapsible={collapsible}
        fontStyleClass="italic"
      />
    </div>
  );
}
