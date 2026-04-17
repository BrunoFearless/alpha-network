import { useAuthStore } from '@/store/auth.store';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  return useAuthStore.getState().accessToken ?? null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Erro ${res.status}`);
  return data.data ?? data;
}

async function requestForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Erro ${res.status}`);
  return data.data ?? data;
}

export const api = {
  get:       <T = unknown>(path: string)                 => request<T>('GET',    path),
  post:      <T = unknown>(path: string, body?: unknown) => request<T>('POST',   path, body),
  patch:     <T = unknown>(path: string, body?: unknown) => request<T>('PATCH',  path, body),
  put:       <T = unknown>(path: string, body?: unknown) => request<T>('PUT',    path, body),
  delete:    <T = unknown>(path: string)                 => request<T>('DELETE', path),
  postForm:  <T = unknown>(path: string, form: FormData) => requestForm<T>('POST',  path, form),
  patchForm: <T = unknown>(path: string, form: FormData) => requestForm<T>('PATCH', path, form),
};

/**
 * Upload de ficheiro para um servidor de comunidade.
 * Usado nos modais de comunidade (ServerSettingsModal, etc.)
 */
export async function uploadCommunityFile(file: File, serverId: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const result = await api.postForm<{ url: string }>(`/community/servers/${serverId}/upload`, form);
  return result.url;
}

/**
 * Upload de avatar ou banner do utilizador.
 *
 * Usa os endpoints dedicados do perfil pessoal:
 *   avatar → POST /users/me/avatar  (devolve o profile actualizado)
 *   banner → POST /users/me/banner  (devolve o profile actualizado)
 *
 * Devolve o URL final do ficheiro guardado.
 */
export async function uploadUserFile(
  file: File,
  type: 'avatar' | 'banner',
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const profile = await api.postForm<{ avatarUrl?: string; bannerUrl?: string }>(
    `/users/me/${type}`,
    form,
  );
  const url = type === 'avatar' ? profile.avatarUrl : profile.bannerUrl;
  if (!url) throw new Error(`O servidor não devolveu o URL do ${type}.`);
  return url;
}

/**
 * Lazer Communities
 */
export async function uploadLazerCommunityFile(file: File, communityId: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const result = await api.postForm<{ url: string }>(`/lazer/communities/${communityId}/upload`, form);
  return result.url;
}

export const lazerApi = {
  // Posts
  getFeed: (cursor?: string, communityId?: string) => 
    api.get<any[]>(`/lazer/feed?${cursor ? `cursor=${cursor}&` : ''}${communityId ? `communityId=${communityId}` : ''}`),
  createPost: (data: any) => api.post('/lazer/posts', data),
  
  // Communities
  getMyCommunities: () => api.get<any[]>('/lazer/communities/my'),
  exploreCommunities: () => api.get<any[]>('/lazer/communities/explore'),
  getCommunity: (id: string) => api.get<any>(`/lazer/communities/${id}`),
  createCommunity: (data: any) => api.post('/lazer/communities', data),
  updateCommunity: (id: string, data: any) => api.patch(`/lazer/communities/${id}`, data),
  joinCommunity: (inviteCode: string) => api.post('/lazer/communities/join', { inviteCode }),
  leaveCommunity: (id: string) => api.delete(`/lazer/communities/${id}/leave`),
  
  // Rules
  addRule: (communityId: string, text: string) => api.post(`/lazer/communities/${communityId}/rules`, { text }),
  deleteRule: (ruleId: string) => api.delete(`/lazer/communities/rules/${ruleId}`),
  
  // Tropes
  getAllTropes: () => api.get<any[]>('/lazer/tropes'),
  createTrope: (data: { name: string; description: string; category: string; iconEmoji: string }) => api.post('/lazer/tropes', data),
};