'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface AnimePlayerModalProps {
  initialUrl: string; // URL da página do episódio OU título do anime
  animeTitle: string;
  onClose: () => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const sanitizeUrl = (url: string) => url.includes('animefire') ? url.replace(/animefire\.(?:lat|plus|tv|net|info|io|me|online|app|vip|club|top|xyz|site|co)/g, 'animefire.cv') : url;

const ANIME_DOMAINS = ['animefire', 'flix2day', 'anitube', 'gogoanime', 'betteranime', 'animesonline', 'crunchyroll'];

function isAnimeDomain(url: string) {
  return ANIME_DOMAINS.some(d => url.toLowerCase().includes(d));
}

export function AnimePlayerModal({ initialUrl, animeTitle, onClose, themeColor: c, themeMode }: AnimePlayerModalProps) {
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [showBar, setShowBar] = useState(true);
  const [searching, setSearching] = useState(false);
  const hideBarTimeout = useRef<NodeJS.Timeout | null>(null);

  const isLight = themeMode === 'light';

  // Resolve the URL: if it's already a direct URL to an episode page, use it;
  // if it's a title or a general anime page, search for episodes first.
  useEffect(() => {
    const resolve = async () => {
      const sanitizedInitial = sanitizeUrl(initialUrl);
      setLoading(true);
      setSearchResults([]);

      // Case 1: URL is pointing directly to an episode page (has /video/ or /episodio/ or specific patterns)
      const isEpisode = sanitizedInitial.startsWith('http') && (
        sanitizedInitial.includes('/video/') ||
        sanitizedInitial.includes('/episodio/') ||
        sanitizedInitial.includes('/episode/') ||
        sanitizedInitial.includes('/ep-') ||
        sanitizedInitial.includes('/ep/')
      );

      if (isEpisode) {
        setCurrentUrl(sanitizedInitial);
        setLoading(false);
        return;
      }

      // Case 2: It's a direct anime domain URL (but a general/detail page) — search for episodes
      if (sanitizedInitial.startsWith('http') && isAnimeDomain(sanitizedInitial)) {
        setSearching(true);
        try {
          const token = (useAuthStore.getState() as any).accessToken;
          const res = await fetch(`${API}/api/v1/lazer/proxy/video?target=${encodeURIComponent(sanitizedInitial)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const json = await res.json();
          if (json.success && json.video?.episodes?.length > 0) {
            setSearchResults(json.video.episodes);
          } else if (json.success && json.video?.url) {
            // Direct episode URL found
            setCurrentUrl(json.video.url);
          } else {
            // Fallback: show the page itself via proxy
            setCurrentUrl(sanitizedInitial);
          }
        } catch {
          setCurrentUrl(sanitizedInitial);
        } finally {
          setSearching(false);
          setLoading(false);
        }
        return;
      }

      // Case 3: It's a title string — search AnimeFireCV
      setSearching(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        // Search via the video endpoint which does a native search
        const searchTarget = encodeURIComponent(sanitizedInitial.startsWith('http') ? sanitizedInitial : sanitizedInitial);
        const res = await fetch(`${API}/api/v1/lazer/proxy/video?target=${searchTarget}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && json.video?.episodes?.length > 0) {
          setSearchResults(json.video.episodes);
        } else if (json.success && json.video?.url) {
          setCurrentUrl(json.video.url);
        }
      } catch {
        // nothing
      } finally {
        setSearching(false);
        setLoading(false);
      }
    };

    resolve();
  }, [initialUrl]);

  const handleMouseMove = () => {
    setShowBar(true);
    if (hideBarTimeout.current) clearTimeout(hideBarTimeout.current);
    hideBarTimeout.current = setTimeout(() => setShowBar(false), 3500);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Build the proxied URL for the iframe
  const proxiedUrl = currentUrl
    ? `${API}/api/v1/lazer/proxy?target=${encodeURIComponent(currentUrl)}`
    : '';

  const showEpisodeList = !loading && searchResults.length > 0 && !currentUrl;
  const showPlayer = !loading && !!currentUrl;
  const showEmpty = !loading && !currentUrl && searchResults.length === 0;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black animate-in fade-in duration-300">
      <div className="relative w-full h-full" onMouseMove={handleMouseMove}>

        {/* ── Top Bar ── */}
        <div
          className={`absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 transition-all duration-500 pointer-events-none ${showBar || !currentUrl ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)', pointerEvents: showBar || !currentUrl ? 'auto' : 'none' }}
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[5px] text-white/30">Alpha Cinematic Bridge 🏮</span>
            <h1 className="text-lg font-black text-white tracking-tight truncate max-w-[60vw]">{animeTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all"
              >
                Abrir Original ↗
              </a>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-lg hover:bg-white/20 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-6">
            <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${c}50`, borderTopColor: c }} />
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[8px] text-white/30 animate-pulse">
                {searching ? 'Alpha Scanning Sources...' : 'Initializing Bridge...'}
              </span>
            </div>
          </div>
        )}

        {/* ── Episode Selector ── */}
        {showEpisodeList && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-8 backdrop-blur-xl overflow-y-auto">
            <div className="w-full max-w-3xl">
              <div className="flex flex-col items-center mb-12 text-center">
                <span className="text-5xl mb-4">📺</span>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Escolha o Episódio</h2>
                <p className="text-white/40 text-sm uppercase tracking-[3px]">
                  Alpha detectou {searchResults.length} transmissões
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                {searchResults.map((ep: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => { setCurrentUrl(ep.url); setSearchResults([]); }}
                    className="flex items-center justify-between p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Episódio {idx + 1}</span>
                      <span className="text-[13px] font-bold text-white truncate">{ep.title || `Ep. ${idx + 1}`}</span>
                    </div>
                    <span
                      className="ml-4 shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                      style={{ background: `${c}30` }}
                    >
                      ▶ Assistir
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-center mt-10">
                <button
                  onClick={onClose}
                  className="px-10 py-4 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[4px] hover:bg-white/10 transition-all"
                >
                  Voltar para a Base
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {showEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-6 text-center p-10">
            <span className="text-6xl">📡</span>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Sinal Não Encontrado</h2>
            <p className="text-white/40 max-w-md text-sm">
              A Alpha não conseguiu localizar este conteúdo em nenhuma fonte nativa conhecida.
            </p>
            <div className="flex gap-4 mt-4">
              <button
                onClick={onClose}
                className="px-10 py-4 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[4px] hover:bg-white/10 transition-all"
              >
                Voltar para a Base
              </button>
            </div>
          </div>
        )}

        {/* ── Full-Page Proxy Iframe ── */}
        {showPlayer && (
          <iframe
            key={proxiedUrl}
            src={proxiedUrl}
            className="w-full h-full border-none block"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}

      </div>
    </div>
  );
}
