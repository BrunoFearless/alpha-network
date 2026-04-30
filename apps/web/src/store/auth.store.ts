import { create } from 'zustand';
import { useAlphaCoreStore } from './useAlphaCoreStore';
import { useChatStore } from './chat.store';

interface UserProfile {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  bio?: string | null;
  status?: string | null;
  tags?: string | null;
  nameFont?: string | null;
  nameEffect?: string | null;
  nameColor?: string | null;
  auroraTheme?: string | null;
  activeModes: string[];
  lazerData?: any;
  spotifyEnabled?: boolean;
  listening?: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  profile?: UserProfile | null;
  alphaAI?: {
    isActive: boolean;
    name: string;
    botname: string;
    avatarUrl: string | null;
    bannerColor: string | null;
  } | null;
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AuthUser, token: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
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

  /**
   * CORRIGIDO: quando user.profile é null (ex: conta Google recém-criada sem
   * perfil ainda), o spread anterior falhava silenciosamente e não actualizava
   * nada. Agora criamos um perfil base mínimo nesse caso.
   */
  updateUserProfile: (profile) => {
    set(state => {
      if (!state.user) return state;

      const existingProfile = state.user.profile;

      return {
        user: {
          ...state.user,
          profile: existingProfile
            ? { ...existingProfile, ...profile }
            // Se profile era null, cria um perfil base com os dados recebidos
            : {
                username:    (profile as any).username ?? '',
                activeModes: (profile as any).activeModes ?? [],
                ...profile,
              },
        },
      };
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Erro ao fazer login.');
      set({
        user:            data.data.user,
        accessToken:     data.data.accessToken,
        isAuthenticated: true,
        isLoading:       false,
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
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ email, password, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Erro ao criar conta.');
      set({
        user:            data.data.user,
        accessToken:     data.data.accessToken,
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const { accessToken } = get();
    try {
      await fetch(`${API}/api/v1/auth/logout`, {
        method:      'POST',
        credentials: 'include',
        headers:     accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch { /* ignora erros de rede no logout */ }

    // Limpar todos os stores com dados do utilizador para evitar
    // vazamento entre contas na mesma sessão do browser
    useAlphaCoreStore.getState().clearMessages();
    useAlphaCoreStore.getState().setPersonalAI(null);
    useChatStore.setState({ conversations: [], activeConversationId: null });

    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refresh: async () => {
    try {
      const res = await fetch(`${API}/api/v1/auth/refresh`, {
        method:      'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        set({ user: null, accessToken: null, isAuthenticated: false });
        return false;
      }
      const data = await res.json();
      const newToken: string = data.data.accessToken;

      const meRes = await fetch(`${API}/api/v1/auth/me`, {
        credentials: 'include',
        headers:     { Authorization: `Bearer ${newToken}` },
      });
      if (!meRes.ok) return false;
      const me = await meRes.json();

      set({ user: me.data, accessToken: newToken, isAuthenticated: true });
      return true;
    } catch {
      return false;
    }
  },
}));