import { create } from 'zustand';
import { useAuthStore } from './auth.store';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  plays: number;
  liked: boolean;
  likesCount: number;
  lyrics?: { time: number; text: string }[];
  collaborations?: { user: { profile: { displayName: string; username: string } } }[];
  authorId: string;
  author?: {
    id: string;
    profile?: { username: string; avatarUrl?: string; displayName?: string } | null;
  };
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  authorId: string;
  author?: { id: string; profile?: { username: string; avatarUrl?: string } | null };
  tracks?: Array<{ track: Track; position: number }>;
  _count?: { tracks: number };
}

interface MusicState {
  // Player
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number; // seconds
  duration: number; // seconds
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  showPlayerModal: boolean;

  // Library
  tracks: Track[];
  likedTracks: Track[];
  playlists: Playlist[];
  isLoading: boolean;
  searchQuery: string;
  activeGenre: string | null;

  // Actions - Player
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  setProgress: (s: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setShowPlayerModal: (show: boolean) => void;

  // Actions - API
  fetchTracks: (search?: string, genre?: string) => Promise<void>;
  fetchLikedTracks: (token: string) => Promise<void>;
  fetchUserTracks: (userId: string) => Promise<Track[]>;
  fetchUserPlaylists: (userId: string) => Promise<Playlist[]>;
  likeTrack: (trackId: string, token: string) => Promise<void>;
  incrementPlay: (trackId: string) => void;
  setSearchQuery: (q: string) => void;
  setActiveGenre: (g: string | null) => void;
  fetchRadio: (genre?: string) => Promise<void>;
  createPlaylist: (fd: FormData, token: string) => Promise<boolean>;
  updatePlaylist: (id: string, fd: FormData, token: string) => Promise<boolean>;
  deletePlaylist: (id: string, token: string) => Promise<boolean>;
  addTrackToPlaylist: (playlistId: string, trackId: string, token: string) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string, token: string) => Promise<boolean>;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useMusicStore = create<MusicState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none',
  showPlayerModal: false,
  tracks: [],
  likedTracks: [],
  playlists: [],
  isLoading: false,
  searchQuery: '',
  activeGenre: null,

  playTrack: (track, queue) => {
    const newQueue = queue || get().queue;
    const idx = newQueue.findIndex(t => t.id === track.id);
    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: idx >= 0 ? idx : 0,
      isPlaying: true,
      progress: 0,
    });
    get().incrementPlay(track.id);
  },

  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (!queue.length) return;
    let next: number;
    if (shuffle) {
      next = Math.floor(Math.random() * queue.length);
    } else {
      next = queueIndex + 1;
      if (next >= queue.length) {
        if (repeat === 'all') next = 0;
        else { set({ isPlaying: false }); return; }
      }
    }
    set({ currentTrack: queue[next], queueIndex: next, isPlaying: true, progress: 0 });
    get().incrementPlay(queue[next].id);
  },

  prev: () => {
    const { queue, queueIndex, progress } = get();
    if (progress > 3) { set({ progress: 0 }); return; }
    const prev = Math.max(0, queueIndex - 1);
    set({ currentTrack: queue[prev], queueIndex: prev, isPlaying: true, progress: 0 });
  },

  seek: (s) => set({ progress: s }),
  setVolume: (vol) => set({ volume: vol }),
  setProgress: (s) => set({ progress: s }),
  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set(s => {
    const order: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
    const next = order[(order.indexOf(s.repeat) + 1) % order.length];
    return { repeat: next };
  }),
  setShowPlayerModal: (show) => set({ showPlayerModal: show }),

  fetchTracks: async (search, genre) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (genre) params.set('genre', genre);
      const res = await fetch(`${API}/api/v1/music/tracks?${params}`);
      const json = await res.json();
      if (json.success) set({ tracks: json.data.tracks });
    } catch (e) { console.error(e); }
    finally { set({ isLoading: false }); }
  },

  fetchLikedTracks: async (token) => {
    try {
      const res = await fetch(`${API}/api/v1/music/me/liked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) set({ likedTracks: json.data });
    } catch (e) { console.error(e); }
  },

  fetchUserTracks: async (userId) => {
    try {
      const res = await fetch(`${API}/api/v1/music/tracks/user/${userId}`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch { return []; }
  },

  fetchUserPlaylists: async (userId) => {
    try {
      const res = await fetch(`${API}/api/v1/music/playlists/user/${userId}`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch { return []; }
  },

  likeTrack: async (trackId, token) => {
    try {
      const res = await fetch(`${API}/api/v1/music/tracks/${trackId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const liked = json.data.liked;
        set(s => ({
          tracks: s.tracks.map(t => t.id === trackId
            ? { ...t, liked, likesCount: liked ? t.likesCount + 1 : t.likesCount - 1 }
            : t
          ),
          likedTracks: liked
            ? [...s.likedTracks, s.tracks.find(t => t.id === trackId)!].filter(Boolean)
            : s.likedTracks.filter(t => t.id !== trackId),
        }));
      }
    } catch (e) { console.error(e); }
  },

  incrementPlay: (trackId) => {
    fetch(`${API}/api/v1/music/tracks/${trackId}/play`, { method: 'POST' }).catch(() => {});
    set(s => ({
      tracks: s.tracks.map(t => t.id === trackId ? { ...t, plays: t.plays + 1 } : t),
    }));
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveGenre: (g) => set({ activeGenre: g }),

  fetchRadio: async (genre) => {
    set({ isLoading: true, activeGenre: genre || null });
    try {
      const params = new URLSearchParams();
      if (genre && genre !== 'Todos') params.set('genre', genre);
      const res = await fetch(`${API}/api/v1/music/radio?${params}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const radioTracks = json.data;
        set({
          tracks: radioTracks,
          queue: radioTracks,
          queueIndex: 0,
          currentTrack: radioTracks[0],
          isPlaying: true,
          progress: 0,
        });
        get().incrementPlay(radioTracks[0].id);
      }
    } catch (e) { console.error(e); }
    finally { set({ isLoading: false }); }
  },
  
  createPlaylist: async (fd, token) => {
    try {
      const res = await fetch(`${API}/api/v1/music/playlists`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      return json.success;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  addTrackToPlaylist: async (playlistId, trackId, token) => {
    try {
      const authToken = token || useAuthStore.getState().accessToken;
      const res = await fetch(`${API}/api/v1/music/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      return json.success || false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  updatePlaylist: async (id, fd, token) => {
    try {
      const authToken = token || useAuthStore.getState().accessToken;
      const res = await fetch(`${API}/api/v1/music/playlists/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
        body: fd,
      });
      const json = await res.json();
      return json.success || false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  deletePlaylist: async (id, token) => {
    try {
      const authToken = token || useAuthStore.getState().accessToken;
      const res = await fetch(`${API}/api/v1/music/playlists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      return json.success || false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  removeTrackFromPlaylist: async (playlistId, trackId, token) => {
    try {
      const authToken = token || useAuthStore.getState().accessToken;
      const res = await fetch(`${API}/api/v1/music/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      return json.success || false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
}));
