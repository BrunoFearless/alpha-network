'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMusicStore, Track } from '@/store/music.store';
import { useAuthStore } from '@/store/auth.store';
import { resolveUrl } from '@/lib/api';

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
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function TrackRow({ track, index, onPlay, isActive }: { track: Track; index: number; onPlay: () => void; isActive: boolean }) {
  const { likeTrack } = useMusicStore();
  const { accessToken } = useAuthStore();

  return (
    <div
      className={`group flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 ${isActive ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'
        }`}
      onClick={onPlay}
    >
      {/* Index / Play Icon */}
      <div className="w-8 text-center shrink-0">
        <span className={`text-xs font-black ${isActive ? 'hidden' : 'block group-hover:hidden text-white/30'}`}>{index + 1}</span>
        <svg className={`w-4 h-4 mx-auto ${isActive ? 'block text-purple-400' : 'hidden group-hover:block text-white'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
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
      <span className="hidden md:block text-xs font-black text-white/20 w-16 text-right">{(track.plays || 0).toLocaleString()}</span>

      {/* Like */}
      <button
        className={`shrink-0 transition-all hover:scale-110 active:scale-95 ${track.liked ? 'text-pink-400' : 'text-white/20 hover:text-white/60'}`}
        onClick={(e) => { e.stopPropagation(); if (accessToken) likeTrack(track.id, accessToken); }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={track.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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

  const handleSectionChange = (section: any) => {
    setActiveSection(section);
    setSelectedPlaylist(null);
  };

  const [activeSection, setActiveSection] = useState<'discover' | 'liked' | 'playlists' | 'upload' | 'radio'>('discover');
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [editingPlaylistState, setEditingPlaylistState] = useState({
    title: '',
    description: '',
    isPublic: true,
    coverFile: null as File | null
  });
  
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

  const [playlistState, setPlaylistState] = useState({
    title: '',
    description: '',
    isPublic: true,
    coverFile: null as File | null
  });

  const [uploading, setUploading] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const playlistCoverInputRef = useRef<HTMLInputElement>(null);
  const editPlaylistCoverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTracks(searchQuery || undefined, activeGenre || undefined);
  }, [searchQuery, activeGenre]);

  useEffect(() => {
    if (playlistSearchQuery.length > 2) {
      const filtered = tracks.filter(t => 
        t.title.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(playlistSearchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [playlistSearchQuery, tracks]);

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

  return (
    <div className="w-full h-full flex overflow-hidden font-['Nunito',sans-serif] rounded-none md:rounded-[4rem] relative">

      {/* Mobile Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/60 z-[90] md:hidden backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`w-64 shrink-0 h-full flex flex-col gap-2 p-4 border-r border-white/5 bg-black/70 md:bg-transparent backdrop-blur-3xl md:backdrop-blur-none absolute md:relative z-[100] transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">Alpha Music</h2>
          <button className="md:hidden p-2 text-white/50" onClick={() => setShowMobileMenu(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {[
            { id: 'discover', label: 'Explorar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> },
            { id: 'radio', label: 'Rádio Alpha', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg> },
            { id: 'liked', label: 'Favoritas', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
            { id: 'playlists', label: 'Minhas Playlists', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M12 7v6"/><path d="M9 10h6"/></svg> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                handleSectionChange(item.id as any);
                setShowMobileMenu(false);
                if (item.id === 'radio') {
                  const { fetchRadio, activeGenre } = useMusicStore.getState();
                  fetchRadio(activeGenre || undefined);
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all focus:outline-none ${activeSection === item.id ? 'bg-white/10 text-white scale-[1.02] border border-white/20' : 'text-white/40 hover:bg-white/5 hover:text-white'
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
              <button 
                key={pl.id} 
                onClick={() => {
                  setSelectedPlaylist(pl);
                  setActiveSection('playlists');
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/40 hover:text-white/70 truncate transition-colors rounded-lg hover:bg-white/5 focus:outline-none group/pl"
              >
                <div className="w-4 h-4 rounded-sm bg-white/5 overflow-hidden shrink-0">
                  {(pl.coverUrl || pl.tracks?.[0]?.track?.coverUrl) ? (
                    <img src={resolveUrl(pl.coverUrl || pl.tracks[0].track.coverUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px]">🎵</div>
                  )}
                </div>
                <span className="truncate">{pl.title}</span>
              </button>
            ))}
            <button
              onClick={() => setShowPlaylistModal(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mt-1 focus:outline-none"
            >
              <span className="text-base leading-none">+</span> Nova Playlist
            </button>
          </div>
        </div>

        {/* Removed upload button from here to prevent player overlap */}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">

        {/* Header */}
        <div className="px-4 md:px-8 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <button className="md:hidden p-2 bg-white/5 rounded-xl border border-white/10 text-white" onClick={() => setShowMobileMenu(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
              />
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 focus:outline-none shrink-0"
              title="Publicar Música"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span className="hidden md:inline">Publicar</span>
            </button>
          </div>

          {/* Genre Filters */}
          {activeSection === 'discover' && !selectedPlaylist && (
            <div className="flex gap-2 flex-wrap">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setActiveGenre(g === 'Todos' ? null : g)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${(g === 'Todos' && !activeGenre) || activeGenre === g
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

        {/* Content Area */}
        <div className="flex-1 px-4 md:px-8 pb-28 md:pb-32">
          {!selectedPlaylist ? (
            <>
              {activeSection === 'discover' && (
                <>
                  <div className="flex items-center gap-2 mb-6 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                    <span>Catálogo Alpha</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  <div className="flex items-center gap-4 text-white/30 text-[10px] font-black uppercase tracking-widest px-4 mb-2">
                    <span className="w-10 shrink-0 text-center">#</span>
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
                          key={`${track.id}-${i}`}
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
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/10">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      <p className="text-sm font-bold opacity-40">Ainda não guardaste nenhuma música.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {likedTracks.map((track, i) => (
                        <TrackRow key={`${track.id}-${i}`} track={track} index={i} isActive={currentTrack?.id === track.id} onPlay={() => playTrack(track, likedTracks)} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeSection === 'playlists' && (
                <>
                  <h2 className="text-lg font-black text-white mb-6">As Minhas Playlists</h2>
                  {myPlaylists.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/10">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
                      <p className="text-sm font-bold opacity-40">Ainda não criaste nenhuma playlist.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                      {myPlaylists.map(pl => (
                        <div 
                          key={pl.id} 
                          onClick={async () => {
                            const res = await fetch(`${apiBase}/api/v1/music/playlists/${pl.id}`, {
                              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
                            });
                            const data = await res.json();
                            if (data.success) setSelectedPlaylist(data.data);
                          }}
                          className="group p-4 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <div className="w-full aspect-square rounded-2xl bg-white/10 mb-3 overflow-hidden">
                            {(pl.coverUrl || pl.tracks?.[0]?.track?.coverUrl) ? (
                              <img src={resolveUrl(pl.coverUrl || pl.tracks?.[0]?.track?.coverUrl)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
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
                      className="px-6 py-2.5 rounded-full bg-white/10 text-white border border-white/20 font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all focus:outline-none"
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
            </>
          ) : (
            /* ── PLAYLIST DETAIL VIEW (VISION PRO STYLE) ── */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Hero Banner */}
               <div className="relative w-full h-48 md:h-80 rounded-[2rem] md:rounded-[4rem] overflow-hidden mb-6 md:mb-10 border border-white/5">
                  <img 
                    src={resolveUrl(selectedPlaylist.coverUrl || selectedPlaylist.tracks?.[0]?.track?.coverUrl)} 
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110"
                    alt=""
                  />
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl" />
                  
                  <div className="absolute inset-0 flex items-end p-5 md:p-10 gap-4 md:gap-10">
                    <div className="w-24 h-24 md:w-48 md:h-48 rounded-[1.5rem] md:rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden shrink-0 shadow-2xl flex items-center justify-center">
                      {(selectedPlaylist.coverUrl || selectedPlaylist.tracks?.[0]?.track?.coverUrl) ? (
                        <img src={resolveUrl(selectedPlaylist.coverUrl || selectedPlaylist.tracks?.[0]?.track?.coverUrl)} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="text-6xl filter drop-shadow-2xl">🎵</div>
                      )}
                    </div>
                    
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">Playlist</span>
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 drop-shadow-lg flex items-center gap-1">
                             {selectedPlaylist.isPublic ? (
                               <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Pública</>
                             ) : (
                               <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Privada</>
                             )}
                          </span>
                      </div>
                      <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter mb-2 md:mb-4 leading-none drop-shadow-2xl">{selectedPlaylist.title}</h1>
                      <p className="text-white/60 text-xs md:text-sm max-w-xl font-medium mb-4 md:mb-6 line-clamp-2 drop-shadow-lg">{selectedPlaylist.description || 'Uma curadoria exclusiva na Alpha Music.'}</p>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => {
                            if (selectedPlaylist.tracks?.length > 0) {
                              const tracks = selectedPlaylist.tracks.map((t: any) => t.track);
                              useMusicStore.getState().playTrack(tracks[0], tracks);
                            }
                          }}
                          className="px-8 py-3.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                          Ouvir Agora
                        </button>
                        <button 
                          onClick={() => setSelectedPlaylist(null)}
                          className="px-8 py-3.5 rounded-full bg-white/5 border border-white/10 text-white/70 font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-md hover:text-white"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>

                    {/* Edit Trigger */}
                    {selectedPlaylist.authorId === authUser?.id && (
                      <button 
                        onClick={() => {
                          setEditingPlaylistState({
                            title: selectedPlaylist.title,
                            description: selectedPlaylist.description || '',
                            isPublic: selectedPlaylist.isPublic,
                            coverFile: null
                          });
                          setShowEditModal(true);
                        }}
                        className="absolute top-10 right-10 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all backdrop-blur-xl hover:scale-110 active:scale-95 shadow-2xl"
                        title="Editar Playlist"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                    )}
                  </div>
               </div>

               {/* Track List */}
               <div className="flex flex-col gap-1">
                 {selectedPlaylist.tracks?.length > 0 ? (
                   selectedPlaylist.tracks.map((item: any, i: number) => (
                     <TrackRow 
                        key={`${item.track.id}-${i}`} 
                        track={item.track} 
                        index={i} 
                        isActive={currentTrack?.id === item.track.id} 
                        onPlay={() => {
                          const allTracks = selectedPlaylist.tracks.map((t: any) => t.track);
                          playTrack(item.track, allTracks);
                        }} 
                     />
                   ))
                 ) : (
                   <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-white/5">
                      <p className="text-white/20 font-bold">Esta playlist ainda não tem músicas.</p>
                      <button 
                        onClick={() => { setSelectedPlaylist(null); setActiveSection('discover'); }}
                        className="mt-4 text-xs font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest"
                      >
                        + Explorar Músicas
                      </button>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-8" onClick={() => setShowUploadModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md bg-white/[0.08] backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-300 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-black text-white">Publicar Música</h3>
                <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">Alpha Music Studio</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              {/* Audio File Drop Zone */}
              <div
                className={`w-full h-28 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all gap-2 ${uploadState.audioFile
                    ? 'border-white/40 bg-white/20'
                    : 'border-white/20 border-dashed hover:border-white/40 hover:bg-white/10'
                  }`}
                onClick={() => audioInputRef.current?.click()}
              >
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e => setUploadState(s => ({ ...s, audioFile: e.target.files?.[0] || null }))} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={uploadState.audioFile ? 'text-white' : 'text-white/40'}>
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
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
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
              >
                {uploading ? '⏳ A publicar...' : '✦ Publicar Faixa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── CREATE PLAYLIST MODAL (VISION PRO STYLE) ── */}
      {showPlaylistModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setShowPlaylistModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
          
          <div 
            className="relative w-full max-w-2xl glass-panel-dark rounded-[3rem] border border-white/10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500"
            onClick={e => e.stopPropagation()}
          >
            {/* Left: Cover Picker */}
            <div className="w-full md:w-64 bg-white/5 p-8 flex flex-col items-center gap-6 border-r border-white/5">
              <input 
                ref={playlistCoverInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={e => setPlaylistState(s => ({ ...s, coverFile: e.target.files?.[0] || null }))} 
              />
              <div 
                className="w-full aspect-square rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all group overflow-hidden"
                onClick={() => playlistCoverInputRef.current?.click()}
              >
                {playlistState.coverFile ? (
                  <img src={URL.createObjectURL(playlistState.coverFile)} className="w-full h-full object-cover" alt="" />
                ) : (
                  <>
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🖼️</span>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center px-4">Capa da Playlist</span>
                  </>
                )}
              </div>
              <p className="text-[9px] text-white/20 text-center font-bold leading-relaxed uppercase tracking-tighter">Escolhe uma imagem quadrada para melhores resultados na Alpha Music.</p>
            </div>

            {/* Right: Info Fields */}
            <div className="flex-1 p-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Criar Nova Playlist</h2>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Curadoria Pessoal · Alpha Network</p>
                </div>
                <button onClick={() => setShowPlaylistModal(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Nome da Playlist *"
                  value={playlistState.title}
                  onChange={e => setPlaylistState(s => ({ ...s, title: e.target.value }))}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
                <textarea
                  placeholder="Descrição (opcional)"
                  value={playlistState.description}
                  onChange={e => setPlaylistState(s => ({ ...s, description: e.target.value }))}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all h-24 resize-none"
                />
              </div>

              <div className="flex items-center gap-4 mt-2">
                <button 
                  onClick={() => setPlaylistState(s => ({ ...s, isPublic: !s.isPublic }))}
                  className={`flex-1 py-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                    playlistState.isPublic ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/20'
                  }`}
                >
                  {playlistState.isPublic ? '🌐 Pública' : '🔒 Privada'}
                </button>
              </div>

              <button
                disabled={creatingPlaylist || !playlistState.title}
                onClick={async () => {
                  setCreatingPlaylist(true);
                  const fd = new FormData();
                  fd.append('title', playlistState.title);
                  fd.append('description', playlistState.description);
                  fd.append('isPublic', String(playlistState.isPublic));
                  if (playlistState.coverFile) fd.append('cover', playlistState.coverFile);
                  
                  const success = await useMusicStore.getState().createPlaylist(fd, accessToken!);
                  if (success) {
                    setShowPlaylistModal(false);
                    setPlaylistState({ title: '', description: '', isPublic: true, coverFile: null });
                  }
                  setCreatingPlaylist(false);
                }}
                className="w-full py-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] mt-auto hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ boxShadow: `0 0 20px rgba(255,255,255,0.05)` }}
              >
                {creatingPlaylist ? '⌛ A Criar...' : '✦ Criar PlayList'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── EDIT PLAYLIST STUDIO MODAL ── */}
      {showEditModal && selectedPlaylist && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setShowEditModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" />
          
          <div 
            className="relative w-full max-w-4xl glass-panel-dark rounded-[3rem] border border-white/10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500 h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Left Column: Details & Danger Zone */}
            <div className="w-full md:w-80 border-r border-white/5 p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar shrink-0">
               <div className="flex items-center justify-between mb-2">
                 <h2 className="text-xl font-black text-white tracking-tight">Definições</h2>
                 <button onClick={() => setShowEditModal(false)} className="md:hidden w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white"><span className="text-xl">×</span></button>
               </div>

               {/* Cover Edit */}
               <div className="group relative w-full aspect-square rounded-[2rem] bg-white/5 border border-white/10 overflow-hidden cursor-pointer" onClick={() => editPlaylistCoverInputRef.current?.click()}>
                 <input 
                   ref={editPlaylistCoverInputRef}
                   type="file"
                   accept="image/*"
                   className="hidden"
                   onChange={e => {
                     const file = e.target.files?.[0];
                     if (file) setEditingPlaylistState(s => ({ ...s, coverFile: file }));
                   }}
                 />
                 {editingPlaylistState.coverFile ? (
                   <img src={URL.createObjectURL(editingPlaylistState.coverFile)} className="w-full h-full object-cover" alt="" />
                 ) : (selectedPlaylist.coverUrl || selectedPlaylist.tracks?.[0]?.track?.coverUrl) ? (
                   <img src={resolveUrl(selectedPlaylist.coverUrl || selectedPlaylist.tracks?.[0]?.track?.coverUrl)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-white/10">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                   </div>
                 )}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-sm">Alterar Capa</div>
               </div>
               <button 
                 onClick={() => editPlaylistCoverInputRef.current?.click()}
                 className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all flex items-center justify-center gap-2"
               >
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                 Mudar Capa
               </button>

               <div className="flex flex-col gap-4">
                 <input 
                   type="text" 
                   value={editingPlaylistState.title} 
                   onChange={e => setEditingPlaylistState(s => ({ ...s, title: e.target.value }))}
                   placeholder="Título da Playlist"
                   className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
                 />
                 <textarea 
                   value={editingPlaylistState.description} 
                   onChange={e => setEditingPlaylistState(s => ({ ...s, description: e.target.value }))}
                   placeholder="Breve descrição..."
                   className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs placeholder-white/20 focus:outline-none focus:border-white/30 transition-all h-24 resize-none"
                 />
                 <button 
                   onClick={() => setEditingPlaylistState(s => ({ ...s, isPublic: !s.isPublic }))}
                   className="w-full py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                 >
                   {editingPlaylistState.isPublic ? '🌐 Pública' : '🔒 Privada'}
                 </button>
               </div>

               <div className="mt-auto pt-8 flex flex-col gap-3">
                 <button 
                   onClick={async () => {
                     const fd = new FormData();
                     fd.append('title', editingPlaylistState.title);
                     fd.append('description', editingPlaylistState.description);
                     fd.append('isPublic', String(editingPlaylistState.isPublic));
                     if (editingPlaylistState.coverFile) fd.append('cover', editingPlaylistState.coverFile);
                     
                     if (accessToken) {
                       const success = await useMusicStore.getState().updatePlaylist(selectedPlaylist.id, fd, accessToken);
                       if (success) {
                         const res = await fetch(`${apiBase}/api/v1/music/playlists/${selectedPlaylist.id}`);
                         const data = await res.json();
                         if (data.success) setSelectedPlaylist(data.data);
                         setShowEditModal(false);
                       }
                     }
                   }}
                   className="w-full py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                 >
                   Guardar Alterações
                 </button>
                 <button 
                   onClick={async () => {
                     if (window.confirm('Tens a certeza que queres eliminar esta playlist?') && accessToken) {
                       const success = await useMusicStore.getState().deletePlaylist(selectedPlaylist.id, accessToken);
                       if (success) {
                         setSelectedPlaylist(null);
                         setActiveSection('playlists');
                         setShowEditModal(false);
                       }
                     }
                   }}
                   className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all"
                 >
                   Eliminar Playlist
                 </button>
               </div>
            </div>

            {/* Right Column: Track Management */}
            <div className="flex-1 flex flex-col p-8 overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                 <div>
                   <h2 className="text-2xl font-black text-white tracking-tight">Cura a tua Playlist</h2>
                   <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Gere músicas e adiciona novas</p>
                 </div>
                 <button onClick={() => setShowEditModal(false)} className="hidden md:flex w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center text-white transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                 </button>
               </div>

               {/* Current Tracks List */}
               <div className="flex-1 overflow-y-auto pr-2 no-scrollbar mb-8">
                 <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Músicas Atuais ({selectedPlaylist.tracks?.length})</p>
                 <div className="flex flex-col gap-2">
                   {selectedPlaylist.tracks?.map((item: any, i: number) => (
                     <div key={`${item.track.id}-${i}`} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0">
                          {item.track.coverUrl ? <img src={resolveUrl(item.track.coverUrl)} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{item.track.title}</p>
                          <p className="text-[10px] text-white/40 truncate">{item.track.artist}</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (accessToken) {
                              const success = await useMusicStore.getState().removeTrackFromPlaylist(selectedPlaylist.id, item.track.id, accessToken);
                              if (success) {
                                const refreshPlaylist = async () => {
                                  const res = await fetch(`${apiBase}/api/v1/music/playlists/${selectedPlaylist.id}`, {
                                    headers: { Authorization: `Bearer ${accessToken}` }
                                  });
                                  const data = await res.json();
                                  if (data.success) setSelectedPlaylist(data.data);
                                };
                                await refreshPlaylist();
                              }
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-all"
                          title="Remover"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Search & Add Section */}
               <div className="mt-auto border-t border-white/5 pt-6">
                 <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Pesquisar e Adicionar</p>
                 <div className="relative mb-4">
                   <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                     <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                   </svg>
                   <input 
                     type="text"
                     placeholder="Procura músicas no catálogo Alpha..."
                     value={playlistSearchQuery}
                     onChange={e => setPlaylistSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-6 py-4 bg-white/10 border border-white/10 rounded-2xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
                   />
                 </div>

                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                   {searchResults.map(track => (
                     <div key={track.id} className="shrink-0 w-48 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
                        <div className="w-full aspect-square rounded-xl bg-white/10 mb-2 overflow-hidden">
                           {track.coverUrl ? <img src={resolveUrl(track.coverUrl)} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>}
                        </div>
                        <p className="text-xs font-bold text-white truncate">{track.title}</p>
                        <p className="text-[9px] text-white/40 truncate">{track.artist}</p>
                        <button 
                          onClick={async () => {
                            if (accessToken) {
                              const success = await useMusicStore.getState().addTrackToPlaylist(selectedPlaylist.id, track.id, accessToken);
                              if (success) {
                                const refreshPlaylist = async () => {
                                  const res = await fetch(`${apiBase}/api/v1/music/playlists/${selectedPlaylist.id}`, {
                                    headers: { Authorization: `Bearer ${accessToken}` }
                                  });
                                  const data = await res.json();
                                  if (data.success) setSelectedPlaylist(data.data);
                                };
                                await refreshPlaylist();
                                setPlaylistSearchQuery('');
                              }
                            }
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-sm"
                        >
                          Adicionar
                        </button>
                     </div>
                   ))}
                   {playlistSearchQuery.length > 2 && searchResults.length === 0 && (
                     <p className="text-[10px] text-white/20 italic p-4">Nenhuma música encontrada...</p>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
