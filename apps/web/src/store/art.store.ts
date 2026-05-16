import { create } from 'zustand';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Art {
  id: string;
  authorId: string;
  title: string;
  description?: string;
  imageUrl: string;
  width?: number;
  height?: number;
  category: string;
  tags: string[];
  liked: boolean;
  likesCount: number;
  commentsCount: number;
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

export interface ArtCollection {
  id: string;
  authorId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  createdAt: string;
  _count?: { items: number };
  items?: { art: { imageUrl: string } }[];
}

interface ArtStore {
  arts: Art[];
  collections: ArtCollection[];
  currentArt: Art | null;
  isLoading: boolean;
  activeCategory: string;
  searchQuery: string;
  totalPages: number;
  currentPage: number;

  fetchArts: (opts?: { category?: string; search?: string; page?: number; requesterId?: string }) => Promise<void>;
  fetchArt: (id: string, requesterId?: string) => Promise<void>;
  likeArt: (artId: string, token: string) => Promise<void>;
  fetchUserCollections: (userId: string) => Promise<void>;
  createCollection: (fd: FormData, token: string) => Promise<boolean>;
  addArtToCollection: (artId: string, collectionId: string, token: string) => Promise<boolean>;
  addCollaborator: (collectionId: string, userId: string, token: string) => Promise<boolean>;
  removeCollaborator: (collectionId: string, userId: string, token: string) => Promise<boolean>;
  updateArt: (id: string, formData: FormData | any, token: string) => Promise<boolean>;
  updateCollection: (id: string, formData: FormData, token: string) => Promise<boolean>;
  setActiveCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  setCurrentArt: (art: Art | null) => void;
}

export const useArtStore = create<ArtStore>((set, get) => ({
  arts: [],
  collections: [],
  currentArt: null,
  isLoading: false,
  activeCategory: 'Para Ti',
  searchQuery: '',
  totalPages: 1,
  currentPage: 1,

  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCurrentArt: (art) => set({ currentArt: art }),

  fetchArts: async ({ category, search, page = 1, requesterId } = {}) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (category && category !== 'Para Ti') params.set('category', category);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '40');
      if (requesterId) params.set('userId', requesterId);

      const res = await fetch(`${API}/api/v1/art/arts?${params}`);
      const json = await res.json();
      if (json.success) {
        set({
          arts: page === 1 ? json.data.arts : [...get().arts, ...json.data.arts],
          totalPages: json.data.pages,
          currentPage: page,
        });
      }
    } catch (e) { console.error(e); }
    finally { set({ isLoading: false }); }
  },

  fetchArt: async (id, requesterId) => {
    try {
      const params = requesterId ? `?userId=${requesterId}` : '';
      const res = await fetch(`${API}/api/v1/art/arts/${id}${params}`);
      const json = await res.json();
      if (json.success) set({ currentArt: json.data });
    } catch (e) { console.error(e); }
  },

  likeArt: async (artId, token) => {
    try {
      const res = await fetch(`${API}/api/v1/art/arts/${artId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const liked = json.data.liked;
        const update = (a: Art) => a.id === artId
          ? { ...a, liked, likesCount: liked ? a.likesCount + 1 : Math.max(0, a.likesCount - 1) }
          : a;
        set(s => ({
          arts: s.arts.map(update),
          currentArt: s.currentArt?.id === artId ? update(s.currentArt) : s.currentArt,
        }));
      }
    } catch (e) { console.error(e); }
  },

  fetchUserCollections: async (userId) => {
    try {
      const res = await fetch(`${API}/api/v1/art/collections/user/${userId}`);
      const json = await res.json();
      if (json.success) set({ collections: json.data });
    } catch (e) { console.error(e); }
  },

  createCollection: async (fd, token) => {
    try {
      const res = await fetch(`${API}/api/v1/art/collections`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        set(s => ({ collections: [json.data, ...s.collections] }));
        return true;
      }
    } catch (e) { console.error(e); }
    return false;
  },

  addArtToCollection: async (artId, collectionId, token) => {
    try {
      const res = await fetch(`${API}/api/v1/art/collections/${collectionId}/add/${artId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.success;
    } catch (e) { console.error(e); }
    return false;
  },

  addCollaborator: async (collectionId, userId, token) => {
    try {
      const res = await fetch(`${API}/api/v1/art/collections/${collectionId}/collaborators`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      return json.success;
    } catch (e) { console.error(e); }
    return false;
  },

  removeCollaborator: async (collectionId, userId, token) => {
    try {
      const res = await fetch(`${API}/api/v1/art/collections/${collectionId}/collaborators/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.success;
    } catch (e) { console.error(e); }
    return false;
  },

  updateArt: async (id: string, formData: FormData | any, token: string) => {
    try {
      const isFormData = formData instanceof FormData;
      const res = await fetch(`${API}/api/v1/art/arts/${id}`, {
        method: 'PUT',
        headers: isFormData ? { Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: isFormData ? formData : JSON.stringify(formData)
      });
      return res.ok;
    } catch (e) { return false; }
  },

  updateCollection: async (id: string, formData: FormData, token: string) => {
    try {
      const res = await fetch(`${API}/api/v1/art/folder/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      return res.ok;
    } catch (e) { return false; }
  }
}));
