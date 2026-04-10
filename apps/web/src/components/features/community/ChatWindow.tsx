'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Avatar, Badge } from '@/components/ui';
import { formatTime } from '@/lib/format';
import { api } from '@/lib/api';
import { useCommunitySocket } from '@/lib/useSocket';
import { useAuthStore } from '@/store/auth.store';

interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  authorType: 'user' | 'bot';
  content: string;
  createdAt: string;
}

interface Props {
  channelId: string;
  channelName: string;
  serverId: string;
}

export function ChatWindow({ channelId, channelName }: Props) {
  const { socket, connected } = useCommunitySocket();
  const user = useAuthStore(s => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedChannel = useRef<string | null>(null);

  // Carregar histórico ao mudar de canal
  useEffect(() => {
    setLoading(true);
    setMessages([]);

    api.get<Message[]>(`/community/channels/${channelId}/messages`)
      .then(data => setMessages(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [channelId]);

  // Entrar na room do canal via WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    // Sair do canal anterior
    if (joinedChannel.current && joinedChannel.current !== channelId) {
      socket.emit('channel.leave', { channelId: joinedChannel.current });
    }

    if (joinedChannel.current !== channelId) {
      socket.emit('channel.join', { channelId });
      joinedChannel.current = channelId;
    }
  }, [socket, connected, channelId]);

  // Receber mensagens em tempo real
  useEffect(() => {
    if (!socket) return;

    const handler = (msg: Message) => {
      if (msg.channelId !== channelId) return;
      setMessages(prev => {
        // Evitar duplicados (o próprio utilizador pode receber o eco)
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('message.receive', handler);
    return () => { socket.off('message.receive', handler); };
  }, [socket, channelId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (!text.trim() || !socket || !connected) return;
    socket.emit('message.send', { channelId, content: text.trim() });
    setText('');
  }, [text, socket, connected, channelId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-alpha-border bg-alpha-surface flex items-center gap-2 flex-shrink-0">
        <span className="text-text-muted text-lg">#</span>
        <span className="font-medium text-text-primary">{channelName}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-text-muted">{connected ? 'ligado' : 'a reconectar…'}</span>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">👋</p>
            <p className="text-text-muted text-sm">
              Bem-vindo a <span className="text-gold font-medium">#{channelName}</span>!
            </p>
            <p className="text-text-muted text-xs mt-1">Sê o primeiro a escrever algo.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          // Agrupar mensagens consecutivas do mesmo autor
          const prev = messages[i - 1];
          const isGrouped = prev && prev.authorId === msg.authorId && prev.authorType === msg.authorType;
          const isOwn = msg.authorId === user?.id && msg.authorType === 'user';

          return (
            <MessageRow
              key={msg.id}
              msg={msg}
              isOwn={isOwn}
              grouped={isGrouped}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-alpha-border flex-shrink-0">
        <div className={`flex gap-2 bg-alpha-card border rounded-xl px-4 py-2.5 transition-colors ${connected ? 'border-alpha-border focus-within:border-gold/40' : 'border-red-500/20 opacity-70'
          }`}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={connected ? `Mensagem em #${channelName}` : 'A reconectar…'}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            disabled={!connected}
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !text.trim()}
            className="text-text-muted hover:text-gold transition-colors disabled:opacity-30 text-lg leading-none flex-shrink-0"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Linha de mensagem ─────────────────────────────────────────────
function MessageRow({
  msg,
  isOwn,
  grouped,
}: {
  msg: Message;
  isOwn: boolean;
  grouped: boolean;
}) {
  const isBot = msg.authorType === 'bot';
  const name = msg.authorName ?? (isBot ? 'Bot' : `user_${msg.authorId.slice(0, 6)}`);
  const avatarUrl = msg.authorAvatarUrl ?? null;

  if (grouped) {
    // Mensagem agrupada — só mostra o conteúdo, sem avatar nem nome
    return (
      <div className="flex items-start gap-3 group pl-11 hover:bg-white/[0.02] rounded-lg px-2 py-0.5 -mx-2 transition-colors">
        <p className="text-sm text-text-secondary leading-relaxed break-words flex-1">
          {msg.content}
        </p>
        <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
          {formatTime(msg.createdAt)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group hover:bg-white/[0.02] rounded-lg px-2 py-1.5 -mx-2 transition-colors mt-3 first:mt-0">
      {/* Avatar */}
      {isBot ? (
        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] text-blue-400 font-bold flex-shrink-0 mt-0.5">
          BOT
        </div>
      ) : (
        <Avatar src={avatarUrl} name={name} size="sm" />
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-semibold leading-none ${isBot ? 'text-blue-400' : isOwn ? 'text-gold' : 'text-text-primary'
            }`}>
            {isOwn ? `${name} (tu)` : name}
          </span>
          {isBot && <Badge variant="blue">Bot</Badge>}
          <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(msg.createdAt)}
          </span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed break-words">
          {msg.content}
        </p>
      </div>
    </div>
  );
}
