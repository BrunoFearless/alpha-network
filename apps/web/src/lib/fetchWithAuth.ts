/**
 * fetchWithAuth — wrapper global de fetch com auto-refresh de token.
 *
 * Se uma chamada retornar 401, tenta um refresh silencioso e repete
 * o pedido original uma única vez. Se o refresh falhar, faz logout
 * e redireciona para /auth/login.
 *
 * Uso idêntico ao fetch nativo:
 *   const res = await fetchWithAuth('/api/v1/users/me');
 */

import { useAuthStore } from '@/store/auth.store';

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

/** Processa a fila de pedidos que ficaram à espera do refresh. */
function processQueue(error: any, token: string | null = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const { accessToken } = useAuthStore.getState();

  // Injeta o token mais recente antes de cada pedido
  const headers = new Headers(init.headers);
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(input, { ...init, headers, credentials: 'include' });

  // Não é um 401 — devolve normalmente
  if (response.status !== 401) return response;

  // ── 401: tentar refresh ───────────────────────────────────────────
  if (isRefreshing) {
    // Outro pedido já está a fazer refresh — aguarda na fila
    return new Promise((resolve, reject) => {
      pendingQueue.push({
        resolve: async (newToken) => {
          const retryHeaders = new Headers(init.headers);
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          resolve(await fetch(input, { ...init, headers: retryHeaders, credentials: 'include' }));
        },
        reject,
      });
    });
  }

  isRefreshing = true;

  try {
    const refreshed = await useAuthStore.getState().refresh();

    if (!refreshed) {
      // Refresh falhou → logout forçado
      processQueue(new Error('Session expired'), null);
      await useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      return response; // retorna o 401 original
    }

    const newToken = useAuthStore.getState().accessToken!;
    processQueue(null, newToken);

    // Repete o pedido original com o novo token
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
    return await fetch(input, { ...init, headers: retryHeaders, credentials: 'include' });
  } catch (err) {
    processQueue(err, null);
    throw err;
  } finally {
    isRefreshing = false;
  }
}
