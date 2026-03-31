'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useCommunitySocket() {
  const token = useAuthStore(s => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const s = io(`${URL}/community`, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', err => console.error('[WS]', err.message));
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); setConnected(false); };
  }, [token]);

  return { socket, connected };
}
