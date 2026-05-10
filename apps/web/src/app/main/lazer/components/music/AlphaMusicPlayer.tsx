'use client';
import { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '@/store/music.store';

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function AlphaMusicPlayer() {
  const {
    currentTrack, isPlaying, volume, progress, repeat, shuffle,
    queue, playlists, tracks,
    togglePlay, next, prev, seek, setVolume, setProgress, toggleShuffle, cycleRepeat,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dominantColor, setDominantColor] = useState('rgba(255,255,255,0.5)');

  // Dynamic Color Extraction
  useEffect(() => {
    if (!currentTrack?.coverUrl) {
      setDominantColor('rgba(255,255,255,0.5)');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = resolveUrl(currentTrack.coverUrl);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setDominantColor(`rgb(${r}, ${g}, ${b})`);
    };
  }, [currentTrack?.coverUrl]);

  // Sync play/pause
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying, currentTrack]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Track time progress
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

  if (!currentTrack) return null;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  const progressPct = audioDuration > 0 ? (localProgress / audioDuration) * 100 : 0;

  return (
    <>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={resolveUrl(currentTrack.audioUrl)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)}
        onEnded={handleEnded}
        preload="auto"
      />

      {/* Player Bar — anchored exactly to the content area padding box */}
      <div className="absolute bottom-6 left-6 right-6 z-[300] animate-in slide-in-from-bottom-4 duration-500">
        <div className="relative overflow-hidden glass-panel-dark rounded-[3rem] !border-none !shadow-[0_20px_80px_rgba(0,0,0,0.4)] transition-all duration-500">
          
          {/* Synchronized Lyrics Panel */}
          {showLyrics && currentTrack.lyrics && currentTrack.lyrics.length > 0 && (() => {
            const currentLyricIndex = currentTrack.lyrics.findIndex((l, i) => {
              const nextL = currentTrack.lyrics![i + 1];
              return localProgress >= l.time && (!nextL || localProgress < nextL.time);
            });
            
            return (
              <div className="w-full h-80 bg-black/20 border-b border-white/5 relative overflow-hidden flex flex-col items-center p-8 animate-in slide-in-from-bottom-8 duration-500">
                {/* Fade masks for top and bottom */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
                
                <div 
                  className="flex flex-col gap-6 w-full max-w-3xl text-center transition-transform duration-500 ease-out absolute top-1/2"
                  style={{ transform: `translateY(calc(-50px - ${(currentLyricIndex >= 0 ? currentLyricIndex : 0) * 56}px))` }}
                >
                  {currentTrack.lyrics.map((lyric, i) => {
                    const isActive = i === currentLyricIndex;
                    const isPast = i < currentLyricIndex;
                    return (
                      <p 
                        key={i} 
                        className={`text-3xl md:text-4xl font-black transition-all duration-500 tracking-tight cursor-pointer hover:text-white ${
                          isActive ? 'text-white scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]' : 
                          isPast ? 'text-white/40 scale-95 blur-[0.5px]' : 'text-white/20 scale-90 blur-[1px]'
                        }`}
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = lyric.time;
                        }}
                      >
                        {lyric.text}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Progress Bar (on top) */}
          <div className="relative w-full h-[3px] bg-white/10 group cursor-pointer z-20">
            <div 
              className="h-full transition-all duration-500 pointer-events-none" 
              style={{ width: `${progressPct}%`, backgroundColor: dominantColor }} 
            />
            <input
              type="range" min={0} max={audioDuration || 1} step={0.1}
              value={localProgress}
              onMouseDown={() => setDragging(true)}
              onMouseUp={() => setDragging(false)}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-4 px-6 py-4 relative z-20">
            
            {/* Track Info (Click to FullScreen) */}
            <div 
              className="flex items-center gap-3 w-64 shrink-0 cursor-pointer group/info"
              onClick={() => setIsFullScreen(true)}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0 shadow-lg transition-transform group-hover/info:scale-110">
                {currentTrack.coverUrl ? (
                  <img src={resolveUrl(currentTrack.coverUrl)} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate flex items-center gap-2">
                  {currentTrack.title}
                  {currentTrack.lyrics?.length ? <span className="text-[8px] bg-white/20 px-1 rounded uppercase tracking-wider">LYRICS</span> : null}
                </p>
                <p className="text-[10px] text-white/40 truncate">
                  {currentTrack.artist}
                  {currentTrack.collaborations?.map(c => ` & ${c.user.profile.displayName}`).join('')}
                </p>
              </div>
            </div>

            {/* Center Controls */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-center gap-5">
                {/* Shuffle */}
                <button onClick={toggleShuffle} className={`text-lg transition-all hover:scale-110 ${shuffle ? 'opacity-100 drop-shadow-[0_0_8px_white]' : 'opacity-30'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                  </svg>
                </button>
                {/* Prev */}
                <button onClick={prev} className="text-white/60 hover:text-white transition-colors hover:scale-110 active:scale-95">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                </button>
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all focus:outline-none shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  style={{ color: 'white' }}
                >
                  {isPlaying ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                {/* Next */}
                <button onClick={next} className="text-white/60 hover:text-white transition-colors hover:scale-110 active:scale-95">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
                {/* Repeat */}
                <button onClick={cycleRepeat} className={`transition-all hover:scale-110 ${repeat !== 'none' ? 'opacity-100 drop-shadow-[0_0_8px_white]' : 'opacity-30'}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    {repeat === 'one' ? (
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                    ) : (
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                    )}
                  </svg>
                </button>
              </div>
              {/* Time */}
              <div className="flex items-center gap-2 text-[9px] font-black text-white/30 tracking-widest mt-1">
                <span>{fmtTime(localProgress)}</span>
                <span>/</span>
                <span>{fmtTime(audioDuration)}</span>
              </div>
            </div>

            {/* Right Side: Lyrics Toggle & Volume */}
            <div className="flex items-center gap-4 w-48 shrink-0 justify-end">
              {/* Lyrics Toggle */}
                <button 
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${showLyrics ? 'bg-white text-black shadow-lg scale-110' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                  title="Letras"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                </button>
              
              {/* Volume Control */}
              <div className="flex items-center gap-3 w-32 shrink-0 group/vol">
                <button className="text-white/40 hover:text-white transition-colors" onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
                  {volume === 0 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  )}
                </button>
                <div className="relative flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300" 
                    style={{ width: `${volume * 100}%`, backgroundColor: dominantColor }} 
                  />
                  <input
                    type="range" min={0} max={1} step={0.01} value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FULL SCREEN PLAYER (ALPHA STANDARDS REFACTOR) ── */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[1000] flex p-10 animate-in fade-in duration-700 overflow-hidden">
          
          {/* Immersive Dynamic Background */}
          <div className="absolute inset-0 z-0">
            {currentTrack.coverUrl ? (
              <div className="relative w-full h-full">
                <img 
                  src={resolveUrl(currentTrack.coverUrl)} 
                  className="w-full h-full object-cover scale-110 blur-[100px] opacity-40 transition-opacity duration-1000"
                  alt=""
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            ) : (
              <div className="w-full h-full bg-black/10 backdrop-blur-3xl" />
            )}
            {/* Pulsing Aura Glow (Intensified) */}
            <div 
              className="absolute inset-0 z-0 opacity-40 blur-[140px] scale-125 transition-all duration-1000"
              style={{ backgroundColor: dominantColor }}
            />
          </div>

          {/* Main Glass Shell */}
          <div className="w-full h-full glass-panel-dark rounded-[3.5rem] !border-white/10 flex overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
            
            {/* 1. ULTRA SLIM SIDEBAR */}
            <aside className="w-16 shrink-0 border-r border-white/5 flex flex-col items-center py-10 gap-6">
              {['🏠', '🔍', '❤️', '📂', '⚙️'].map((icon, i) => (
                <button key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-all text-lg">
                  {icon}
                </button>
              ))}
              <div className="mt-auto">
                <button 
                  onClick={() => setIsFullScreen(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                </button>
              </div>
            </aside>

            {/* 2. PLAYER HUB (LEFT) */}
            <div className="w-[40%] flex flex-col p-12 gap-8 border-r border-white/5 overflow-y-auto no-scrollbar">
              {/* Floating Album Art Card */}
              <div className="relative aspect-square w-full max-w-[340px] self-center">
                <div className="absolute inset-0 bg-white/10 blur-[50px] opacity-20 scale-90" />
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative z-10">
                  {currentTrack.coverUrl ? (
                    <img src={resolveUrl(currentTrack.coverUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl bg-white/5">🎵</div>
                  )}
                </div>
              </div>

              {/* Title & Info */}
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-xl truncate">{currentTrack.title}</h1>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-white/40">{currentTrack.artist}</p>
                  {currentTrack.collaborations && currentTrack.collaborations.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                      <span className="text-[10px] font-black text-white/60">
                        + {currentTrack.collaborations.length} {currentTrack.collaborations.length === 1 ? 'COLAB' : 'COLABS'}
                      </span>
                    </div>
                  )}
                </div>
                {/* List names of collaborators if any */}
                {currentTrack.collaborations && currentTrack.collaborations.length > 0 && (
                  <p className="text-[10px] font-bold text-white/20 mt-1">
                    com {currentTrack.collaborations.map(c => c.user.profile.displayName).join(', ')}
                  </p>
                )}
              </div>

              {/* Progress & Waveform */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-[9px] font-black text-white/20 uppercase tracking-widest">
                  <span>{fmtTime(localProgress)}</span>
                  <span>{fmtTime(audioDuration)}</span>
                </div>
                <div className="relative h-10 flex items-center gap-1">
                   {Array.from({ length: 40 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-full transition-all duration-500`} 
                      style={{ 
                        height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}%`,
                        backgroundColor: (i/40)*100 <= progressPct ? dominantColor : 'rgba(255,255,255,0.1)',
                        boxShadow: (i/40)*100 <= progressPct ? `0 0 10px ${dominantColor}44` : 'none'
                      }}
                    />
                  ))}
                  <input
                    type="range" min={0} max={audioDuration || 1} step={0.1}
                    value={localProgress}
                    onMouseDown={() => setDragging(true)}
                    onMouseUp={() => setDragging(false)}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-10">
                <button onClick={toggleShuffle} className={`text-xl transition-all ${shuffle ? 'text-white' : 'text-white/10'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
                </button>
                <button onClick={prev} className="text-white/40 hover:text-white transition-all">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                </button>
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all focus:outline-none"
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
                <button onClick={cycleRepeat} className={`text-xl transition-all ${repeat !== 'none' ? 'text-white' : 'text-white/10'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    {repeat === 'one' ? (
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                    ) : (
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* 3. DISCOVERY & CONTENT (RIGHT) */}
            <div className="flex-1 flex flex-col p-12 gap-10 overflow-hidden">
              
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {queue.length > 1 ? 'Próximo na Fila' : 'A Descobrir'}
                  </h2>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">
                    {queue.length > 1 ? `Restam ${queue.length - 1} músicas` : 'Sincronizado com Alpha Radio'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </button>
                </div>
              </div>

              {/* Central Content: Lyrics or Queue */}
              <div className="flex-1 overflow-hidden relative">
                {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (() => {
                  const currentLyricIndex = currentTrack.lyrics.findIndex((l, i) => {
                    const nextL = currentTrack.lyrics![i + 1];
                    return localProgress >= l.time && (!nextL || localProgress < nextL.time);
                  });

                  return (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex-1 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#111]/40 to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#111]/40 to-transparent z-10 pointer-events-none" />
                        
                        <div 
                          className="flex flex-col gap-6 w-full transition-all duration-700 absolute top-1/3"
                          style={{ transform: `translateY(calc(-20px - ${(currentLyricIndex >= 0 ? currentLyricIndex : 0) * 54}px))` }}
                        >
                          {currentTrack.lyrics.map((lyric, i) => (
                            <p 
                              key={i} 
                              className={`text-2xl font-black transition-all duration-500 tracking-tight ${
                                i === currentLyricIndex ? 'text-white scale-105' : 
                                i < currentLyricIndex ? 'text-white/20 scale-95' : 'text-white/5'
                              }`}
                            >
                              {lyric.text}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center h-full text-white/10 italic font-bold">
                    Sem letras para esta faixa
                  </div>
                )}
              </div>

              {/* Bottom: Playlists/Recent Section */}
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
                        {pl.coverUrl ? (
                          <img src={resolveUrl(pl.coverUrl)} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">📁</div>
                        )}
                      </div>
                      <p className="text-xs font-black text-white truncate">{pl.name}</p>
                      <p className="text-[9px] font-bold text-white/30 mt-1 uppercase tracking-tighter">{pl.tracks?.length || 0} Faixas</p>
                    </div>
                  )) : tracks.slice(0, 6).map((t: any) => (
                    <div key={t.id} onClick={() => useMusicStore.getState().playTrack(t)} className="min-w-[160px] p-4 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                      <div className="w-full aspect-square rounded-3xl bg-white/10 mb-3 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                        {t.coverUrl ? (
                          <img src={resolveUrl(t.coverUrl)} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
                        )}
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
      )}
    </>
  );
}
