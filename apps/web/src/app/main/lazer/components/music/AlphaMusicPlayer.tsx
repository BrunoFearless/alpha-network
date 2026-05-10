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
    togglePlay, next, prev, seek, setVolume, setProgress, toggleShuffle, cycleRepeat,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

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
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-75 pointer-events-none" style={{ width: `${progressPct}%` }} />
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
                  className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl text-white border border-white/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.2)] focus:outline-none"
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
              {(currentTrack.lyrics?.length ?? 0) > 0 && (
                <button 
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded transition-all ${showLyrics ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                  🎤
                </button>
              )}
              
              {/* Volume */}
              <div className="flex items-center gap-2 flex-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/40 shrink-0">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
                <div className="relative flex-1 h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-white/60 rounded-full pointer-events-none" style={{ width: `${volume * 100}%` }} />
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

      {/* ── FULL SCREEN PLAYER ── */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-black overflow-hidden animate-in fade-in duration-500">
          {/* Dynamic Background */}
          <div className="absolute inset-0 z-0">
            {currentTrack.coverUrl && (
              <img 
                src={resolveUrl(currentTrack.coverUrl)} 
                className="w-full h-full object-cover blur-[100px] scale-110 opacity-40" 
                alt="" 
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
          </div>

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between px-12 py-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg shadow-xl border border-white/10">🎵</div>
              <span className="text-xs font-black text-white uppercase tracking-[0.3em] opacity-40">Alpha Music Premium</span>
            </div>
            <button 
              onClick={() => setIsFullScreen(false)}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all hover:rotate-90 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 items-center px-12 lg:px-24 gap-16 overflow-hidden">
            
            {/* Left: Artwork & Info */}
            <div className="flex flex-col items-center lg:items-start gap-12 animate-in slide-in-from-left-12 duration-700">
              <div className="relative group">
                <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700 opacity-30" />
                <div className="w-64 h-64 md:w-96 md:h-96 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 relative z-10 transition-transform duration-700 hover:scale-105">
                  {currentTrack.coverUrl ? (
                    <img src={resolveUrl(currentTrack.coverUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl">🎵</div>
                  )}
                </div>
              </div>
              
              <div className="text-center lg:text-left">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 drop-shadow-2xl">{currentTrack.title}</h1>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <p className="text-xl md:text-2xl font-bold text-white/60">{currentTrack.artist}</p>
                  {currentTrack.collaborations && currentTrack.collaborations.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/20 text-xl">×</span>
                      {currentTrack.collaborations.map((c, i) => (
                        <span key={i} className="text-xl md:text-2xl font-bold text-white/40 hover:text-white/80 cursor-pointer transition-colors">
                          {c.user.profile.displayName}{i < currentTrack.collaborations!.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Lyrics (Karaoke) */}
            <div className="h-full flex flex-col justify-center items-center lg:items-start overflow-hidden py-12">
              {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (() => {
                const currentLyricIndex = currentTrack.lyrics.findIndex((l, i) => {
                  const nextL = currentTrack.lyrics![i + 1];
                  return localProgress >= l.time && (!nextL || localProgress < nextL.time);
                });

                return (
                  <div className="w-full h-full relative overflow-hidden flex flex-col items-center lg:items-start p-4">
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />
                    
                    <div 
                      className="flex flex-col gap-10 w-full transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] absolute top-1/2 text-center lg:text-left"
                      style={{ transform: `translateY(calc(-40px - ${(currentLyricIndex >= 0 ? currentLyricIndex : 0) * 88}px))` }}
                    >
                      {currentTrack.lyrics.map((lyric, i) => {
                        const isActive = i === currentLyricIndex;
                        const isPast = i < currentLyricIndex;
                        return (
                          <p 
                            key={i} 
                            className={`text-4xl md:text-6xl font-black transition-all duration-700 tracking-tight cursor-pointer ${
                              isActive ? 'text-white scale-110 drop-shadow-[0_0_40px_rgba(255,255,255,0.6)]' : 
                              isPast ? 'text-white/30 scale-95 blur-[1px]' : 'text-white/10 scale-90 blur-[2px] hover:text-white/30'
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
              })() : (
                <div className="flex flex-col items-center lg:items-start gap-4 text-white/20">
                  <div className="text-8xl">🎵</div>
                  <p className="text-2xl font-black uppercase tracking-widest">Sem letras sincronizadas</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar: Reusing standard controls with larger scale */}
          <div className="relative z-10 px-12 pb-16 pt-8 bg-gradient-to-t from-black/60 to-transparent">
            {/* Enhanced Progress Slider */}
            <div className="max-w-5xl mx-auto mb-12">
              <div className="flex items-center justify-between text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">
                <span>{fmtTime(localProgress)}</span>
                <span className="text-white/60">{currentTrack.title}</span>
                <span>{fmtTime(audioDuration)}</span>
              </div>
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden group cursor-pointer shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-75" 
                  style={{ width: `${progressPct}%` }} 
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
            </div>

            {/* Large Controls */}
            <div className="flex items-center justify-center gap-12">
              <button onClick={toggleShuffle} className={`text-2xl transition-all hover:scale-110 ${shuffle ? 'text-white drop-shadow-[0_0_15px_white]' : 'text-white/20'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
              </button>
              <button onClick={prev} className="text-white/60 hover:text-white transition-all hover:scale-125 active:scale-90">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>
              <button
                onClick={togglePlay}
                className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.4)]"
              >
                {isPlaying ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button onClick={next} className="text-white/60 hover:text-white transition-all hover:scale-125 active:scale-90">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
              <button onClick={cycleRepeat} className={`text-2xl transition-all hover:scale-110 ${repeat !== 'none' ? 'text-white drop-shadow-[0_0_15px_white]' : 'text-white/20'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  {repeat === 'one' ? (
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                  ) : (
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
