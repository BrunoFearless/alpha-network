'use client';
import React, { useEffect, useRef, useCallback } from 'react';

export type ElementalType = 'fire' | 'lightning' | 'sakura' | 'slash' | 'cosmic' | 'heart';

export interface ElementalReaction {
  id: ElementalType;
  label: string;
  emoji: string;
  color: string;
  kanji: string;
}

export const ELEMENTAL_REACTIONS: ElementalReaction[] = [
  { id: 'heart', label: 'Coração', emoji: '❤️', color: '#ec4899', kanji: '愛' },
  { id: 'fire', label: 'Katon (Fogo)', emoji: '🔥', color: '#f97316', kanji: '火' },
  { id: 'lightning', label: 'Chidori (Raio)', emoji: '⚡', color: '#06b6d4', kanji: '雷' },
  { id: 'sakura', label: 'Sakura (Pétalas)', emoji: '🌸', color: '#f472b6', kanji: '桜' },
  { id: 'slash', label: 'Slash (Corte)', emoji: '🗡️', color: '#a855f7', kanji: '斬' },
  { id: 'cosmic', label: 'Cósmico', emoji: '✨', color: '#eab308', kanji: '星' },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
  type: ElementalType;
  scale: number;
}

interface MangaBurstVFXProps {
  burstEvent: { x: number; y: number; type: ElementalType; timestamp: number } | null;
  className?: string;
}

export const MangaBurstCanvas: React.FC<MangaBurstVFXProps> = ({ burstEvent, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const spawnParticles = useCallback((originX: number, originY: number, type: ElementalType) => {
    const particles: Particle[] = [];
    const count = type === 'slash' ? 18 : 28;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 6 + 2.5;

      let color = '#fff';
      if (type === 'fire') {
        const fireColors = ['#f97316', '#ef4444', '#fbbf24', '#ffedd5'];
        color = fireColors[Math.floor(Math.random() * fireColors.length)];
      } else if (type === 'lightning') {
        const lightColors = ['#06b6d4', '#38bdf8', '#e0f2fe', '#fef08a'];
        color = lightColors[Math.floor(Math.random() * lightColors.length)];
      } else if (type === 'sakura') {
        const sakuraColors = ['#f472b6', '#fbcfe8', '#fda4af', '#fff'];
        color = sakuraColors[Math.floor(Math.random() * sakuraColors.length)];
      } else if (type === 'slash') {
        const slashColors = ['#c084fc', '#a855f7', '#e9d5ff', '#ffffff'];
        color = slashColors[Math.floor(Math.random() * slashColors.length)];
      } else if (type === 'cosmic') {
        const starColors = ['#facc15', '#fef08a', '#c084fc', '#67e8f9'];
        color = starColors[Math.floor(Math.random() * starColors.length)];
      } else {
        const heartColors = ['#ec4899', '#f43f5e', '#fda4af', '#ffffff'];
        color = heartColors[Math.floor(Math.random() * heartColors.length)];
      }

      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * (type === 'slash' ? (i % 2 === 0 ? 2 : -2) : 1),
        vy: Math.sin(angle) * speed * (type === 'slash' ? (i % 2 === 0 ? -1.5 : 1.5) : 1) - (type === 'fire' ? 2 : 0),
        size: Math.random() * 6 + (type === 'sakura' ? 6 : 3),
        color,
        alpha: 1,
        decay: Math.random() * 0.025 + 0.02,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type,
        scale: 1,
      });
    }

    particlesRef.current.push(...particles);
  }, []);

  useEffect(() => {
    if (!burstEvent) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = burstEvent.x - rect.left;
    const y = burstEvent.y - rect.top;
    spawnParticles(x, y, burstEvent.type);
  }, [burstEvent, spawnParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.type === 'fire') {
          p.vy -= 0.12; // Flutuação térmica
          p.size *= 0.98;
        } else if (p.type === 'sakura') {
          p.vy += 0.06; // Gravidade suave de pétala
          p.vx += Math.sin(p.rotation) * 0.2;
        }

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'sakura') {
          // Desenha pétala de sakura
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'cosmic' || p.type === 'slash') {
          // Estrela de 4 pontas
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5);
          ctx.lineTo(p.size * 0.35, -p.size * 0.35);
          ctx.lineTo(p.size * 1.5, 0);
          ctx.lineTo(p.size * 0.35, p.size * 0.35);
          ctx.lineTo(0, p.size * 1.5);
          ctx.lineTo(-p.size * 0.35, p.size * 0.35);
          ctx.lineTo(-p.size * 1.5, 0);
          ctx.lineTo(-p.size * 0.35, -p.size * 0.35);
          ctx.closePath();
          ctx.fill();
        } else {
          // Partícula de faísca com rastro suave
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      }
    };
    handleResize();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current?.parentElement) {
      observer = new ResizeObserver(handleResize);
      observer.observe(canvasRef.current.parentElement);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-30 ${className}`}
    />
  );
};

interface ElementalPickerProps {
  isOpen: boolean;
  onSelect: (type: ElementalType) => void;
  onClose: () => void;
  themeColor: string;
}

export const ElementalPicker: React.FC<ElementalPickerProps> = ({ isOpen, onSelect, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-full mb-2 left-0 z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-[#111]/90 backdrop-blur-2xl border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-3 fade-in duration-200 select-none"
      onPointerDown={e => e.stopPropagation()}
    >
      {ELEMENTAL_REACTIONS.map((r) => (
        <button
          key={r.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(r.id);
            onClose();
          }}
          className="relative group w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-125 hover:-translate-y-1 active:scale-95 cursor-pointer bg-transparent border-none"
          title={r.label}
        >
          <span className="text-lg filter drop-shadow-md group-hover:scale-110 transition-transform">
            {r.emoji}
          </span>
          <span
            className="absolute -top-6 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white bg-black/80 backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10"
            style={{ color: r.color }}
          >
            {r.kanji} {r.label}
          </span>
        </button>
      ))}
    </div>
  );
};
