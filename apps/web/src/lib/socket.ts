'use client';

/**
 * useCommunitySocket — fonte única de verdade para o WebSocket de comunidade.
 *
 * CORRIGIDO: existiam dois ficheiros com implementações idênticas:
 *   - apps/web/src/lib/socket.ts
 *   - apps/web/src/lib/useSocket.ts
 *
 * Este ficheiro é a versão canónica. O ficheiro useSocket.ts deve ser apagado.
 * Qualquer import de @/lib/useSocket deve ser substituído por @/lib/socket.
 *
 * Exemplo de migração em ChatWindow.tsx:
 *   ANTES: import { useCommunitySocket } from '@/lib/useSocket';
 *   DEPOIS: import { useCommunitySocket } from '@/lib/socket';
 */

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useCommunitySocket() {
  const token = useAuthStore(s => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const sock = io(`${WS_URL}/community`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    sock.on('connect', () => {
      setConnected(true);
      setSocket(sock);
    });

    sock.on('disconnect', () => {
      setConnected(false);
    });

    sock.on('connect_error', (err) => {
      console.error('[Community WS] Erro de ligação:', err.message);
      setConnected(false);
    });

    // Disponibiliza o socket imediatamente para emissão pós-connect
    setSocket(sock);

    return () => {
      sock.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  return { socket, connected };
}