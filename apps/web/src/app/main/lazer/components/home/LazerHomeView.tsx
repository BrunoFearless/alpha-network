'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { LazerUserProfile } from '../profile/types';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';
import { resolveUrl } from '@/lib/api';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { EmojiPicker } from '@/components/community/EmojiPicker';
import { TropesModal } from '../modals/TropesModal';
import { YoutubeEmbed, extractYoutubeId } from '@/components/ui/YoutubeEmbed';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconComment = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconRepost = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
const IconHeart = ({ filled, size = 16 }: { filled?: boolean; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
const IconShare = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
const IconDots = ({ size = 18 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>;
const IconImage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const IconSparkle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>;
const IconTag = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
const IconAddUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
const IconUserCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>;
const IconVerified = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c4dff"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const IconEmoji = ({ size = 18 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>;
const IconEdit = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconPin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 10.5C5 7 8.134 4 12 4s7 3 7 6.5c0 2-1.2 3.8-3 5l-4 2.5-4-2.5c-1.8-1.2-3-3-3-5z" /><circle cx="12" cy="10" r="2" /></svg>;
const IconUnpin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22" /><line x1="12" y1="17" x2="12" y2="22" /><path d="M7.3 7.3A7 7 0 0 0 5 10.5c0 2 1.2 3.8 3 5l.5.3" /></svg>;

const resolveLazerMediaUrl = (url?: string) => resolveUrl(url);
const IconTrash = ({ size = 15 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
const IconEyeOff = ({ size = 15 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
const IconReply = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>;
const IconClose = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>;
const IconUserX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>;
const IconClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconFlame = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
const IconUsers = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconTv = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" /></svg>;
const IconMessageSquare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconHash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>;
const IconPlay = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
const IconPause = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const IconForward10 = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5V3l4 4-4 4V9c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6" /><path d="M12 13v4" /><path d="M15 13v4" /></svg>;
const IconBackward10 = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5V3l-4 4 4 4V9c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6" /><path d="M12 13v4" /><path d="M9 13v4" /></svg>;
const IconVolume = ({ level }: { level: number }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5L6 9H2v6h4l5 4V5z" />
    {level > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
    {level > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
    {level === 0 && (
      <>
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </>
    )}
  </svg>
);
const IconExpand = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>;

// ─── Modern Video Player ──────────────────────────────────────────────────────
function ModernVideoPlayer({ src, className, onClick, autoPlay = true, loop = true, accentColor = '#7c4dff', showControlsEnabled = true, initialMuted = true }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const controlsTimeout = useRef<any>(null);

  // Sync isMuted with initialMuted on mount/prop change
  useEffect(() => {
    setIsMuted(initialMuted);
  }, [initialMuted]);

  // Auto-play/pause based on viewport visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.2, rootMargin: '100px' }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isIntersecting) {
      // Re-assign src if it was cleared by optimization
      if (!videoRef.current.src || videoRef.current.src === window.location.href) {
        videoRef.current.src = src;
        videoRef.current.load();
      }
      if (playing) videoRef.current.play().catch(() => { });
    } else {
      videoRef.current.pause();
      // Optimization: Force browser to stop buffering when not visible
      // This is crucial for long feeds with many heavy videos
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, [isIntersecting, playing, src]);

  const handleMouseMove = () => {
    if (!showControlsEnabled) return;
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = (e: any) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        videoRef.current.play().catch(() => { });
        setPlaying(true);
      }
    }
  };

  const skip = (seconds: number, e: any) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime += seconds;
    setShowControls(true);
  };

  const handleProgress = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const onSeek = (e: any) => {
    e.stopPropagation();
    const pos = e.target.value;
    if (videoRef.current) {
      videoRef.current.currentTime = (pos / 100) * videoRef.current.duration;
      setProgress(pos);
    }
  };

  const IconLargePlay = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="">
      <path d="M8 5v14l11-7z" />
    </svg>
  );

  const IconLargePause = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );

  return (
    <div ref={containerRef} className={`relative group ${className} overflow-hidden bg-black cursor-pointer`}
      onClick={(e) => {
        if (!showControlsEnabled) onClick?.();
        else togglePlay(e);
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}>
      <video
        ref={videoRef}
        src={isIntersecting ? src : undefined}
        loop={loop}
        muted={isMuted}
        playsInline
        preload="metadata"
        onTimeUpdate={handleProgress}
        className="w-full h-full object-contain"
      />

      {/* Central Controls Overlay */}
      {showControlsEnabled && (
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
          <div className="flex items-center gap-16 px-12 py-8 bg-transparent">
            <button onClick={(e) => skip(-10, e)} className="bg-transparent border-none text-white cursor-pointer opacity-70 hover:opacity-100 hover:scale-125 transition-all">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5V3l-4 4 4 4V9c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6" /><path d="M12 13v4" /><path d="M9 13v4" /></svg>
            </button>
            <div className="text-white flex items-center justify-center pointer-events-none transition-all">
              {playing ? <IconLargePause /> : <IconLargePlay />}
            </div>
            <button onClick={(e) => skip(10, e)} className="bg-transparent border-none text-white cursor-pointer opacity-70 hover:opacity-100 hover:scale-125 transition-all">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5V3l4 4-4 4V9c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6" /><path d="M12 13v4" /><path d="M15 13v4" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Controls Panel */}
      {showControlsEnabled && (
        <div className={`absolute bottom-0 left-0 right-0 p-6 pt-10 transition-all duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
          <div className="relative w-full h-1 group/progress mb-4" onClick={e => e.stopPropagation()}>
            <input type="range" min="0" max="100" value={progress} onChange={onSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-100" style={{ width: `${progress}%`, background: accentColor }} />
            </div>
          </div>

          <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-6">
              <button onClick={togglePlay} className="bg-transparent border-none text-white cursor-pointer hover:scale-110 transition-transform">
                {playing ? <IconPause /> : <IconPlay />}
              </button>
              <div className="flex items-center gap-3 group/volume">
                <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="bg-transparent border-none text-white cursor-pointer"><IconVolume level={isMuted ? 0 : volume} /></button>
                <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-0 group-hover/volume:w-24 transition-all duration-300 h-1 accent-white" />
              </div>
            </div>
            <button onClick={onClick} className="bg-transparent border-none text-white cursor-pointer hover:scale-110 transition-transform"><IconExpand /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Community Preview Card ──────────────────────────────────────────────────
function CommunityPreviewCard({ community, onClick, c, isLight, borderCol, cardBg, textPrimary, textSecondary }: any) {
  const icon = community.iconUrl;
  const banner = community.bannerUrl;

  return (
    <div onClick={onClick} className={`group cursor-pointer rounded-[24px] overflow-hidden border-[1.5px] transition-all hover:scale-[1.02] ${cardBg}`}
      style={{ borderColor: borderCol }}>
      <div className="h-20 relative bg-cover bg-center" style={{ backgroundImage: banner ? `url(${banner})` : `linear-gradient(135deg, ${c}dd, ${c}44)` }}>
        {banner?.match(/\.(mp4|webm|mov)(\?|$)/i) && <video src={banner} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
      </div>
      <div className="px-4 pb-4 pt-10 relative">
        <div className="absolute -top-7 left-4">
          <div className="w-14 h-14 rounded-[18px] border-[3px] overflow-hidden bg-cover bg-center"
            style={{ borderColor: isLight ? '#fff' : '#09090b', backgroundColor: icon ? 'transparent' : c, backgroundImage: icon ? `url(${icon})` : 'none' }}>
            {!icon && <span className="flex items-center justify-center h-full text-2xl">🌐</span>}
            {icon?.match(/\.(mp4|webm|mov)(\?|$)/i) && <video src={icon} autoPlay muted loop playsInline className="w-full h-full object-cover" />}
          </div>
        </div>
        <div className="flex flex-col">
          <h4 className={`font-black text-sm uppercase tracking-tight truncate ${textPrimary}`}>{community.name}</h4>
          <div className="flex items-center gap-3 mt-1.5 ">
            <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider" style={{ color: c }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c }} />
              {community.onlineCount ?? 0} online
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>
              {community.membersCount?.toLocaleString() ?? 0} membros
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PREMIUM_FONTS = [
  { id: 'default', label: 'Default', family: "'Nunito', sans-serif" },
  { id: 'serif', label: 'Serif', family: "'Playfair Display', serif" },
  { id: 'mono', label: 'Mono', family: "'Fira Code', monospace" },
  { id: 'display', label: 'Display', family: "'Outfit', sans-serif" },
  { id: 'elegant', label: 'Elegant', family: "'Libre Baskerville', serif" },
];

const PREMIUM_COLORS_LIST = [
  { id: 'L-green', value: '#A5E600', label: 'Green' },
  { id: 'pink', value: '#ff9ef0', label: 'Neon' },
  { id: 'gold', value: '#ffeb3b', label: 'Gold' },
  { id: 'blue', value: '#22d3ee', label: 'Alpha' },
  { id: 'green', value: '#86efac', label: 'Green' },
  { id: 'orange', value: '#ffb07c', label: 'Flame' },
  { id: 'red', value: "#ef4444", label: 'Red' },

];

function formatContent(content: string, postTitleFont?: string | null, postTitleColor?: string | null, isLight?: boolean) {
  if (!content) return null;
  const lines = content.split('\n');
  const title = lines[0];
  const body = lines.slice(1).join('\n');
  const fontData = PREMIUM_FONTS.find(f => f.id === postTitleFont) || PREMIUM_FONTS[0];
  const titleCol = postTitleColor || (isLight ? '#000000' : '#ffffff');
  return (
    <div className="flex flex-col">
      <div className="font-black text-[24px] xl:text-[28px] leading-[1.05] tracking-tight uppercase mb-2" style={{ fontFamily: fontData.family, color: titleCol }}>
        <EmojiRenderer content={title} emojiSize={28} />
      </div>
      {body && <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${isLight ? 'text-black font-medium' : 'text-white/70'}`}><EmojiRenderer content={body} emojiSize={20} /></div>}
    </div>
  );
}

// ─── Helper: get author info from post ───────────────────────────────────────
function getAuthorInfo(post: any, authUser: any, myProfile: any) {
  const isOwn = post.authorId === authUser?.id;
  // Always prefer the embedded author.profile from the API
  const apiProfile = post.author?.profile;
  if (apiProfile) {
    return {
      name: apiProfile.displayName || apiProfile.username || 'Utilizador',
      handle: `@${apiProfile.username || 'user'}`,
      avatar: apiProfile.avatarUrl || null,
      profile: apiProfile,
    };
  }
  // Fallback: if it's own post, use local auth state
  if (isOwn && myProfile) {
    return {
      name: myProfile.displayName || myProfile.username || 'Eu',
      handle: `@${myProfile.username || 'user'}`,
      avatar: myProfile.avatarUrl || null,
      profile: myProfile,
    };
  }
  return {
    name: 'Utilizador',
    handle: '@user',
    avatar: null,
    profile: null,
  };
}

// ─── Comment Item ─────────────────────────────────────────────────────────────
function CommentItem({
  cm, allComments, postId, postAuthorId, authUser, myProfile, isLight, c,
  textPrimary, textSecondary, borderCol, cardBg,
  hiddenComments, setHiddenComments, onReply, nested = false
}: {
  cm: any; allComments: any[]; postId: string; postAuthorId: string;
  authUser: any; myProfile: any; isLight: boolean; c: string;
  textPrimary: string; textSecondary: string; borderCol: string; cardBg: string;
  hiddenComments: Set<string>; setHiddenComments: (v: Set<string>) => void;
  onReply: (cm: any) => void; nested?: boolean;
}) {
  const { deleteComment, toggleCommentReaction } = useLazerStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (hiddenComments.has(cm.id)) return null;

  const replies = allComments.filter(r => r.parentId === cm.id);
  const isAuthor = cm.authorId === authUser?.id;
  const isPostOwner = postAuthorId === authUser?.id;
  const canDelete = isAuthor || isPostOwner;

  // Get comment author info
  const commentProfile = cm.author?.profile;
  const authorName = commentProfile?.displayName || commentProfile?.username || 'Utilizador';
  const authorAvatar = commentProfile?.avatarUrl || null;

  const bubbleBg = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const menuBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(14,14,20,0.97)';

  return (
    <div className={`flex flex-col ${nested ? 'ml-9 mt-1' : 'mt-3'} relative`}>
      {nested && <div className="absolute -left-5 top-0 bottom-4 w-px opacity-20" style={{ background: isLight ? '#000' : '#fff' }} />}
      {nested && <div className="absolute -left-5 top-3 h-px w-5 opacity-20" style={{ background: isLight ? '#000' : '#fff' }} />}

      <div className="flex gap-2.5 items-start relative group/comment"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}>
        <Avatar src={authorAvatar} name={authorName} size={nested ? 'xs' : 'sm'} style={{ flexShrink: 0, marginTop: 2 }} />

        <div className="flex-1 min-w-0">
          <div className="inline-flex flex-col rounded-2xl px-3.5 py-2.5 relative" style={{ background: bubbleBg, border: `1px solid ${borderCol}20`, maxWidth: '100%' }}>
            <DisplayName
              profile={commentProfile}
              fallbackName={authorName}
              style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: 2, cursor: 'pointer' }}
            />
            <div className={`text-[13px] leading-snug ${textSecondary} font-medium`}>
              <EmojiRenderer content={cm.content} emojiSize={16} />
            </div>
            {(cm._count?.reactions > 0 || cm.isLiked) && (
              <div className="absolute -right-2.5 -bottom-2 px-1.5 py-0.5 rounded-full border flex items-center gap-1 "
                style={{ background: isLight ? '#fff' : '#1e1e2e', borderColor: borderCol }}>
                <span style={{ color: c, fontSize: 10 }}><IconHeart filled size={10} /></span>
                <span className={`text-[10px] font-black ${textPrimary}`}>{Math.max(1, cm._count?.reactions || 0)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1.5 ml-1 text-[10px] font-black uppercase tracking-widest">
            <button onClick={() => toggleCommentReaction(postId, cm.id)}
              className="bg-transparent border-none cursor-pointer flex items-center gap-1 transition-all hover:scale-105"
              style={{ color: cm.isLiked ? c : (isLight ? '#999' : '#666') }}>
              <IconHeart filled={cm.isLiked} size={12} /> Gosto
            </button>
            <button onClick={() => onReply(cm)}
              className="bg-transparent border-none cursor-pointer flex items-center gap-1 transition-colors hover:opacity-80"
              style={{ color: isLight ? '#999' : '#666' }}>
              <IconReply /> Responder
            </button>
            <button onClick={() => { const s = new Set(hiddenComments); s.add(cm.id); setHiddenComments(s); }}
              className="bg-transparent border-none cursor-pointer transition-colors hover:opacity-80"
              style={{ color: isLight ? '#bbb' : '#444' }}>
              Ocultar
            </button>
            <span style={{ color: isLight ? '#ccc' : '#333', fontSize: 9 }}>
              {new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {/* Menu with delete */}
            <div className="relative ml-auto">
              {(hovered || canDelete) && (
                <button onClick={() => setMenuOpen(o => !o)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors"
                  style={{ color: isLight ? '#999' : '#666', opacity: hovered ? 1 : 0 }}>
                  <IconDots size={14} />
                </button>
              )}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] rounded-xl border py-1 "
                    style={{ background: menuBg, borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}>
                    {canDelete && (
                      <button onClick={() => { deleteComment(postId, cm.id); setMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[12px] text-red-500 hover:bg-red-500/10 border-none bg-transparent cursor-pointer flex items-center gap-2 font-bold">
                        <IconTrash /> {isAuthor ? 'Eliminar' : 'Remover'}
                      </button>
                    )}
                    <button onClick={() => { const s = new Set(hiddenComments); s.add(cm.id); setHiddenComments(s); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[12px] border-none bg-transparent cursor-pointer flex items-center gap-2 hover:bg-black/5"
                      style={{ color: isLight ? '#666' : '#aaa' }}>
                      <IconEyeOff /> Ocultar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="flex flex-col">
          {replies.map(reply => (
            <CommentItem key={reply.id} cm={reply} allComments={allComments} postId={postId} postAuthorId={postAuthorId}
              authUser={authUser} myProfile={myProfile} isLight={isLight} c={c} textPrimary={textPrimary}
              textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg}
              hiddenComments={hiddenComments} setHiddenComments={setHiddenComments}
              onReply={onReply} nested />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, isOwner, openModal, onProfileClick, authUser, myProfile, isLight, c, textPrimary, textSecondary, cardBg, borderCol, setSelectedPostId, setInitialMediaIndex }: {
  post: any; isOwner: boolean; openModal: (focus?: boolean) => void; onProfileClick?: (userId: string) => void;
  authUser: any; myProfile: any; isLight: boolean; c: string; textPrimary: string; textSecondary: string; cardBg: string; borderCol: string;
  setSelectedPostId: (id: string | null) => void; setInitialMediaIndex: (idx: number) => void;
}) {
  const { deletePost, editPost, pinPost, fetchComments, addComment, comments, feedPosts, toggleReaction } = useLazerStore();
  const { isFriend, hasSentRequest, sendFriendRequest, cancelFriendRequest, removeFriend } = useLazerStore();

  const rawPost = feedPosts.find(p => p.id === post.id);
  const isPinned = rawPost?.isPinned ?? false;
  const isLiked = rawPost?.isLiked ?? false;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editFont, setEditFont] = useState(rawPost?.titleFont || 'default');
  const [editColor, setEditColor] = useState(rawPost?.titleColor || '');
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hiddenComments, setHiddenComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const commentRef = useRef<HTMLInputElement>(null);
  const postComments = comments[post.id] || [];

  // Get author info from the post's embedded data
  const authorInfo = getAuthorInfo(rawPost || post, authUser, myProfile);
  const friendStatus = isFriend(post.authorId) ? 'friend' : hasSentRequest(post.authorId) ? 'sent' : 'none';

  const handleToggleComments = async () => {
    if (!showComments && !comments[post.id]) await fetchComments(post.id);
    setShowComments(v => !v);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    await addComment(post.id, commentText.trim(), replyingTo?.id);
    setCommentText(''); setReplyingTo(null);
    setSubmitting(false);
  };

  const handleSaveEdit = async () => {
    await editPost(post.id, editContent, undefined, undefined, editFont !== 'default' ? editFont : undefined, editColor || undefined);
    setEditing(false);
  };

  const handleFriendBtn = () => {
    if (friendStatus === 'friend') removeFriend(post.authorId);
    else if (friendStatus === 'sent') cancelFriendRequest(post.authorId);
    else sendFriendRequest(post.authorId);
  };

  const menuBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,18,0.97)';
  const PREMIUM_COLORS = [...PREMIUM_COLORS_LIST, { id: 'dynamic', value: isLight ? '#000' : '#fff', label: isLight ? 'Black' : 'Pure' }];

  // Ensure rawPost is typed correctly if possible, or default to any.
  const tropesList = rawPost?.tropes || post.tropes || [];

  return (
    <div className="glass-card rounded-3xl transition-all duration-500 overflow-hidden" style={isPinned ? { borderColor: c } : undefined}>
      <div className="glass-shine-effect" />
      {isPinned && (
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0 text-[11px] font-bold tracking-wide" style={{ color: c }}>
          <IconPin /> Publicação fixada
        </div>
      )}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onProfileClick?.(post.authorId)}>
            <Avatar src={authorInfo.avatar} name={authorInfo.name} className="w-[42px] h-[42px] rounded-full object-cover shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 cursor-pointer flex-wrap" onClick={() => onProfileClick?.(post.authorId)}>
              <DisplayName profile={authorInfo.profile} fallbackName={authorInfo.name} className="font-bold text-sm animate-glow-pulse" />
              {post.verified && <IconVerified />}
            </div>
            <div className={`text-xs ${textSecondary}`}>{authorInfo.handle} · {new Date(post.createdAt).toLocaleDateString('pt-PT')}</div>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <button onClick={handleFriendBtn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] transition-all hover:scale-105"
                style={{
                  background: friendStatus === 'friend' ? `${c}20` : friendStatus === 'sent' ? 'rgba(255,165,0,0.12)' : 'transparent',
                  borderColor: friendStatus === 'friend' ? c : friendStatus === 'sent' ? '#f97316' : borderCol,
                  color: friendStatus === 'friend' ? c : friendStatus === 'sent' ? '#f97316' : (isLight ? '#999' : '#666'),
                }}>
                {friendStatus === 'friend' ? <><IconUserCheck /> Amigos</> : friendStatus === 'sent' ? <><IconClock /> Enviado</> : <><IconAddUser /> Seguir</>}
              </button>
            )}
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)}
                className={`bg-transparent border-none cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition-all ${menuOpen ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                style={{ background: menuOpen ? `${c}18` : 'transparent', color: menuOpen ? c : undefined }}>
                <IconDots />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-40 w-[200px] rounded-2xl overflow-hidden border-[1.5px] py-1"
                    style={{ background: menuBg, borderColor: borderCol, boxShadow: `0 20px 60px rgba(0,0,0,0.35)` }}>
                    {isOwner && <>
                      <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:bg-black/5"
                        style={{ color: isLight ? '#333' : '#ddd' }}><IconEdit /> Editar</button>
                      <button onClick={async () => { await pinPost(post.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:bg-black/5"
                        style={{ color: isLight ? '#333' : '#ddd' }}>{isPinned ? <><IconUnpin /> Desafixar</> : <><IconPin /> Fixar</>}</button>
                      <button onClick={async () => { await deletePost(post.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-red-500 bg-transparent border-none cursor-pointer hover:bg-red-500/10"><IconTrash /> Apagar</button>
                    </>}
                    {!isOwner && (
                      <button onClick={() => { handleFriendBtn(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:bg-black/5"
                        style={{ color: friendStatus === 'friend' ? '#ef4444' : (isLight ? '#333' : '#ddd') }}>
                        {friendStatus === 'friend' ? <><IconUserX /> Remover amigo</> : <><IconAddUser /> {friendStatus === 'sent' ? 'Cancelar pedido' : 'Adicionar amigo'}</>}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div onClick={() => !editing && openModal(false)} className="cursor-pointer select-none">
          {editing ? (
            <div className="mb-3" onClick={e => e.stopPropagation()}>
              <textarea className={`w-full border rounded-xl px-3 py-2 text-sm bg-transparent resize-none outline-none ${textPrimary}`}
                style={{ borderColor: borderCol }} value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} autoFocus />
              <div className="flex items-center gap-3 mt-2">
                <select value={editFont} onChange={e => setEditFont(e.target.value)} className="text-xs px-2 py-1 rounded-lg border bg-transparent" style={{ borderColor: borderCol }}>
                  {PREMIUM_FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <div className="flex gap-1.5">
                  {PREMIUM_COLORS.map(col => (
                    <button key={col.id} onClick={() => setEditColor(editColor === col.value ? '' : col.value)}
                      className="w-4 h-4 rounded-full border-none cursor-pointer transition-all hover:scale-125"
                      style={{ background: col.value, outline: editColor === col.value ? '2px solid #fff' : 'none' }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => setEditing(false)} className={`text-xs px-4 py-1.5 rounded-full border bg-transparent cursor-pointer ${textSecondary}`} style={{ borderColor: borderCol }}>Cancelar</button>
                <button onClick={handleSaveEdit} className="text-xs px-4 py-1.5 rounded-full text-black border-none cursor-pointer font-bold" style={{ background: c }}>Guardar</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">{formatContent(post.content, rawPost?.titleFont, rawPost?.titleColor, isLight)}</div>
              {tropesList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {tropesList.map((trope: any) => (
                    <span key={trope.id} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md"
                      style={{ background: `${c}15`, color: c, border: `1px solid ${c}40` }}>
                      {trope.iconEmoji} #{trope.name}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
          {/* YouTube Embed Detection */}
          {!editing && (() => {
            const ytId = extractYoutubeId(post.content || '');
            if (!ytId) return null;
            return <div className="mb-3" onClick={e => e.stopPropagation()}><YoutubeEmbed videoId={ytId} accentColor={c} /></div>;
          })()}
          {/* Media Rendering */}
          {!editing && (() => {
            const imageUrl = rawPost?.imageUrl || post.imageUrl;
            if (!imageUrl) return null;
            let media: string[] = [];
            try {
              media = (typeof imageUrl === 'string' && imageUrl.startsWith('['))
                ? JSON.parse(imageUrl)
                : (Array.isArray(imageUrl) ? imageUrl : [imageUrl]);
            } catch (e) {
              media = [imageUrl];
            }

            if (media.length === 0) return null;

            const isVid = (url?: string) => url ? (url.match(/\.(mp4|webm|mov|ogg)(\?|$)/i) || url.startsWith('data:video')) : false;

            if (media.length === 1) {
              return (
                <div className="flex justify-center mb-4">
                  {isVid(media[0]) ? (
                    <ModernVideoPlayer
                      src={resolveLazerMediaUrl(media[0])}
                      accentColor={c}
                      onClick={() => { setSelectedPostId(post.id); setInitialMediaIndex(0); }}
                      className="w-full max-h-[350px] rounded-[20px] border border-white/10 "
                      showControlsEnabled={false}
                      initialMuted={true}
                    />
                  ) : (
                    <img
                      onClick={() => { setSelectedPostId(post.id); setInitialMediaIndex(0); }}
                      src={resolveLazerMediaUrl(media[0])} alt="post" className="w-full max-h-[350px] object-contain block rounded-[20px] border border-white/10  cursor-pointer" />
                  )}
                </div>
              );
            }

            return (
              <div className="flex gap-2.5 overflow-x-auto pb-4 mb-2 custom-scrollbar snap-x snap-mandatory">
                {media.map((m, idx) => (
                  <div key={idx}
                    onClick={() => { setSelectedPostId(post.id); setInitialMediaIndex(idx); }}
                    className="h-[180px] shrink-0 snap-start rounded-2xl overflow-hidden border border-white/5 bg-black/20  transition-transform hover:scale-[1.02] cursor-pointer">
                    {isVid(m) ? (
                      <ModernVideoPlayer src={resolveLazerMediaUrl(m)} accentColor={c} className="h-full w-auto" onClick={() => { setSelectedPostId(post.id); setInitialMediaIndex(idx); }} showControlsEnabled={false} initialMuted={true} />
                    ) : (
                      <img src={resolveLazerMediaUrl(m)} alt={`media-${idx}`} className="h-full w-auto object-contain block" />
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between xl:justify-start xl:gap-8 pt-2.5 border-t-[1.5px]" style={{ borderColor: borderCol }}>
          <button onClick={() => toggleReaction(post.id)}
            className={`flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] transition-all hover:scale-110 ${isLiked ? 'animate-heart-burst' : ''}`}
            style={{ color: isLiked ? c : (isLight ? '#9e9e9e' : '#888'), fontWeight: isLiked ? 700 : 400 }}>
            <span className="transition-transform active:scale-125"><IconHeart filled={isLiked} /></span>
            {rawPost?._count?.reactions || 0}
          </button>
          <button onClick={handleToggleComments}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] transition-all hover:opacity-80"
            style={{ color: showComments ? c : (isLight ? '#9e9e9e' : '#888'), fontWeight: showComments ? 600 : 400 }}>
            <IconComment /> {rawPost?._count?.comments || 0}
          </button>
          <button className={`bg-transparent border-none cursor-pointer text-[13px] hover:opacity-80 ${textSecondary}`}><IconRepost /></button>
          <button className={`bg-transparent border-none cursor-pointer xl:ml-auto hover:opacity-80 ${textSecondary}`}><IconShare /></button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 border-t-[1.5px] pt-4" style={{ borderColor: borderCol }}>
            {/* Comment input */}
            <div className="flex gap-2 mb-4">
              <Avatar src={myProfile?.avatarUrl} name={myProfile?.displayName || myProfile?.username || 'Me'} size="sm" style={{ flexShrink: 0 }} />
              <div className="flex-1 relative">
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl mb-2 border border-dashed"
                    style={{ background: `${c}10`, borderColor: `${c}30` }}>
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${textSecondary}`}>A responder a</span>
                      <span className="text-[11px] font-bold truncate" style={{ color: c }}>
                        {replyingTo.author?.profile?.displayName || replyingTo.author?.profile?.username || 'Utilizador'}
                      </span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100"><IconClose size={14} /></button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input ref={commentRef} type="text" placeholder="Escreve um eco..." value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                    className={`flex-1 text-xs px-3 py-1.5 rounded-full border bg-transparent outline-none ${textPrimary}`} style={{ borderColor: borderCol }} />
                  <div className="relative">
                    <button onClick={() => setShowEmojiPicker(v => !v)} className="w-7 h-7 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: isLight ? '#999' : '#666' }}><IconEmoji size={16} /></button>
                    {showEmojiPicker && <div className="absolute bottom-full right-0 mb-2 z-50"><EmojiPicker onSelect={e => { setCommentText(p => p + e); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} /></div>}
                  </div>
                  <button onClick={handleSubmitComment} disabled={!commentText.trim() || submitting}
                    className="w-7 h-7 rounded-full text-black text-[10px] font-bold border-none cursor-pointer disabled:opacity-40 flex items-center justify-center"
                    style={{ background: c }}>{submitting ? '…' : '➤'}</button>
                </div>
              </div>
            </div>

            {/* Comment list */}
            <div className="flex flex-col">
              {postComments.length === 0
                ? <p className={`text-xs text-center py-4 italic ${textSecondary} opacity-50`}>Sê o primeiro a comentar!</p>
                : postComments.filter(cm => !cm.parentId).map((cm: any) => (
                  <CommentItem key={cm.id} cm={cm} allComments={postComments} postId={post.id}
                    postAuthorId={post.authorId} authUser={authUser} myProfile={myProfile}
                    isLight={isLight} c={c} textPrimary={textPrimary} textSecondary={textSecondary}
                    borderCol={borderCol} cardBg={cardBg} hiddenComments={hiddenComments}
                    setHiddenComments={setHiddenComments}
                    onReply={(cm) => { setReplyingTo(cm); commentRef.current?.focus(); }} />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Font Selector ────────────────────────────────────────────────────────────
function CustomFontSelector({ selected, onSelect, fonts, borderColor, textColor, isLightMode }: {
  selected: string; onSelect: (id: string) => void; fonts: typeof PREMIUM_FONTS;
  borderColor: string; textColor: string; isLightMode: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const label = fonts.find(f => f.id === selected)?.label || 'Font';
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border-[1.5px] bg-transparent outline-none cursor-pointer flex items-center gap-1.5 ${textColor}`}
        style={{ borderColor }}>
        {label} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 w-[160px] rounded-2xl overflow-hidden border-[1.5px] z-[70] "
            style={{ borderColor, background: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(14,14,20,0.98)', backdropFilter: 'blur(32px)' }}>
            {fonts.map(f => (
              <button key={f.id} onClick={() => { onSelect(f.id); setIsOpen(false); }}
                className="w-full px-4 py-2 text-[11px] font-extrabold text-left border-none cursor-pointer rounded-xl transition-all hover:bg-black/10"
                style={{ fontFamily: f.family, color: selected === f.id ? undefined : (isLightMode ? '#555' : '#aaa'), opacity: selected === f.id ? 1 : 0.7 }}>
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sidebar Widgets ──────────────────────────────────────────────────────────
const TRENDING_TROPES = [
  { rank: 1, tag: '#EnemiesToLovers', count: '15.2k', color: '#f472b6' },
  { rank: 2, tag: '#SchoolFestival', count: '8.4k', color: '#fb923c' },
  { rank: 3, tag: '#ChildhoodFriend', count: '5.1k', color: '#a78bfa' },
  { rank: 4, tag: '#RainyConfession', count: '3.2k', color: '#60a5fa' },
  { rank: 5, tag: '#SliceOfLife', count: '2.9k', color: '#4ade80' },
];

const WATCHING_NOW = [
  { title: 'Solo Leveling', ep: 'EP 8', genre: 'Ação', emoji: '⚔️' },
  { title: 'Frieren', ep: 'EP 22', genre: 'Aventura', emoji: '🌿' },
  { title: 'Dandadan', ep: 'EP 4', genre: 'Comédia', emoji: '👻' },
  { title: 'Blue Lock', ep: 'EP 16', genre: 'Desporto', emoji: '⚽' },
];

const HOT_DISCUSSIONS = [
  { title: 'O melhor final do ano?', replies: 142, heat: 98 },
  { title: 'Personagem mais odiada', replies: 89, heat: 76 },
  { title: 'Arc favorito de Frieren', replies: 67, heat: 54 },
];

function TrendingWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, onTagClick, onVerTodas }: {
  c: string; isLight: boolean; textPrimary: string; textSecondary: string; borderCol: string; cardBg: string;
  onTagClick: (tag: string) => void;
  onVerTodas: () => void;
}) {
  const { trendingTropes } = useLazerStore();

  return (
    <div className={`glass-card rounded-3xl p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <IconFlame />
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Trending Tropes</h3>
        <button onClick={onVerTodas} className="ml-auto text-[10px] font-black uppercase tracking-widest bg-transparent border-none cursor-pointer" style={{ color: c }}>Ver todas</button>
      </div>
      <div className="flex flex-col gap-2">
        {trendingTropes.length === 0 ? (
          <p className={`text-[10px] text-center py-4 italic ${textSecondary} opacity-50`}>Ainda não há tropos em alta.</p>
        ) : (
          trendingTropes.slice(0, 5).map((t, idx) => (
            <button key={t.id} onClick={() => onTagClick(t.name)}
              className="flex items-center gap-2.5 w-full bg-transparent border-none cursor-pointer text-left rounded-xl px-2 py-1.5 transition-all hover:scale-[1.02] group"
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = `${c}15`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span className="font-black text-[13px] w-5 text-center opacity-50" style={{ color: idx === 0 ? '#fbbf24' : (isLight ? '#aaa' : '#555') }}>{idx + 1}</span>
              <span className="flex-1 flex gap-1 items-center font-bold text-[12px]" style={{ color: c }}>
                <span>{t.iconEmoji}</span> #{t.name}
              </span>
              <span className={`text-[10px] font-bold ${textSecondary}`}>{t.metrics?.sparkles + t.metrics?.talking || 0} ✨</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function WatchingWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, watchingNow, onSubmitCheckIn }: any) {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customEp, setCustomEp] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🎬');

  const handleCustomSubmit = async () => {
    if (!customTitle.trim() || !customEp.trim()) return;
    setIsSubmitting(true);
    await onSubmitCheckIn(customTitle, customEp, customEmoji, 'Comunidade');
    setIsSubmitting(false);
    setIsCustomOpen(false);
    setCustomTitle('');
    setCustomEp('');
  };

  const handleCheckIn = async (item: any, idx: number) => {
    setIsSubmitting(true);
    await onSubmitCheckIn(item.title, item.ep, item.emoji, item.genre);
    setIsSubmitting(false);
    setSelected(null); // Fecha a selecção após sucesso
  };

  return (
    <div className={`glass-card rounded-3xl p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <IconTv />
        <div className="flex-1">
          <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary} leading-none`}>A ver agora</h3>
          <p className={`text-[9px] ${textSecondary} mt-0.5`}>Simulcast Sync</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
      </div>
      <div className="flex flex-col gap-1.5">
        {watchingNow?.length === 0 ? (
          <p className={`text-[10px] text-center py-4 italic ${textSecondary} opacity-50`}>A carregar grelha...</p>
        ) : (
          watchingNow?.map((w: any, i: number) => (
            <div key={w.id} className="w-full flex flex-col gap-1">
              <button onClick={() => setSelected(selected === i ? null : i)}
                className="flex items-center gap-3 w-full rounded-xl px-2.5 py-2 transition-all border-[1.5px] cursor-pointer text-left"
                style={{
                  background: selected === i ? `${c}10` : 'transparent',
                  borderColor: selected === i ? `${c}40` : 'transparent',
                }}>
                <span className="text-xl">{w.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-bold truncate ${textPrimary}`}>{w.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${textSecondary}`}>{w.ep}</span>
                    <div className="flex -space-x-1.5">
                      {w.recentAvatars?.map((av: string, i: number) => (
                        <div key={i} className="w-4 h-4 rounded-full overflow-hidden border border-white dark:border-[#1e1e1e]">
                          <img src={av} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    {w.totalCheckIns > 3 && (
                      <span className={`text-[9px] font-bold ${textSecondary} ml-1`}>+{w.totalCheckIns - 3}</span>
                    )}
                  </div>
                </div>
                {selected !== i && w.totalCheckIns > 0 && <span className="text-[10px] font-black" style={{ color: c }}>{w.totalCheckIns} 👀</span>}
                {selected === i && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c }} />}
              </button>

              {/* Expand Check-in Panel */}
              {selected === i && (
                <div className="mx-2 mb-1 p-2 rounded-xl border border-dashed flex flex-col items-center gap-2 animate-in slide-in-from-top-2" style={{ borderColor: `${c}30`, background: `${c}08` }}>
                  <p className={`text-[10px] font-bold text-center ${textPrimary}`}>Fazer check-in neste episódio?</p>
                  <button onClick={() => handleCheckIn(w, i)} disabled={isSubmitting} className="w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white border-none cursor-pointer hover:scale-105 transition-transform" style={{ background: c }}>
                    {isSubmitting ? '...' : 'Sim, Estou a ver ✓'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Custom Add Button / Form */}
      <div className="mt-2">
        {!isCustomOpen ? (
          <button onClick={() => setIsCustomOpen(true)} className={`w-full py-2 rounded-xl border border-dashed text-[10px] font-bold cursor-pointer transition-all ${textSecondary} hover:${textPrimary}`} style={{ borderColor: borderCol, background: 'transparent' }}>
            + Adicionar outro...
          </button>
        ) : (
          <div className="p-2.5 rounded-xl border flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200" style={{ borderColor: borderCol, background: `${c}08` }}>
            <div className="flex gap-2">
              <input value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} maxLength={2} className="w-8 text-center bg-transparent border-b outline-none text-lg" style={{ borderColor: `${c}40`, color: isLight ? '#000' : '#fff' }} placeholder="⚽" />
              <input value={customTitle} onChange={e => setCustomTitle(e.target.value)} autoFocus className="flex-1 bg-transparent border-b outline-none text-[11px] font-bold" style={{ borderColor: `${c}40`, color: isLight ? '#000' : '#fff' }} placeholder="Nome da obra (Ex: One Piece)" />
            </div>
            <input value={customEp} onChange={e => setCustomEp(e.target.value)} className="w-full bg-transparent border-b outline-none text-[10px]" style={{ borderColor: `${c}40`, color: isLight ? '#000' : '#fff' }} placeholder="Nº do Episódio (Ex: EP 1000)" />

            <div className="flex gap-2 mt-1">
              <button onClick={() => setIsCustomOpen(false)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer ${textSecondary}`} style={{ background: isLight ? '#e5e7eb' : '#27272a' }}>Cancelar</button>
              <button onClick={handleCustomSubmit} disabled={isSubmitting || !customTitle.trim() || !customEp.trim()} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer text-white disabled:opacity-50" style={{ background: c }}>
                {isSubmitting ? '...' : 'Adicionar ✓'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className={`text-center text-[9px] mt-3 ${textSecondary} opacity-50 uppercase tracking-widest`}>Assinala no teu perfil</p>
    </div>
  );
}

function HotDiscussionsWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, onDiscussionClick }: any) {
  return (
    <div className={`glass-card rounded-3xl p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <IconMessageSquare />
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Hot Discussions</h3>
      </div>
      <div className="flex flex-col gap-2">
        {HOT_DISCUSSIONS.map((d, i) => (
          <button key={i} onClick={() => onDiscussionClick(d.title)}
            className="flex flex-col w-full bg-transparent border-none cursor-pointer text-left rounded-xl px-2 py-2 transition-all"
            onMouseEnter={e => (e.currentTarget.style.background = `${c}10`)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <p className={`text-[12px] font-bold ${textPrimary} mb-1`}>{d.title}</p>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] ${textSecondary}`}>{d.replies} respostas</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: isLight ? '#eee' : '#333' }}>
                <div className="h-full rounded-full" style={{ width: `${d.heat}%`, background: `linear-gradient(90deg, ${c}, #f97316)` }} />
              </div>
              <span className="text-[10px] font-bold" style={{ color: '#f97316' }}>🔥{d.heat}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveNowWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, feedPosts, authUserId, onProfileClick }: any) {
  const recentlyActive = feedPosts
    .filter((p: any) => p.authorId !== authUserId)
    .reduce((acc: any[], p: any) => {
      const exists = acc.find(a => a.authorId === p.authorId);
      if (!exists) acc.push(p);
      return acc;
    }, [])
    .slice(0, 5);

  return (
    <div className={`glass-card rounded-3xl p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <IconUsers />
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Ativos agora</h3>
        <div className="w-2 h-2 rounded-full ml-auto animate-pulse" style={{ background: '#22c55e' }} />
      </div>
      {recentlyActive.length === 0 ? (
        <p className={`text-[11px] italic ${textSecondary} opacity-50 text-center py-2`}>Nenhum utilizador ativo ainda</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recentlyActive.map((p: any) => {
            const profile = p.author?.profile;
            const name = profile?.displayName || profile?.username || 'Utilizador';
            return (
              <button key={p.authorId} onClick={() => onProfileClick?.(p.authorId)}
                className="flex items-center gap-2.5 w-full bg-transparent border-none cursor-pointer rounded-xl px-1 py-1 transition-all hover:opacity-80">
                <div className="relative shrink-0">
                  <Avatar src={profile?.avatarUrl} name={name} size="xs" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: '#22c55e', borderColor: isLight ? '#fff' : '#09090b' }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <DisplayName profile={profile} fallbackName={name} style={{ fontSize: 12, fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                  <p className={`text-[10px] truncate ${textSecondary}`}>publicou há pouco</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyCommunities({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, onCommunityClick }: any) {
  const { myCommunities } = useLazerStore();

  return (
    <div className={`glass-card rounded-3xl p-4 ${cardBg}`}>
      <button className="flex items-center gap-2 mb-3 w-full bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity p-0" onClick={() => onCommunityClick?.()}>
        <IconHash />
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary} flex-1 text-left`}>Minhas Communities</h3>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      <div className="flex flex-col gap-1.5">
        {myCommunities.length === 0 ? (
          <p className={`text-[10px] italic py-2 text-center ${textSecondary} opacity-40`}>Ainda não entraste em nenhuma community.</p>
        ) : (
          myCommunities.slice(0, 6).map((com) => {
            const icon = com.iconUrl;
            return (
              <button key={com.id}
                onClick={() => onCommunityClick?.(com.id)}
                className="flex items-center gap-2.5 w-full bg-transparent border-none cursor-pointer rounded-xl px-2 py-2 transition-all text-left group"
                onMouseEnter={e => (e.currentTarget.style.background = `${c}15`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden border"
                  style={{ background: `${c}25`, borderColor: `${c}30` }}>
                  {icon ? (
                    icon.match(/\.(mp4|webm|mov)(\?|$)/i)
                      ? <video src={icon} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                      : <img src={icon} className="w-full h-full object-cover" />
                  ) : <span className="text-sm">🌐</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-bold truncate ${textPrimary}`}>{com.name}</p>
                  <p className={`text-[10px] ${textSecondary}`}>{com.membersCount ?? 0} membros</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full opacity-40 group-hover:opacity-100 transition-opacity" style={{ background: c }} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
function PostDetailModal({ selectedPostId, setSelectedPostId, onProfileClick, isLight, c, cardBg, borderCol, textPrimary, textSecondary, authUser, myProfile, initialIndex = 0 }: any) {
  const { feedPosts, comments, fetchComments, addComment, toggleReaction } = useLazerStore();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(initialIndex);
  const [modalCommentText, setModalCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hiddenComments, setHiddenComments] = useState<Set<string>>(new Set());
  const modalInputRef = useRef<HTMLInputElement>(null);

  const raw = feedPosts.find(p => p.id === selectedPostId);
  const isVideo = (url?: string) => url ? (url.match(/\.(mp4|webm|mov|ogg)(\?|$)/i) || url.startsWith('data:video')) : false;

  useEffect(() => {
    if (selectedPostId && !comments[selectedPostId]) fetchComments(selectedPostId);
  }, [selectedPostId, comments, fetchComments]);

  const nextMedia = () => { if (currentMediaIndex < allMedia.length - 1) setCurrentMediaIndex((v: number) => v + 1); };
  const prevMedia = () => { if (currentMediaIndex > 0) setCurrentMediaIndex((v: number) => v - 1); };

  const allMedia = useMemo(() => {
    if (!raw?.imageUrl) return [];
    if (Array.isArray(raw.imageUrl)) return raw.imageUrl;
    try {
      const parsed = JSON.parse(raw.imageUrl);
      return Array.isArray(parsed) ? parsed : [raw.imageUrl];
    } catch (e) {
      return [raw.imageUrl];
    }
  }, [raw?.imageUrl]);

  useEffect(() => {
    if (selectedPostId) {
      document.body.style.overflow = 'hidden';
      setCurrentMediaIndex(initialIndex);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPostId, initialIndex]);

  if (!selectedPostId || !raw) return null;

  const authorInfo = {
    avatar: raw?.author?.profile?.avatarUrl,
    name: raw?.author?.profile?.displayName || raw?.author?.profile?.username || 'User',
    profile: raw?.author?.profile
  };

  const postComments = comments[selectedPostId] || [];
  const panelBg = isLight ? '#f4f4f5' : '#09090b';

  const handleModalComment = async () => {
    if (!modalCommentText.trim() || submitting) return;
    setSubmitting(true);
    await addComment(selectedPostId, modalCommentText, replyingTo?.id);
    setModalCommentText('');
    setReplyingTo(null);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col lg:flex-row bg-[#020204] animate-in fade-in duration-500 overflow-y-auto lg:overflow-hidden h-screen w-screen border-none custom-scrollbar">
      {/* Dynamic Ambient Glow (Aura) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="absolute inset-[-10%] blur-[100px] saturate-[2.5] brightness-125 animate-pulse duration-[10s]">
          {isVideo(allMedia[currentMediaIndex]) ? (
            <video src={resolveLazerMediaUrl(allMedia[currentMediaIndex])} muted loop autoPlay className="w-full h-full object-cover" />
          ) : (
            <img src={resolveLazerMediaUrl(allMedia[currentMediaIndex])} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#020204] via-transparent to-[#020204] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020204] via-transparent to-[#020204] opacity-80" />
      </div>

      {/* Main Immersive Area (Full Screen on Mobile, Left on Desktop) */}
      <div className="w-full lg:flex-1 h-screen lg:h-full relative flex flex-col items-center justify-center bg-transparent overflow-hidden shrink-0 border-b lg:border-b-0 lg:border-r border-white/5">
        <div className="w-full h-full flex items-center justify-center p-0">
          {allMedia.length > 0 ? (
            <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
              {isVideo(allMedia[currentMediaIndex]) ? (
                <ModernVideoPlayer
                  key={allMedia[currentMediaIndex]}
                  src={resolveLazerMediaUrl(allMedia[currentMediaIndex])}
                  accentColor={c}
                  className="w-full h-full shadow-[0_50px_150px_rgba(0,0,0,1)]"
                  showControlsEnabled={true}
                  initialMuted={false}
                />
              ) : (
                <img
                  key={allMedia[currentMediaIndex]}
                  src={resolveLazerMediaUrl(allMedia[currentMediaIndex])}
                  alt="post media"
                  className="w-full h-full object-contain shadow-[0_50px_150px_rgba(0,0,0,1)]"
                />
              )}
            </div>
          ) : (
            <div className="text-white/5 font-black text-9xl tracking-tighter select-none">ALPHA</div>
          )}
        </div>

        {/* Navigation Buttons */}
        {allMedia.length > 1 && (
          <div className="absolute inset-0 pointer-events-none z-[60] flex items-center justify-between px-4 lg:px-10">
            <div className="w-10 h-10 lg:w-14 lg:h-14 flex items-center justify-center">
              {currentMediaIndex > 0 && (
                <button onClick={(e) => { e.stopPropagation(); prevMedia(); }}
                  className="w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/80 text-white border border-white/10 cursor-pointer backblur-3xl transition-all  pointer-events-auto hover:scale-110 active:scale-95">
                  <svg width="20" height="20" className="lg:w-8 lg:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
              )}
            </div>
            <div className="w-10 h-10 lg:w-14 lg:h-14 flex items-center justify-center">
              {currentMediaIndex < allMedia.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); nextMedia(); }}
                  className="w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/80 text-white border border-white/10 cursor-pointer backblur-3xl transition-all  pointer-events-auto hover:scale-110 active:scale-95">
                  <svg width="20" height="20" className="lg:w-8 lg:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button onClick={() => setSelectedPostId(null)}
          className="absolute top-6 left-6 lg:top-10 lg:left-10 z-[70] w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/80 text-white border border-white/10 cursor-pointer backblur-3xl transition-all ">
          <IconClose size={20} />
        </button>
      </div>

      {/* Cinematic Interaction Panel (Floating Glass Sidebar) */}
      <div className={`w-full lg:w-[450px] xl:w-[500px] h-auto lg:h-[calc(100vh-40px)] lg:m-5 flex flex-col glass-card rounded-[32px] border border-white/10  relative z-[100] transition-all duration-700 animate-in slide-in-from-right-20 mb-20 lg:mb-5 ${cardBg}`}>

        {/* Author Spotlight Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => onProfileClick?.(raw.authorId)} className="cursor-pointer bg-transparent border-none p-0 transition-transform hover:rotate-6 hover:scale-110">
              <Avatar src={authorInfo.avatar} name={authorInfo.name} className="w-12 h-12 rounded-2xl border-2" style={{ borderColor: c }} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onProfileClick?.(raw.authorId)}>
                <DisplayName profile={authorInfo.profile} fallbackName={authorInfo.name} className="font-black text-base animate-glow-pulse tracking-tight" />
                <IconVerified />
              </div>
              <div className={`text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] ${textSecondary}`}>@{authorInfo.profile?.username || 'user'}</div>
            </div>
          </div>
          <button className="bg-white/5 w-10 h-10 rounded-xl border-none cursor-pointer flex items-center justify-center opacity-30 hover:opacity-100 transition-all hover:scale-110 text-white"><IconDots size={20} /></button>
        </div>

        <div className="flex-1 lg:overflow-y-auto custom-scrollbar flex flex-col">
          <div className="px-8 py-8 border-b border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent">
            <div className={`text-xl lg:text-2xl leading-relaxed mb-8 font-medium tracking-tight animate-glow-pulse  ${textPrimary}`}>
              {formatContent(raw.content, raw.titleFont, raw.titleColor, isLight)}
            </div>

            <div className="flex items-center gap-8">
              <button onClick={() => toggleReaction(raw.id)} className={`flex items-center gap-3 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-2xl border border-white/5 cursor-pointer text-xs font-black transition-all hover:scale-110 ${raw.isLiked ? 'animate-heart-burst' : ''}`} style={{ color: c }}>
                <IconHeart filled={raw.isLiked} size={22} />
                <span className="text-sm">{raw._count?.reactions || 0}</span>
              </button>
              <div className="flex items-center gap-3 opacity-30 text-[10px] font-black tracking-[0.2em] uppercase">
                <div className="scale-110"><IconComment /></div> {postComments.length} ECOAR
              </div>
            </div>
          </div>

          <div className="flex-1 px-6 py-4 space-y-4">
            {postComments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10 py-20 text-center">
                <div className="scale-[2.5] mb-8"><IconComment /></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">O silêncio é absoluto.<br />Sê o primeiro a ecoar.</p>
              </div>
            ) : (
              postComments.filter(cm => !cm.parentId).map((cm: any) => (
                <div key={cm.id} className={`glass-card p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all group/comment ${cardBg}`}>
                  <CommentItem cm={cm} allComments={postComments} postId={selectedPostId}
                    postAuthorId={raw.authorId} authUser={authUser} myProfile={myProfile}
                    isLight={isLight} c={c} textPrimary={textPrimary} textSecondary={textSecondary}
                    borderCol={borderCol} cardBg="bg-transparent" hiddenComments={hiddenComments}
                    setHiddenComments={setHiddenComments}
                    onReply={(cm) => { setReplyingTo(cm); modalInputRef.current?.focus(); }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Futuristic Floating Input Bar */}
        <div className={`absolute bottom-6 left-6 right-6 p-4 glass-card rounded-[24px] border border-white/10  flex flex-col gap-3 z-[110] animate-in slide-in-from-bottom-5 ${cardBg}`}>
          {replyingTo && (
            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/5 border border-dashed border-white/10">
              <span className={`text-[10px] font-bold tracking-tight ${textSecondary}`}>Ecoando para <span style={{ color: c }}>@{replyingTo.author?.profile?.username}</span></span>
              <button onClick={() => setReplyingTo(null)} className="bg-transparent border-none cursor-pointer opacity-40 hover:opacity-100 text-white"><IconClose size={14} /></button>
            </div>
          )}
          <div className="flex items-center gap-4 px-2">
            <Avatar src={myProfile?.avatarUrl} name={myProfile?.username} size="sm" className="w-10 h-10 rounded-xl border border-white/10" />
            <input
              ref={modalInputRef}
              type="text"
              placeholder="Escreve o teu eco..."
              className={`flex-1 bg-transparent border-none outline-none text-sm py-2 ${textPrimary} placeholder:opacity-20`}
              value={modalCommentText}
              onChange={e => setModalCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleModalComment()}
            />
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="bg-transparent border-none cursor-pointer text-xl hover:scale-110 transition-transform">😊</button>
              <button
                onClick={handleModalComment}
                disabled={!modalCommentText.trim() || submitting}
                className="w-10 h-10 rounded-xl flex items-center justify-center border-none cursor-pointer disabled:opacity-20 transition-all hover:scale-110 active:scale-95  shadow-black/40"
                style={{ background: c, color: '#000' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
          {showEmojiPicker && (
            <div className="absolute bottom-full right-5 mb-4 z-[120] scale-[0.9] origin-bottom-right ">
              <EmojiPicker onSelect={e => { setModalCommentText(prev => prev + e); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
interface LazerHomeViewProps {
  user?: LazerUserProfile;
  onProfileClick?: (userId: string) => void;
  onCommunityClick?: (communityId?: string) => void;
  initialPostId?: string | null;
  onPostOpened?: () => void;
}

const TABS = ['For You', 'Following', 'Anime', 'Manga'];

export function LazerHomeView({ user, onProfileClick, onCommunityClick, initialPostId, onPostOpened }: LazerHomeViewProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts, createPost, fetchComments, comments, fetchFriends, fetchMyCommunities, fetchExploreCommunities, trendingTropes, fetchTrendingTropes } = useLazerStore();
  const { exploreCommunities, watchingNow, fetchWatchingNow, submitCheckIn } = useLazerStore();

  const [activeTab, setActiveTab] = useState('For You');
  const [postText, setPostText] = useState('');
  const [showTag, setShowTag] = useState(false);
  const [tag, setTag] = useState('');
  const [isSparkle, setIsSparkle] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [initialMediaIndex, setInitialMediaIndex] = useState(0);
  const [selectedFont, setSelectedFont] = useState('default');
  const [selectedColor, setSelectedColor] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeDiscussion, setActiveDiscussion] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showTropesModal, setShowTropesModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = user?.themeMode === 'light';
  const c = user?.themeColor || '#e879f9';
  const cardBg = isLight ? 'glass-panel-light' : 'glass-panel-dark';
  const borderCol = 'rgba(255, 255, 255, 0.12)';
  const textPrimary = isLight ? 'text-[#111]' : 'text-[#fff]';
  const textSecondary = isLight ? 'text-[#666]' : 'text-[#888]';

  // Current user profile (for composer & comments)
  const myProfile = authUser?.profile || null;

  const PREMIUM_COLORS = [...PREMIUM_COLORS_LIST, { id: 'dynamic', value: isLight ? '#000' : '#fff', label: isLight ? 'Black' : 'Pure' }];

  useEffect(() => {
    fetchFriends();
    fetchMyCommunities();
    fetchExploreCommunities();
    fetchTrendingTropes();
    fetchWatchingNow();
  }, []);

  useEffect(() => {
    if (initialPostId) {
      setSelectedPostId(initialPostId);
      onPostOpened?.();
    }
  }, [initialPostId]);

  const handleMediaPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setMediaPreviews(prev => [...prev, dataUrl]);
        setMediaFiles(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (index: number) => {
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!postText.trim() && mediaFiles.length === 0) return;
    setIsPosting(true);

    // Convert tags #a #b into an array ['a', 'b']
    const tropeNames = tag.split(' ')
      .map(t => t.replace('#', '').trim())
      .filter(Boolean);

    await createPost(
      postText,
      mediaFiles.length > 0 ? mediaFiles : undefined,
      tropeNames.length > 0 ? tropeNames : undefined,
      isSparkle,
      selectedFont !== 'default' ? selectedFont : undefined,
      selectedColor || undefined
    );
    setPostText(''); setMediaPreviews([]); setMediaFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTag(''); setIsSparkle(false); setShowTag(false); setSelectedFont('default'); setSelectedColor('');
    setIsPosting(false);
  };

  const handleOpenPost = async (postId: string) => {
    setSelectedPostId(postId);
    if (!comments[postId]) await fetchComments(postId);
  };

  const displayPosts = feedPosts.filter(p => {
    if (activeTag) {
      const tagToMatch = activeTag.replace('#', '').toLowerCase();
      const hasTrope = p.tropes?.some((t: any) => t.name.toLowerCase() === tagToMatch);
      if (!hasTrope) return false;
    }
    if (activeTab !== 'For You' && activeTab !== 'Following') {
      const tabMap: Record<string, string> = { 'Anime': 'anime', 'Manga': 'manga' };
      if (tabMap[activeTab]) {
        const hasTrope = p.tropes?.some((t: any) => t.name.toLowerCase() === tabMap[activeTab]);
        if (!hasTrope) return false;
      }
    }
    return true;
  });

  return (
    <>
      <style>{`
        @keyframes heart-burst {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); filter: brightness(1.5) drop-shadow(0 0 10px currentColor); }
          100% { transform: scale(1); }
        }
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 5px rgba(255,255,255,0.1); }
          50% { text-shadow: 0 0 15px rgba(255,255,255,0.4); }
        }
        .animate-heart-burst { animation: heart-burst 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-glow-pulse { animation: glow-pulse 3s infinite ease-in-out; }
      `}</style>
      <PostDetailModal
        selectedPostId={selectedPostId} setSelectedPostId={setSelectedPostId}
        feedPosts={feedPosts} comments={comments} authUser={authUser} myProfile={myProfile}
        isLight={isLight} c={c} textPrimary={textPrimary} textSecondary={textSecondary}
        borderCol={borderCol} cardBg={cardBg} onProfileClick={onProfileClick}
        initialIndex={initialMediaIndex} />

      <div className="h-full w-full font-['Nunito',sans-serif] relative rounded-none md:rounded-[3rem] border-0 md:border liquid-glass-shell flex flex-col overflow-hidden transition-all duration-300">
        {/* Crista de luz especular no topo do arco Liquid Glass */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />
        {showTropesModal && (
          <TropesModal
            c={c}
            isLight={isLight}
            onClose={() => setShowTropesModal(false)}
            onTropeClick={(t) => { setActiveTag(t); setActiveTab(''); setShowTropesModal(false); }}
          />
        )}

        <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 custom-scrollbar">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[210px_1fr_210px] xl:grid-cols-[240px_1fr_280px] gap-6 items-start">

            {/* Left sidebar */}
            <aside className="hidden lg:flex flex-col gap-4 sticky top-6">
              <div className="rounded-3xl overflow-hidden glass-card">
                <div className="h-[100px] relative overflow-hidden" style={{ backgroundImage: user?.bannerUrl ? `url('${resolveUrl(user.bannerUrl)}')` : `linear-gradient(135deg, ${c}80, ${c}20)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  {user?.bannerUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) && <video src={resolveUrl(user.bannerUrl)} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0" />}
                </div>
                <div className="px-4 pb-4 relative text-center flex flex-col items-center">
                  <div className={`mt-[-42px] mb-2 w-[84px] h-[84px] rounded-full border-[3px] overflow-hidden shrink-0  ${cardBg}`} style={{ borderColor: borderCol }}>
                    <Avatar src={user?.avatarUrl} name={user?.displayName || user?.username || 'U'} className="w-full h-full object-cover" />
                  </div>
                  <DisplayName profile={user} fallbackName={user?.displayName || 'Alpha'} className="font-extrabold text-base flex justify-center w-full mb-1" />
                  <div className={`text-xs mb-4 font-medium ${textSecondary}`}>@{user?.username || 'user'}</div>
                  <div className="grid grid-cols-3 w-full text-center pt-3 border-t-[1.5px]" style={{ borderColor: borderCol }}>
                    {(user?.stats?.slice(0, 3) || [{ label: 'POSTS', value: feedPosts.filter(p => p.authorId === authUser?.id).length.toString() }]).map(s => (
                      <div key={s.label} className="cursor-pointer">
                        <div className={`font-extrabold text-[15px] ${textPrimary}`}>{s.value}</div>
                        <div className={`text-[9px] font-bold tracking-widest mt-1 uppercase ${textSecondary}`}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* My Communities */}
              <MyCommunities c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg} onCommunityClick={onCommunityClick} />
            </aside>

            {/* Center feed */}
            <main className="flex flex-col gap-5 w-full">
              {/* Tabs */}
              <div className="flex gap-4 pt-1 px-4 sm:px-6 rounded-b-3xl sm:rounded-3xl overflow-x-auto mb-1 liquid-glass-border">
                {TABS.map(tab => (
                  <button key={tab} onClick={() => { setActiveTab(tab); setActiveTag(null); }}
                    className="py-3 px-1 mt-1 bg-transparent border-none cursor-pointer text-sm whitespace-nowrap transition-all"
                    style={{ borderBottom: activeTab === tab ? `3px solid ${c}` : '3px solid transparent', marginBottom: '-2px', color: activeTab === tab ? c : (isLight ? '#9e9e9e' : '#666'), fontWeight: activeTab === tab ? 800 : 500 }}>
                    {tab}
                  </button>
                ))}
                {activeTag && (
                  <button onClick={() => setActiveTag(null)} className="py-3 px-1 mt-1 bg-transparent border-none cursor-pointer text-sm whitespace-nowrap flex items-center gap-1.5"
                    style={{ borderBottom: `3px solid ${c}`, marginBottom: '-2px', color: c, fontWeight: 800 }}>
                    {activeTag} <IconClose size={12} />
                  </button>
                )}
              </div>

              {/* Composer */}
              <div className="rounded-3xl p-4 sm:p-5 glass-card">
                <div className="flex gap-3 items-start">
                  <Avatar src={myProfile?.avatarUrl} name={myProfile?.displayName || myProfile?.username || 'U'} className="w-[42px] h-[42px] rounded-full shrink-0" />
                  <div className="flex-1">
                    <textarea className={`w-full border-none resize-none text-sm bg-transparent min-h-[48px] outline-none ${textPrimary}`}
                      placeholder="O que está a acontecer no teu universo?..."
                      value={postText} onChange={e => setPostText(e.target.value)} rows={2} />

                    {/* Media Previews */}
                    {mediaPreviews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-3 mt-1 custom-scrollbar">
                        {mediaPreviews.map((p, idx) => (
                          <div key={idx} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border  group/preview" style={{ borderColor: borderCol }}>
                            {p.match(/\.(mp4|webm|mov|ogg)(\?|$)/i) || p.startsWith('data:video') ? (
                              <video src={p} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={p} alt="preview" className="w-full h-full object-cover" />
                            )}
                            <button onClick={() => handleRemoveMedia(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center border-none cursor-pointer hover:bg-black/80 transition-all backblur-md">
                              <IconClose size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showTag && (
                      <input type="text" placeholder="#tag..." value={tag} onChange={e => setTag(e.target.value)}
                        className={`w-full mt-2 text-xs px-3 py-1.5 rounded-lg border bg-transparent outline-none ${textPrimary}`} style={{ borderColor: borderCol }} />
                    )}

                    <div className="flex items-center justify-between pt-3 mt-2 border-t-[1.5px]" style={{ borderColor: borderCol }}>
                      <div className="flex gap-2 flex-wrap">
                        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleMediaPick} />
                        <button onClick={() => fileInputRef.current?.click()}
                          className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{ borderColor: mediaPreviews.length > 0 ? c : borderCol, color: c }}><IconImage /></button>
                        <button onClick={() => setIsSparkle(!isSparkle)}
                          className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{ borderColor: borderCol, color: isSparkle ? '#fbbf24' : c }}><IconSparkle /></button>
                        <button onClick={() => setShowTag(!showTag)}
                          className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{ borderColor: borderCol, color: c }}><IconTag /></button>
                        <div className="relative">
                          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            style={{ borderColor: borderCol, color: c }}><IconEmoji /></button>
                          {showEmojiPicker && <div className="absolute top-full left-0 mt-2 z-50"><EmojiPicker onSelect={e => { setPostText(p => p + e); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} /></div>}
                        </div>
                        <CustomFontSelector selected={selectedFont} onSelect={setSelectedFont} fonts={PREMIUM_FONTS} borderColor={borderCol} textColor={textPrimary} isLightMode={isLight} />
                        <div className="flex gap-1 items-center px-2 py-1 rounded-lg border-[1.5px]" style={{ borderColor: borderCol }}>
                          {PREMIUM_COLORS.map(col => (
                            <button key={col.id} onClick={() => setSelectedColor(selectedColor === col.value ? '' : col.value)}
                              className="w-3.5 h-3.5 rounded-full border-none cursor-pointer transition-all hover:scale-125"
                              style={{ background: col.value, outline: selectedColor === col.value ? '2px solid #fff' : 'none', opacity: selectedColor === col.value ? 1 : 0.5 }} />
                          ))}
                        </div>
                      </div>
                      <button onClick={handleCreate} disabled={(!postText.trim() && mediaFiles.length === 0) || isPosting}
                        className="text-black border-none rounded-full px-5 py-2 text-sm font-bold cursor-pointer transition-opacity disabled:opacity-50 hover:opacity-90 "
                        style={{ background: `linear-gradient(135deg, ${c}dd, ${c})` }}>
                        {isPosting ? 'A publicar...' : 'Publicar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active discussion banner */}
              {activeDiscussion && (
                <div className={`rounded-2xl px-4 py-3 flex items-center justify-between border-[1.5px] ${cardBg}`} style={{ borderColor: `${c}40` }}>
                  <span className={`text-sm font-bold ${textPrimary}`}>💬 {activeDiscussion}</span>
                  <button onClick={() => setActiveDiscussion(null)} className="bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100" style={{ color: isLight ? '#000' : '#fff' }}><IconClose /></button>
                </div>
              )}

              {/* Posts */}
              <div className="flex flex-col gap-4">
                {displayPosts.length === 0
                  ? <div className={`text-center py-10 opacity-60 text-sm ${textPrimary}`}>
                    {activeTag ? `Nenhuma publicação com ${activeTag}` : 'Nenhuma publicação para mostrar.'}
                  </div>
                  : displayPosts.map((post: any) => (
                    <div key={post.id} className="relative">
                      {post.isSparkle && <div className="absolute -top-1 -right-1 z-10 w-4 h-4 text-yellow-400 rotate-12"><IconSparkle /></div>}
                      <div className={post.isSparkle ? 'p-[2px] rounded-3xl' : ''} style={{ background: post.isSparkle ? `linear-gradient(135deg, ${c}, transparent, ${c})` : 'transparent' }}>
                        <PostCard
                          post={post}
                          isOwner={post.authorId === authUser?.id}
                          openModal={() => handleOpenPost(post.id)}
                          onProfileClick={onProfileClick}
                          authUser={authUser}
                          myProfile={myProfile}
                          isLight={isLight} c={c}
                          textPrimary={textPrimary} textSecondary={textSecondary}
                          cardBg={cardBg} borderCol={borderCol}
                          setSelectedPostId={setSelectedPostId}
                          setInitialMediaIndex={setInitialMediaIndex} />
                      </div>
                    </div>
                  ))}
              </div>
            </main>

            {/* Right sidebar */}
            <aside className="hidden lg:flex flex-col gap-4 sticky top-6">
              <div className="rounded-3xl p-4 glass-card">
                <div className="flex items-center gap-2 mb-4">
                  <IconFlame />
                  <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Em Alta</h3>
                  <button onClick={() => onCommunityClick?.()} className="ml-auto text-[10px] font-black uppercase tracking-widest bg-transparent border-none cursor-pointer" style={{ color: c }}>Ver todas</button>
                </div>
                <div className="flex flex-col gap-4">
                  {exploreCommunities.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 opacity-30">
                      <div className="text-2xl">🌐</div>
                      <p className="text-[10px] font-bold uppercase tracking-widest">A carregar...</p>
                    </div>
                  ) : (
                    exploreCommunities.slice(0, 3).map(com => (
                      <CommunityPreviewCard
                        key={com.id}
                        community={com}
                        c={c}
                        isLight={isLight}
                        cardBg={isLight ? 'bg-white/60' : 'bg-white/5'}
                        borderCol={borderCol}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        onClick={() => onCommunityClick?.(com.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              <TrendingWidget
                c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary}
                borderCol={borderCol} cardBg={cardBg}
                onTagClick={(tag) => { setActiveTag(tag); setActiveTab(''); }}
                onVerTodas={() => setShowTropesModal(true)} />

              <WatchingWidget c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg} watchingNow={watchingNow} onSubmitCheckIn={submitCheckIn} />

              <HotDiscussionsWidget c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg}
                onDiscussionClick={(title: string) => setActiveDiscussion(title)} />

              <ActiveNowWidget c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg}
                feedPosts={feedPosts} authUserId={authUser?.id} onProfileClick={onProfileClick} />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
