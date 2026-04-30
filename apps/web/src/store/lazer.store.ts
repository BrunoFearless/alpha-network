import { create } from 'zustand';
import { useAuthStore } from './auth.store';

export interface LazerTrope {
  id: string;
  name: string;
  description?: string | null;
  iconEmoji: string;
  category: string;
}

export interface TrendingTrope extends LazerTrope {
  metrics: {
    sparkles: number;
    talking: number;
    postCount: number;
  };
  score: number;
}

export interface WatchingSimulcast {
  id: string;
  title: string;
  ep: string;
  genre: string;
  emoji: string;
  totalCheckIns: number;
  recentAvatars: string[];
}

export interface LazerPost {
  id: string;
  authorId: string;
  author?: {
    profile: {
      username: string; displayName: string | null; avatarUrl?: string | null;
      themeColor?: string | null; themeMode?: string | null; bio?: string | null;
      nameFont?: string | null; nameEffect?: string | null; nameColor?: string | null;
    }
  };
  content: string; imageUrl?: string | null; 
  tropes?: LazerTrope[];
  tag?: string | null;
  communityId?: string | null;
  isSparkle: boolean; isPinned: boolean;
  isLiked?: boolean; // persists in store, never reset between renders
  titleFont?: string | null; titleColor?: string | null; createdAt: string;
  _count?: { reactions: number; comments: number };
}

export interface LazerComment {
  id: string; postId: string; authorId: string; parentId?: string | null;
  author?: {
    profile: {
      username: string; displayName: string | null; avatarUrl?: string | null;
      nameFont?: string | null; nameEffect?: string | null; nameColor?: string | null;
    }
  };
  content: string; isLiked?: boolean; _count?: { reactions: number }; createdAt: string;
}

export interface FriendRequest {
  id: string; fromUserId: string; toUserId: string; status: 'pending' | 'accepted' | 'rejected';
  fromUser?: { id: string; profile: { username: string; displayName: string | null; avatarUrl?: string | null } };
  toUser?: { id: string; profile: { username: string; displayName: string | null; avatarUrl?: string | null } };
  createdAt: string;
}

export interface LazerCommunity {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  iconEmoji?: string;
  themeColor?: string;
  accentColor?: string;
  isPublic: boolean;
  membersCount: number;
  onlineCount: number;
  role: 'admin' | 'member' | 'none' | string;
  inviteCode?: string;
  tags?: string[];
}

interface LazerStoreState {
  feedPosts: LazerPost[]; userPosts: LazerPost[];
  comments: Record<string, LazerComment[]>;
  friends: string[]; friendRequests: FriendRequest[]; sentRequests: string[];
  myCommunities: LazerCommunity[]; exploreCommunities: LazerCommunity[];
  trendingTropes: TrendingTrope[];
  watchingNow: WatchingSimulcast[];
  suggestions: any[];
  isLoading: boolean;
  spotifyPlayback: any | null;
  fetchFeed: () => Promise<void>;
  fetchUserPosts: (userId: string) => Promise<void>;
  createPost: (content: string, imageUrl?: string, tropeNames?: string[], isSparkle?: boolean, titleFont?: string, titleColor?: string, communityId?: string) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  editPost: (id: string, content: string, imageUrl?: string, tropeNames?: string[], titleFont?: string, titleColor?: string) => Promise<boolean>;
  pinPost: (id: string) => Promise<boolean>;
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string) => Promise<boolean>;
  deleteComment: (postId: string, commentId: string) => Promise<boolean>;
  toggleCommentReaction: (postId: string, commentId: string) => Promise<{ liked: boolean; reactionCount: number } | null>;
  toggleReaction: (postId: string) => Promise<{ liked: boolean; reactionCount: number } | null>;
  fetchFriends: () => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<boolean>;
  cancelFriendRequest: (userId: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string, fromUserId: string) => Promise<boolean>;
  rejectFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (userId: string) => Promise<boolean>;
  fetchMyCommunities: () => Promise<void>;
  fetchExploreCommunities: () => Promise<void>;
  isFriend: (userId: string) => boolean;
  hasSentRequest: (userId: string) => boolean;
  hasReceivedRequest: (userId: string) => FriendRequest | undefined;
  fetchTrendingTropes: () => Promise<void>;
  fetchWatchingNow: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  submitCheckIn: (title: string, episode: string, emoji: string, genre: string) => Promise<boolean>;
  fetchSpotifyPlayback: (userId: string) => Promise<void>;
  connectSpotify: () => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const authHeaders = (): Record<string, string> => {
  const token = useAuthStore.getState().accessToken;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

export const useLazerStore = create<LazerStoreState>((set, get) => ({
  feedPosts: [], userPosts: [], comments: {},
  friends: [], friendRequests: [], sentRequests: [],
  myCommunities: [], exploreCommunities: [],
  trendingTropes: [],
  watchingNow: [],
  suggestions: [],
  isLoading: false,
  spotifyPlayback: null,

  fetchTrendingTropes: async () => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/tropes/trending`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ trendingTropes: data.data || [] });
      }
    } catch (e) { console.error('fetchTrendingTropes error', e); }
  },

  fetchWatchingNow: async () => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/watching`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ watchingNow: data.data || [] });
      }
    } catch (e) { console.error('fetchWatchingNow error', e); }
  },

  fetchSuggestions: async () => {
    try {
      const res = await fetch(`${API}/api/v1/users/me/suggestions`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ suggestions: data.data || [] });
      }
    } catch (e) { console.error('fetchSuggestions error', e); }
  },

  submitCheckIn: async (title, episode, emoji, genre) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/watching/checkin`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, episode, emoji, genre }),
      });
      if (res.ok) {
        get().fetchWatchingNow();
        return true;
      }
    } catch (e) { console.error('submitCheckIn error', e); }
    return false;
  },

  fetchFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/lazer/feed`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const incoming: LazerPost[] = data.data || [];
        incoming.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        // Preserve isLiked from local state so reaction doesn't reset on refetch
        const existing = get().feedPosts;
        const merged = incoming.map(p => {
          const old = existing.find(e => e.id === p.id);
          return old ? { ...p, isLiked: old.isLiked ?? p.isLiked } : p;
        });
        set({ feedPosts: merged });
      }
    } catch (e) { console.error('fetchFeed error', e); }
    finally { set({ isLoading: false }); }
  },

  fetchUserPosts: async (userId: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/lazer/users/${userId}/posts`, { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); set({ userPosts: data.data || data || [] }); }
    } catch (e) { console.error('fetchUserPosts error', e); }
    finally { set({ isLoading: false }); }
  },

  createPost: async (content, imageUrl, tropeNames, isSparkle, titleFont, titleColor, communityId) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ content, imageUrl, tropeNames, isSparkle, titleFont, titleColor, communityId }),
      });
      if (res.ok) {
        const newPost = await res.json();
        const post = newPost.data || newPost;
        // Immediately enrich with author info so the post displays correctly
        const myProfile = useAuthStore.getState().user?.profile;
        const myId = useAuthStore.getState().user?.id;
        const enriched = myProfile
          ? { ...post, authorId: myId || post.authorId, author: { profile: myProfile } }
          : post;
        set(state => ({ feedPosts: [enriched, ...state.feedPosts], userPosts: [enriched, ...state.userPosts] }));
        return true;
      }
      return false;
    } catch (e) { return false; }
  },

  // deletePost removes from feedPosts → automatically drops it from the
  // "my posts with activity" count → notif badge decrements without extra logic
  deletePost: async (id: string) => {
    set(state => ({
      feedPosts: state.feedPosts.filter(p => p.id !== id),
      userPosts: state.userPosts.filter(p => p.id !== id),
    }));
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) get().fetchFeed(); // restore on failure
      return res.ok;
    } catch { return false; }
  },

  editPost: async (id, content, imageUrl, tropeNames, titleFont, titleColor) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ content, imageUrl, tropeNames, titleFont, titleColor }),
      });
      if (res.ok) {
        const updated = await res.json(); const p = updated.data || updated;
        set(state => ({
          feedPosts: state.feedPosts.map(fp => fp.id === id ? { ...fp, ...p } : fp),
          userPosts: state.userPosts.map(fp => fp.id === id ? { ...fp, ...p } : fp),
        }));
        return true;
      }
      return false;
    } catch { return false; }
  },

  pinPost: async (id: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${id}/pin`, { method: 'PATCH', headers: authHeaders() });
      if (res.ok) {
        const updated = await res.json(); const p = updated.data || updated;
        set(state => ({ feedPosts: state.feedPosts.map(fp => fp.id === id ? { ...fp, isPinned: p.isPinned } : fp) }));
        return true;
      }
      return false;
    } catch { return false; }
  },

  fetchComments: async (postId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${postId}/comments`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const comments = data.data || data || [];
        const myId = useAuthStore.getState().user?.id;
        const myProfile = useAuthStore.getState().user?.profile;
        const enriched = comments.map((c: LazerComment) => {
          if (c.authorId === myId && myProfile && !c.author?.profile?.username) {
            return { ...c, author: { profile: { ...myProfile, ...c.author?.profile } } };
          }
          return c;
        });
        set(state => ({ comments: { ...state.comments, [postId]: enriched } }));
      }
    } catch (e) { console.error('fetchComments error', e); }
  },

  addComment: async (postId: string, content: string, parentId?: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/${postId}/comments`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ content, parentId }),
      });
      if (res.ok) {
        const newComment = await res.json(); const comment = newComment.data || newComment;
        const myProfile = useAuthStore.getState().user?.profile;
        const myId = useAuthStore.getState().user?.id;
        const enriched = myProfile
          ? { ...comment, authorId: myId || comment.authorId, author: { profile: myProfile } }
          : comment;
        set(state => ({
          comments: { ...state.comments, [postId]: [...(state.comments[postId] || []), enriched] },
          feedPosts: state.feedPosts.map(p =>
            p.id === postId ? { ...p, _count: { reactions: p._count?.reactions || 0, comments: (p._count?.comments || 0) + 1 } } : p
          ),
        }));
        return true;
      }
      return false;
    } catch { return false; }
  },

  // deleteComment decrements comment count → affects notif badge immediately
  deleteComment: async (postId: string, commentId: string) => {
    set(state => ({
      comments: { ...state.comments, [postId]: (state.comments[postId] || []).filter(c => c.id !== commentId) },
      feedPosts: state.feedPosts.map(p =>
        p.id === postId
          ? { ...p, _count: { reactions: p._count?.reactions || 0, comments: Math.max(0, (p._count?.comments || 1) - 1) } }
          : p
      ),
    }));
    try {
      const res = await fetch(`${API}/api/v1/lazer/comments/${commentId}`, { method: 'DELETE', headers: authHeaders() });
      return res.ok;
    } catch { return false; }
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
      const res = await fetch(`${API}/api/v1/lazer/posts/reactions`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ postId: commentId }),
      });
      if (res.ok) {
        const r = (await res.json()).data || await res.json();
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
    } catch { return null; }
  },

  // toggleReaction — isLiked is persisted in the store, never lost between renders
  toggleReaction: async (postId: string) => {
    set(state => ({
      feedPosts: state.feedPosts.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, _count: { reactions: (p._count?.reactions || 0) + (p.isLiked ? -1 : 1), comments: p._count?.comments || 0 } }
          : p
      ),
    }));
    try {
      const res = await fetch(`${API}/api/v1/lazer/posts/reactions`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        const result = await res.json(); const r = result.data || result;
        set(state => ({
          feedPosts: state.feedPosts.map(p =>
            p.id === postId ? { ...p, isLiked: r.liked, _count: { ...p._count!, reactions: r.reactionCount } } : p
          ),
          userPosts: state.userPosts.map(p =>
            p.id === postId ? { ...p, isLiked: r.liked, _count: { ...p._count!, reactions: r.reactionCount } } : p
          ),
        }));
        return r;
      }
      return null;
    } catch { return null; }
  },

  fetchFriends: async () => {
    try {
      const [fRes, rRes] = await Promise.allSettled([
        fetch(`${API}/api/v1/users/me/friends`, { headers: authHeaders() }),
        fetch(`${API}/api/v1/users/me/friend-requests`, { headers: authHeaders() }),
      ]);
      if (fRes.status === 'fulfilled' && fRes.value.ok) {
        const data = await fRes.value.json();
        const list = data.data || data || [];
        set({ friends: list.map((f: any) => f.id || f.userId || f).filter(Boolean) });
      }
      if (rRes.status === 'fulfilled' && rRes.value.ok) {
        const data = await rRes.value.json();
        const requests: FriendRequest[] = data.data || data || [];
        const myId = useAuthStore.getState().user?.id;
        const sent = requests.filter(r => r.fromUserId === myId && r.status === 'pending').map(r => r.toUserId);
        set({ friendRequests: requests, sentRequests: sent });
      }
    } catch (e) { console.error('fetchFriends error', e); }
  },

  sendFriendRequest: async (userId: string) => {
    set(state => ({ sentRequests: [...state.sentRequests, userId] }));
    try {
      const res = await fetch(`${API}/api/v1/users/friend-requests`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ toUserId: userId }),
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
      const res = await fetch(`${API}/api/v1/users/friend-requests/${userId}`, { method: 'DELETE', headers: authHeaders() });
      return res.ok;
    } catch { return false; }
  },
  acceptFriendRequest: async (requestId: string, fromUserId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/users/friend-requests/${requestId}/accept`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        set(state => ({
          friends: [...state.friends, fromUserId],
          friendRequests: state.friendRequests.map(r => r.id === requestId ? { ...r, status: 'accepted' as const } : r),
        }));
        return true;
      }
      return false;
    } catch { return false; }
  },
  rejectFriendRequest: async (requestId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/users/friend-requests/${requestId}/reject`, { method: 'POST', headers: authHeaders() });
      if (res.ok) { set(state => ({ friendRequests: state.friendRequests.filter(r => r.id !== requestId) })); return true; }
      return false;
    } catch { return false; }
  },
  removeFriend: async (userId: string) => {
    set(state => ({ friends: state.friends.filter(id => id !== userId) }));
    try {
      const res = await fetch(`${API}/api/v1/users/friends/${userId}`, { method: 'DELETE', headers: authHeaders() });
      return res.ok;
    } catch { return false; }
  },

  fetchMyCommunities: async () => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/communities/my`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ myCommunities: data.data || [] });
      }
    } catch (e) { console.error('fetchMyCommunities error', e); }
  },

  fetchExploreCommunities: async () => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/communities/explore`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ exploreCommunities: data.data || [] });
      }
    } catch (e) { console.error('fetchExploreCommunities error', e); }
  },

  isFriend: (userId: string) => get().friends.includes(userId),
  hasSentRequest: (userId: string) => get().sentRequests.includes(userId),
  hasReceivedRequest: (userId: string) => {
    const myId = useAuthStore.getState().user?.id;
    return get().friendRequests.find(r => r.fromUserId === userId && r.toUserId === myId && r.status === 'pending');
  },

  // ── Spotify Actions ──────────────────────────────────────────────────

  fetchSpotifyPlayback: async (userId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/profile/${userId}/playback`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ spotifyPlayback: data });
      } else {
        set({ spotifyPlayback: null });
      }
    } catch (e) { 
      set({ spotifyPlayback: null });
    }
  },

  connectSpotify: async () => {
    try {
      const res = await fetch(`${API}/api/v1/lazer/spotify/auth`, { headers: authHeaders() });
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          // Abrir numa nova aba para evitar conflitos com o modal e refresh da página
          window.open(url, '_blank');
        }
      }
    } catch (e) {
      console.error('Erro ao conectar Spotify:', e);
    }
  }
}));