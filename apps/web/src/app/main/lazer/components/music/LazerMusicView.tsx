'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMusicStore, Track } from '@/store/music.store';
import { useAuthStore } from '@/store/auth.store';
import { resolveUrl, apiBase } from '@/lib/api';

interface LazerMusicViewProps {
  onClose?: () => void;
  onSelectView?: (view: any) => void;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  userAvatar?: string;
  userName?: string;
}

// ── HOME DATA (Exact match to the John Legend reference image) ───────────────
const HOME_FEATURED_ARTIST = {
  name: 'John Legend',
  badge: 'Artist',
  verified: true,
  monthlyListeners: '54,698,364 Monthly Listeners',
  image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80',
  currentSong: {
    title: 'I Know Better',
    artist: 'John Legend',
    album: 'Darkness and Light',
    cover: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80',
    duration: 233, // 3:53
    progress: 116, // 1:56
    plays: 264341876,
  },
};

const HOME_PLAYLIST_TRACKS: Track[] = [
  {
    id: 'legend-1',
    title: 'I Know Better',
    artist: 'John Legend',
    album: 'Darkness and Light',
    duration: 233, // 3:53
    plays: 264341876,
    liked: true,
    likesCount: 1420000,
    authorId: 'john-legend',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'legend-2',
    title: 'Bigger Love',
    artist: 'John Legend',
    album: 'Bigger Love',
    duration: 264, // 4:24
    plays: 128636453,
    liked: false,
    likesCount: 890000,
    authorId: 'john-legend',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'legend-3',
    title: 'All Of Me',
    artist: 'John Legend',
    album: 'Love in the Future',
    duration: 222, // 3:42
    plays: 952772984,
    liked: true,
    likesCount: 5200000,
    authorId: 'john-legend',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'legend-4',
    title: 'This Christmas',
    artist: 'John Legend',
    album: 'A Legendary Christmas',
    duration: 218, // 3:38
    plays: 52872984,
    liked: false,
    likesCount: 310000,
    authorId: 'john-legend',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f777dd.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=400&q=80',
  },
];

const HOME_NEW_ALBUMS = [
  { id: 'na-1', badge: '#1', title: 'Bigger Love', year: '2020', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80' },
  { id: 'na-2', badge: '#2', title: 'Love In The Future', year: '2013', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
  { id: 'na-3', badge: '#3', title: 'Darkness and Light', year: '2016', cover: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80' },
  { id: 'na-4', badge: '#4', title: 'Get Lifted', year: '2004', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80' },
  { id: 'na-5', badge: '#5', title: 'Once Again', year: '2006', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80' },
  { id: 'na-6', badge: '#6', title: 'Wake Up!', year: '2010', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
];

const HOME_TOP_SONGS = [
  { id: 'ts-1', badge: '#1', title: 'All of Me - John Legend', duration: '3:42', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80' },
  { id: 'ts-2', badge: '#2', title: 'Wild (feat. Gary Clark Jr.)', duration: '3:16', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=200&q=80' },
  { id: 'ts-3', badge: '#3', title: 'Minefields (feat. Faouzia)', duration: '3:37', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=200&q=80' },
];

const HOME_FANS_LIKE_TOO = [
  { id: 'fl-1', name: 'Sam Smith', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { id: 'fl-2', name: 'Alicia Keys', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
  { id: 'fl-3', name: 'Gary Clark Jr.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
  { id: 'fl-4', name: 'Bruno Mars', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80' },
  { id: 'fl-5', name: 'Leon Bridges', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80' },
  { id: 'fl-6', name: 'Usher', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80' },
];

const INITIAL_PLAYLISTS = [
  { id: 'sp-1', title: 'Top Hit 2022' },
  { id: 'sp-2', title: 'Dangdut' },
  { id: 'sp-3', title: 'Accoustic Love' },
  { id: 'sp-4', title: 'Have a Great D...' },
];

// ── ALBUM DATA (Shallipopi - Planet Pluto reference) ─────────────────────────
const DEMO_ALBUM_ARTIST = {
  name: 'Shallipopi',
  badge: 'Verified Artist',
  monthlyListeners: '652,600 monthly listeners',
  verified: true,
  image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80',
  currentAlbum: 'Planet Pluto',
  cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
};

const DEMO_ALBUM_TRACKS: Track[] = [
  {
    id: 'track-shalli-1',
    title: 'Ex Convict',
    artist: 'Shallipopi',
    album: 'Planet Pluto',
    duration: 200, // 3:20
    plays: 3152481,
    liked: false,
    likesCount: 142000,
    authorId: 'demo-shallipopi',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'track-shalli-2',
    title: 'Obapluto',
    artist: 'Shallipopi',
    album: 'Planet Pluto',
    duration: 170, // 2:50
    plays: 2757181,
    liked: true,
    likesCount: 198000,
    authorId: 'demo-shallipopi',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'track-shalli-3',
    title: 'Elon Musk',
    artist: 'Shallipopi',
    album: 'Planet Pluto',
    duration: 193, // 3:13
    plays: 4087298,
    liked: false,
    likesCount: 320000,
    authorId: 'demo-shallipopi',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'track-shalli-4',
    title: 'Sharpiru',
    artist: 'Shallipopi',
    album: 'Planet Pluto',
    duration: 205, // 3:25
    plays: 2299356,
    liked: false,
    likesCount: 112000,
    authorId: 'demo-shallipopi',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f777dd.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'track-shalli-5',
    title: 'Elon Musk - Remix',
    artist: 'Shallipopi ft. Fireboy DML',
    album: 'Planet Pluto',
    duration: 201, // 3:21
    plays: 1587282,
    liked: true,
    likesCount: 95000,
    authorId: 'demo-shallipopi',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
  },
];

const DEMO_DISCOGRAPHY = [
  { id: 'd-1', title: 'Planet Pluto', type: 'Album', year: '2023', cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-2', title: 'Ex Convict', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-3', title: 'Elon Musk (Remix)', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-4', title: 'Sharpiru', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-5', title: 'Elon Musk', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-6', title: 'Wait', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-7', title: 'Shaka', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-8', title: 'Power', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?auto=format&fit=crop&w=400&q=80' },
  { id: 'd-9', title: 'Gra Gra', type: 'Singles', year: '2023', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
];

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

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

export function LazerMusicView({
  onClose,
  onSelectView,
  themeColor: c = '#1ed760',
  themeMode = 'dark',
  userAvatar,
  userName = 'Pangeran Yusuf',
}: LazerMusicViewProps) {
  const {
    tracks,
    likedTracks,
    playlists,
    isLoading,
    searchQuery,
    activeGenre,
    currentTrack,
    isPlaying,
    volume,
    progress,
    duration,
    shuffle,
    repeat,
    playTrack,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    fetchTracks,
    fetchLikedTracks,
    fetchUserPlaylists,
    likeTrack,
    setSearchQuery,
    setActiveGenre,
  } = useMusicStore();

  const { user: authUser, accessToken } = useAuthStore();

  // Navigation state within Alpha Music: default is 'home' (matching user's new screenshot)
  const [activeMenu, setActiveMenu] = useState<'Home' | 'Discover' | 'Radio' | 'Podcast' | 'Artist' | 'Album'>('Home');
  const [viewMode, setViewMode] = useState<'home' | 'album'>('home');
  const [activeTopTab, setActiveTopTab] = useState<'Library' | 'Genre'>('Library');
  const [sidebarPlaylists, setSidebarPlaylists] = useState(INITIAL_PLAYLISTS);

  // Album sub-view state
  const [discoFilter, setDiscoFilter] = useState<'Album' | 'Songs' | 'Singles'>('Singles');
  const [selectedAlbum, setSelectedAlbum] = useState<any>(DEMO_ALBUM_ARTIST);
  const [isFollowing, setIsFollowing] = useState(true);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // Upload state
  const [uploadState, setUploadState] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    lyricsRaw: '',
    audioFile: null as File | null,
    coverFile: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  // Playlist state
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Fetch real data on mount
  useEffect(() => {
    fetchTracks(searchQuery || undefined, activeGenre || undefined);
  }, [searchQuery, activeGenre]);

  useEffect(() => {
    if (accessToken) fetchLikedTracks(accessToken);
    if (authUser?.id) {
      fetchUserPlaylists(authUser.id).then((pls) => {
        if (pls && pls.length > 0) {
          setSidebarPlaylists(pls.map(p => ({ id: p.id, title: p.title })));
        }
      });
    }
  }, [accessToken, authUser?.id]);

  // Fallback tracks & active track
  const effectivePlaylistTracks = useMemo(() => {
    if (tracks && tracks.length > 0) return tracks.slice(0, 4);
    return HOME_PLAYLIST_TRACKS;
  }, [tracks]);

  // Currently playing track: defaults to "I Know Better" by John Legend as in the screenshot
  const effectiveCurrentTrack = currentTrack || HOME_PLAYLIST_TRACKS[0];

  const handlePlaySong = (track: Track) => {
    playTrack(track, viewMode === 'home' ? effectivePlaylistTracks : DEMO_ALBUM_TRACKS);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = pct * (duration || effectiveCurrentTrack.duration || 233);
    seek(targetSec);
  };

  const handleRemovePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSidebarPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const handleUploadSubmit = async () => {
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

      const res = await fetch(`${apiBase}/api/v1/music/tracks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setShowUploadModal(false);
        setUploadState({ title: '', artist: '', album: '', genre: '', lyricsRaw: '', audioFile: null, coverFile: null });
        fetchTracks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const progressRatio = duration > 0 ? (progress / duration) : (116 / 233); // 1:56 / 3:53 from screenshot

  return (
    <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500 relative">

      {/* ══════════════════════════════════════════════════════════════════════
          1. FLOATING ALPHA MUSIC SIDEBAR (Extreme Left Floating Pill)
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col items-center justify-between w-14 lg:w-16 h-fit py-6 px-2 rounded-full border border-white/20 liquid-glass-shell shadow-2xl relative z-40 shrink-0 select-none transition-all duration-300"
        style={{
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        }}
      >
        <div className="absolute top-0 left-1/4 right-1/4 h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/70 to-transparent blur-[0.2px]" />

        {/* Top: Avatar / Exit Back to Lazer */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#1ed760] p-0.5 hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(30,215,96,0.35)] cursor-pointer group relative bg-black/40"
          title="Voltar ao Lazer (Feed)"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full bg-[#1ed760]/20 text-[#1ed760] font-black text-xs">
              {(userName || 'P')[0].toUpperCase()}
            </div>
          )}
          <span className="sr-only">Voltar ao Lazer</span>
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Navigation Icons */}
        <div className="flex flex-col items-center gap-4">
          {/* Home / Dashboard */}
          <button
            onClick={() => {
              setViewMode('home');
              setActiveMenu('Home');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              viewMode === 'home' && activeMenu === 'Home'
                ? 'text-[#1ed760] bg-white/10 shadow-[0_0_12px_rgba(30,215,96,0.35)] scale-110'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Home (John Legend)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>

          {/* Album / Player View */}
          <button
            onClick={() => {
              setViewMode('album');
              setActiveMenu('Album');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              viewMode === 'album'
                ? 'text-[#1ed760] bg-white/10 shadow-[0_0_12px_rgba(30,215,96,0.35)] scale-110'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Álbum / Artista (Shallipopi)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>

          {/* Radio / Broadcast */}
          <button
            onClick={() => {
              setActiveMenu('Radio');
              useMusicStore.getState().fetchRadio();
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeMenu === 'Radio'
                ? 'text-[#1ed760] bg-white/10 shadow-[0_0_12px_rgba(30,215,96,0.35)] scale-110'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Rádio Alpha"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4.93 19.07A10 10 0 0 1 12 2a10 10 0 0 1 7.07 17.07" />
              <path d="M7.76 16.24A6 6 0 0 1 12 6a6 6 0 0 1 4.24 10.24" />
              <circle cx="12" cy="16" r="2" />
            </svg>
          </button>

          {/* Exit to Feed */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Sair para o Feed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>

          {/* Search Focus */}
          <button
            onClick={() => searchInputRef.current?.focus()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Pesquisar Músicas"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>

        <div className="w-6 h-px bg-white/10 my-1" />
        <div className="w-2 h-2 rounded-full bg-[#1ed760] shadow-[0_0_8px_#1ed760]" />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN VISIONOS LIQUID GLASS WINDOW (Exact match to Home image)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border md:border-white/15 liquid-glass-shell flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300"
        style={{
          backdropFilter: 'blur(36px) saturate(140%)',
          WebkitBackdropFilter: 'blur(36px) saturate(140%)',
        }}
      >
        {/* Specular Top Edge Light */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#1ed760]/10 blur-[130px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-white/5 blur-[140px] pointer-events-none -z-10" />

        {/* ── TOP NAVIGATION BAR (Exact Header from Screenshot) ── */}
        <header className="px-6 sm:px-8 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0 z-20 select-none">
          {/* Left Brand: Spotify / Alpha Music Logo + Three Dots */}
          <div className="w-56 lg:w-60 xl:w-64 flex items-center justify-between shrink-0 pr-4">
            <div
              onClick={() => { setViewMode('home'); setActiveMenu('Home'); }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#1ed760] flex items-center justify-center text-black shadow-[0_0_12px_rgba(30,215,96,0.6)] shrink-0 group-hover:scale-105 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.436-5.308-1.76-8.792-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.51 9.72 1.113.295.18.388.563.208.857zm1.224-2.72c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.13-9.965-1.166-.413.127-.848-.106-.973-.517-.125-.413.108-.848.52-.973 3.632-1.102 8.147-.568 11.233 1.328.366.226.48.707.257 1.072zm.104-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.018-.128-1.168-.623-.15-.495.13-1.018.624-1.168 3.532-1.072 9.404-.866 12.983 1.26.444.263.59.84.327 1.284-.264.444-.84.59-1.284.326z" />
                </svg>
              </div>
              <span className="text-base font-extrabold text-white tracking-tight">
                Alpha Music
              </span>
            </div>

            <button
              onClick={() => {}}
              className="text-white/40 hover:text-white transition-colors cursor-pointer border-none bg-transparent p-1"
              title="Opções"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
                <circle cx="5" cy="12" r="2" />
              </svg>
            </button>
          </div>

          {/* Center: Tabs (Library | Genre) & Search Pill */}
          <div className="flex-1 flex items-center justify-center gap-6 max-w-xl">
            <div className="flex items-center gap-5 text-xs font-bold">
              <button
                onClick={() => setActiveTopTab('Library')}
                className={`transition-colors cursor-pointer border-none bg-transparent ${
                  activeTopTab === 'Library' ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Library
              </button>
              <button
                onClick={() => setActiveTopTab('Genre')}
                className={`transition-colors cursor-pointer border-none bg-transparent ${
                  activeTopTab === 'Genre' ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Genre
              </button>
            </div>

            {/* Dark Search Pill from Screenshot */}
            <div className="relative flex items-center flex-1 max-w-xs">
              <svg className="absolute left-3.5 w-3.5 h-3.5 text-white/35 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full h-8 pl-9 pr-3 rounded-full bg-black/40 hover:bg-black/60 focus:bg-black/70 border border-white/10 text-white text-xs font-medium placeholder-white/35 outline-none transition-all focus:border-[#1ed760]/60"
              />
            </div>
          </div>

          {/* Right: Go Pro Pill with Crown */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {}}
              className="h-8 px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <span className="text-amber-400 text-xs">👑</span>
              <span>Go Pro</span>
            </button>
          </div>
        </header>

        {/* ── 3-COLUMN BODY (Sidebar + Central Content + Right Sidebar) ── */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">

          {/* ──────────────────────────────────────────────────────────────
              COL 1 (LEFT): SIDEBAR INTERNA (Exact from Screenshot)
          ────────────────────────────────────────────────────────────── */}
          <aside className="w-56 lg:w-60 xl:w-64 border-r border-white/10 flex flex-col p-5 shrink-0 bg-white/[0.015] overflow-y-auto custom-scrollbar select-none justify-between">
            
            <div className="flex flex-col gap-6">
              {/* Section: MENU */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-white/35 uppercase tracking-[0.2em] px-3 mb-1">
                  MENU
                </span>

                {[
                  { id: 'Home', label: 'Home', icon: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
                  { id: 'Discover', label: 'Discover', icon: <circle cx="12" cy="12" r="10" /> },
                  { id: 'Radio', label: 'Radio', icon: <><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49" /></> },
                  { id: 'Podcast', label: 'Podcast', icon: <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /> },
                  { id: 'Artist', label: 'Artist', icon: <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /> },
                  { id: 'Album', label: 'Album', icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></> },
                ].map((item) => {
                  const isActive = (item.id === 'Home' && viewMode === 'home') || (item.id === 'Album' && viewMode === 'album');

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id as any);
                        if (item.id === 'Home') setViewMode('home');
                        if (item.id === 'Album') setViewMode('album');
                        if (item.id === 'Radio') useMusicStore.getState().fetchRadio();
                      }}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all text-left cursor-pointer border-none rounded-lg ${
                        isActive
                          ? 'text-white border-l-2 border-[#1ed760] pl-3.5 bg-white/[0.05] font-extrabold'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.03] bg-transparent'
                      }`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        {item.icon}
                      </svg>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Section: PLAYLIST */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-3 mb-1">
                  <span className="text-[10px] font-black text-white/35 uppercase tracking-[0.2em]">
                    PLAYLIST
                  </span>
                  <button
                    onClick={() => setShowPlaylistModal(true)}
                    className="w-4 h-4 rounded flex items-center justify-center text-white/40 hover:text-white text-sm font-bold border-none bg-transparent cursor-pointer"
                    title="Adicionar Playlist"
                  >
                    +
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {sidebarPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => setViewMode('home')}
                      className="group flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 shrink-0">
                          <line x1="8" y1="6" x2="21" y2="6" />
                          <line x1="8" y1="12" x2="21" y2="12" />
                          <line x1="8" y1="18" x2="21" y2="18" />
                          <line x1="3" y1="6" x2="3.01" y2="6" />
                          <line x1="3" y1="12" x2="3.01" y2="12" />
                          <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                        <span className="truncate">{pl.title}</span>
                      </div>

                      {/* Trash Icon from Screenshot */}
                      <button
                        onClick={(e) => handleRemovePlaylist(pl.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all border-none bg-transparent cursor-pointer p-0 shrink-0"
                        title="Remover Playlist"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: Your Account + Volume Slider */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-4 mt-6">
              {/* Your Account Box */}
              <div>
                <span className="text-[10px] font-black text-white/35 uppercase tracking-[0.2em] px-2 block mb-2">
                  Your Account
                </span>
                <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-9 h-9 rounded-full bg-[#06b6d4] text-black font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                    {(userName || 'P')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate leading-tight">
                      {userName || 'Pangeran Yusuf'}
                    </span>
                    <span className="text-[10px] text-white/40 truncate leading-tight mt-0.5">
                      {authUser?.email || 'yusoxf@gmail.com'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume Slider in Left Sidebar (as shown in screenshot bottom-left) */}
              <div className="flex items-center gap-2.5 px-2">
                <button
                  onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                  className="text-white/40 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#1ed760]"
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
            </div>

          </aside>

          {/* ──────────────────────────────────────────────────────────────
              COL 2 (CENTER): MAIN CONTENT (Home / John Legend OR Album)
          ────────────────────────────────────────────────────────────── */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar p-6 sm:p-7">
            
            {viewMode === 'home' ? (
              /* ── EXACT HOME DASHBOARD FROM SCREENSHOT ── */
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">

                {/* 1. HERO BANNER: John Legend */}
                <div
                  className="w-full rounded-[30px] p-7 sm:p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px] sm:min-h-[240px] shadow-2xl border border-white/[0.10]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30, 35, 45, 0.70) 0%, rgba(18, 22, 30, 0.85) 100%)',
                    backdropFilter: 'blur(24px)',
                  }}
                >
                  {/* Artist Info */}
                  <div className="relative z-10 flex flex-col gap-2 max-w-sm my-auto">
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none drop-shadow-md">
                      {HOME_FEATURED_ARTIST.name}
                    </h1>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                      <span>{HOME_FEATURED_ARTIST.badge}</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-[#0284c7] flex items-center justify-center text-white text-[9px] font-bold">
                        ✓
                      </div>
                    </div>

                    <p className="text-[11px] text-white/50 font-medium tracking-wide">
                      {HOME_FEATURED_ARTIST.monthlyListeners}
                    </p>
                  </div>

                  {/* Right Cutout Image of John Legend */}
                  <div className="absolute right-0 bottom-0 top-0 w-64 sm:w-80 md:w-96 pointer-events-none flex items-end justify-end overflow-hidden">
                    <img
                      src={HOME_FEATURED_ARTIST.image}
                      alt={HOME_FEATURED_ARTIST.name}
                      className="h-[110%] w-auto object-cover object-top grayscale contrast-125 brightness-95"
                      style={{
                        maskImage: 'linear-gradient(to top, black 70%, transparent 100%), linear-gradient(to left, black 65%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%), linear-gradient(to left, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* 2. SECTION: Playlist (Track Table) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Playlist
                    </h2>
                    <button
                      onClick={() => {}}
                      className="text-[11px] font-bold text-white/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                    >
                      See all
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    {effectivePlaylistTracks.map((song, idx) => {
                      const isSongActive = currentTrack?.id === song.id || idx === 0;

                      return (
                        <div
                          key={song.id || idx}
                          onClick={() => handlePlaySong(song)}
                          className={`group px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer select-none ${
                            isSongActive
                              ? 'bg-white/[0.08] border border-white/10'
                              : 'hover:bg-white/[0.04] border border-transparent'
                          }`}
                        >
                          {/* Index or Equalizer Wave + Cover + Title */}
                          <div className="flex items-center gap-3.5 min-w-0 pr-4">
                            <div className="w-5 text-center text-xs font-bold text-white/40 shrink-0">
                              {isSongActive ? (
                                <span className="text-[#1ed760] font-black">ılı</span>
                              ) : (
                                <span>#{idx + 1}</span>
                              )}
                            </div>

                            {/* Mini Cover */}
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 shrink-0 border border-white/10">
                              {song.coverUrl && (
                                <img src={resolveUrl(song.coverUrl)} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>

                            <span className="text-xs font-bold text-white truncate">
                              {song.title} - {song.artist}
                            </span>
                          </div>

                          {/* Streams Count (🎧) */}
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 font-mono w-28 justify-end shrink-0">
                            <span>🎧</span>
                            <span>{(song.plays || 264341876).toLocaleString('en-US')}</span>
                          </div>

                          {/* Duration (🕒) */}
                          <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono w-16 justify-end shrink-0">
                            <span>🕒</span>
                            <span>{fmtTime(song.duration)}</span>
                          </div>

                          {/* Like & Options */}
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (accessToken) likeTrack(song.id, accessToken);
                              }}
                              className={`border-none bg-transparent cursor-pointer transition-transform hover:scale-120 ${
                                song.liked ? 'text-[#1ed760]' : 'text-white/30 hover:text-white'
                              }`}
                            >
                              ♥
                            </button>

                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-white/30 hover:text-white border-none bg-transparent cursor-pointer"
                            >
                              •••
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. SECTION: New Album (Carousel) */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      New Album
                    </h2>
                    <button
                      onClick={() => setViewMode('album')}
                      className="text-[11px] font-bold text-white/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                    >
                      See all
                    </button>
                  </div>

                  {/* Horizontal Scroll Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {HOME_NEW_ALBUMS.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => {
                          setSelectedAlbum({
                            name: 'John Legend',
                            badge: 'Artist',
                            monthlyListeners: '54,698,364 Monthly Listeners',
                            currentAlbum: album.title,
                            image: HOME_FEATURED_ARTIST.image,
                            cover: album.cover,
                          });
                          setViewMode('album');
                        }}
                        className="h-32 sm:h-36 rounded-2xl overflow-hidden relative p-2.5 flex flex-col justify-between border border-white/10 group cursor-pointer shadow-md hover:scale-[1.03] transition-transform"
                      >
                        {/* Background Cover */}
                        <img
                          src={album.cover}
                          alt={album.title}
                          className="w-full h-full object-cover absolute inset-0 -z-10 group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent -z-10" />

                        {/* Top Badge */}
                        <div className="flex justify-end relative z-10">
                          <span className="text-[9px] font-black text-white/60 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded">
                            {album.badge}
                          </span>
                        </div>

                        {/* Bottom Title & Year */}
                        <div className="relative z-10 flex flex-col">
                          <span className="text-[11px] font-bold text-white truncate leading-tight">
                            {album.title}
                          </span>
                          <span className="text-[9px] text-white/40">
                            {album.year}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              /* ── SUB-VIEW: SHALLIPOPI ALBUM VIEW ── */
              <div className="flex flex-col gap-7 animate-in fade-in duration-300">
                <div
                  className="w-full rounded-[30px] p-7 sm:p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px] sm:min-h-[250px] shadow-2xl border border-white/[0.12]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(35, 40, 52, 0.75) 0%, rgba(20, 24, 32, 0.85) 100%)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <button
                      onClick={() => setViewMode('home')}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                      title="Voltar para a Home"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                  </div>

                  <div className="relative z-10 flex flex-col gap-2 max-w-md my-auto pt-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
                      <div className="w-4 h-4 rounded-full bg-[#0284c7] flex items-center justify-center text-white text-[10px]">✓</div>
                      <span>{selectedAlbum.badge || 'Verified Artist'}</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none drop-shadow-md">
                      {selectedAlbum.name || 'Shallipopi'}
                    </h1>
                    <p className="text-xs text-white/60 font-medium">
                      {selectedAlbum.monthlyListeners || '652,600 monthly listeners'}
                    </p>
                  </div>

                  <div className="absolute right-4 sm:right-10 bottom-0 top-0 w-48 sm:w-64 md:w-72 pointer-events-none flex items-end justify-end overflow-hidden">
                    <img
                      src={selectedAlbum.image || DEMO_ALBUM_ARTIST.image}
                      alt={selectedAlbum.name}
                      className="h-[105%] w-auto object-cover object-top grayscale-[20%] contrast-110 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                      style={{
                        maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%), linear-gradient(to left, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%), linear-gradient(to left, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 px-1">
                  <button
                    onClick={() => handlePlaySong(DEMO_ALBUM_TRACKS[0])}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-black flex items-center justify-center shadow-[0_8px_24px_rgba(30,215,96,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
                  </button>

                  <button
                    onClick={() => setIsFollowing(prev => !prev)}
                    className="h-10 px-5 rounded-full border border-white/20 hover:border-white/40 bg-white/[0.05] hover:bg-white/[0.10] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isFollowing && <span className="text-[#1ed760]">✓</span>}
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight px-1 mb-2">Popular</h2>
                  {DEMO_ALBUM_TRACKS.map((song, idx) => (
                    <div
                      key={song.id}
                      onClick={() => handlePlaySong(song)}
                      className="group px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-4">
                        <span className="w-5 text-center text-xs font-bold text-white/40">{idx + 1}</span>
                        {song.coverUrl && (
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 shrink-0">
                            <img src={resolveUrl(song.coverUrl)} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <span className="text-xs sm:text-sm font-bold text-white truncate">{song.title}</span>
                      </div>
                      <span className="text-xs text-white/50 font-mono w-24 text-right">{(song.plays || 2500000).toLocaleString('en-US')}</span>
                      <span className="text-xs text-white/50 font-mono w-9 text-right ml-4">{fmtTime(song.duration)}</span>
                      <button className="text-white/30 hover:text-white border-none bg-transparent cursor-pointer ml-3">♥</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </main>

          {/* ──────────────────────────────────────────────────────────────
              COL 3 (RIGHT): TOP SONG & FANS LIKE TOO (Exact from Screenshot)
          ────────────────────────────────────────────────────────────── */}
          <aside className="hidden xl:flex w-64 lg:w-72 border-l border-white/10 flex-col p-5 shrink-0 bg-white/[0.015] overflow-y-auto custom-scrollbar select-none gap-6">
            
            {/* 1. Top Song Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Top Song
                </h3>
                <button
                  onClick={() => {}}
                  className="text-[10px] font-bold text-white/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  See all
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {HOME_TOP_SONGS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const matchingTrack = HOME_PLAYLIST_TRACKS[0];
                      if (matchingTrack) handlePlaySong(matchingTrack);
                    }}
                    className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="text-[10px] font-bold text-white/40 w-4 text-center">
                        {item.badge}
                      </span>
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 shrink-0">
                        <img src={item.cover} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white truncate leading-tight group-hover:text-[#1ed760] transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[9px] text-white/40 mt-0.5">
                          {item.duration}
                        </span>
                      </div>
                    </div>

                    <div className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-[#1ed760] group-hover:text-black text-white flex items-center justify-center transition-all shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Fans Like too Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Fans Like too
                </h3>
                <button
                  onClick={() => {}}
                  className="text-[10px] font-bold text-white/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >
                  See all
                </button>
              </div>

              {/* 3x2 Grid Box from Screenshot */}
              <div className="p-3.5 rounded-3xl bg-white/[0.03] border border-white/5 grid grid-cols-3 gap-2.5">
                {HOME_FANS_LIKE_TOO.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => {
                      setSelectedAlbum({
                        name: artist.name,
                        badge: 'Artist',
                        monthlyListeners: '28,140,000 Monthly Listeners',
                        currentAlbum: 'Greatest Hits',
                        image: artist.image,
                        cover: artist.image,
                      });
                      setViewMode('album');
                    }}
                    className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer group"
                    title={artist.name}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 shrink-0 border border-white/10 group-hover:scale-105 transition-transform shadow-md">
                      <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] font-bold text-white/70 truncate max-w-full text-center">
                      {artist.name.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            3. BOTTOM LIQUID GLASS PLAYER BAR (Exact Match to Screenshot)
        ══════════════════════════════════════════════════════════════════════ */}
        <footer
          className="h-20 border-t border-white/10 px-6 sm:px-8 flex items-center justify-between shrink-0 bg-white/[0.02] backdrop-blur-xl relative z-30"
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Green Progress Timeline on Top Edge */}
          <div
            ref={progressBarRef}
            onClick={handleSeekClick}
            className="absolute top-0 left-0 right-0 h-1 bg-white/10 hover:h-2 transition-all cursor-pointer group"
          >
            <div
              className="h-full bg-[#1ed760] relative group-hover:bg-[#1fdf64]"
              style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow-md transition-opacity" />
            </div>
          </div>

          {/* Left: Track Information + Heart + Download */}
          <div className="flex items-center gap-3 min-w-0 w-44 sm:w-60">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 shrink-0 shadow-md border border-white/10">
              <img
                src={effectiveCurrentTrack.coverUrl ? resolveUrl(effectiveCurrentTrack.coverUrl) : HOME_FEATURED_ARTIST.currentSong.cover}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold text-white truncate leading-tight hover:underline cursor-pointer">
                {effectiveCurrentTrack.title || 'I Know Better'}
              </span>
              <span className="text-[10px] text-white/40 truncate mt-0.5">
                {effectiveCurrentTrack.artist || 'John Legend'}
              </span>
            </div>

            {/* Like Heart Button */}
            <button
              onClick={() => {
                if (accessToken && effectiveCurrentTrack.id) {
                  likeTrack(effectiveCurrentTrack.id, accessToken);
                }
              }}
              className={`ml-1 border-none bg-transparent cursor-pointer transition-transform hover:scale-120 ${
                effectiveCurrentTrack.liked ? 'text-[#1ed760]' : 'text-white/40 hover:text-white'
              }`}
            >
              ♥
            </button>

            {/* Download Icon Button from Screenshot */}
            <button
              onClick={() => {}}
              className="text-white/40 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-0"
              title="Download Offline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>

          {/* Center: Playback Controls (Shuffle, Prev, Round White Play, Next, Repeat) */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleShuffle}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none bg-transparent ${
                shuffle ? 'text-[#1ed760]' : 'text-white/40 hover:text-white'
              }`}
              title="Shuffle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </button>

            <button
              onClick={prev}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer border-none bg-transparent"
              title="Anterior"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            {/* Central Round White Play Button */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-[0_4px_16px_rgba(255,255,255,0.3)] hover:scale-108 active:scale-95 transition-all cursor-pointer border-none"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={next}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer border-none bg-transparent"
              title="Próxima"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            <button
              onClick={cycleRepeat}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none bg-transparent ${
                repeat !== 'none' ? 'text-[#1ed760]' : 'text-white/40 hover:text-white'
              }`}
              title={`Repetir: ${repeat}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="m17 2 4 4-4 4" />
                <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                <path d="m7 22-4-4 4-4" />
                <path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
          </div>

          {/* Right: Time (1:56 / 3:43) + Options */}
          <div className="flex items-center gap-3 w-44 sm:w-60 justify-end">
            <span className="text-[11px] font-mono font-bold text-white/50 tracking-wider">
              {fmtTime(progress || 116)} / {fmtTime(duration || effectiveCurrentTrack.duration || 233)}
            </span>

            <button className="text-white/40 hover:text-white transition-colors border-none bg-transparent cursor-pointer p-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </button>
          </div>
        </footer>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. MODALS (Upload & Playlist)
      ══════════════════════════════════════════════════════════════════════ */}
      {showUploadModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowUploadModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div
            className="relative w-full max-w-lg bg-[#141820]/90 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">Publicar Música</h2>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border-none cursor-pointer">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <input
                type="text"
                value={uploadState.title}
                onChange={(e) => setUploadState(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da Música *"
                className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-[#1ed760]"
              />
              <input
                type="text"
                value={uploadState.artist}
                onChange={(e) => setUploadState(prev => ({ ...prev, artist: e.target.value }))}
                placeholder="Artista *"
                className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-[#1ed760]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setUploadState(prev => ({ ...prev, audioFile: e.target.files?.[0] || null }))}
                  className="w-full text-xs text-white/60 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#1ed760] file:text-black cursor-pointer"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadState(prev => ({ ...prev, coverFile: e.target.files?.[0] || null }))}
                  className="w-full text-xs text-white/60 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-white/10 file:text-white cursor-pointer"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={uploading || !uploadState.audioFile || !uploadState.title || !uploadState.artist}
                  onClick={handleUploadSubmit}
                  className="flex-1 py-3 rounded-xl bg-[#1ed760] text-black text-xs font-black border-none cursor-pointer disabled:opacity-40"
                >
                  {uploading ? 'A enviar...' : 'Publicar Agora'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPlaylistModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowPlaylistModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md bg-[#141820]/90 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-black text-white mb-4">Nova Playlist</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nome da playlist"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-[#1ed760]"
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setShowPlaylistModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-white text-xs font-bold border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  disabled={!newPlaylistTitle.trim() || creatingPlaylist}
                  onClick={async () => {
                    if (!newPlaylistTitle.trim()) return;
                    setCreatingPlaylist(true);
                    setSidebarPlaylists(prev => [...prev, { id: `sp-${Date.now()}`, title: newPlaylistTitle.trim() }]);
                    if (accessToken) {
                      const fd = new FormData();
                      fd.append('title', newPlaylistTitle.trim());
                      fd.append('isPublic', 'true');
                      await useMusicStore.getState().createPlaylist(fd, accessToken);
                    }
                    setCreatingPlaylist(false);
                    setShowPlaylistModal(false);
                    setNewPlaylistTitle('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#1ed760] text-black text-xs font-black border-none cursor-pointer disabled:opacity-40"
                >
                  {creatingPlaylist ? 'A criar...' : 'Criar Playlist'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
