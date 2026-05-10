'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMusicStore, Track } from '@/store/music.store';
import { useAuthStore } from '@/store/auth.store';

const GENRES = ['Todos', 'Lo-fi', 'Hip-Hop', 'Electronic', 'Rock', 'Pop', 'Indie', 'Classical', 'R&B', 'Jazz'];

function parseLRC(lrc: string) {
  const lines = lrc.split('\n');
  const result = [];
  const timeRegex = /\[(\d+):(\d+\.\d+)\]/;
  
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function TrackRow({ track, index, onPlay, isActive }: { track: Track; index: number; onPlay: () => void; isActive: boolean }) {
  const { likeTrack } = useMusicStore();
  const { accessToken } = useAuthStore();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  return (
    <div
      className={`group flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 ${
        isActive ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'
      }`}
      onClick={onPlay}
    >
      {/* Index / Play Icon */}
      <div className="w-8 text-center shrink-0">
        <span className={`text-xs font-black ${isActive ? 'hidden' : 'block group-hover:hidden text-white/30'}`}>{index + 1}</span>
        <svg className={`w-4 h-4 mx-auto ${isActive ? 'block text-purple-400' : 'hidden group-hover:block text-white'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>

      {/* Cover */}
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0 shadow-md">
        {track.coverUrl ? (
          <img src={resolveUrl(track.coverUrl)} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-lg">🎵</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${isActive ? 'text-purple-300' : 'text-white'}`}>{track.title}</p>
        <p className="text-xs text-white/40 truncate">{track.artist}</p>
      </div>

      {/* Genre badge */}
      {track.genre && (
        <span className="hidden md:block text-[9px] font-black uppercase tracking-widest text-white/20 px-2 py-1 rounded-full bg-white/5">{track.genre}</span>
      )}

      {/* Plays */}
      <span className="hidden md:block text-xs font-black text-white/20 w-16 text-right">{track.plays.toLocaleString()}</span>

      {/* Like */}
      <button
        className={`shrink-0 transition-all hover:scale-110 active:scale-95 ${track.liked ? 'text-pink-400' : 'text-white/20 hover:text-white/60'}`}
        onClick={(e) => { e.stopPropagation(); if (accessToken) likeTrack(track.id, accessToken); }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={track.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>

      {/* Duration */}
      <span className="text-xs font-black text-white/20 w-10 text-right shrink-0">{fmtTime(track.duration)}</span>
    </div>
  );
}

export function LazerMusicView() {
  const {
    tracks, likedTracks, playlists, isLoading, searchQuery, activeGenre,
    fetchTracks, fetchLikedTracks, fetchUserPlaylists, playTrack, currentTrack,
    setSearchQuery, setActiveGenre,
  } = useMusicStore();
  const { user: authUser, accessToken } = useAuthStore();

  const [activeSection, setActiveSection] = useState<'discover' | 'liked' | 'playlists' | 'upload' | 'radio'>('discover');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadState, setUploadState] = useState({ 
    title: '', 
    artist: '', 
    album: '', 
    genre: '', 
    lyricsRaw: '', 
    collaboratorsRaw: '', 
    audioFile: null as File | null, 
    coverFile: null as File | null 
  });
  const [uploading, setUploading] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTracks(searchQuery || undefined, activeGenre || undefined);
  }, [searchQuery, activeGenre]);

  useEffect(() => {
    if (accessToken) fetchLikedTracks(accessToken);
    if (authUser?.id) fetchUserPlaylists(authUser.id).then(setMyPlaylists);
  }, [accessToken, authUser?.id]);

  const handleUpload = async () => {
    if (!uploadState.audioFile || !uploadState.title || !uploadState.artist || !accessToken) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('audio', uploadState.audioFile);
      if (uploadState.coverFile) fd.append('cover', uploadState.coverFile);
      fd.append('title', uploadState.title);
      fd.append('artist', uploadState.artist);
      if (uploadState.album) fd.append('album', uploadState.album);
      if (uploadState.genre) fd.append('genre', uploadState.genre);

      // Parse lyrics
      if (uploadState.lyricsRaw) {
        const parsedLyrics = parseLRC(uploadState.lyricsRaw);
        if (parsedLyrics.length > 0) fd.append('lyrics', JSON.stringify(parsedLyrics));
      }

      // Parse collaborators (comma separated usernames/ids)
      if (uploadState.collaboratorsRaw) {
        const collabs = uploadState.collaboratorsRaw.split(',').map(s => s.trim()).filter(Boolean);
        if (collabs.length > 0) fd.append('collaborators', JSON.stringify(collabs));
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/v1/music/tracks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setShowUploadModal(false);
        setUploadState({ title: '', artist: '', album: '', genre: '', lyricsRaw: '', collaboratorsRaw: '', audioFile: null, coverFile: null });
        fetchTracks();
      }
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const displayTracks = activeSection === 'liked' ? likedTracks : tracks;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  return (
    <div className="w-full h-full flex overflow-hidden font-['Nunito',sans-serif]">
      
      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 shrink-0 h-full flex flex-col gap-2 p-4 border-r border-white/5">
        
        <div className="mb-4">
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 px-2">Alpha Music</h2>
        </div>
        <div className="flex flex-col gap-1">
          {[
            { id: 'discover', label: 'Explorar', icon: '✨' },
            { id: 'radio', label: 'Rádio Alpha', icon: '🎙️' },
            { id: 'liked', label: 'Favoritas', icon: '❤️' },
            { id: 'playlists', label: 'Minhas Playlists', icon: '📂' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id as any);
                if (item.id === 'radio') {
                  const { fetchRadio, activeGenre } = useMusicStore.getState();
                  fetchRadio(activeGenre || undefined);
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all focus:outline-none ${
                activeSection === item.id ? 'bg-white/10 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] scale-[1.02] border border-white/20' : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 px-2">
          <div className="w-full h-[1px] bg-white/5 mb-4" />
          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3">As Minhas Playlists</p>
          <div className="flex flex-col gap-1">
            {myPlaylists.slice(0, 8).map(pl => (
              <button key={pl.id} className="text-left px-2 py-1.5 text-xs text-white/40 hover:text-white/70 truncate transition-colors rounded-lg hover:bg-white/5 focus:outline-none">
                {pl.title}
              </button>
            ))}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mt-1 focus:outline-none"
            >
              <span className="text-base leading-none">+</span> Nova Playlist
            </button>
          </div>
        </div>

        {/* Upload Button */}
        <div className="mt-auto">
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 focus:outline-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Publicar Música
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Pesquisar músicas, artistas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {/* Genre Filters */}
          {activeSection === 'discover' && (
            <div className="flex gap-2 flex-wrap">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setActiveGenre(g === 'Todos' ? null : g)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    (g === 'Todos' && !activeGenre) || activeGenre === g
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Track List */}
        <div className="flex-1 px-8 pb-32">
          {activeSection === 'discover' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-white">
                  {activeGenre ? activeGenre : 'Descobrir'} 
                  <span className="text-white/20 text-sm font-bold ml-2">· {tracks.length} faixas</span>
                </h2>
              </div>

              {/* Header Row */}
              <div className="flex items-center gap-4 px-4 mb-2 text-[9px] font-black uppercase tracking-widest text-white/20">
                <span className="w-8 text-center">#</span>
                <span className="w-10 shrink-0" />
                <span className="flex-1">Título</span>
                <span className="hidden md:block w-16 text-center">Género</span>
                <span className="hidden md:block w-16 text-right">Plays</span>
                <span className="w-4" />
                <span className="w-10 text-right">Duração</span>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/20">
                  <span className="text-6xl">🎵</span>
                  <p className="text-sm font-bold">Nenhuma música encontrada.</p>
                  <p className="text-xs">Sê o primeiro a publicar!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {displayTracks.map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      isActive={currentTrack?.id === track.id}
                      onPlay={() => playTrack(track, displayTracks)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === 'liked' && (
            <>
              <h2 className="text-lg font-black text-white mb-6">Músicas Guardadas <span className="text-white/20 text-sm font-bold ml-2">· {likedTracks.length}</span></h2>
              {likedTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/20">
                  <span className="text-6xl">❤️</span>
                  <p className="text-sm font-bold">Ainda não guardaste nenhuma música.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {likedTracks.map((track, i) => (
                    <TrackRow key={track.id} track={track} index={i} isActive={currentTrack?.id === track.id} onPlay={() => playTrack(track, likedTracks)} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === 'playlists' && (
            <>
              <h2 className="text-lg font-black text-white mb-6">As Minhas Playlists</h2>
              {myPlaylists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/20">
                  <span className="text-6xl">📂</span>
                  <p className="text-sm font-bold">Ainda não criaste nenhuma playlist.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {myPlaylists.map(pl => (
                    <div key={pl.id} className="group p-4 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                      <div className="w-full aspect-square rounded-2xl bg-white/10 mb-3 overflow-hidden">
                        {pl.tracks?.[0]?.track?.coverUrl ? (
                          <img src={resolveUrl(pl.tracks[0].track.coverUrl)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                        )}
                      </div>
                      <p className="text-sm font-black text-white truncate">{pl.title}</p>
                      <p className="text-xs text-white/30">{pl._count?.tracks ?? 0} músicas</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === 'radio' && (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white">Rádio Alpha</h2>
                  <p className="text-sm text-white/40 mt-1 uppercase tracking-widest font-bold">Stream Contínuo · {activeGenre || 'Todos os Géneros'}</p>
                </div>
                <button 
                  onClick={() => useMusicStore.getState().fetchRadio(activeGenre || undefined)}
                  className="px-6 py-2.5 rounded-full bg-white/10 text-white border border-white/20 font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all shadow-xl focus:outline-none"
                >
                  Regerar Stream 🔄
                </button>
              </div>

              <div className="glass-panel-dark p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center gap-6 min-h-[400px]">
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 animate-pulse flex items-center justify-center text-5xl shadow-[0_0_50px_rgba(168,85,247,0.4)]">
                  🎙️
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">A Rádio está ativa!</h3>
                  <p className="text-sm text-white/40 max-w-sm">Estamos a gerar uma sequência infinita de músicas baseada no teu gosto e no género selecionado.</p>
                </div>
                {currentTrack && (
                  <div className="mt-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                      {currentTrack.coverUrl && <img src={resolveUrl(currentTrack.coverUrl)} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-white/40 uppercase tracking-widest">A tocar agora</p>
                      <p className="text-sm font-bold text-white">{currentTrack.title}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-8" onClick={() => setShowUploadModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md bg-white/[0.08] backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-white">Publicar Música</h3>
                <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">Alpha Music Studio</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 active:scale-95">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              {/* Audio File Drop Zone */}
              <div
                className={`w-full h-28 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all gap-2 shadow-inner ${
                  uploadState.audioFile
                    ? 'border-white/40 bg-white/20'
                    : 'border-white/20 border-dashed hover:border-white/40 hover:bg-white/10'
                }`}
                onClick={() => audioInputRef.current?.click()}
              >
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e => setUploadState(s => ({ ...s, audioFile: e.target.files?.[0] || null }))} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={uploadState.audioFile ? 'text-white' : 'text-white/40'}>
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <p className={`text-xs font-bold ${uploadState.audioFile ? 'text-white' : 'text-white/40'}`}>
                  {uploadState.audioFile ? `🎵 ${uploadState.audioFile.name}` : 'Clica para escolher o ficheiro de áudio'}
                </p>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'title', placeholder: 'Título *' },
                  { key: 'artist', placeholder: 'Artista *' },
                  { key: 'album', placeholder: 'Álbum' },
                  { key: 'genre', placeholder: 'Género' },
                ].map(({ key, placeholder }) => (
                  <input
                    key={key}
                    type="text"
                    placeholder={placeholder}
                    value={(uploadState as any)[key]}
                    onChange={e => setUploadState(s => ({ ...s, [key]: e.target.value }))}
                    className="px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all shadow-inner"
                  />
                ))}
              </div>

              {/* Advanced Fields: Lyrics & Collabs */}
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Colaboradores (ex: @user1, @user2)"
                  value={uploadState.collaboratorsRaw}
                  onChange={e => setUploadState(s => ({ ...s, collaboratorsRaw: e.target.value }))}
                  className="px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all shadow-inner"
                />
                <textarea
                  placeholder="Letras (Formato LRC: [00:15.00] Letra)"
                  value={uploadState.lyricsRaw}
                  onChange={e => setUploadState(s => ({ ...s, lyricsRaw: e.target.value }))}
                  className="px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all shadow-inner h-24 resize-none"
                />
              </div>

              {/* Cover picker */}
              <button
                className="flex items-center gap-3 text-xs text-white/50 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5"
                onClick={() => coverInputRef.current?.click()}
              >
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => setUploadState(s => ({ ...s, coverFile: e.target.files?.[0] || null }))} />
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-lg leading-none border border-white/10 shadow-sm">+</div>
                {uploadState.coverFile ? <span className="font-bold text-white">✓ {uploadState.coverFile.name}</span> : 'Adicionar capa da música (opcional)'}
              </button>

              {/* Divider */}
              <div className="w-full h-px bg-white/10 my-1" />

              {/* Submit */}
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadState.audioFile || !uploadState.title || !uploadState.artist}
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_8px_32px_rgba(0,0,0,0.3)] focus:outline-none"
              >
                {uploading ? '⏳ A publicar...' : '✦ Publicar Faixa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
