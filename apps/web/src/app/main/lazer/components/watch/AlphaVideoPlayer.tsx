'use client';
import { useState, useEffect, useRef } from 'react';
import { useWatchStore, Video, VideoComment } from '@/store/watch.store';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  return `${Math.floor(diff / 86400)}d atrás`;
}

// ── Comment Component ────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: VideoComment }) {
  const resolveUrl = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;
  return (
    <div className="flex gap-3 py-3 border-b border-white/5">
      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
        {comment.author?.profile?.avatarUrl ? (
          <img src={resolveUrl(comment.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-black text-white/40">
            {(comment.author?.profile?.displayName || 'A')[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black text-white/80">{comment.author?.profile?.displayName || comment.author?.profile?.username}</span>
          <span className="text-[10px] text-white/25">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">{comment.content}</p>
      </div>
    </div>
  );
}

// ── Main AlphaVideoPlayer ────────────────────────────────────────────────────

interface Props {
  video: Video;
  onClose: () => void;
  onLike?: () => void;
  onEdit?: () => void;
}

export function AlphaVideoPlayer({ video, onClose, onLike, onEdit }: Props) {
  const { user: authUser, accessToken } = useAuthStore();
  const { comments, addComment, fetchComments, incrementView, deleteVideo, setPipVideo } = useWatchStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSpeeding, setIsSpeeding] = useState(false);
  const controlsTimer = useRef<NodeJS.Timeout>();
  const holdTimer = useRef<NodeJS.Timeout>();
  const isHolding = useRef(false);
  const pointerDownTime = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isVertical = video.format === 'vertical';
  const resolveUrl = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;

  useEffect(() => {
    fetchComments(video.id);

    // Restore volume
    const savedVolume = localStorage.getItem('alpha_watch_volume');
    if (savedVolume !== null) {
      const v = parseFloat(savedVolume);
      setVolume(v);
      setMuted(v === 0);
      if (videoRef.current) {
        videoRef.current.volume = v;
        videoRef.current.muted = v === 0;
      }
    }
  }, [video.id]);

  // Ambient Glow Loop
  useEffect(() => {
    let animationId: number;
    let lastDrawTime = 0;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const drawGlow = (timestamp: number) => {
      // Throttle to 4 FPS (250ms) - Ambient light changes don't need to be fast
      if (timestamp - lastDrawTime > 250) {
        if (video && canvas && !video.paused) {
          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx && video.readyState >= 2) {
            // 8x8 resolution is microscopic. When stretched to full screen,
            // the browser's native bilinear filtering creates a massive "free" blur without using CSS filters.
            if (canvas.width !== 8) {
              canvas.width = 8;
              canvas.height = 8;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            lastDrawTime = timestamp;
          }
        }
      }
      animationId = requestAnimationFrame(drawGlow);
    };

    animationId = requestAnimationFrame(drawGlow);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Auto-hide controls
  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
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

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const p = current / (videoRef.current.duration || 1);
    setProgress(p * 100);

    // Persist time (throttled to roughly once every second when floor changes)
    if (Math.floor(current) % 2 === 0) {
      localStorage.setItem(`alpha_watch_time_${video.id}`, current.toString());
    }

    // Count view after 5 seconds
    if (!viewCounted && current > 5) {
      setViewCounted(true);
      incrementView(video.id, authUser?.id);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.target as HTMLVideoElement;
    setDuration(target.duration);

    // Restore time
    const savedTime = localStorage.getItem(`alpha_watch_time_${video.id}`);
    if (savedTime !== null) {
      target.currentTime = parseFloat(savedTime);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * videoRef.current.duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
    localStorage.setItem('alpha_watch_volume', v.toString());
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !muted;
    videoRef.current.muted = newMuted;
    setMuted(newMuted);
    
    // If unmuting and volume is 0, set to max
    const newVolume = newMuted ? 0 : (volume === 0 ? 1 : volume);
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
    
    localStorage.setItem('alpha_watch_volume', newVolume.toString());
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
    showControlsTemporarily();
  };

  const handlePointerDown = () => {
    pointerDownTime.current = Date.now();
    isHolding.current = false;
    holdTimer.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.playbackRate = 2.0;
        setIsSpeeding(true);
        isHolding.current = true;
      }
    }, 400); // 400ms to trigger hold
  };

  const handlePointerUp = () => {
    clearTimeout(holdTimer.current);
    if (isHolding.current) {
      if (videoRef.current) videoRef.current.playbackRate = 1.0;
      setIsSpeeding(false);
      isHolding.current = false;
    } else {
      // Short tap
      const duration = Date.now() - pointerDownTime.current;
      if (duration < 400) {
        togglePlay();
      }
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handlePiP = () => {
    setPipVideo(video);
    onClose();
  };

  const handleComment = async () => {
    if (!commentText.trim() || !accessToken) return;
    await addComment(video.id, commentText, accessToken);
    setCommentText('');
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!accessToken) return;
    const success = await deleteVideo(video.id, accessToken);
    if (success) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const isOwner = authUser?.id === video.authorId;

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      
      {/* ── Alpha Ambient Glow Layer ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-80 pointer-events-none"
        style={{
          // NO CSS BLUR! We rely on the 8x8 canvas being stretched to full screen
          // which the browser natively interpolates/blurs for free.
          filter: 'saturate(200%) brightness(0.6)',
          transform: 'scale(1.3)', // prevent edge artifacts
          zIndex: 0,
          transition: 'opacity 0.5s ease',
          imageRendering: 'auto', // forces smooth bilinear scaling
        }}
      />

      {/* ── Player + Info area ── */}
      <div className={`flex flex-col ${showComments ? 'flex-1' : 'w-full'} h-full overflow-hidden relative z-10`}>

        {/* Back + title bar */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-4 shrink-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{video.title}</p>
            <p className="text-[11px] text-white/40">
              {video.author?.profile?.displayName || video.author?.profile?.username} · {fmtViews(video.views)} views
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Owner Actions */}
            {isOwner && (
              <>
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 bg-white/8 text-white/60 border border-white/10 hover:border-white/25 hover:text-white"
                  title="Editar Vídeo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 bg-white/8 text-red-400/60 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 mr-2"
                  title="Eliminar Vídeo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </>
            )}

            {/* Like */}
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 ${
                video.liked
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/8 text-white/60 border border-white/10 hover:border-white/25'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={video.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {fmtViews(video.likesCount)}
            </button>

            {/* Comments toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all hover:scale-105 ${
                showComments
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/8 text-white/60 border border-white/10 hover:border-white/25'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {fmtViews(video.commentsCount)}
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div
          className={`relative mx-6 rounded-[2rem] overflow-hidden bg-black/40 backdrop-blur-sm border border-white/5 ${
            isVertical ? 'flex-1 max-w-[380px] self-center' : 'flex-1'
          }`}
          onMouseMove={showControlsTemporarily}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Speeding Indicator */}
          {isSpeeding && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-white font-black text-xs tracking-widest uppercase z-30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-none">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 19l6-7-6-7M5 19l6-7-6-7"/></svg>
              Velocidade 2x
            </div>
          )}

          {/* Video element */}
          <video
            ref={videoRef}
            src={resolveUrl(video.videoUrl)}
            className="relative z-10 w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setPlaying(false)}
            playsInline
          />

          {/* Controls overlay */}
          <div
            className={`absolute inset-0 z-20 flex flex-col justify-end transition-opacity duration-300 pointer-events-none ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Bottom controls */}
            <div 
              className="relative px-4 pb-4 space-y-3 pointer-events-auto"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              {/* Progress bar */}
              <div
                className="w-full h-1.5 rounded-full bg-white/20 cursor-pointer group"
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-blue-400 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Play/Pause (Small version for bottom bar) */}
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
                >
                  {playing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>

                {/* Time */}
                <span className="text-white text-xs font-black">
                  {fmtDuration(videoRef.current?.currentTime || 0)} / {fmtDuration(duration)}
                </span>

                <div className="flex-1" />

                {/* Volume */}
                <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                  {muted || volume === 0 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  )}
                </button>
                <input
                  type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-purple-400"
                  onClick={e => e.stopPropagation()}
                />

                {/* PiP (Mini-Player) */}
                <button onClick={handlePiP} className="text-white/70 hover:text-white transition-colors" title="Mini-Player (PiP)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="13" y="13" width="6" height="4" rx="1" ry="1"/></svg>
                </button>

                {/* Fullscreen */}
                <button onClick={handleFullscreen} className="text-white/70 hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Center Controls (Play/Pause & Skip) */}
          <div 
             className={`absolute inset-0 z-30 flex items-center justify-center gap-8 md:gap-16 pointer-events-none transition-opacity duration-300 ${!playing || showControls ? 'opacity-100' : 'opacity-0'}`}
          >
             {/* Skip Backward */}
             <button 
               onClick={(e) => { e.stopPropagation(); skip(-10); }}
               onPointerDown={e => e.stopPropagation()}
               className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all pointer-events-auto active:scale-95 relative"
               title="Recuar 10s"
             >
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
               <span className="absolute text-[10px] font-black mt-1">10</span>
             </button>

             {/* Center Play/Pause Icon */}
             <button 
               onClick={(e) => { e.stopPropagation(); togglePlay(); }}
               onPointerDown={e => e.stopPropagation()}
               className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-white/30 transition-all pointer-events-auto active:scale-95 shadow-2xl shadow-black/50"
             >
               {playing ? (
                 <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
               ) : (
                 <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
               )}
             </button>

             {/* Skip Forward */}
             <button 
               onClick={(e) => { e.stopPropagation(); skip(10); }}
               onPointerDown={e => e.stopPropagation()}
               className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all pointer-events-auto active:scale-95 relative"
               title="Avançar 10s"
             >
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
               <span className="absolute text-[10px] font-black mt-1">10</span>
             </button>
          </div>
        </div>

        {/* Video Info below player */}
        <div className="px-6 py-4 shrink-0">
          <h2 className="text-base font-black text-white mb-1">{video.title}</h2>
          {video.description && <p className="text-sm text-white/50 line-clamp-2">{video.description}</p>}
          {video.tags && video.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {video.tags.map((tag, i) => (
                <span key={i} className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-bold">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Comments Panel ── */}
      {showComments && (
        <div className="w-[360px] shrink-0 flex flex-col h-full border-l border-white/8 bg-white/[0.02]">
          <div className="px-6 py-5 border-b border-white/8 shrink-0">
            <h3 className="text-sm font-black text-white">Comentários ({video.commentsCount})</h3>
          </div>

          {/* Comment input */}
          {accessToken && (
            <div className="px-4 py-4 border-b border-white/5 shrink-0">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
                  {authUser?.profile?.avatarUrl ? (
                    <img src={resolveUrl(authUser.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-white/40">
                      {(authUser?.profile?.displayName || 'A')[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Escreve um comentário..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComment()}
                    className="w-full px-4 py-2.5 bg-white/8 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/25 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-4 no-scrollbar">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p className="text-xs font-bold mt-2">Ainda não há comentários.</p>
              </div>
            ) : (
              comments.map(c => <CommentItem key={c.id} comment={c} />)
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-6"
          onClick={() => setShowDeleteConfirm(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 backdrop-blur-xl" style={{ background: 'rgba(0,0,0,0.4)' }} />

          {/* Modal card */}
          <div
            className="relative w-full max-w-sm rounded-[2rem] border border-red-500/20 animate-in zoom-in-95 duration-300 overflow-hidden p-6 text-center"
            style={{
              background: 'rgba(20,0,0,0.4)',
              backdropFilter: 'blur(48px) saturate(160%)',
              WebkitBackdropFilter: 'blur(48px) saturate(160%)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            
            <h3 className="text-xl font-black text-white mb-2">Eliminar Vídeo</h3>
            <p className="text-sm text-white/50 mb-8">
              Tens a certeza que desejas eliminar <b>{video.title}</b>? Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-sm hover:bg-red-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all active:scale-95"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
