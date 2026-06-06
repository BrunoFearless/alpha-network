'use client';
// Refresh TS
import { useState, useEffect, useRef } from 'react';
import { useWatchStore, Video } from '@/store/watch.store';
import { useAuthStore } from '@/store/auth.store';
import { AlphaVideoPlayer } from '@/app/main/lazer/components/watch/AlphaVideoPlayer';
import { resolveUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CATEGORIES = ['Para Ti', 'Tendências', 'Música', 'Gaming', 'Desporto', 'Tecnologia', 'Arte', 'Comédia', 'Educação'];

// Shared glassmorphism input style — transparent, no dark bg
const glassInput = 'w-full px-5 py-3.5 bg-transparent border border-white/15 rounded-2xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40 transition-all backdrop-blur-none';

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
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 2592000)}mês`;
}

// ── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({ video, onPlay, index = 0 }: { video: Video; onPlay: () => void; index?: number }) {
  const isVertical = video.format === 'vertical';

  return (
    <div
      onClick={onPlay}
      className={`group relative cursor-pointer rounded-[2rem] overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(168,85,247,0.15)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 fill-mode-both ${isVertical ? 'row-span-2' : ''}`}
      style={{ animationDuration: '600ms', animationDelay: `${index * 50}ms` }}
    >
      {/* Thumbnail */}
      <div className={`relative overflow-hidden ${isVertical ? 'aspect-[9/16]' : 'aspect-video'}`}>
        {video.thumbnailUrl ? (
          <img
            src={resolveUrl(video.thumbnailUrl)}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-blue-900/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded-lg">
          {fmtDuration(video.duration)}
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
        {isVertical && (
          <div className="absolute top-2 left-2 bg-purple-500/70 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
            Vertical
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0 mt-0.5">
            {video.author?.profile?.avatarUrl ? (
              <img src={resolveUrl(video.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-black text-white/40">
                {(video.author?.profile?.displayName || 'A')[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white line-clamp-2 leading-tight">{video.title}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {video.author?.profile?.displayName || video.author?.profile?.username || 'Anónimo'}
            </p>
            <p className="text-[10px] text-white/25 mt-0.5">
              {fmtViews(video.views)} visualizações · {timeAgo(video.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { accessToken } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState({
    videoFile: null as File | null,
    thumbnailFile: null as File | null,
    title: '',
    description: '',
    category: 'Geral',
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
      if (state.tags) fd.append('tags', JSON.stringify(state.tags.split(',').map(t => t.trim()).filter(Boolean)));

      const res = await fetch(`${API}/api/v1/watch/videos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) { onSuccess(); onClose(); }
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-6"
      onClick={onClose}
    >
      {/* Backdrop — only subtle blur, no dark overlay */}
      <div className="absolute inset-0 backdrop-blur-xl" style={{ background: 'rgba(0,0,0,0.25)' }} />

      {/* Modal card — pure glassmorphism, no solid bg */}
      <div
        className="relative w-full max-w-lg rounded-[2.5rem] border border-white/20 animate-in fade-in zoom-in-[0.95] slide-in-from-bottom-8 duration-500 overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(48px) saturate(160%)',
          WebkitBackdropFilter: 'blur(48px) saturate(160%)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div className="max-h-[88vh] overflow-y-auto no-scrollbar p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-2xl font-black text-white">Publicar Vídeo</h3>
              <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-widest">Alpha Watch Studio</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:border-white/30 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Video dropzone */}
            <div
              onClick={() => videoInputRef.current?.click()}
              className={`w-full h-24 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all gap-2 ${state.videoFile
                  ? 'border-purple-400/50 bg-purple-400/10'
                  : 'border-white/15 border-dashed hover:border-white/30 hover:bg-white/[0.04]'
                }`}
            >
              {state.videoFile ? (
                <>
                  <svg className="text-purple-300" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  <p className="text-sm font-bold text-purple-300 max-w-xs truncate text-center px-4">{state.videoFile.name}</p>
                </>
              ) : (
                <>
                  <svg className="text-white/25" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" /></svg>
                  <p className="text-xs text-white/30 font-bold">Arrasta um vídeo ou clica para selecionar</p>
                </>
              )}
            </div>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={e => setState(s => ({ ...s, videoFile: e.target.files?.[0] || null }))} />

            {/* Thumbnail */}
            <div
              onClick={() => thumbInputRef.current?.click()}
              className={`w-full h-16 rounded-2xl border-2 flex items-center justify-center gap-3 cursor-pointer transition-all ${state.thumbnailFile ? 'border-blue-400/50 bg-blue-400/10' : 'border-white/10 border-dashed hover:border-white/20 hover:bg-white/[0.03]'
                }`}
            >
              <svg className={state.thumbnailFile ? 'text-blue-300' : 'text-white/20'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
              <p className="text-[11px] font-bold text-white/30">{state.thumbnailFile ? state.thumbnailFile.name : 'Miniatura (opcional)'}</p>
            </div>
            <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={e => setState(s => ({ ...s, thumbnailFile: e.target.files?.[0] || null }))} />

            {/* Title */}
            <input
              type="text"
              placeholder="Título do vídeo *"
              value={state.title}
              onChange={e => setState(s => ({ ...s, title: e.target.value }))}
              className={glassInput}
            />

            {/* Description */}
            <textarea
              placeholder="Descrição (opcional)"
              value={state.description}
              onChange={e => setState(s => ({ ...s, description: e.target.value }))}
              rows={2}
              className={`${glassInput} resize-none`}
            />

            <div className="flex gap-3 items-center w-full">
              {/* Category */}
              <div className="flex-1 relative" ref={categoryRef}>
                 <button
                   type="button"
                   onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                   className="w-full h-[52px] px-5 bg-transparent border border-white/15 rounded-2xl text-white text-sm flex items-center justify-between hover:bg-white/[0.04] focus:outline-none transition-all text-left"
                 >
                   <span>{state.category}</span>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                 </button>

                 {showCategoryDropdown && (
                   <div className="absolute top-[105%] left-0 right-0 p-1.5 bg-neutral-950/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl z-[150] max-h-48 overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
                     {CATEGORIES.filter(c => c !== 'Para Ti').map(c => (
                       <button
                         key={c}
                         type="button"
                         onClick={() => {
                           setState(s => ({ ...s, category: c }));
                           setShowCategoryDropdown(false);
                         }}
                         className={`w-full px-4 py-2.5 rounded-xl text-left text-xs transition-all ${state.category === c ? 'bg-white text-black font-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                       >
                         {c}
                       </button>
                     ))}
                   </div>
                 )}
              </div>

              {/* Format toggle */}
              <div className="flex rounded-2xl overflow-hidden border border-white/15">
                {(['horizontal', 'vertical'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setState(s => ({ ...s, format: f }))}
                    className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${state.format === f
                        ? 'bg-purple-500/25 text-purple-300 border-r border-white/10'
                        : 'text-white/35 hover:text-white/70'
                      }`}
                    style={{ background: state.format === f ? undefined : 'transparent' }}
                  >
                    {f === 'horizontal' ? '16:9' : '9:16'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <input
              type="text"
              placeholder="Tags separadas por vírgula (ex: música, tutorial)"
              value={state.tags}
              onChange={e => setState(s => ({ ...s, tags: e.target.value }))}
              className={glassInput}
            />

            {/* Submit */}
            <button
              onClick={handleUpload}
              disabled={!state.videoFile || !state.title || uploading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-sm uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 mt-1"
            >
              {uploading ? 'A publicar...' : 'Publicar Vídeo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

function EditModal({ video, onClose, onSuccess }: { video: Video; onClose: () => void; onSuccess: () => void }) {
  const { accessToken } = useAuthStore();
  const { updateVideo } = useWatchStore();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState({
    title: video.title || '',
    description: video.description || '',
    category: video.category || 'Geral',
    tags: video.tags ? video.tags.join(', ') : '',
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSave = async () => {
    if (!state.title || !accessToken) return;
    setSaving(true);
    try {
      const tagsArray = state.tags ? state.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
      const success = await updateVideo(video.id, accessToken, {
        title: state.title,
        description: state.description,
        category: state.category,
        tags: tagsArray as any,
      });
      if (success) { onSuccess(); onClose(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-xl" style={{ background: 'rgba(0,0,0,0.25)' }} />

      {/* Modal card */}
      <div
        className="relative w-full max-w-lg rounded-[2.5rem] border border-white/20 animate-in zoom-in-95 duration-300 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(48px) saturate(160%)',
          WebkitBackdropFilter: 'blur(48px) saturate(160%)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div className="max-h-[88vh] overflow-y-auto no-scrollbar p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-2xl font-black text-white">Editar Vídeo</h3>
              <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-widest">Alpha Watch Studio</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:border-white/30 transition-all"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Title */}
            <input
              type="text"
              placeholder="Título do vídeo *"
              value={state.title}
              onChange={e => setState(s => ({ ...s, title: e.target.value }))}
              className={glassInput}
            />

            {/* Description */}
            <textarea
              placeholder="Descrição (opcional)"
              value={state.description}
              onChange={e => setState(s => ({ ...s, description: e.target.value }))}
              rows={2}
              className={`${glassInput} resize-none`}
            />

            <div className="flex gap-3 items-center w-full">
              {/* Category */}
              <div className="flex-1 relative" ref={categoryRef}>
                 <button
                   type="button"
                   onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                   className="w-full h-[52px] px-5 bg-transparent border border-white/15 rounded-2xl text-white text-sm flex items-center justify-between hover:bg-white/[0.04] focus:outline-none transition-all text-left"
                 >
                   <span>{state.category}</span>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                 </button>

                 {showCategoryDropdown && (
                   <div className="absolute top-[105%] left-0 right-0 p-1.5 bg-neutral-950/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl z-[150] max-h-48 overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
                     {CATEGORIES.filter(c => c !== 'Para Ti').map(c => (
                       <button
                         key={c}
                         type="button"
                         onClick={() => {
                           setState(s => ({ ...s, category: c }));
                           setShowCategoryDropdown(false);
                         }}
                         className={`w-full px-4 py-2.5 rounded-xl text-left text-xs transition-all ${state.category === c ? 'bg-white text-black font-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                       >
                         {c}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
            </div>

            {/* Tags */}
            <input
              type="text"
              placeholder="Tags separadas por vírgula (ex: música, tutorial)"
              value={state.tags}
              onChange={e => setState(s => ({ ...s, tags: e.target.value }))}
              className={glassInput}
            />

            {/* Submit */}
            <button
              onClick={handleSave}
              disabled={!state.title || saving}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-sm uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 mt-1"
            >
              {saving ? 'A Guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main LazerWatchView ──────────────────────────────────────────────────────

export function LazerWatchView() {
  const { user: authUser, accessToken } = useAuthStore();
  const {
    videos, currentVideo, isLoading, activeCategory,
    fetchVideos, setCurrentVideo, setActiveCategory, setSearchQuery, likeVideo,
  } = useWatchStore();

  const [showUpload, setShowUpload] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchVideos({ category: activeCategory, requesterId: authUser?.id });
  }, [activeCategory]);

  const handleSearch = (q: string) => {
    setLocalSearch(q);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(q);
      fetchVideos({ search: q || undefined, category: activeCategory, requesterId: authUser?.id });
    }, 400);
  };

  const handleVideoSuccess = () => {
    fetchVideos({ category: activeCategory, requesterId: authUser?.id });
  };

  return (
    <div className="flex h-full w-full">

      {/* ── VIDEO PLAYER VIEW ── */}
      {currentVideo ? (
        <AlphaVideoPlayer
          video={currentVideo}
          onClose={() => setCurrentVideo(null)}
          onLike={accessToken ? () => likeVideo(currentVideo.id, accessToken) : undefined}
          onEdit={() => setEditingVideo(currentVideo)}
        />
      ) : (

        /* ── BROWSE VIEW ── */
        <div className="flex-1 flex flex-col h-full overflow-hidden">

          {/* Top Bar */}
          <div className="flex flex-col md:flex-row items-center gap-4 px-4 pt-6 pb-4 md:px-5 md:pt-8 md:pb-5 shrink-0">
            {/* Logo & Mobile Upload */}
            <div className="flex items-center justify-between w-full md:w-auto md:mr-2">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div>
                  <p className="text-base font-black text-white leading-none">Alpha Watch</p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest">Vídeo Premium</p>
                </div>
              </div>
              
              {/* Mobile Upload */}
              {accessToken && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="md:hidden shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl border border-purple-400/30 text-white transition-all hover:bg-purple-500/20 active:scale-95"
                  style={{ background: 'rgba(168,85,247,0.12)', backdropFilter: 'blur(12px)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="flex-1 relative w-full">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar vídeos..."
                value={localSearch}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-3 rounded-2xl border border-white/15 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/30 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
              />
            </div>

            {/* Desktop Upload */}
            {accessToken && (
              <button
                onClick={() => setShowUpload(true)}
                className="hidden md:flex shrink-0 items-center gap-2 px-5 py-3 rounded-2xl border border-purple-400/30 text-white font-black text-xs uppercase tracking-widest transition-all hover:border-purple-400/50 hover:scale-105 active:scale-95"
                style={{ background: 'rgba(168,85,247,0.12)', backdropFilter: 'blur(12px)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Publicar
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-4 md:px-5 pb-5 overflow-x-auto no-scrollbar shrink-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeCategory === cat
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                    : 'text-white/50 border border-white/[0.08] hover:text-white hover:border-white/20'
                  }`}
                style={activeCategory !== cat ? { background: 'rgba(255,255,255,0.04)' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Video Grid */}
          <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-8">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-[2rem] overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 60}ms` }}>
                    <div className="aspect-video" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="p-3 space-y-2">
                      <div className="h-3 rounded-full w-4/5" style={{ background: 'rgba(255,255,255,0.07)' }} />
                      <div className="h-2 rounded-full w-2/5" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4 text-white/20">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" /></svg>
                <p className="text-sm font-bold">Nenhum vídeo encontrado.</p>
                {accessToken && (
                  <button onClick={() => setShowUpload(true)} className="text-xs text-purple-400 hover:text-purple-300 font-black uppercase tracking-widest transition-colors">
                    + Sê o primeiro a publicar
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                {videos.map((video, i) => (
                  <VideoCard key={video.id} video={video} onPlay={() => setCurrentVideo(video)} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleVideoSuccess} />
      )}

      {/* Edit Modal */}
      {editingVideo && (
        <EditModal video={editingVideo} onClose={() => setEditingVideo(null)} onSuccess={handleVideoSuccess} />
      )}
    </div>
  );
}
