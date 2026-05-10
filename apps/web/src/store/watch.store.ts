import { create } from 'zustand';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Video {
  id: string;
  authorId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  format: 'horizontal' | 'vertical';
  category: string;
  duration: number;
  views: number;
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  tags: string[];
  createdAt: string;
  author?: {
    id: string;
    profile?: {
      username: string;
      displayName?: string;
      avatarUrl?: string;
    };
  };
}

export interface VideoComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    profile?: { username: string; displayName?: string; avatarUrl?: string };
  };
  _count?: { likes: number; replies: number };
}

interface WatchStore {
  videos: Video[];
  currentVideo: Video | null;
  pipVideo: Video | null;
  comments: VideoComment[];
  isLoading: boolean;
  isLoadingVideo: boolean;
  activeCategory: string;
  searchQuery: string;
  totalPages: number;
  currentPage: number;

  fetchVideos: (opts?: { category?: string; search?: string; page?: number; requesterId?: string }) => Promise<void>;
  setCurrentVideo: (video: Video | null) => void;
  setPipVideo: (video: Video | null) => void;
  fetchVideo: (id: string, requesterId?: string) => Promise<void>;
  likeVideo: (videoId: string, token: string) => Promise<void>;
  incrementView: (videoId: string, userId?: string) => Promise<void>;
  addComment: (videoId: string, content: string, token: string) => Promise<void>;
  fetchComments: (videoId: string) => Promise<void>;
  setActiveCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  deleteVideo: (id: string, token: string) => Promise<boolean>;
  updateVideo: (id: string, token: string, data: Partial<Video>) => Promise<boolean>;
}

export const useWatchStore = create<WatchStore>((set, get) => ({
  videos: [],
  currentVideo: null,
  pipVideo: null,
  comments: [],
  isLoading: false,
  isLoadingVideo: false,
  activeCategory: 'Para Ti',
  searchQuery: '',
  totalPages: 1,
  currentPage: 1,

  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCurrentVideo: (video) => set({ currentVideo: video, comments: [] }),
  setPipVideo: (video) => set({ pipVideo: video }),

  fetchVideos: async ({ category, search, page = 1, requesterId } = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (category && category !== 'Para Ti') params.set('category', category);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '24');
      if (requesterId) params.set('userId', requesterId);

      const res = await fetch(`${API}/api/v1/watch/videos?${params}`);
      const json = await res.json();
      if (json.success) {
        set({
          videos: page === 1 ? json.data.videos : [...get().videos, ...json.data.videos],
          totalPages: json.data.pages,
          currentPage: page,
        });
      }
    } catch (e) { console.error(e); }
    finally { set({ isLoading: false }); }
  },

  fetchVideo: async (id, requesterId) => {
    set({ isLoadingVideo: true });
    try {
      const params = requesterId ? `?userId=${requesterId}` : '';
      const res = await fetch(`${API}/api/v1/watch/videos/${id}${params}`);
      const json = await res.json();
      if (json.success) {
        set({ currentVideo: json.data, comments: json.data.comments || [] });
      }
    } catch (e) { console.error(e); }
    finally { set({ isLoadingVideo: false }); }
  },

  likeVideo: async (videoId, token) => {
    try {
      const res = await fetch(`${API}/api/v1/watch/videos/${videoId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const liked = json.data.liked;
        const update = (v: Video) => v.id === videoId
          ? { ...v, liked, likesCount: liked ? v.likesCount + 1 : Math.max(0, v.likesCount - 1) }
          : v;
        set(s => ({
          videos: s.videos.map(update),
          currentVideo: s.currentVideo?.id === videoId ? update(s.currentVideo) : s.currentVideo,
        }));
      }
    } catch (e) { console.error(e); }
  },

  incrementView: async (videoId, userId) => {
    try {
      const params = userId ? `?userId=${userId}` : '';
      await fetch(`${API}/api/v1/watch/videos/${videoId}/view${params}`, { method: 'POST' });
      set(s => ({
        videos: s.videos.map(v => v.id === videoId ? { ...v, views: v.views + 1 } : v),
        currentVideo: s.currentVideo?.id === videoId
          ? { ...s.currentVideo, views: s.currentVideo.views + 1 }
          : s.currentVideo,
      }));
    } catch (e) { console.error(e); }
  },

  addComment: async (videoId, content, token) => {
    try {
      const res = await fetch(`${API}/api/v1/watch/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success) {
        set(s => ({
          comments: [json.data, ...s.comments],
          currentVideo: s.currentVideo?.id === videoId
            ? { ...s.currentVideo, commentsCount: s.currentVideo.commentsCount + 1 }
            : s.currentVideo,
        }));
      }
    } catch (e) { console.error(e); }
  },

  fetchComments: async (videoId) => {
    try {
      const res = await fetch(`${API}/api/v1/watch/videos/${videoId}`);
      const json = await res.json();
      if (json.success) set({ comments: json.data.comments || [] });
    } catch (e) { console.error(e); }
  },

  deleteVideo: async (id, token) => {
    try {
      const res = await fetch(`${API}/api/v1/watch/videos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        set(s => ({
          videos: s.videos.filter(v => v.id !== id),
          currentVideo: s.currentVideo?.id === id ? null : s.currentVideo,
        }));
        return true;
      }
    } catch (e) { console.error(e); }
    return false;
  },

  updateVideo: async (id, token, data) => {
    try {
      const res = await fetch(`${API}/api/v1/watch/videos/${id}`, {
        method: 'POST', // Using POST for update based on controller change
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        set(s => ({
          videos: s.videos.map(v => v.id === id ? { ...v, ...json.data } : v),
          currentVideo: s.currentVideo?.id === id ? { ...s.currentVideo, ...json.data } : s.currentVideo,
        }));
        return true;
      }
    } catch (e) { console.error(e); }
    return false;
  },
}));
