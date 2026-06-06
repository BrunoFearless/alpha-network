import { useEffect, useRef, useState } from 'react';
import { useWatchStore } from '@/store/watch.store';
import { resolveUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  onExpand: () => void;
}

export function AlphaWatchPiP({ onExpand }: Props) {
  const { pipVideo, setPipVideo, setCurrentVideo } = useWatchStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!pipVideo || !videoRef.current) return;

    // Restore volume
    const savedVolume = localStorage.getItem('alpha_watch_volume');
    if (savedVolume !== null) {
      const v = parseFloat(savedVolume);
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }

    // Auto-play when PiP opens
    videoRef.current.play().catch(console.error);
  }, [pipVideo]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!pipVideo) return;
    const target = e.target as HTMLVideoElement;
    // Restore exact time
    const savedTime = localStorage.getItem(`alpha_watch_time_${pipVideo.id}`);
    if (savedTime !== null) {
      target.currentTime = parseFloat(savedTime);
    }
  };

  const handleTimeUpdate = () => {
    if (!pipVideo || !videoRef.current) return;
    const current = videoRef.current.currentTime;
    if (Math.floor(current) % 2 === 0) {
      localStorage.setItem(`alpha_watch_time_${pipVideo.id}`, current.toString());
    }
  };

  const handleExpand = () => {
    if (!pipVideo) return;
    // Make sure we save the very latest time before expanding
    if (videoRef.current) {
      localStorage.setItem(`alpha_watch_time_${pipVideo.id}`, videoRef.current.currentTime.toString());
    }
    setCurrentVideo(pipVideo);
    setPipVideo(null);
    onExpand();
  };

  const handleClose = () => {
    if (videoRef.current && pipVideo) {
      localStorage.setItem(`alpha_watch_time_${pipVideo.id}`, videoRef.current.currentTime.toString());
    }
    setPipVideo(null);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  if (!pipVideo) return null;


  const isVertical = pipVideo.format === 'vertical';

  return (
    <div 
      className={`fixed bottom-6 right-6 z-[400] overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-black animate-in slide-in-from-bottom-8 duration-300 ${isVertical ? 'w-[140px] aspect-[9/16]' : 'w-[280px] aspect-video'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={resolveUrl(pipVideo.videoUrl)}
        className="w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
        playsInline
      />

      {/* Hover Controls */}
      <div 
        className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-4 transition-opacity duration-200 pointer-events-none ${isHovered || !playing ? 'opacity-100' : 'opacity-0'}`}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all pointer-events-auto active:scale-95"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
      </div>

      {/* Top right actions (Always visible on hover) */}
      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={handleExpand}
          className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-all active:scale-95"
          title="Expandir"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded-full bg-red-500/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500/80 transition-all active:scale-95"
          title="Fechar"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
