'use client';
import { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '@/store/music.store';
import { useAuthStore } from '@/store/auth.store';
import { resolveUrl } from '@/lib/api';

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Waveform constants removed

export function AlphaMusicPlayer() {
  const {
    currentTrack, isPlaying, volume, progress, repeat, shuffle,
    queue, playlists, tracks,
    togglePlay, next, prev, seek, setVolume, setProgress, toggleShuffle, cycleRepeat,
    showPlayerModal, setShowPlayerModal,
  } = useMusicStore();
  const { accessToken } = useAuthStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [dominantColor, setDominantColor] = useState('#6366f1');
  const [dominantRgb, setDominantRgb] = useState<[number, number, number]>([99, 102, 241]);

  // Swipe-to-close
  const touchStartY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const [active, setActive] = useState(false);

  useEffect(() => {
    if (showPlayerModal) {
      const t = setTimeout(() => setActive(true), 20);
      return () => clearTimeout(t);
    } else {
      setActive(false);
    }
  }, [showPlayerModal]);

  const handleClose = () => {
    setActive(false);
    setTimeout(() => {
      setShowPlayerModal(false);
    }, 400);
  };


  // Dynamic color extraction
  useEffect(() => {
    if (!currentTrack?.coverUrl) {
      setDominantColor('#6366f1');
      setDominantRgb([99, 102, 241]);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = resolveUrl(currentTrack.coverUrl);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 1; canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setDominantColor(`rgb(${r}, ${g}, ${b})`);
      setDominantRgb([r, g, b]);
    };
  }, [currentTrack?.coverUrl]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, currentTrack]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !dragging) {
      const p = audioRef.current.currentTime;
      setLocalProgress(p);
      setProgress(p);
    }
  };

  const handleEnded = () => {
    if (repeat === 'one') { audioRef.current!.currentTime = 0; audioRef.current!.play(); }
    else next();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLocalProgress(val);
    if (audioRef.current) audioRef.current.currentTime = val;
    seek(val);
  };

  // Touch swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setSwipeOffset(delta);
  };
  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (swipeOffset > 120) handleClose();
    else setSwipeOffset(0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    const isScrollable = target.closest('.overflow-y-auto') || target.closest('.overflow-x-auto');
    const isInteractive = target.closest('button') || target.closest('input') || target.closest('a');
    
    if (!isScrollable && !isInteractive && Math.abs(e.deltaY) > 8) {
      handleClose();
    }
  };

  if (!currentTrack) return null;

  const progressPct = audioDuration > 0 ? (localProgress / audioDuration) * 100 : 0;
  const likeTrack = useMusicStore.getState().likeTrack;

  const currentLyricIndex = currentTrack.lyrics
    ? currentTrack.lyrics.findIndex((l, i) => {
        const nextL = currentTrack.lyrics![i + 1];
        return localProgress >= l.time && (!nextL || localProgress < nextL.time);
      })
    : -1;

  return (
    <>
      {/* Audio — always mounted */}
      <audio
        ref={audioRef}
        src={resolveUrl(currentTrack.audioUrl)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)}
        onEnded={handleEnded}
        preload="auto"
      />

      {showPlayerModal && (
        <div 
          className="fixed inset-0 z-[1000] overflow-hidden transition-all duration-500"
          style={{
            backdropFilter: active ? 'blur(40px)' : 'blur(0px)',
            WebkitBackdropFilter: active ? 'blur(40px)' : 'blur(0px)',
            backgroundColor: active ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0)',
          }}
          onWheel={handleWheel}
        >

          {/* ══════════════════════════════════
              MOBILE LAYOUT  (< md)
          ══════════════════════════════════ */}
          <div
            className="md:hidden w-full h-full flex flex-col"
            style={{
              transform: active ? `translateY(${swipeOffset}px)` : 'translateY(100%)',
              transition: isSwiping ? 'none' : 'transform 400ms cubic-bezier(0.32, 0.94, 0.6, 1), opacity 400ms ease',
              opacity: active ? Math.max(0, 1 - swipeOffset / 400) : 0,
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Dynamic Background based on Cover Color */}
            <div 
              className="absolute inset-0 z-0 overflow-hidden"
              style={{ backgroundColor: `rgba(${dominantRgb[0]}, ${dominantRgb[1]}, ${dominantRgb[2]}, 0.2)` }}
            >
              {/* Blurred Album Art for vibrant cover colors */}
              {currentTrack.coverUrl && (
                <img 
                  src={resolveUrl(currentTrack.coverUrl)} 
                  className="absolute inset-0 w-full h-full object-cover scale-[1.6] blur-[80px] saturate-[1.8] brightness-[1.15] opacity-75 pointer-events-none" 
                  alt="" 
                />
              )}
              
              {/* Glowing color blobs based on dominantColor */}
              <div 
                className="absolute -top-[10%] inset-x-0 h-[350px] blur-[100px] opacity-50 rounded-full pointer-events-none" 
                style={{ backgroundColor: dominantColor }}
              />
              <div 
                className="absolute -bottom-[10%] inset-x-0 h-[300px] blur-[120px] opacity-35 rounded-full pointer-events-none" 
                style={{ backgroundColor: dominantColor }}
              />

              {/* Light translucent overlay for readability */}
              <div className="absolute inset-0 bg-white/[0.04] backdrop-brightness-105" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full px-6">

              {/* Mobile Header with Down Chevron */}
              <div className="flex items-center justify-between pt-4 pb-1 shrink-0">
                <button 
                  onClick={handleClose}
                  className="w-10 h-10 flex items-center justify-center text-white/60 active:scale-90 hover:text-white transition-all"
                  aria-label="Minimizar Player"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">A Reproduzir</span>
                
                <div className="w-10 h-10" /> {/* Balancer */}
              </div>

              {/* Album Art */}
              <div className="flex-1 flex items-center justify-center py-4 min-h-0 animate-in fade-in zoom-in-95 duration-700 delay-100 fill-mode-both">
                <div className="relative w-full aspect-square max-w-[300px]">
                  {/* Outer Glow */}
                  <div
                    className="absolute inset-2 rounded-[2.5rem] blur-2xl opacity-50"
                    style={{ backgroundColor: dominantColor }}
                  />
                  <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    {currentTrack.coverUrl ? (
                      <img src={resolveUrl(currentTrack.coverUrl)} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-[#1e2a5c] flex items-center justify-center text-7xl">🎵</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title + Artist + Actions */}
              <div className="flex items-center justify-between gap-3 shrink-0 mb-8 mt-10 px-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                <div className="flex-1 min-w-0">
                  <h1 className="text-[28px] font-black text-white truncate leading-tight tracking-tight drop-shadow-md">{currentTrack.title}</h1>
                  <p className="text-base font-semibold text-white/70 truncate mt-1">{currentTrack.artist}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <button
                    onClick={() => accessToken && likeTrack(currentTrack.id, accessToken)}
                    className={`transition-all hover:scale-110 active:scale-95 ${currentTrack.liked ? 'text-white' : 'text-white/50 hover:text-white'}`}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill={currentTrack.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <button className="text-white/50 hover:text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress Bar (Waveform removed, clean thicker line without thumb) */}
              <div className="shrink-0 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                <div className="relative h-[6px] bg-white/10 rounded-full flex items-center mb-2">
                  <div 
                    className="absolute left-0 h-full rounded-full transition-all duration-100" 
                    style={{ 
                      width: `${progressPct}%`, 
                      backgroundColor: dominantColor, 
                      boxShadow: `0 0 10px ${dominantColor}aa` 
                    }} 
                  />
                  <input
                    type="range" min={0} max={audioDuration || 1} step={0.1}
                    value={localProgress}
                    onMouseDown={() => setDragging(true)}
                    onMouseUp={() => setDragging(false)}
                    onTouchStart={() => setDragging(true)}
                    onTouchEnd={() => setDragging(false)}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
                
                <div className="flex justify-between text-xs font-semibold text-white/50 tracking-wider mt-1">
                  <span>{fmtTime(localProgress)}</span>
                  <span>{fmtTime(audioDuration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-8 shrink-0 mb-8 text-white drop-shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[400ms] fill-mode-both">
                {/* Previous */}
                <button onClick={prev} className="transition-all active:scale-90 hover:opacity-80">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 6.5a1 1 0 0 0-1.55-.83l-7 4.5a1 1 0 0 0 0 1.66l7 4.5A1 1 0 0 0 11 15.5V11l6.45 4.15A1 1 0 0 0 19 14.32V5.68a1 1 0 0 0-1.55-.84L11 9V6.5z"/>
                  </svg>
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className={`transition-all hover:scale-105 active:scale-95 mx-2 ${!isPlaying ? 'animate-pulse' : ''}`}
                >
                  {isPlaying ? (
                    <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="2" />
                      <rect x="14" y="5" width="4" height="14" rx="2" />
                    </svg>
                  ) : (
                    <svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 5.5a1.5 1.5 0 0 1 2.27-1.28l11.5 6.9a1.5 1.5 0 0 1 0 2.56l-11.5 6.9A1.5 1.5 0 0 1 6 19.3V5.5z"/>
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button onClick={next} className="transition-all active:scale-90 hover:opacity-80">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 17.5a1 1 0 0 0 1.55.83l7-4.5a1 1 0 0 0 0-1.66l-7-4.5A1 1 0 0 0 13 8.5V13L6.55 8.85A1 1 0 0 0 5 9.68v8.64a1 1 0 0 0 1.55.84L13 15v2.5z"/>
                  </svg>
                </button>
              </div>

              {/* iOS-Style Volume Controller */}
              <div className="flex items-center gap-3 shrink-0 px-3 mb-8 text-white/40 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[500ms] fill-mode-both">
                <button onClick={() => setVolume(0)} className="hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  </svg>
                </button>
                <div className="relative flex-1 h-[6px] bg-white/15 rounded-full flex items-center">
                  <div className="absolute left-0 h-full bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
                <button onClick={() => setVolume(1)} className="hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </button>
              </div>

              {/* Inline Lyrics snippet */}
              {showLyrics && currentTrack.lyrics && currentTrack.lyrics.length > 0 && (
                <div className="shrink-0 h-16 overflow-hidden relative mb-2">
                  <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />
                  <div
                    className="flex flex-col gap-2 transition-all duration-500"
                    style={{ transform: `translateY(calc(-${Math.max(0, currentLyricIndex - 1) * 30}px))` }}
                  >
                    {currentTrack.lyrics.map((lyric, i) => (
                      <p
                        key={i}
                        className={`text-sm font-black text-center transition-all duration-400 ${
                          i === currentLyricIndex ? 'text-white' :
                          i < currentLyricIndex ? 'text-white/25' : 'text-white/10'
                        }`}
                      >
                        {lyric.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Bar: EQ | Lyrics | Repeat */}
              <div className="flex items-center justify-between shrink-0 pb-10 pt-2 px-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[600ms] fill-mode-both">
                <button
                  onClick={toggleShuffle}
                  className={`flex items-center justify-center transition-all ${shuffle ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/>
                    <line x1="4" y1="12" x2="14" y2="12"/>
                    <line x1="4" y1="18" x2="11" y2="18"/>
                    <circle cx="18" cy="12" r="2"/>
                    <circle cx="15" cy="18" r="2"/>
                  </svg>
                </button>

                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] font-bold text-[15px] transition-all shadow-md ${
                    showLyrics
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Lyrics
                </button>

                <button
                  onClick={cycleRepeat}
                  className={`flex items-center justify-center transition-all ${repeat !== 'none' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {repeat === 'one' ? (
                      <>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                        <polyline points="17 1 21 5 17 9"/>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                        <polyline points="7 23 3 19 7 15"/>
                        <path d="M10 14h2v5"/>
                      </>
                    ) : (
                      <>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                        <polyline points="17 1 21 5 17 9"/>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                        <polyline points="7 23 3 19 7 15"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════
              DESKTOP LAYOUT  (≥ md)
          ══════════════════════════════════ */}
          <div 
            className="hidden md:flex w-full h-full p-10"
            style={{
              transform: active ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
              opacity: active ? 1 : 0,
              transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease',
            }}
          >
            {/* Immersive BG */}
            <div 
              className="absolute inset-0 z-0 overflow-hidden rounded-[3.5rem]"
              style={{ backgroundColor: `rgba(${dominantRgb[0]}, ${dominantRgb[1]}, ${dominantRgb[2]}, 0.15)` }}
            >
              {currentTrack.coverUrl && (
                <img 
                  src={resolveUrl(currentTrack.coverUrl)} 
                  className="absolute inset-0 w-full h-full object-cover scale-[1.5] blur-[80px] saturate-[1.8] brightness-[1.15] opacity-70 pointer-events-none" 
                  alt="" 
                />
              )}
              <div 
                className="absolute inset-0 opacity-40 blur-[120px] scale-125 pointer-events-none" 
                style={{ backgroundColor: dominantColor }} 
              />
              <div className="absolute inset-0 bg-white/[0.04] backdrop-brightness-[1.05]" />
            </div>

            <div className="relative z-10 w-full h-full glass-panel-dark rounded-[3.5rem] !border-white/10 flex overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.5)]">

              {/* Slim Sidebar */}
              <aside className="w-16 shrink-0 border-r border-white/5 flex flex-col items-center py-10 gap-6">
                {['🏠', '🔍', '❤️', '📂', '⚙️'].map((icon, i) => (
                  <button key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-all text-lg">{icon}</button>
                ))}
                <div className="mt-auto">
                  <button
                    onClick={handleClose}
                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                </div>
              </aside>

              {/* Player Hub */}
              <div className="w-[40%] flex flex-col p-12 gap-8 border-r border-white/5 overflow-y-auto no-scrollbar shrink-0">
                <div className="relative aspect-square w-full max-w-[340px] self-center animate-in fade-in zoom-in-[0.95] duration-700 delay-100 fill-mode-both">
                  <div className="absolute inset-0 bg-white/10 blur-[50px] opacity-20 scale-90" />
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative z-10">
                    {currentTrack.coverUrl ? (
                      <img src={resolveUrl(currentTrack.coverUrl)} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-8xl bg-white/5">🎵</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                  <h1 className="text-3xl font-black text-white tracking-tight truncate">{currentTrack.title}</h1>
                  <p className="text-lg font-bold text-white/40">{currentTrack.artist}</p>
                </div>

                {/* Progress Bar (Waveform removed, clean thicker line without thumb) */}
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                  <div className="relative h-[6px] bg-white/10 rounded-full flex items-center">
                    <div 
                      className="absolute left-0 h-full rounded-full transition-all duration-100" 
                      style={{ 
                        width: `${progressPct}%`, 
                        backgroundColor: dominantColor, 
                        boxShadow: `0 0 10px ${dominantColor}aa` 
                      }} 
                    />
                    <input 
                      type="range" min={0} max={audioDuration || 1} step={0.1} value={localProgress}
                      onMouseDown={() => setDragging(true)} onMouseUp={() => setDragging(false)} onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/40 tracking-wider">
                    <span>{fmtTime(localProgress)}</span>
                    <span>{fmtTime(audioDuration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[400ms] fill-mode-both">
                  <button onClick={toggleShuffle} className={`transition-all ${shuffle ? 'text-white' : 'text-white/10'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                  </button>
                  <button onClick={prev} className="text-white/40 hover:text-white transition-all">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                  </button>
                  <button
                    onClick={togglePlay}
                    className={`w-20 h-20 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none ${!isPlaying ? 'animate-pulse' : ''}`}
                    style={{ color: dominantColor, boxShadow: `0 0 40px ${dominantColor}33` }}
                  >
                    {isPlaying ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <button onClick={next} className="text-white/40 hover:text-white transition-all">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                  </button>
                  <button onClick={cycleRepeat} className={`transition-all ${repeat !== 'none' ? 'text-white' : 'text-white/10'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      {repeat === 'one' ? (
                        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                      ) : (
                        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                      )}
                    </svg>
                  </button>
                </div>

                {/* iOS-Style Volume Controller (Desktop) */}
                <div className="flex items-center gap-3 px-3 mt-4 text-white/30 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[500ms] fill-mode-both">
                  <button onClick={() => setVolume(0)} className="hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    </svg>
                  </button>
                  <div className="relative flex-1 h-[5px] bg-white/10 rounded-full flex items-center">
                    <div className="absolute left-0 h-full bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                  <button onClick={() => setVolume(1)} className="hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Discovery / Lyrics panel */}
              <div className="flex-1 flex flex-col p-12 gap-10 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700 delay-500 fill-mode-both">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">{queue.length > 1 ? 'Próximo na Fila' : 'A Descobrir'}</h2>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">
                      {queue.length > 1 ? `Restam ${queue.length - 1} músicas` : 'Sincronizado com Alpha Radio'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLyrics(!showLyrics)}
                    className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${showLyrics ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/10'}`}
                  >
                    Lyrics
                  </button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (
                    <div className="w-full h-full">
                      <div className="relative h-full overflow-hidden">
                        <div
                          className="flex flex-col gap-6 w-full transition-all duration-700 absolute top-1/3"
                          style={{ transform: `translateY(calc(-20px - ${(currentLyricIndex >= 0 ? currentLyricIndex : 0) * 54}px))` }}
                        >
                          {currentTrack.lyrics.map((lyric, i) => (
                            <p key={i} className={`text-2xl font-black transition-all duration-500 tracking-tight ${
                              i === currentLyricIndex ? 'text-white scale-105' :
                              i < currentLyricIndex ? 'text-white/20 scale-95' : 'text-white/5'
                            }`}>{lyric.text}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-white/10 italic font-bold">
                      Sem letras para esta faixa
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                      {playlists.length > 0 ? `As Minhas Playlists (${playlists.length})` : 'Ouvidas Recentemente'}
                    </h3>
                    <button className="text-[9px] font-bold text-white/10 hover:text-white uppercase tracking-widest transition-colors">Ver Biblioteca</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {playlists.length > 0 ? playlists.slice(0, 5).map((pl: any) => (
                      <div key={pl.id} className="min-w-[160px] p-4 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="w-full aspect-square rounded-3xl bg-white/10 mb-3 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                          {pl.coverUrl
                            ? <img src={resolveUrl(pl.coverUrl)} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center text-3xl">📁</div>}
                        </div>
                        <p className="text-xs font-black text-white truncate">{pl.name}</p>
                        <p className="text-[9px] font-bold text-white/30 mt-1 uppercase tracking-tighter">{pl.tracks?.length || 0} Faixas</p>
                      </div>
                    )) : tracks.slice(0, 6).map((t: any) => (
                      <div key={t.id} onClick={() => useMusicStore.getState().playTrack(t)} className="min-w-[160px] p-4 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="w-full aspect-square rounded-3xl bg-white/10 mb-3 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                          {t.coverUrl
                            ? <img src={resolveUrl(t.coverUrl)} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>}
                        </div>
                        <p className="text-xs font-black text-white truncate">{t.title}</p>
                        <p className="text-[9px] font-bold text-white/30 mt-1 uppercase tracking-tighter">{t.artist}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </>
  );
}
