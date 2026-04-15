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
      bio?: string;
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

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  fromUser?: { profile: { username: string; displayName: string; avatarUrl?: string } };
  toUser?: { profile: { username: string; displayName: string; avatarUrl?: string } };
  createdAt: string;
}

interface LazerStoreState {
  feedPosts: LazerPost[];
  userPosts: LazerPost[];
  comments: Record<string, LazerComment[]>;
  friends: string[];
  friendRequests: FriendRequest[];
  sentRequests: string[];
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

  // Friends
  fetchFriends: () => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<boolean>;
  cancelFriendRequest: (userId: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string, fromUserId: string) => Promise<boolean>;
  rejectFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (userId: string) => Promise<boolean>;
  isFriend: (userId: string) => boolean;
  hasSentRequest: (userId: string) => boolean;
  hasReceivedRequest: (userId: string) => FriendRequest | undefined;
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
  friends: [],
  friendRequests: [],
  sentRequests: [],
  isLoading: false,

  fetchFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/lazer/feed`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const posts: LazerPost[] = data.data || [];
        posts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        set({ feedPosts: posts });
      }
    } catch (e) {
      console.error('fetchFeed error', e);
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
      console.error('fetchUserPosts error', e);
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
        const post = newPost.data || newPost;
        set(state => ({
          feedPosts: [post, ...state.feedPosts],
          userPosts: [post, ...state.userPosts],
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('createPost error', e);
      return false;
    }
  },

  deletePost: async (id: string) => {
    set(state => ({
      feedPosts: state.feedPosts.filter(p => p.id !== id),
      userPosts: state.userPosts.filter(p => p.id !== id),
    }));
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${id}`, {
        method: 'POST', // soft delete via POST
        headers: authHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.error('deletePost error', e);
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
        const p = updated.data || updated;
        set(state => ({
          feedPosts: state.feedPosts.map(fp => fp.id === id ? { ...fp, ...p } : fp),
          userPosts: state.userPosts.map(fp => fp.id === id ? { ...fp, ...p } : fp),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('editPost error', e);
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
        const p = updated.data || updated;
        set(state => ({
          feedPosts: state.feedPosts.map(fp => fp.id === id ? { ...fp, isPinned: p.isPinned } : fp),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('pinPost error', e);
      return false;
    }
  },

  fetchComments: async (postId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${postId}/comments`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          comments: { ...state.comments, [postId]: data.data || data || [] },
        }));
      }
    } catch (e) {
      console.error('fetchComments error', e);
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
        const newComment = await res.json();
        const comment = newComment.data || newComment;
        set(state => ({
          comments: {
            ...state.comments,
            [postId]: [...(state.comments[postId] || []), comment],
          },
          feedPosts: state.feedPosts.map(p =>
            p.id === postId ? { ...p, _count: { ...p._count!, reactions: p._count?.reactions || 0, comments: (p._count?.comments || 0) + 1 } } : p
          ),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('addComment error', e);
      return false;
    }
  },

  deleteComment: async (postId: string, commentId: string) => {
    set(state => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] || []).filter(c => c.id !== commentId),
      },
    }));
    try {
      const res = await fetch(`${API}/api/v1/lazer/comments/${commentId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.error('deleteComment error', e);
      return false;
    }
  },

  toggleCommentReaction: async (postId: string, commentId: string) => {
    set(state => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] || []).map(c =>
          c.id === commentId
            ? { ...c, isLiked: !c.isLiked, _count: { reactions: (c._count?.reactions || 0) + (c.isLiked ? -1 : 1) } }
            : c
        ),
      },
    }));
    try {
      const res = await fetch(`${API}/api/v1/lazer/comments/${commentId}/react`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        const r = result.data || result;
        set(state => ({
          comments: {
            ...state.comments,
            [postId]: (state.comments[postId] || []).map(c =>
              c.id === commentId ? { ...c, isLiked: r.liked, _count: { reactions: r.reactionCount } } : c
            ),
          },
        }));
        return r;
      }
      return null;
    } catch (e) {
      console.error('toggleCommentReaction error', e);
      return null;
    }
  },

  toggleReaction: async (postId: string) => {
    set(state => ({
      feedPosts: state.feedPosts.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, _count: { ...p._count!, reactions: (p._count?.reactions || 0) + (p.isLiked ? -1 : 1), comments: p._count?.comments || 0 } }
          : p
      ),
    }));
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/reactions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        const result = await res.json();
        const r = result.data || result;
        set(state => ({
          feedPosts: state.feedPosts.map(p => p.id === postId ? { ...p, isLiked: r.liked, _count: { ...p._count!, reactions: r.reactionCount } } : p),
          userPosts: state.userPosts.map(p => p.id === postId ? { ...p, isLiked: r.liked, _count: { ...p._count!, reactions: r.reactionCount } } : p),
        }));
        return r;
      }
      return null;
    } catch (e) {
      console.error('toggleReaction error', e);
      return null;
    }
  },

  // ── Friends System ────────────────────────────────────────────────────────

  fetchFriends: async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.allSettled([
        fetch(`${API}/api/v1/users/me/friends`, { headers: authHeaders() }),
        fetch(`${API}/api/v1/users/me/friend-requests`, { headers: authHeaders() }),
      ]);

      if (friendsRes.status === 'fulfilled' && friendsRes.value.ok) {
        const data = await friendsRes.value.json();
        const friends = (data.data || data || []).map((f: any) => f.id || f.userId || f);
        set({ friends });
      }

      if (requestsRes.status === 'fulfilled' && requestsRes.value.ok) {
        const data = await requestsRes.value.json();
        const requests: FriendRequest[] = data.data || data || [];
        const myId = useAuthStore.getState().user?.id;
        const sent = requests.filter(r => r.fromUserId === myId && r.status === 'pending').map(r => r.toUserId);
        set({ friendRequests: requests, sentRequests: sent });
      }
    } catch (e) {
      console.error('fetchFriends error', e);
    }
  },

  sendFriendRequest: async (userId: string) => {
    set(state => ({ sentRequests: [...state.sentRequests, userId] }));
    try {
      const res = await fetch(`${API}/api/v1/users/friend-requests`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ toUserId: userId }),
      });
      if (res.ok) return true;
      set(state => ({ sentRequests: state.sentRequests.filter(id => id !== userId) }));
      return false;
    } catch {
      set(state => ({ sentRequests: state.sentRequests.filter(id => id !== userId) }));
      return false;
    }
  },

  cancelFriendRequest: async (userId: string) => {
    set(state => ({ sentRequests: state.sentRequests.filter(id => id !== userId) }));
    try {
      const res = await fetch(`${API}/api/v1/users/friend-requests/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.ok;
    } catch { return false; }
  },

  acceptFriendRequest: async (requestId: string, fromUserId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/users/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        set(state => ({
          friends: [...state.friends, fromUserId],
          friendRequests: state.friendRequests.map(r =>
            r.id === requestId ? { ...r, status: 'accepted' as const } : r
          ),
        }));
        return true;
      }
      return false;
    } catch { return false; }
  },

  rejectFriendRequest: async (requestId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/users/friend-requests/${requestId}/reject`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        set(state => ({
          friendRequests: state.friendRequests.filter(r => r.id !== requestId),
        }));
        return true;
      }
      return false;
    } catch { return false; }
  },

  removeFriend: async (userId: string) => {
    set(state => ({ friends: state.friends.filter(id => id !== userId) }));
    try {
      const res = await fetch(`${API}/api/v1/users/friends/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.ok;
    } catch { return false; }
  },

  isFriend: (userId: string) => get().friends.includes(userId),
  hasSentRequest: (userId: string) => get().sentRequests.includes(userId),
  hasReceivedRequest: (userId: string) => {
    const myId = useAuthStore.getState().user?.id;
    return get().friendRequests.find(r => r.fromUserId === userId && r.toUserId === myId && r.status === 'pending');
  },
}));