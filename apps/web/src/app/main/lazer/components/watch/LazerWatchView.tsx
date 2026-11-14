'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWatchStore, Video } from '@/store/watch.store';
import { useAuthStore } from '@/store/auth.store';
import { AlphaVideoPlayer } from '@/app/main/lazer/components/watch/AlphaVideoPlayer';
import { resolveUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── CINEMA CATEGORIES ───────────────────────────────────────────────────────
const CATEGORIES = [
  'Todos',
  'Tendências 🔥',
  'Alpha Shorts ⚡',
  'Cinema & Séries 🎬',
  'Música 🎵',
  'Gaming 🎮',
  'Tecnologia 💻',
  'Arte 🎨',
  'Educação 📚',
];

interface LazerWatchViewProps {
  onClose?: () => void;
  onSelectView?: (view: any) => void;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  userAvatar?: string;
  userName?: string;
}

// ── CURATED DEMO SHOWCASE SPOTLIGHTS ─────────────────────────────────────────
const DEMO_SPOTLIGHTS: Video[] = [
  {
    id: 'spotlight-1',
    authorId: 'director-neo',
    title: 'Cyberpunk 2099: Neo-Tokyo Resonance',
    description:
      'Uma odisseia visual e sonora pelas vielas hiper-iluminadas de Neo-Tokyo. Gravado inteiramente em sensores cinematográficos 8K com design de áudio imersivo e trilha sonora synthwave original.',
    videoUrl: 'https://cdn.pixabay.com/video/2020/05/25/40149-425425642_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1600&q=80',
    format: 'horizontal',
    category: 'Cinema & Séries',
    duration: 258,
    views: 1420000,
    liked: true,
    likesCount: 89400,
    commentsCount: 1240,
    tags: ['4K HDR', 'Cyberpunk', 'Originals', 'Sci-Fi'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    author: {
      id: 'director-neo',
      profile: {
        username: 'alex_rivers',
        displayName: 'Alex Rivers',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      },
    },
  },
  {
    id: 'spotlight-2',
    authorId: 'astro-maya',
    title: 'Astro Voyage: O Segredo das Supernovas',
    description:
      'Explore os confins do universo observável com simulações astrofísicas de última geração, capturas de telescópios espaciais e a narrativa fascinante sobre o colapso e renascimento das estrelas.',
    videoUrl: 'https://cdn.pixabay.com/video/2021/04/12/70868-537446467_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    format: 'horizontal',
    category: 'Tecnologia',
    duration: 525,
    views: 820000,
    liked: false,
    likesCount: 65100,
    commentsCount: 780,
    tags: ['Espaço', 'Ciência', '4K', 'Documentário'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    author: {
      id: 'astro-maya',
      profile: {
        username: 'dr_maya',
        displayName: 'Dra. Maya Santos',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
      },
    },
  },
  {
    id: 'spotlight-3',
    authorId: 'luna-chill',
    title: 'Lo-Fi Beats & Rainy Nights in Shibuya',
    description:
      'Sessão sensorial lo-fi de chuva contínua, iluminação de lanternas e sintetizadores analógicos. Perfeito para programar, estudar ou relaxar sob o luar digital da rede Alpha.',
    videoUrl: 'https://cdn.pixabay.com/video/2019/04/23/23011-332470704_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    format: 'horizontal',
    category: 'Música',
    duration: 750,
    views: 2150000,
    liked: true,
    likesCount: 142000,
    commentsCount: 3100,
    tags: ['Lo-Fi', 'Audio 3D', 'Shibuya', 'Relax'],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    author: {
      id: 'luna-chill',
      profile: {
        username: 'luna_beats',
        displayName: 'Luna Chill',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      },
    },
  },
];

// ── CURATED DEMO SHORTS (9:16 VERTICAL REELS) ────────────────────────────────
const DEMO_SHORTS: Video[] = [
  {
    id: 'short-1',
    authorId: 'dev-master',
    title: 'Behind The Code: Shaders em WebGL ⚡',
    videoUrl: 'https://cdn.pixabay.com/video/2021/08/04/83875-585802273_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    format: 'vertical',
    category: 'Tecnologia',
    duration: 45,
    views: 340000,
    liked: true,
    likesCount: 28400,
    commentsCount: 420,
    tags: ['Code', 'Shorts', 'WebGL'],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    author: {
      id: 'dev-master',
      profile: {
        username: 'dev_master',
        displayName: 'Dev Master',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      },
    },
  },
  {
    id: 'short-2',
    authorId: 'speed-freak',
    title: 'Drift na Neve com Skyline R34 🏎️',
    videoUrl: 'https://cdn.pixabay.com/video/2020/09/21/50849-462370395_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    format: 'vertical',
    category: 'Gaming',
    duration: 32,
    views: 890000,
    liked: false,
    likesCount: 74200,
    commentsCount: 950,
    tags: ['Drift', 'JDM', 'Cars'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    author: {
      id: 'speed-freak',
      profile: {
        username: 'speed_club',
        displayName: 'Speed Club',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      },
    },
  },
  {
    id: 'short-3',
    authorId: 'beat-craft',
    title: 'Spatial Audio Masterclass no VisionOS 🎧',
    videoUrl: 'https://cdn.pixabay.com/video/2022/10/18/135515-762283296_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    format: 'vertical',
    category: 'Música',
    duration: 58,
    views: 195000,
    liked: true,
    likesCount: 16800,
    commentsCount: 230,
    tags: ['Audio', 'VisionOS', 'Music'],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    author: {
      id: 'beat-craft',
      profile: {
        username: 'beatcraft',
        displayName: 'BeatCraft',
        avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      },
    },
  },
  {
    id: 'short-4',
    authorId: 'studio-sakuga',
    title: 'Sakuga Animation: Quadros Chaves 🎨',
    videoUrl: 'https://cdn.pixabay.com/video/2021/02/25/66184-517865225_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    format: 'vertical',
    category: 'Arte',
    duration: 42,
    views: 510000,
    liked: false,
    likesCount: 43900,
    commentsCount: 610,
    tags: ['Sakuga', 'Anime', 'Art'],
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    author: {
      id: 'studio-sakuga',
      profile: {
        username: 'sakuga_lab',
        displayName: 'Sakuga Lab',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      },
    },
  },
];

// ── CURATED DEMO CINEMA CARDS ────────────────────────────────────────────────
const DEMO_CINEMA_VIDEOS: Video[] = [
  {
    id: 'cinema-1',
    authorId: 'tech-future',
    title: 'A Revolução dos Modelos de IA Autônomos e Agentes Cognitivos',
    description: 'Análise aprofundada da nova geração de arquiteturas neurais e sua integração em ecossistemas espaciais.',
    videoUrl: 'https://cdn.pixabay.com/video/2020/05/25/40149-425425642_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    format: 'horizontal',
    category: 'Tecnologia',
    duration: 612,
    views: 450000,
    liked: true,
    likesCount: 38200,
    commentsCount: 540,
    tags: ['IA', 'Tecnologia', 'Futuro'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    author: {
      id: 'tech-future',
      profile: { username: 'techfuture', displayName: 'Tech Future', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80' },
    },
  },
  {
    id: 'cinema-2',
    authorId: 'studio-zero',
    title: 'Construindo um Setup Minimalista com Vidro Líquido',
    description: 'Design de interiores e workstations de desenvolvedores projetadas para imersão total.',
    videoUrl: 'https://cdn.pixabay.com/video/2021/04/12/70868-537446467_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    format: 'horizontal',
    category: 'Arte',
    duration: 480,
    views: 310000,
    liked: false,
    likesCount: 22100,
    commentsCount: 310,
    tags: ['Setup', 'Design', 'Minimal'],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    author: {
      id: 'studio-zero',
      profile: { username: 'studiozero', displayName: 'Studio Zero', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
    },
  },
  {
    id: 'cinema-3',
    authorId: 'retrowave-lab',
    title: 'Neon Sunset: Synthwave Live Session & Guitar Riffs',
    description: 'Uma jam session ao vivo gravada durante o entardecer com sintetizadores vintage e guitarras solistas.',
    videoUrl: 'https://cdn.pixabay.com/video/2019/04/23/23011-332470704_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    format: 'horizontal',
    category: 'Música',
    duration: 1840,
    views: 1240000,
    liked: true,
    likesCount: 112000,
    commentsCount: 1890,
    tags: ['Synthwave', 'Live', 'Music'],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    author: {
      id: 'retrowave-lab',
      profile: { username: 'retrowavelab', displayName: 'RetroWave Lab', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
    },
  },
  {
    id: 'cinema-4',
    authorId: 'pixel-forge',
    title: 'Pixel Art & Animações Clássicas de 16-Bits: Do Zero ao Jogo',
    description: 'Como desenhar sprites fluidos, paletas de cores harmônicas e ciclos de caminhada.',
    videoUrl: 'https://cdn.pixabay.com/video/2021/08/04/83875-585802273_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    format: 'horizontal',
    category: 'Gaming',
    duration: 395,
    views: 180000,
    liked: false,
    likesCount: 14500,
    commentsCount: 290,
    tags: ['PixelArt', 'Games', 'Tutorial'],
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    author: {
      id: 'pixel-forge',
      profile: { username: 'pixelforge', displayName: 'PixelForge', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' },
    },
  },
  {
    id: 'cinema-5',
    authorId: 'deep-ocean',
    title: 'Explorando as Profundezas da Fossa das Marianas em 4K',
    description: 'Criaturas bioluminescentes, fontes hidrotermais e a beleza misteriosa dos abismos oceânicos.',
    videoUrl: 'https://cdn.pixabay.com/video/2020/09/21/50849-462370395_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    format: 'horizontal',
    category: 'Educação',
    duration: 920,
    views: 670000,
    liked: true,
    likesCount: 52000,
    commentsCount: 880,
    tags: ['Oceano', 'Ciência', '4K'],
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    author: {
      id: 'deep-ocean',
      profile: { username: 'deepocean', displayName: 'Deep Ocean Discovery', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
    },
  },
  {
    id: 'cinema-6',
    authorId: 'film-craft',
    title: 'Guia Completo de Color Grading Cinematográfico e LUTs',
    description: 'Segredos de Hollywood para obter o look cinematográfico teal and orange em qualquer câmera.',
    videoUrl: 'https://cdn.pixabay.com/video/2022/10/18/135515-762283296_large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    format: 'horizontal',
    category: 'Cinema & Séries',
    duration: 740,
    views: 290000,
    liked: false,
    likesCount: 21900,
    commentsCount: 370,
    tags: ['Cinema', 'ColorGrading', 'Film'],
    createdAt: new Date(Date.now() - 86400000 * 22).toISOString(),
    author: {
      id: 'film-craft',
      profile: { username: 'filmcraft', displayName: 'FilmCraft Academy', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
    },
  },
];

// Helper formatting functions
function fmtDuration(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtViews(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d atrás`;
  return `${Math.floor(diff / 2592000)}mês atrás`;
}

const glassInput =
  'w-full px-5 py-3.5 bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/15 rounded-2xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#f97316]/60 transition-all shadow-inner';

// ── UPLOAD MODAL (ALPHA WATCH STUDIO) ─────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { accessToken } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState({
    videoFile: null as File | null,
    thumbnailFile: null as File | null,
    title: '',
    description: '',
    category: 'Cinema & Séries',
    format: 'horizontal' as 'horizontal' | 'vertical',
    tags: '',
  });
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpload = async () => {
    if (!state.videoFile || !state.title || !accessToken) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('video', state.videoFile);
      if (state.thumbnailFile) fd.append('thumbnail', state.thumbnailFile);
      fd.append('title', state.title);
      if (state.description) fd.append('description', state.description);
      fd.append('category', state.category);
      fd.append('format', state.format);
      if (state.tags) fd.append('tags', state.tags);

      const res = await fetch(`${API}/api/v1/watch/videos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success || data.data) {
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300" />
      <div
        className="relative w-full max-w-lg rounded-[2.5rem] border border-white/20 liquid-glass-shell shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden"
        style={{
          background: 'rgba(18, 18, 24, 0.75)',
          backdropFilter: 'blur(36px) saturate(150%)',
          WebkitBackdropFilter: 'blur(36px) saturate(150%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/4 right-1/4 h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/80 to-transparent blur-[0.2px]" />

        <div className="max-h-[88vh] overflow-y-auto custom-scrollbar p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f97316] to-[#8b5cf6] flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-white">
                  <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Alpha Watch Studio</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Publicar Novo Vídeo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Video File Dropzone */}
            <div
              onClick={() => videoInputRef.current?.click()}
              className={`w-full py-6 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                state.videoFile
                  ? 'border-[#f97316]/70 bg-[#f97316]/10 text-white'
                  : 'border-white/15 hover:border-white/30 hover:bg-white/[0.03] text-white/50'
              }`}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={state.videoFile ? 'text-[#f97316]' : 'text-white/40'}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-xs font-bold text-center">
                {state.videoFile ? state.videoFile.name : 'Selecionar arquivo de vídeo (MP4, WebM, MOV)'}
              </p>
            </div>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => setState((s) => ({ ...s, videoFile: e.target.files?.[0] || null }))} />

            {/* Thumbnail */}
            <div
              onClick={() => thumbInputRef.current?.click()}
              className={`w-full h-14 rounded-2xl border flex items-center justify-center gap-3 cursor-pointer transition-all ${
                state.thumbnailFile ? 'border-amber-400/50 bg-amber-400/10' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
              }`}
            >
              <svg className={state.thumbnailFile ? 'text-amber-300' : 'text-white/30'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p className="text-xs font-bold text-white/50">
                {state.thumbnailFile ? state.thumbnailFile.name : 'Miniatura / Poster (opcional)'}
              </p>
            </div>
            <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setState((s) => ({ ...s, thumbnailFile: e.target.files?.[0] || null }))} />

            {/* Title */}
            <input
              type="text"
              placeholder="Título da obra / vídeo *"
              value={state.title}
              onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
              className={glassInput}
            />

            {/* Description */}
            <textarea
              placeholder="Sinopse / Descrição da publicação..."
              value={state.description}
              onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              className={`${glassInput} resize-none`}
            />

            <div className="flex gap-3 items-center w-full">
              {/* Category Dropdown */}
              <div className="flex-1 relative" ref={categoryRef}>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full h-[48px] px-4 bg-white/[0.06] border border-white/15 rounded-2xl text-white text-xs font-bold flex items-center justify-between hover:bg-white/[0.10] transition-all"
                >
                  <span>{state.category}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {showCategoryDropdown && (
                  <div className="absolute top-[105%] left-0 right-0 p-1.5 bg-neutral-950/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl z-[150] max-h-48 overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
                    {CATEGORIES.filter((c) => !c.includes('Todos') && !c.includes('Tendências')).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setState((s) => ({ ...s, category: c.replace(/[^a-zA-Z0-9 &áéíóúÁÉÍÓÚãõÃÕ]/g, '').trim() }));
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl text-left text-xs transition-all text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Format Toggle (16:9 vs 9:16 Shorts) */}
              <div className="flex rounded-2xl overflow-hidden border border-white/15 p-0.5 bg-white/[0.04]">
                {(['horizontal', 'vertical'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setState((s) => ({ ...s, format: f }))}
                    className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      state.format === f
                        ? 'bg-gradient-to-r from-[#f97316] to-[#8b5cf6] text-white shadow-md'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {f === 'horizontal' ? '16:9' : '9:16 Shorts'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <input
              type="text"
              placeholder="Tags separadas por vírgula (ex: 4k, trailer, anime)"
              value={state.tags}
              onChange={(e) => setState((s) => ({ ...s, tags: e.target.value }))}
              className={glassInput}
            />

            {/* Submit */}
            <button
              onClick={handleUpload}
              disabled={!state.videoFile || !state.title || uploading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#8b5cf6] text-white font-black text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 mt-2"
            >
              {uploading ? 'A Enviar para a Rede Alpha...' : 'Publicar Obra'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ video, onClose, onSuccess }: { video: Video; onClose: () => void; onSuccess: () => void }) {
  const { accessToken } = useAuthStore();
  const { updateVideo } = useWatchStore();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState({
    title: video.title || '',
    description: video.description || '',
    category: video.category || 'Cinema & Séries',
    tags: video.tags ? video.tags.join(', ') : '',
  });

  const handleSave = async () => {
    if (!state.title || !accessToken) return;
    setSaving(true);
    try {
      const tagsArray = state.tags ? state.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
      const success = await updateVideo(video.id, accessToken, {
        title: state.title,
        description: state.description,
        category: state.category,
        tags: tagsArray as any,
      });
      if (success) {
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300" />
      <div
        className="relative w-full max-w-lg rounded-[2.5rem] border border-white/20 liquid-glass-shell shadow-2xl animate-in zoom-in-95 duration-300 p-6 sm:p-8"
        style={{
          background: 'rgba(18, 18, 24, 0.85)',
          backdropFilter: 'blur(36px) saturate(150%)',
          WebkitBackdropFilter: 'blur(36px) saturate(150%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white">Editar Vídeo</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Título *"
            value={state.title}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
            className={glassInput}
          />
          <textarea
            placeholder="Descrição..."
            value={state.description}
            onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
            rows={3}
            className={`${glassInput} resize-none`}
          />
          <input
            type="text"
            placeholder="Tags separadas por vírgula"
            value={state.tags}
            onChange={(e) => setState((s) => ({ ...s, tags: e.target.value }))}
            className={glassInput}
          />
          <button
            onClick={handleSave}
            disabled={!state.title || saving}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#8b5cf6] text-white font-black text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_25px_rgba(249,115,22,0.4)] disabled:opacity-40"
          >
            {saving ? 'A Guardar...' : 'Guardar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN LAZER WATCH VIEW ────────────────────────────────────────────────────
export function LazerWatchView({
  onClose,
  onSelectView,
  themeColor = '#f97316',
  themeMode = 'dark',
  userAvatar,
  userName = 'Cinema',
}: LazerWatchViewProps) {
  const { user: authUser, accessToken } = useAuthStore();
  const {
    videos: rawVideos,
    currentVideo,
    isLoading,
    activeCategory,
    fetchVideos,
    setCurrentVideo,
    setActiveCategory,
    setSearchQuery,
    likeVideo,
    deleteVideo,
  } = useWatchStore();

  const [showUpload, setShowUpload] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'shorts' | 'saved' | 'trending'>('all');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchVideos({ category: activeCategory, requesterId: authUser?.id });
  }, [activeCategory, authUser?.id]);

  const handleSearch = (q: string) => {
    setLocalSearch(q);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(q);
      fetchVideos({ search: q || undefined, category: activeCategory, requesterId: authUser?.id });
    }, 350);
  };

  const handleVideoSuccess = () => {
    fetchVideos({ category: activeCategory, requesterId: authUser?.id });
  };

  // Toggle Saved Video in My List
  const toggleSaveVideo = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Combined video list (Real User Videos + Curated Showcases)
  const allVideos = useMemo(() => {
    if (!rawVideos || rawVideos.length === 0) {
      return [...DEMO_SPOTLIGHTS, ...DEMO_SHORTS, ...DEMO_CINEMA_VIDEOS];
    }
    // Merge real videos with showcase so there is always a rich cinema catalogue
    const realIds = new Set(rawVideos.map((v) => v.id));
    const extra = [...DEMO_SPOTLIGHTS, ...DEMO_SHORTS, ...DEMO_CINEMA_VIDEOS].filter((v) => !realIds.has(v.id));
    return [...rawVideos, ...extra];
  }, [rawVideos]);

  // Filtered by Search & Tab
  const filteredVideos = useMemo(() => {
    let result = allVideos;

    // Filter by search query
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Filter by Tab
    if (activeTab === 'shorts') {
      result = result.filter((v) => v.format === 'vertical');
    } else if (activeTab === 'saved') {
      result = result.filter((v) => savedVideoIds.has(v.id));
    } else if (activeTab === 'trending') {
      result = [...result].sort((a, b) => b.views - a.views);
    }

    // Filter by category if category is specific
    if (
      activeCategory &&
      !activeCategory.includes('Todos') &&
      !activeCategory.includes('Tendências') &&
      !activeCategory.includes('Shorts')
    ) {
      const cleanCat = activeCategory.replace(/[^a-zA-Z0-9 &áéíóúÁÉÍÓÚãõÃÕ]/g, '').trim().toLowerCase();
      result = result.filter((v) => v.category.toLowerCase().includes(cleanCat));
    }

    return result;
  }, [allVideos, localSearch, activeTab, activeCategory, savedVideoIds]);

  // Vertical Shorts list for the horizontal shelf
  const shortsList = useMemo(() => {
    return allVideos.filter((v) => v.format === 'vertical');
  }, [allVideos]);

  // Horizontal Cinema grid list
  const cinemaGridList = useMemo(() => {
    if (activeTab === 'shorts') return filteredVideos;
    return filteredVideos.filter((v) => v.format !== 'vertical');
  }, [filteredVideos, activeTab]);

  // Current Hero Spotlight
  const activeSpotlight = DEMO_SPOTLIGHTS[spotlightIndex] || DEMO_SPOTLIGHTS[0];

  const nextSpotlight = useCallback(() => {
    setSpotlightIndex((prev) => (prev + 1) % DEMO_SPOTLIGHTS.length);
  }, []);

  const prevSpotlight = useCallback(() => {
    setSpotlightIndex((prev) => (prev - 1 + DEMO_SPOTLIGHTS.length) % DEMO_SPOTLIGHTS.length);
  }, []);

  const isLight = themeMode === 'light';
  const shellBg = isLight ? 'glass-panel-light' : 'liquid-glass-shell';

  return (
    <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500 relative">
      
      {/* ══════════════════════════════════════════════════════════════════════
          1. FLOATING WATCH CAPSULE SIDEBAR (Pílula Vertical Exclusiva do Cinema)
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col items-center justify-between w-14 lg:w-16 h-fit py-6 px-2.5 rounded-full border border-white/20 liquid-glass-shell shadow-2xl relative z-40 shrink-0 select-none transition-all duration-300"
        style={{
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/80 to-transparent blur-[0.2px]" />

        {/* Top: Cinema Aperture / User Avatar */}
        <button
          onClick={() => {
            setActiveTab('all');
            scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#f97316] p-0.5 hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(249,115,22,0.45)] cursor-pointer group relative bg-black/40"
          title="Início do Cinema"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full bg-[#f97316]/20 text-[#f97316] font-black text-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
          )}
          {/* VisionOS Floating Tooltip */}
          <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
            <span>Alpha Watch Cinema</span>
          </span>
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Cinema Navigation Action Icons */}
        <div className="flex flex-col items-center gap-3.5">
          {/* Icon 1: Film / Clapperboard (Cinema Feed) */}
          <button
            onClick={() => {
              setActiveTab('all');
              setActiveCategory('Todos');
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'all'
                ? 'text-[#f97316] bg-white/15 shadow-[0_0_14px_rgba(249,115,22,0.4)] scale-110 border border-[#f97316]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Feed Cinema & Destaques</span>
            </span>
          </button>

          {/* Icon 2: Zap / Lightning (Alpha Shorts) */}
          <button
            onClick={() => {
              setActiveTab('shorts');
              const el = document.getElementById('watch-shorts-section');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'shorts'
                ? 'text-[#f97316] bg-white/15 shadow-[0_0_14px_rgba(249,115,22,0.4)] scale-110 border border-[#f97316]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Alpha Shorts (Verticais)</span>
            </span>
          </button>

          {/* Icon 3: Flame (Tendências / Em Alta) */}
          <button
            onClick={() => {
              setActiveTab('trending');
              setActiveCategory('Tendências 🔥');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'trending'
                ? 'text-[#f97316] bg-white/15 shadow-[0_0_14px_rgba(249,115,22,0.4)] scale-110 border border-[#f97316]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Em Alta & Tendências</span>
            </span>
          </button>

          {/* Icon 4: Bookmark (Minha Lista / Salvos) */}
          <button
            onClick={() => setActiveTab('saved')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'saved'
                ? 'text-[#f97316] bg-white/15 shadow-[0_0_14px_rgba(249,115,22,0.4)] scale-110 border border-[#f97316]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Minha Lista ({savedVideoIds.size})</span>
            </span>
          </button>

          {/* Icon 5: Studio / Upload (+ Publicar Obra) */}
          {accessToken && (
            <button
              onClick={() => setShowUpload(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-tr from-[#f97316] to-[#8b5cf6] hover:scale-110 active:scale-95 shadow-[0_0_16px_rgba(249,115,22,0.4)] transition-all cursor-pointer group relative"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                <span>Alpha Studio (Publicar)</span>
              </span>
            </button>
          )}

          {/* Icon 6: Switch to Alpha Music */}
          <button
            onClick={() => onSelectView?.('music')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#1ed760] hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-[#1ed760] text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
              <span>Ouvir Alpha Music</span>
            </span>
          </button>

          {/* Icon 7: Switch to Explore */}
          <button
            onClick={() => onSelectView?.('explore')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#38bdf8] hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-[#38bdf8] text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
              <span>Explorar & Estudos</span>
            </span>
          </button>

          {/* Icon 8: Back to Lazer Feed */}
          <button
            onClick={() => onSelectView?.('feed') || onClose?.()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Voltar ao Feed do Lazer</span>
            </span>
          </button>

          {/* Icon 9: Spotlight Search */}
          <button
            onClick={() => {
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => searchInputRef.current?.focus(), 200);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#f97316] hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Pesquisar Vídeos</span>
            </span>
          </button>
        </div>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Bottom indicator jewel em âmbar neon */}
        <div className="w-2 h-2 rounded-full bg-[#f97316] shadow-[0_0_10px_#f97316] animate-pulse" />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN VISIONOS LIQUID GLASS WINDOW (Painel Principal do Cinema)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border ${shellBg} flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300`}
      >
        {/* Crista de luz especular superior */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* Ambient Cinema Lighting Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#f97316]/10 blur-[130px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-[#8b5cf6]/10 blur-[140px] pointer-events-none -z-10" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#f97316]/10 blur-[130px] pointer-events-none -z-10" />

        {/* ── VIDEO PLAYER FULLSCREEN LAYER (quando ativo) ── */}
        {currentVideo ? (
          <div className="w-full h-full flex flex-col relative z-20">
            <AlphaVideoPlayer
              video={currentVideo}
              onClose={() => setCurrentVideo(null)}
              onLike={accessToken ? () => likeVideo(currentVideo.id, accessToken) : undefined}
              onEdit={() => setEditingVideo(currentVideo)}
            />
          </div>
        ) : (
          /* ── CINEMA BROWSE FEED ── */
          <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
            {/* ── TOP CINEMA HEADER ── */}
            <header className="px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 border-b border-white/[0.08] shrink-0 z-20">
              {/* Left: Brand + Search Pill */}
              <div className="flex items-center gap-3 w-full max-w-md">
                <div className="relative flex items-center w-full">
                  <svg className="absolute left-4 w-4 h-4 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={localSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Pesquisar filmes, shorts, canais ou tags..."
                    className="w-full h-11 pl-11 pr-4 rounded-full bg-white/[0.07] hover:bg-white/[0.10] focus:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold placeholder-white/40 outline-none transition-all shadow-inner focus:border-[#f97316]/60"
                  />
                  {localSearch && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] hover:bg-white/40 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Center: Interactive Category Pills */}
              <nav className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat);
                        if (cat.includes('Shorts')) setActiveTab('shorts');
                        else if (cat.includes('Tendências')) setActiveTab('trending');
                        else setActiveTab('all');
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#f97316] text-white shadow-[0_4px_16px_rgba(249,115,22,0.4)] scale-[1.02]'
                          : 'bg-white/[0.05] hover:bg-white/[0.12] text-white/60 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </nav>

              {/* Right: Studio Upload, Profile & Close */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Desktop Upload Button */}
                {accessToken && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#f97316] to-[#8b5cf6] text-white font-extrabold text-xs hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-all cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Publicar</span>
                  </button>
                )}

                {/* Profile Pill */}
                <div
                  onClick={() => onSelectView?.('profile')}
                  className="h-10 pl-1.5 pr-3.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center gap-2.5 cursor-pointer transition-all group"
                  title="Meu Perfil"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 border border-white/20">
                    {userAvatar ? (
                      <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/70">
                        {(userName || 'A')[0]}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[80px]">
                      {userName}
                    </span>
                    <span className="text-[9px] font-semibold text-white/40 leading-none">
                      Cinema
                    </span>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 transition-all cursor-pointer"
                  title="Fechar Alpha Watch"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </header>

            {/* ── MAIN SCROLLABLE CINEMA FEED BODY ── */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-10 scroll-smooth">
              
              {/* ── 1. HERO PREMIERE SPOTLIGHT BANNER (Apenas na aba 'all' ou sem busca ativa) ── */}
              {activeTab === 'all' && !localSearch && (
                <section className="w-full rounded-[32px] overflow-hidden relative p-6 sm:p-10 md:p-12 border border-white/15 flex flex-col justify-between min-h-[380px] sm:min-h-[440px] shadow-2xl group transition-all duration-700">
                  {/* Background Backdrop Image */}
                  <img
                    key={activeSpotlight.id}
                    src={activeSpotlight.thumbnailUrl}
                    alt={activeSpotlight.title}
                    className="w-full h-full object-cover absolute inset-0 -z-10 transition-transform duration-[2000ms] group-hover:scale-105 animate-in fade-in duration-700"
                  />

                  {/* Multilayer Dark Vignette & Dramatic Cinematic Gradients */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/25 -z-10" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 -z-10" />

                  {/* Top Badges */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white text-xs font-black shadow-[0_0_16px_rgba(249,115,22,0.5)]">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>PREMIERE EM DESTAQUE</span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold">
                        4K ULTRA HD
                      </span>
                      <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold">
                        DOLBY VISION
                      </span>
                    </div>

                    {/* Spotlight Indicators */}
                    <div className="flex items-center gap-1.5">
                      {DEMO_SPOTLIGHTS.map((s, idx) => (
                        <button
                          key={s.id}
                          onClick={() => setSpotlightIndex(idx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            spotlightIndex === idx ? 'w-8 bg-[#f97316]' : 'w-2 bg-white/30 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Center Content / Typography */}
                  <div className="relative z-10 flex flex-col items-start gap-2 max-w-2xl my-6">
                    {/* Tags */}
                    <div className="flex items-center gap-2 mb-1">
                      {activeSpotlight.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-white/80 text-[11px] font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                      {activeSpotlight.title}
                    </h1>

                    <p className="text-white/70 text-xs sm:text-sm leading-relaxed max-w-xl font-medium drop-shadow-md">
                      {activeSpotlight.description}
                    </p>

                    {/* Author Pill */}
                    <div className="flex items-center gap-2 mt-2 py-1 px-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20">
                        {activeSpotlight.author?.profile?.avatarUrl && (
                          <img src={activeSpotlight.author.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white">
                        {activeSpotlight.author?.profile?.displayName}
                      </span>
                      <span className="text-[10px] text-white/50 font-medium">
                        · {fmtViews(activeSpotlight.views)} visualizações
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Actions & Carousel Controls */}
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      {/* Play Button */}
                      <button
                        onClick={() => setCurrentVideo(activeSpotlight)}
                        className="px-7 py-3 rounded-full bg-white text-neutral-950 font-black text-xs flex items-center gap-2 hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.3)] transition-all cursor-pointer border-none"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Assistir Agora</span>
                      </button>

                      {/* Add to My List */}
                      <button
                        onClick={(e) => toggleSaveVideo(activeSpotlight.id, e)}
                        className={`px-5 py-3 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          savedVideoIds.has(activeSpotlight.id)
                            ? 'bg-[#f97316] border-[#f97316] text-white shadow-[0_0_15px_#f97316]'
                            : 'bg-black/40 hover:bg-white/20 border-white/20 text-white'
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={savedVideoIds.has(activeSpotlight.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2">
                          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                        </svg>
                        <span>{savedVideoIds.has(activeSpotlight.id) ? 'Na Minha Lista' : '+ Minha Lista'}</span>
                      </button>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={prevSpotlight}
                        className="w-10 h-10 rounded-full bg-black/40 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer"
                        title="Anterior"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                      </button>
                      <button
                        onClick={nextSpotlight}
                        className="w-10 h-10 rounded-full bg-black/40 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer"
                        title="Próximo"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* ── 2. ALPHA SHORTS / REELS SHELF ── */}
              {shortsList.length > 0 && activeTab !== 'saved' && (
                <section id="watch-shorts-section" className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f97316] to-[#8b5cf6] flex items-center justify-center shadow-md">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-white tracking-tight leading-none">Alpha Shorts</h2>
                        <p className="text-[10px] text-white/40 font-semibold mt-0.5">Momentos Rápidos e Verticais</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab(activeTab === 'shorts' ? 'all' : 'shorts')}
                      className="text-xs font-bold text-[#f97316] hover:text-[#fb923c] transition-colors cursor-pointer bg-transparent border-none"
                    >
                      {activeTab === 'shorts' ? 'Mostrar Todos' : 'Ver Todos os Shorts →'}
                    </button>
                  </div>

                  {/* Horizontal Scroll Track */}
                  <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                    {shortsList.map((short) => (
                      <div
                        key={short.id}
                        onClick={() => setCurrentVideo(short)}
                        className="w-[180px] sm:w-[200px] aspect-[9/16] rounded-[26px] overflow-hidden relative p-3 flex flex-col justify-between border border-white/10 hover:border-[#f97316]/60 shadow-xl group hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(249,115,22,0.3)] transition-all cursor-pointer shrink-0"
                      >
                        {/* Background Thumbnail */}
                        <img
                          src={resolveUrl(short.thumbnailUrl || '')}
                          alt={short.title}
                          className="w-full h-full object-cover absolute inset-0 -z-10 group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/20 -z-10" />

                        {/* Top: 9:16 Badge & Play Hover */}
                        <div className="flex items-center justify-between relative z-10">
                          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-wider border border-white/15">
                            ⚡ {fmtDuration(short.duration)}
                          </span>
                        </div>

                        {/* Center Hover Play Icon */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>

                        {/* Bottom: Info */}
                        <div className="relative z-10 flex flex-col gap-1">
                          <span className="text-xs font-black text-white leading-tight line-clamp-2 drop-shadow-md">
                            {short.title}
                          </span>
                          <div className="flex items-center justify-between text-[10px] text-white/60 font-medium">
                            <span className="truncate max-w-[100px]">{short.author?.profile?.displayName}</span>
                            <span>{fmtViews(short.views)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── 3. CINEMA VIDEO CATALOG GRID ── */}
              <section className="flex flex-col gap-5">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-lg font-black text-white tracking-tight leading-none">
                      {activeTab === 'saved'
                        ? 'Minha Lista de Vídeos'
                        : activeTab === 'trending'
                        ? 'Mais Assistidos no Momento'
                        : activeCategory !== 'Todos'
                        ? activeCategory
                        : 'Filmes, Séries & Transmissões'}
                    </h2>
                    <p className="text-[10px] text-white/40 font-semibold mt-0.5">
                      {cinemaGridList.length} obras cinematográficas disponíveis
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="rounded-[24px] overflow-hidden animate-pulse bg-white/[0.04]">
                        <div className="aspect-video bg-white/[0.06]" />
                        <div className="p-4 space-y-2">
                          <div className="h-3 rounded-full w-4/5 bg-white/[0.08]" />
                          <div className="h-2 rounded-full w-2/5 bg-white/[0.04]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : cinemaGridList.length === 0 ? (
                  /* Empty State Encantador */
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f97316] shadow-2xl">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                        <line x1="7" y1="2" x2="7" y2="22" />
                        <line x1="17" y1="2" x2="17" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Nenhuma obra encontrada</h3>
                      <p className="text-xs text-white/50 max-w-sm mt-1">
                        As luzes estão acesas e a tela está pronta. Seja o primeiro diretor a publicar um vídeo no Alpha Watch!
                      </p>
                    </div>
                    {accessToken && (
                      <button
                        onClick={() => setShowUpload(true)}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#f97316] to-[#8b5cf6] text-white font-extrabold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer"
                      >
                        + Estrear Primeiro Vídeo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {cinemaGridList.map((video, idx) => {
                      const isOwner = authUser?.id === video.authorId;
                      const isSaved = savedVideoIds.has(video.id);

                      return (
                        <div
                          key={video.id}
                          onClick={() => setCurrentVideo(video)}
                          className="group relative flex flex-col rounded-[26px] overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(249,115,22,0.18)] cursor-pointer"
                        >
                          {/* Thumbnail Aspect 16:9 */}
                          <div className="relative aspect-video overflow-hidden bg-black/40">
                            {video.thumbnailUrl ? (
                              <img
                                src={resolveUrl(video.thumbnailUrl)}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#f97316]/20 via-[#8b5cf6]/20 to-black/60 flex items-center justify-center">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-white/20">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            )}

                            {/* Duration Badge */}
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[10px] font-mono font-bold border border-white/10">
                              {fmtDuration(video.duration)}
                            </div>

                            {/* Hover Play Icon Overlay */}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>

                            {/* Top Quick Actions (Save & Owner Edit) */}
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                onClick={(e) => toggleSaveVideo(video.id, e)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                                  isSaved
                                    ? 'bg-[#f97316] text-white shadow-[0_0_10px_#f97316]'
                                    : 'bg-black/60 hover:bg-white/30 text-white/80 hover:text-white border border-white/15'
                                }`}
                                title={isSaved ? 'Remover da lista' : 'Salvar na Minha Lista'}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                                </svg>
                              </button>

                              {isOwner && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVideo(video);
                                  }}
                                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-white/30 text-white/80 hover:text-white border border-white/15 flex items-center justify-center backdrop-blur-md transition-all"
                                  title="Editar"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Info Footer */}
                          <div className="p-3.5 flex gap-3">
                            {/* Author Avatar */}
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 shrink-0 mt-0.5 border border-white/15">
                              {video.author?.profile?.avatarUrl ? (
                                <img src={resolveUrl(video.author.profile.avatarUrl)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/60">
                                  {(video.author?.profile?.displayName || 'C')[0]}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-black text-white leading-tight line-clamp-2 group-hover:text-[#f97316] transition-colors">
                                {video.title}
                              </h3>
                              <p className="text-[11px] font-semibold text-white/50 mt-1 truncate">
                                {video.author?.profile?.displayName || video.author?.profile?.username || 'Canal Alpha'}
                              </p>
                              <p className="text-[10px] font-medium text-white/35 mt-0.5">
                                {fmtViews(video.views)} visualizações · {timeAgo(video.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleVideoSuccess} />}
      {editingVideo && <EditModal video={editingVideo} onClose={() => setEditingVideo(null)} onSuccess={handleVideoSuccess} />}
    </div>
  );
}
