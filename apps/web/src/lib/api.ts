/**
 * Wrapper para chamadas à API com autenticação automática.
 *
 * CORRECÇÃO: a versão anterior tentava ler o token de window.__ZUSTAND_AUTH__,
 * mas o store nunca escrevia nesse objecto. Resultado: todas as chamadas
 * autenticadas enviavam pedidos sem Authorization header e falhavam com 401.
 *
 * Solução: importar useAuthStore e chamar .getState() fora de componentes React.
 *
 * Uso:
 *   import { api } from '@/lib/api'
 *   const data = await api.get('/lazer/feed')
 *   const data = await api.post('/lazer/posts', { content: '...' })
 */

import { useAuthStore } from '@/store/auth.store';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  // getState() funciona fora de componentes React — sem hooks
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

  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Erro ${res.status}`);
  }

  return data.data ?? data;
}

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Erro ${res.status}`);
  }
  return data.data ?? data;
}

async function patchForm<T>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Erro ${res.status}`);
  }
  return data.data ?? data;
}

export const api = {
  get:    <T = unknown>(path: string)                  => request<T>('GET',    path),
  post:   <T = unknown>(path: string, body?: unknown)  => request<T>('POST',   path, body),
  postForm: <T = unknown>(path: string, form: FormData) => postForm<T>(path, form),
  patch:  <T = unknown>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  patchForm: <T = unknown>(path: string, form: FormData) => patchForm<T>(path, form),
  put:    <T = unknown>(path: string, body?: unknown)  => request<T>('PUT',    path, body),
  delete: <T = unknown>(path: string)                  => request<T>('DELETE', path),
};
