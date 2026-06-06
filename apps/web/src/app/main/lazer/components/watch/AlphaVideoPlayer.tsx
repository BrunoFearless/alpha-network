'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AlphaWatchPiP } from './AlphaWatchPiP';
import { resolveUrl } from '@/lib/api';
import { useWatchStore, Video, VideoComment } from '@/store/watch.store';
import { useAuthStore } from '@/store/auth.store';
import { io, Socket } from 'socket.io-client';

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

function CommentItem({ comment, onSeek }: { comment: VideoComment; onSeek?: (time: number) => void }) {

  return (
    <div className="group relative flex gap-4 p-4 mb-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10 transition-all duration-300">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-white/10 to-white/5 shrink-0 shadow-lg border border-white/10">
        {comment.author?.profile?.avatarUrl ? (
          <img src={resolveUrl(comment.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-black text-white/40">
            {(comment.author?.profile?.displayName || 'A')[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white group-hover:text-blue-400 transition-colors">
              {comment.author?.profile?.displayName || comment.author?.profile?.username}
            </span>
            {comment.timestamp !== undefined && comment.timestamp !== null && (
              <button
                onClick={() => onSeek?.(comment.timestamp!)}
                className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md font-black hover:bg-blue-500/40 transition-all border border-blue-500/20"
              >
                {fmtDuration(comment.timestamp)}
              </button>
            )}
          </div>
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed font-medium break-words">{comment.content}</p>
      </div>
    </div>
  );
}

// ── Main AlphaVideoPlayer ────────────────────────────────────────────────────

const BUBBLE_STYLES = `
  @keyframes floatUp {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    20% { transform: translateY(-30px) scale(1.3); opacity: 1; }
    100% { transform: translateY(-200px) scale(1); opacity: 0; }
  }
  .alpha-bubble {
    animation: floatUp 2.5s ease-out forwards;
  }
`;

interface Props {
  video: Video;
  onClose: () => void;
  onLike?: () => void;
  onEdit?: () => void;
}

export function AlphaVideoPlayer({ video, onClose, onLike, onEdit }: Props) {
  const { user: authUser, accessToken } = useAuthStore();
  const { comments, addComment, fetchComments, incrementView, deleteVideo, setPipVideo, reactions, fetchReactions, addReaction } = useWatchStore();
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
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const isRemoteAction = useRef(false);
  const controlsTimer = useRef<NodeJS.Timeout>();
  const holdTimer = useRef<NodeJS.Timeout>();
  const isHolding = useRef(false);
  const pointerDownTime = useRef(0);
  const isVertical = video.format === 'vertical';


  // Alpha Bubbles State
  const [bubbles, setBubbles] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const lastTimeRef = useRef(0);

  // Mocked Chapters (Phase 5)
  const chapters = useMemo(() => {
    if (duration < 30) return [];
    return [
      { time: 0, title: 'Início' },
      { time: duration * 0.3, title: 'Desenvolvimento' },
      { time: duration * 0.7, title: 'Conclusão' },
    ];
  }, [duration]);

  useEffect(() => {
    fetchComments(video.id);
    fetchReactions(video.id);

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Watch Party Socket Logic
  useEffect(() => {
    if (!accessToken || !video.id) return;

    const socket = io(`${API}/watch-party`, {
      auth: { token: accessToken }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', { videoId: video.id, user: authUser });
    });

    socket.on('play', (time: number) => {
      if (videoRef.current && !playing) {
        isRemoteAction.current = true;
        videoRef.current.currentTime = time;
        videoRef.current.play();
        setPlaying(true);
      }
    });

    socket.on('pause', (time: number) => {
      if (videoRef.current && playing) {
        isRemoteAction.current = true;
        videoRef.current.currentTime = time;
        videoRef.current.pause();
        setPlaying(false);
      }
    });

    socket.on('seek', (time: number) => {
      if (videoRef.current) {
        isRemoteAction.current = true;
        videoRef.current.currentTime = time;
      }
    });

    socket.on('reaction', (data: { emoji: string, left: number }) => {
      const id = Math.random().toString();
      setBubbles(b => [...b, { id, emoji: data.emoji, left: data.left }]);
      setTimeout(() => {
        setBubbles(b => b.filter(bubble => bubble.id !== id));
      }, 3000);
    });

    socket.on('userJoined', (user: any) => {
      setParticipants(prev => [...prev, user]);
    });

    return () => {
      socket.emit('leaveRoom', video.id);
      socket.disconnect();
    };
  }, [video.id, accessToken]);

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
      if (!isRemoteAction.current) {
        socketRef.current?.emit('pause', { videoId: video.id, time: videoRef.current.currentTime });
      }
      setPlaying(false);
    } else {
      videoRef.current.play();
      if (!isRemoteAction.current) {
        socketRef.current?.emit('play', { videoId: video.id, time: videoRef.current.currentTime });
      }
      setPlaying(true);
    }
    isRemoteAction.current = false;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const p = current / (videoRef.current.duration || 1);
    setProgress(p * 100);

    // Alpha Bubbles playback logic (optimized: only check if second changed)
    const prev = lastTimeRef.current;
    const currentSecond = Math.floor(current);
    const prevSecond = Math.floor(prev);

    if (currentSecond !== prevSecond) {
      const newBubbles = reactions
        .filter(r => r.timestamp > prev && r.timestamp <= current)
        .map(r => ({
          id: r.id + Math.random(),
          emoji: r.emoji,
          left: 10 + Math.random() * 80,
        }));
      if (newBubbles.length > 0) {
        setBubbles(b => [...b, ...newBubbles]);
        setTimeout(() => {
          setBubbles(b => b.filter(bubble => !newBubbles.find(nb => nb.id === bubble.id)));
        }, 3000);
      }
    }
    lastTimeRef.current = current;

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
    const time = ratio * videoRef.current.duration;
    videoRef.current.currentTime = time;
    socketRef.current?.emit('seek', { videoId: video.id, time });
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

  const REACTION_EMOJIS = ['🔥', '💎', '💡', '🤣'];

  const handleReactionClick = (emoji: string) => {
    if (!videoRef.current || !accessToken) return;
    const current = videoRef.current.currentTime;
    addReaction(video.id, emoji, current, accessToken);

    // Show locally immediately
    const id = Date.now().toString();
    const left = 10 + Math.random() * 80;
    setBubbles(b => [...b, { id, emoji, left }]);

    // Emit to others
    socketRef.current?.emit('reaction', { videoId: video.id, emoji, left });

    setTimeout(() => {
      setBubbles(b => b.filter(bubble => bubble.id !== id));
    }, 3000);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !accessToken || !videoRef.current) return;
    const current = videoRef.current.currentTime;
    await addComment(video.id, commentText, accessToken, current);
    setCommentText('');
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime + seconds;
    videoRef.current.currentTime = time;
    socketRef.current?.emit('seek', { videoId: video.id, time });
  };

  const handleSeekTo = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    socketRef.current?.emit('seek', { videoId: video.id, time });
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
    <div className="flex w-full h-full relative overflow-hidden bg-white/[0.02] backdrop-blur-3xl shadow-[inset_0_0_100px_rgba(255,255,255,0.02)] animate-in fade-in zoom-in-[0.98] duration-500">
      <style>{BUBBLE_STYLES}</style>

      {/* ── Player area ── */}
      <div className={`flex flex-col ${showComments ? 'flex-1' : 'w-full'} h-full overflow-hidden relative z-10`}>

        {/* Back + title bar */}
        <div className="flex items-center gap-3 md:gap-4 px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-4 shrink-0 flex-wrap">
          <button
            onClick={onClose}
            className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">{video.title}</p>
            <p className="text-[11px] text-white/40">
              {video.author?.profile?.displayName || video.author?.profile?.username} · {fmtViews(video.views)} views
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto mt-2 md:mt-0 overflow-x-auto no-scrollbar">
            {/* Owner Actions */}
            {isOwner && (
              <>
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 bg-white/8 text-white/60 border border-white/10 hover:border-white/25 hover:text-white"
                  title="Editar Vídeo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 bg-white/8 text-red-400/60 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 mr-2"
                  title="Eliminar Vídeo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </button>
              </>
            )}

            {/* Like */}
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 ${video.liked
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/8 text-white/60 border border-white/10 hover:border-white/25'
                }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={video.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {fmtViews(video.likesCount)}
            </button>

            {/* Comments toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all hover:scale-105 ${showComments
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/8 text-white/60 border border-white/10 hover:border-white/25'
                }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {fmtViews(video.commentsCount)}
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div
          className={`relative mx-2 md:mx-6 rounded-3xl md:rounded-[2.5rem] overflow-hidden ${isVertical ? 'flex-1 max-w-[380px] self-center w-full' : 'flex-1'
            } group/video shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-700`}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(12px)',
          }}
          onMouseMove={showControlsTemporarily}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Speeding Indicator */}
          {isSpeeding && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-1.5 rounded-full text-white font-black text-xs tracking-widest uppercase z-30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-none shadow-2xl">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 19l6-7-6-7M5 19l6-7-6-7" /></svg>
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

          {/* Alpha Bubbles Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {bubbles.map(b => (
              <div
                key={b.id}
                className="absolute bottom-20 text-4xl drop-shadow-2xl alpha-bubble"
                style={{ left: `${b.left}%` }}
              >
                {b.emoji}
              </div>
            ))}
          </div>

          {/* Controls overlay */}
          <div
            className={`absolute inset-0 z-20 flex flex-col justify-end transition-opacity duration-300 pointer-events-none ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* Bottom controls */}
            <div
              className="relative px-4 pb-4 space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              {/* Progress bar */}
              <div
                className="w-full h-1.5 rounded-full bg-white/20 cursor-pointer group relative"
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-blue-400 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                </div>

                {/* Alpha Chapters */}
                {chapters.map((chap, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-1 bg-black/60 group-hover:bg-white/80 transition-colors z-10 hover:w-1.5"
                    style={{ left: `${(chap.time / duration) * 100}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center gap-6 group-hover/video:opacity-100 opacity-0 transition-opacity z-30 shadow-2xl pointer-events-none whitespace-nowrap shadow-xl">
                      {chap.title}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                {/* Play/Pause (Small version for bottom bar) */}
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all"
                >
                  {playing ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>

                {/* Time */}
                <span className="text-white text-[10px] md:text-xs font-black">
                  {fmtDuration(videoRef.current?.currentTime || 0)} / {fmtDuration(duration)}
                </span>

                <div className="flex-1" />

                {/* Reactions Bar */}
                <div className="flex items-center gap-1 md:gap-2 bg-white/5 backdrop-blur-2xl rounded-full px-2 py-1 md:px-3 md:py-1 mr-1 md:mr-2 pointer-events-auto border border-white/10 shadow-xl">
                  {REACTION_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={(e) => { e.stopPropagation(); handleReactionClick(emoji); }}
                      className="text-base md:text-lg hover:scale-125 transition-transform active:scale-95"
                      title="Reagir"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Volume */}
                <div className="flex items-center gap-1 md:gap-2">
                  <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                    {muted || volume === 0 ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                    )}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-10 md:w-16 accent-purple-400"
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                {/* Watch Party */}
                <button onClick={() => setShowWatchParty(true)} className="block text-white/70 hover:text-white transition-colors" title="Watch Party">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </button>

                {/* PiP (Mini-Player) */}
                <button onClick={handlePiP} className="block text-white/70 hover:text-white transition-colors" title="Mini-Player (PiP)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><rect x="13" y="13" width="6" height="4" rx="1" ry="1" /></svg>
                </button>

                {/* Fullscreen */}
                <button onClick={handleFullscreen} className="text-white/70 hover:text-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
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
              className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all pointer-events-auto active:scale-95 relative shadow-xl"
              title="Recuar 10s"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              <span className="absolute text-[10px] font-black mt-1">10</span>
            </button>

            {/* Center Play/Pause Icon */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              onPointerDown={e => e.stopPropagation()}
              className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-white/30 transition-all pointer-events-auto active:scale-95 shadow-2xl shadow-black/50 ${!playing ? 'animate-pulse' : ''}`}
            >
              {playing ? (
                <svg className="w-6 h-6 md:w-8 md:h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={(e) => { e.stopPropagation(); skip(10); }}
              onPointerDown={e => e.stopPropagation()}
              className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all pointer-events-auto active:scale-95 relative shadow-xl"
              title="Avançar 10s"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
              <span className="absolute text-[10px] font-black mt-1">10</span>
            </button>
          </div>

          {/* Watch Party Lobby Modal - Rendered via Portal to avoid clipping */}
          {showWatchParty && mounted && createPortal(
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/[0.02] backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500 p-6">
              <div
                className="w-full max-w-[440px] border border-white/20 rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(64px) saturate(180%)',
                  boxShadow: '0 0 100px rgba(59, 130, 246, 0.15), inset 0 0 40px rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Decorative Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 blur-[80px] pointer-events-none" />

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/20 text-white flex items-center justify-center mb-6 shadow-xl">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>

                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Alpha Watch Party</h2>
                <p className="text-sm text-white/50 text-center mb-8 px-4 leading-relaxed">
                  Cria uma experiência imersiva e vê vídeos em sincronia perfeita com os teus amigos.
                </p>

                <div className="w-full bg-white/5 rounded-3xl p-5 border border-white/10 mb-8 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Participantes</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black animate-pulse">LIVE SYNC</span>
                  </div>

                  <div className="space-y-4 max-h-[120px] overflow-y-auto no-scrollbar">
                    <div className="flex items-center gap-4 group">
                      <div className="relative">
                        {authUser?.profile?.avatarUrl ? (
                          <img src={resolveUrl(authUser.profile.avatarUrl)} className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/30 group-hover:border-blue-500/60 transition-colors" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-sm font-black text-white border-2 border-white/10">{(authUser?.profile?.displayName || 'A')[0]}</div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black/50" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{authUser?.profile?.displayName || authUser?.profile?.username}</span>
                        <span className="text-[10px] font-bold text-white/30 uppercase">Tu (Anfitrião)</span>
                      </div>
                    </div>

                    {participants.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 group animate-in slide-in-from-left-2 duration-300">
                        <img src={resolveUrl(p.profile?.avatarUrl || '')} className="w-10 h-10 rounded-full object-cover border-2 border-white/10" />
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white">{p.profile?.displayName || p.username}</span>
                          <span className="text-[10px] font-bold text-white/30 uppercase">Participante</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white font-black text-sm hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    Copiar Convite
                  </button>
                  <button
                    onClick={() => setShowWatchParty(false)}
                    className="w-full py-4 rounded-2xl bg-white/5 text-white/70 font-black text-sm border border-white/5 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                  >
                    Fechar Lobby
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
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
        <div className="absolute inset-0 md:static md:w-[380px] w-full shrink-0 flex flex-col h-full border-l border-white/10 bg-black/40 md:bg-white/[0.05] backdrop-blur-[40px] md:backdrop-blur-2xl z-50 shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="px-6 py-4 md:py-6 border-b border-white/10 shrink-0 bg-white/[0.02] flex justify-between items-center">
            <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Comentários <span className="text-blue-400">({video.commentsCount})</span>
            </h3>
            <button onClick={() => setShowComments(false)} className="md:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
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
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/15 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-4 no-scrollbar">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <p className="text-xs font-bold mt-2">Ainda não há comentários.</p>
              </div>
            ) : (
              comments.map(c => <CommentItem key={c.id} comment={c} onSeek={handleSeekTo} />)
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
          <div className="absolute inset-0 backdrop-blur-3xl" style={{ background: 'rgba(255,255,255,0.02)' }} />

          {/* Modal card */}
          <div
            className="relative w-full max-w-sm rounded-[2rem] border border-red-500/30 animate-in zoom-in-95 duration-300 overflow-hidden p-6 text-center shadow-2xl"
            style={{
              background: 'rgba(255, 0, 0, 0.05)',
              backdropFilter: 'blur(64px) saturate(180%)',
              WebkitBackdropFilter: 'blur(64px) saturate(180%)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
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
