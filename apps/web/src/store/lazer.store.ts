import { create } from 'zustand';
import { useAuthStore } from './auth.store';

export interface LazerPost {
  id: string;
  authorId: string;
  author?: {
    profile: {
      username: string;
      displayName: string;
      avatarUrl?: string;
      themeColor?: string;
      themeMode?: string;
    }
  };
  content: string;
  imageUrl?: string | null;
  tag?: string | null;
  isSparkle: boolean;
  isPinned: boolean;
  isLiked?: boolean;
  titleFont?: string;
  titleColor?: string;
  createdAt: string;
  _count?: { reactions: number; comments: number };
}

export interface LazerComment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string | null;
  author?: {
    profile: {
      username: string;
      displayName: string;
      avatarUrl?: string;
    }
  };
  content: string;
  isLiked?: boolean;
  _count?: { reactions: number };
  createdAt: string;
}

interface LazerStoreState {
  feedPosts: LazerPost[];
  userPosts: LazerPost[];
  comments: Record<string, LazerComment[]>;
  isLoading: boolean;

  fetchFeed: () => Promise<void>;
  fetchUserPosts: (userId: string) => Promise<void>;
  createPost: (content: string, imageUrl?: string, tag?: string, isSparkle?: boolean, titleFont?: string, titleColor?: string) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  editPost: (id: string, content: string, imageUrl?: string, tag?: string, titleFont?: string, titleColor?: string) => Promise<boolean>;
  pinPost: (id: string) => Promise<boolean>;
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string) => Promise<boolean>;
  deleteComment: (postId: string, commentId: string) => Promise<boolean>;
  toggleCommentReaction: (postId: string, commentId: string) => Promise<{ liked: boolean; reactionCount: number } | null>;
  toggleReaction: (postId: string) => Promise<{ liked: boolean; reactionCount: number } | null>;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const authHeaders = (): Record<string, string> => {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const useLazerStore = create<LazerStoreState>((set, get) => ({
  feedPosts: [],
  userPosts: [],
  comments: {},
  isLoading: false,

  fetchFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/lazer/feed`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        // Pinned posts come first
        const posts: LazerPost[] = data.data || [];
        posts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        set({ feedPosts: posts });
      }
    } catch (e) {
      console.error("Failed to fetch lazer feed", e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUserPosts: async (userId: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/lazer/users/${userId}/posts`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ userPosts: data.data || data || [] });
      }
    } catch (e) {
      console.error("Failed to fetch lazer user posts", e);
    } finally {
      set({ isLoading: false });
    }
  },

  createPost: async (content, imageUrl, tag, isSparkle, titleFont, titleColor) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content, imageUrl, tag, isSparkle, titleFont, titleColor }),
      });
      if (res.ok) {
        const newPost = await res.json();
        set((state) => ({
          feedPosts: [newPost, ...state.feedPosts],
          userPosts: [newPost, ...state.userPosts],
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to create lazer post", e);
      return false;
    }
  },

  deletePost: async (id: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${id}`, {
        method: 'POST', // using soft-delete which is POST
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        set((state) => ({
          feedPosts: state.feedPosts.filter((p) => p.id !== id),
          userPosts: state.userPosts.filter((p) => p.id !== id),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to delete post", e);
      return false;
    }
  },

  editPost: async (id, content, imageUrl, tag, titleFont, titleColor) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ content, imageUrl, tag, titleFont, titleColor }),
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          feedPosts: state.feedPosts.map((p) => p.id === id ? { ...p, ...updated } : p),
          userPosts: state.userPosts.map((p) => p.id === id ? { ...p, ...updated } : p),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to edit post", e);
      return false;
    }
  },

  pinPost: async (id: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${id}/pin`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => {
          const mapFn = (p: LazerPost) => p.id === id ? { ...p, isPinned: updated.isPinned } : p;
          const feedPosts = state.feedPosts.map(mapFn);
          feedPosts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
          return {
            feedPosts,
            userPosts: state.userPosts.map(mapFn),
          };
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to pin post", e);
      return false;
    }
  },

  fetchComments: async (postId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${postId}/comments`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const commentsList = data.data || data || [];
        set((state) => ({ comments: { ...state.comments, [postId]: commentsList } }));
      }
    } catch (e) {
      console.error("Failed to fetch comments", e);
    }
  },

  addComment: async (postId: string, content: string, parentId?: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${postId}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content, parentId }),
      });
      if (res.ok) {
        const comment = await res.json();
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: [...(state.comments[postId] || []), comment],
          },
          feedPosts: state.feedPosts.map((p) =>
            p.id === postId ? { ...p, _count: { ...p._count!, reactions: p._count?.reactions || 0, comments: (p._count?.comments || 0) + 1 } } : p
          ),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to add comment", e);
      return false;
    }
  },

  deleteComment: async (postId: string, commentId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/comments/${commentId}/delete`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: (state.comments[postId] || []).filter(c => c.id !== commentId),
          },
          feedPosts: state.feedPosts.map(p =>
            p.id === postId ? { ...p, _count: { ...p._count!, reactions: p._count?.reactions || 0, comments: Math.max(0, (p._count?.comments || 1) - 1) } } : p
          )
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to delete comment", e);
      return false;
    }
  },

  toggleCommentReaction: async (postId: string, commentId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/comments/${commentId}/react`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: (state.comments[postId] || []).map(c => 
              c.id === commentId ? { ...c, isLiked: result.liked, _count: { reactions: result.reactionCount } } : c
            )
          }
        }));
        return result;
      }
      return null;
    } catch (e) {
      console.error("Failed to toggle comment reaction", e);
      return null;
    }
  },

  toggleReaction: async (postId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/reactions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        const result = await res.json();
        // Result is usually { liked: boolean, reactionCount: number }
        set((state) => {
          const mapFn = (p: LazerPost) => 
            p.id === postId 
              ? { ...p, isLiked: result.liked, _count: { ...p._count!, reactions: result.reactionCount } } 
              : p;
          return {
            feedPosts: state.feedPosts.map(mapFn),
            userPosts: state.userPosts.map(mapFn),
          };
        });
        return result;
      }
      return null;
    } catch (e) {
      console.error("Failed to toggle reaction", e);
      return null;
    }
  },
}));

