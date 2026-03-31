'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useCommunitySocket() {
  const accessToken = useAuthStore(s => s.accessToken);
  const [socket,    setSocket]    = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const sock = io(`${WS_URL}/community`, {
      auth:                 { token: accessToken },
      transports:           ['websocket'],
      reconnectionDelay:    1000,
      reconnectionAttempts: 5,
    });

    sock.on('connect',    () => { setConnected(true);  setSocket(sock); });
    sock.on('disconnect', () => { setConnected(false); });
    sock.on('connect_error', (err) => {
      console.error('[Community WS] Erro de ligação:', err.message);
      setConnected(false);
    });

    // Disponibilizar o socket mesmo antes do connect (para emitir após connect)
    setSocket(sock);

    return () => {
      sock.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [accessToken]);

  return { socket, connected };
}
