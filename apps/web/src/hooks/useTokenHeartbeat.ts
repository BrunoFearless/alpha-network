'use client';
/**
 * useTokenHeartbeat — renova silenciosamente o accessToken antes de expirar.
 *
 * O token dura 15 minutos. Este hook faz refresh a cada 13 minutos,
 * garantindo que o utilizador nunca recebe um 401 por token expirado
 * durante uma sessão activa.
 *
 * Deve ser montado uma única vez no layout raiz autenticado (main/layout.tsx).
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

/** 50 minutos em ms — 10 min antes dos 60 min de expiração */
const REFRESH_INTERVAL_MS = 50 * 60 * 1000;

export function useTokenHeartbeat() {
  const { isAuthenticated, refresh, logout } = useAuthStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const doRefresh = async () => {
      const ok = await refresh();
      if (!ok) {
        // Refresh falhou (sessão de 30d expirou ou foi revogada) → logout limpo
        await logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    };

    // Primeiro refresh ligeiramente atrasado para não colidir com o boot
    const initialDelay = setTimeout(() => {
      doRefresh();
      timerRef.current = setInterval(doRefresh, REFRESH_INTERVAL_MS);
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(initialDelay);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, refresh, logout]);
}
