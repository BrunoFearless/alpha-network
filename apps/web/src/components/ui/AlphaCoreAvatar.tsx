// AlphaCoreAvatar.tsx
// Avatar SVG animado da Alpha Core — usa o símbolo α (Alpha) com anéis orbitais.
// Aceita props de tamanho e estado (thinking, speaking, idle).

'use client';

import React from 'react';

export type AlphaCoreAvatarState = 'idle' | 'thinking' | 'speaking';

interface AlphaCoreAvatarProps {
  size?: number;
  state?: AlphaCoreAvatarState;
  themeColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function AlphaCoreAvatar({
  size = 48,
  state = 'idle',
  themeColor = '#a78bfa',
  className = '',
  style = {},
}: AlphaCoreAvatarProps) {
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';

  // Derive slightly lighter/darker variants from themeColor for rings
  const ringOuter = themeColor + '40';  // 25% opacity
  const ringMid   = themeColor + '70';  // 44% opacity
  const ringInner = themeColor + 'aa';  // 67% opacity
  const coreFill  = themeColor + '18';  // very light fill

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Alpha Core"
      role="img"
    >
      <defs>
        {/* Outer ring gradient */}
        <linearGradient id="ac-grad-outer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={themeColor} stopOpacity="0.8"/>
          <stop offset="100%" stopColor={themeColor} stopOpacity="0.2"/>
        </linearGradient>

        {/* Inner glow */}
        <radialGradient id="ac-grad-inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={themeColor} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={themeColor} stopOpacity="0"/>
        </radialGradient>

        {/* Core circle gradient */}
        <radialGradient id="ac-grad-core" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={themeColor} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={themeColor} stopOpacity="0.08"/>
        </radialGradient>

        {/* Clip to circle */}
        <clipPath id="ac-clip">
          <circle cx="50" cy="50" r="46"/>
        </clipPath>

        <style>{`
          @keyframes ac-spin-slow {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes ac-spin-reverse {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
          @keyframes ac-pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50%       { opacity: 1;   transform: scale(1.04); }
          }
          @keyframes ac-think {
            0%, 100% { opacity: 0.3; }
            33%       { opacity: 1;   }
            66%       { opacity: 0.6; }
          }
          @keyframes ac-speak {
            0%, 100% { transform: scaleY(1); }
            50%       { transform: scaleY(1.15); }
          }
          @keyframes ac-orbit-dot {
            from { transform: rotate(0deg) translateX(33px) rotate(0deg); }
            to   { transform: rotate(360deg) translateX(33px) rotate(-360deg); }
          }
          @keyframes ac-orbit-dot-2 {
            from { transform: rotate(120deg) translateX(33px) rotate(-120deg); }
            to   { transform: rotate(480deg) translateX(33px) rotate(-480deg); }
          }
          @keyframes ac-orbit-dot-3 {
            from { transform: rotate(240deg) translateX(33px) rotate(-240deg); }
            to   { transform: rotate(600deg) translateX(33px) rotate(-600deg); }
          }

          .ac-ring-outer {
            transform-origin: 50px 50px;
            animation: ac-spin-slow ${isThinking ? '1.2s' : '8s'} linear infinite;
          }
          .ac-ring-mid {
            transform-origin: 50px 50px;
            animation: ac-spin-reverse ${isThinking ? '0.9s' : '12s'} linear infinite;
          }
          .ac-core-glow {
            transform-origin: 50px 50px;
            animation: ac-pulse ${isSpeaking ? '0.4s' : '3s'} ease-in-out infinite;
          }
          .ac-alpha-symbol {
            transform-origin: 50px 50px;
            animation: ${isThinking ? 'ac-think 1.2s ease-in-out infinite' : isSpeaking ? 'ac-speak 0.35s ease-in-out infinite' : 'none'};
          }
          .ac-dot-1 {
            transform-origin: 50px 50px;
            animation: ac-orbit-dot ${isThinking ? '1.2s' : '6s'} linear infinite;
          }
          .ac-dot-2 {
            transform-origin: 50px 50px;
            animation: ac-orbit-dot-2 ${isThinking ? '1.2s' : '6s'} linear infinite;
          }
          .ac-dot-3 {
            transform-origin: 50px 50px;
            animation: ac-orbit-dot-3 ${isThinking ? '1.2s' : '6s'} linear infinite;
          }
        `}</style>
      </defs>

      {/* Background circle */}
      <circle cx="50" cy="50" r="46" fill={coreFill}/>
      <circle cx="50" cy="50" r="46" stroke={themeColor} strokeWidth="1" strokeOpacity="0.3"/>

      {/* Inner glow */}
      <circle cx="50" cy="50" r="38" fill="url(#ac-grad-inner)"/>

      {/* Core circle with gradient */}
      <circle cx="50" cy="50" r="28" fill="url(#ac-grad-core)" className="ac-core-glow"/>

      {/* Outer ring — dashed, slow spin */}
      <circle
        className="ac-ring-outer"
        cx="50" cy="50" r="42"
        stroke={ringOuter}
        strokeWidth="1"
        strokeDasharray="4 6"
        fill="none"
      />

      {/* Mid ring — dashed, reverse spin */}
      <circle
        className="ac-ring-mid"
        cx="50" cy="50" r="35"
        stroke={ringMid}
        strokeWidth="0.8"
        strokeDasharray="2 8"
        fill="none"
      />

      {/* Orbiting dots */}
      {!isThinking ? (
        <>
          <circle className="ac-dot-1" cx="50" cy="17" r="2.5" fill={themeColor} opacity="0.8"/>
          <circle className="ac-dot-2" cx="50" cy="17" r="2"   fill={themeColor} opacity="0.5"/>
          <circle className="ac-dot-3" cx="50" cy="17" r="1.5" fill={themeColor} opacity="0.35"/>
        </>
      ) : (
        /* Thinking state: 3 dots pulsing in sequence inside core */
        <>
          <circle cx="38" cy="54" r="3" fill={themeColor} style={{ animation: 'ac-think 1.2s ease-in-out infinite 0s' }}/>
          <circle cx="50" cy="54" r="3" fill={themeColor} style={{ animation: 'ac-think 1.2s ease-in-out infinite 0.2s' }}/>
          <circle cx="62" cy="54" r="3" fill={themeColor} style={{ animation: 'ac-think 1.2s ease-in-out infinite 0.4s' }}/>
        </>
      )}

      {/* Alpha symbol — α */}
      <text
        className="ac-alpha-symbol"
        x="50"
        y="56"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="26"
        fontWeight="300"
        fontFamily="'Georgia', 'Times New Roman', serif"
        fill={themeColor}
        opacity="0.95"
        letterSpacing="-1"
      >
        α
      </text>

      {/* Inner ring — very subtle */}
      <circle cx="50" cy="50" r="22" stroke={ringInner} strokeWidth="0.5" fill="none" opacity="0.5"/>
    </svg>
  );
}

export default AlphaCoreAvatar;
