/**
 * Wrapper para chamadas à API com autenticação automática.
 * Uso: import { api } from '@/lib/api'
 *      const data = await api.get('/lazer/feed')
 *      const data = await api.post('/lazer/posts', { content: '...' })
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  // Obtém o token do Zustand store sem usar hooks
  // Para uso fora de componentes React
  try {
    const state = (window as any).__ZUSTAND_AUTH__;
    return state?.accessToken ?? null;
  } catch {
    return null;
  }
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
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Erro ${res.status}`);
  return data.data ?? data;
}

export const api = {
  get:    <T>(path: string)                => request<T>('GET', path),
  post:   <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string)                => request<T>('DELETE', path),
};
