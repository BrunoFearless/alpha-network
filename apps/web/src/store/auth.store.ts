import { create } from 'zustand';

interface UserProfile {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  activeModes: string[];
}

interface AuthUser {
  id: string;
  email: string;
  profile?: UserProfile | null;
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  setUser: (user: AuthUser, token: string) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  isLoading:       false,

  setUser: (user, accessToken) => {
    set({ user, accessToken, isAuthenticated: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isLoading: false });
        throw new Error(data.error?.message ?? 'Erro ao fazer login.');
      }
      set({
        user: data.data.user,
        accessToken: data.data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, username) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isLoading: false });
        throw new Error(data.error?.message ?? 'Erro ao criar conta.');
      }
      set({
        user: data.data.user,
        accessToken: data.data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await fetch(`${API}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${get().accessToken}` },
    });
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refresh: async () => {
    try {
      const res = await fetch(`${API}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) { set({ user: null, accessToken: null, isAuthenticated: false }); return false; }
      const data = await res.json();
      // Busca os dados do utilizador com o novo token
      const meRes = await fetch(`${API}/api/v1/auth/me`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${data.data.accessToken}` },
      });
      if (!meRes.ok) return false;
      const me = await meRes.json();
      set({ user: me.data, accessToken: data.data.accessToken, isAuthenticated: true });
      return true;
    } catch {
      return false;
    }
  },
}));