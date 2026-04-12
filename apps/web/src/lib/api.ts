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
  get:       <T = unknown>(path: string)                   => request<T>('GET',    path),
  post:      <T = unknown>(path: string, body?: unknown)   => request<T>('POST',   path, body),
  patch:     <T = unknown>(path: string, body?: unknown)   => request<T>('PATCH',  path, body),
  put:       <T = unknown>(path: string, body?: unknown)   => request<T>('PUT',    path, body),
  delete:    <T = unknown>(path: string)                   => request<T>('DELETE', path),
  postForm:  <T = unknown>(path: string, form: FormData)   => requestForm<T>('POST',  path, form),
  patchForm: <T = unknown>(path: string, form: FormData)   => requestForm<T>('PATCH', path, form),
};

/**
 * Upload de ficheiro para um servidor de comunidade.
 * Usado nos modais de comunidade (EditProfileModal, etc.)
 */
export async function uploadCommunityFile(file: File, serverId: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const result = await api.postForm<{ url: string }>(`/community/servers/${serverId}/upload`, form);
  return result.url;
}

/**
 * Upload de avatar ou banner do utilizador global.
 * Usado no EditProfileModal e em qualquer outro lugar que precise.
 */
export async function uploadUserFile(
  file: File,
  type: 'avatar' | 'banner',
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  // O endpoint retorna o profile atualizado — extraímos só o URL
  const profile = await api.postForm<{ avatarUrl?: string; bannerUrl?: string }>(
    `/users/me/${type}`,
    form,
  );
  return type === 'avatar' ? profile.avatarUrl! : profile.bannerUrl!;
}