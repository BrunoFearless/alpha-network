'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCommunitySocket } from '@/lib/socket';

interface Channel { id: string; name: string; position: number; }
interface Member  { userId: string; role: string; profile: { displayName?: string | null; username: string; } | null; }
interface BotRow  { bot: { id: string; name: string; prefix: string; }; }
interface Server  { id: string; name: string; description?: string | null; inviteCode: string; ownerId: string; channels: Channel[]; members: Member[]; bots: BotRow[]; membersCount: number; }
interface Msg     { id: string; channelId: string; authorId: string; authorName: string; authorAvatarUrl?: string | null; authorType: 'user' | 'bot'; content: string; createdAt: string; }

export default function ServerPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const { socket, connected } = useCommunitySocket();

  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showCh, setShowCh] = useState(false);
  const [chName, setChName] = useState('');
  const [crCh, setCrCh] = useState(false);
  const [showInv, setShowInv] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef<string | null>(null);

  const isAdmin = server?.members.find(m => m.userId === user?.id)?.role === 'admin';

  useEffect(() => {
    if (!serverId) return;
    api.get<Server>(`/community/servers/${serverId}`)
      .then(d => { setServer(d); if (d.channels.length > 0) setChannel(d.channels[0]); })
      .catch(() => router.push('/main/community'))
      .finally(() => setLoading(false));
  }, [serverId]);

  useEffect(() => {
    if (!channel) return;
    setLoadingMsgs(true); setMsgs([]);
    api.get<Msg[]>(`/community/channels/${channel.id}/messages`).then(setMsgs).catch(console.error).finally(() => setLoadingMsgs(false));
  }, [channel?.id]);

  useEffect(() => {
    if (!socket || !connected || !channel) return;
    if (joinedRef.current && joinedRef.current !== channel.id) socket.emit('channel.leave', { channelId: joinedRef.current });
    if (joinedRef.current !== channel.id) { socket.emit('channel.join', { channelId: channel.id }); joinedRef.current = channel.id; }
  }, [socket, connected, channel?.id]);

  useEffect(() => {
    if (!socket) return;
    const h = (msg: Msg) => { if (msg.channelId !== channel?.id) return; setMsgs(p => p.some(m => m.id === msg.id) ? p : [...p, msg]); };
    socket.on('message.new', h);
    return () => { socket.off('message.new', h); };
  }, [socket, channel?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = useCallback(() => {
    if (!text.trim() || !socket || !connected || !channel) return;
    socket.emit('message.send', { channelId: channel.id, content: text.trim() });
    setText('');
  }, [text, socket, connected, channel]);

  async function createCh() {
    if (!chName.trim() || !server) return;
    setCrCh(true);
    try {
      const ch = await api.post<Channel>(`/community/servers/${server.id}/channels`, { name: chName.trim() });
      setServer(p => p ? { ...p, channels: [...p.channels, ch] } : p);
      setChannel(ch); setShowCh(false); setChName('');
    } catch (e: any) { alert(e.message ?? 'Erro.'); }
    finally { setCrCh(false); }
  }

  function mname(m: Member) {
    if (m.userId === user?.id) return user.profile?.displayName ?? user.profile?.username ?? 'Tu';
    return m.profile?.displayName ?? m.profile?.username ?? `user_${m.userId.slice(0,6)}`;
  }

  const C: Record<string, React.CSSProperties> = {
    wrap: { display: 'flex', height: 'calc(100vh - 56px)' },
    side: { width: 220, background: '#0F1019', borderRight: '1px solid rgba(180,160,255,0.1)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
    sideTop: { padding: '12px 12px 10px', borderBottom: '1px solid rgba(180,160,255,0.1)' },
    backBtn: { background: 'none', border: 'none', color: '#504870', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 6, display: 'block' },
    srvName: { fontFamily: 'Cinzel, serif', color: '#C9A84C', fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    chList: { flex: 1, overflowY: 'auto', padding: '8px 0' },
    chSec: { display: 'flex', alignItems: 'center', padding: '0 12px', marginBottom: 4 },
    chLabel: { color: '#504870', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 },
    addBtn: { background: 'none', border: 'none', color: '#504870', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0 },
    chat: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    chHeader: { padding: '10px 16px', borderBottom: '1px solid rgba(180,160,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, background: '#0F1019', flexShrink: 0 },
    msgs: { flex: 1, overflowY: 'auto', padding: 16 },
    inputWrap: { padding: '12px 16px', borderTop: '1px solid rgba(180,160,255,0.1)', flexShrink: 0 },
    inputRow: { display: 'flex', gap: 8, background: '#141620', border: '1px solid rgba(180,160,255,0.12)', borderRadius: 12, padding: '8px 12px' },
    members: { width: 180, background: '#0F1019', borderLeft: '1px solid rgba(180,160,255,0.1)', overflowY: 'auto', flexShrink: 0 },
    overlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    obg: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' },
    modal: { position: 'relative', zIndex: 10, background: '#0F1019', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 },
    btnPri: { background: '#C9A84C', color: '#07080D', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    btnSec: { background: 'transparent', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
    btnGhost: { background: 'transparent', color: '#504870', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>;
  if (!server) return null;

  return (
    <div style={C.wrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Canais */}
      <div style={C.side}>
        <div style={C.sideTop}>
          <button onClick={() => router.push('/main/community')} style={C.backBtn}>← Servidores</button>
          <p style={C.srvName}>{server.name}</p>
          <p style={{ color: '#504870', fontSize: 11, margin: '2px 0 0' }}>{server.membersCount} membros</p>
        </div>
        <div style={C.chList}>
          <div style={C.chSec}>
            <span style={C.chLabel}>Canais</span>
            {isAdmin && <button onClick={() => setShowCh(true)} style={C.addBtn} title="Criar canal">+</button>}
          </div>
          {server.channels.map(ch => (
            <button key={ch.id} onClick={() => setChannel(ch)} style={{ width: '100%', textAlign: 'left', background: channel?.id === ch.id ? 'rgba(201,168,76,0.1)' : 'none', border: 'none', color: channel?.id === ch.id ? '#C9A84C' : '#504870', padding: '6px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.5 }}>#</span>{ch.name}
            </button>
          ))}
        </div>
        {server.bots.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(180,160,255,0.1)', padding: '8px 12px' }}>
            <p style={{ color: '#504870', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Bots</p>
            {server.bots.map(b => (
              <div key={b.bot.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#60a5fa', fontWeight: 700, flexShrink: 0 }}>B</div>
                <span style={{ color: '#9890B8', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.bot.name}</span>
                <code style={{ color: '#504870', fontSize: 10 }}>{b.bot.prefix}</code>
              </div>
            ))}
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(180,160,255,0.1)', padding: 8 }}>
          <button onClick={() => setShowInv(true)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#504870', fontSize: 12, cursor: 'pointer', padding: '6px 8px', borderRadius: 6 }}>🔗 Código de convite</button>
          {isAdmin && <button onClick={() => router.push('/main/bots')} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#504870', fontSize: 12, cursor: 'pointer', padding: '6px 8px', borderRadius: 6 }}>🤖 Gerir bots</button>}
        </div>
      </div>

      {/* Chat */}
      <div style={C.chat}>
        {channel && (
          <div style={C.chHeader}>
            <span style={{ color: '#504870' }}>#</span>
            <span style={{ color: '#E8E0F0', fontWeight: 600, fontSize: 14 }}>{channel.name}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
              <span style={{ color: '#504870', fontSize: 11 }}>{connected ? 'ligado' : 'desligado'}</span>
            </div>
          </div>
        )}
        <div style={C.msgs}>
          {loadingMsgs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
          ) : msgs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>👋</p>
              <p style={{ color: '#504870', fontSize: 13 }}>Nenhuma mensagem ainda.</p>
            </div>
          ) : msgs.map((msg, i) => {
            const prev = msgs[i - 1];
            const grouped = prev && prev.authorId === msg.authorId && prev.authorType === msg.authorType;
            const isOwn = msg.authorId === user?.id && msg.authorType === 'user';
            const isBot = msg.authorType === 'bot';
            if (grouped) return (
              <div key={msg.id} style={{ paddingLeft: 44, marginBottom: 2 }}>
                <p style={{ color: '#9890B8', fontSize: 13, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.content}</p>
              </div>
            );
            return (
              <div key={msg.id} style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 2 }}>
                {isBot ? (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#60a5fa', fontWeight: 700, flexShrink: 0 }}>BOT</div>
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', color: '#C9A84C', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{msg.authorName[0]?.toUpperCase() ?? '?'}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: isBot ? '#60a5fa' : isOwn ? '#C9A84C' : '#E8E0F0' }}>{isOwn ? `${msg.authorName} (tu)` : msg.authorName}</span>
                    {isBot && <span style={{ fontSize: 10, background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, padding: '1px 5px' }}>Bot</span>}
                    <span style={{ color: '#383356', fontSize: 11 }}>{new Date(msg.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ color: '#9890B8', fontSize: 13, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div style={C.inputWrap}>
          <div style={C.inputRow}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={channel ? `Mensagem em #${channel.name}` : 'Selecciona um canal'} disabled={!connected || !channel} style={{ flex: 1, background: 'transparent', border: 'none', color: '#E8E0F0', fontSize: 13, outline: 'none' }} />
            <button onClick={send} disabled={!connected || !text.trim() || !channel} style={{ background: 'none', border: 'none', color: '#504870', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1, opacity: (!connected || !text.trim()) ? 0.3 : 1 }}>↑</button>
          </div>
        </div>
      </div>

      {/* Membros */}
      <div style={C.members}>
        <p style={{ color: '#504870', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 12px 8px' }}>Membros — {server.membersCount}</p>
        {(['admin', 'member'] as const).map(role => {
          const g = server.members.filter(m => m.role === role);
          if (!g.length) return null;
          return (
            <div key={role} style={{ marginBottom: 12 }}>
              <p style={{ color: '#383356', fontSize: 10, textTransform: 'uppercase', padding: '0 12px', marginBottom: 4 }}>{role === 'admin' ? 'Admins' : 'Membros'}</p>
              {g.map(m => (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#C9A84C', fontWeight: 700, flexShrink: 0 }}>{mname(m)[0]?.toUpperCase() ?? '?'}</div>
                  <span style={{ fontSize: 12, color: m.userId === user?.id ? '#C9A84C' : '#9890B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{mname(m)}</span>
                  {m.role === 'admin' && <span style={{ color: '#C9A84C', fontSize: 10 }}>✦</span>}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Modal criar canal */}
      {showCh && (
        <div style={C.overlay}>
          <div onClick={() => setShowCh(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#E8E0F0', margin: '0 0 16px' }}>Criar canal</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#07080D', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ color: '#504870' }}>#</span>
              <input style={{ flex: 1, background: 'transparent', border: 'none', color: '#E8E0F0', fontSize: 13, outline: 'none' }} placeholder="novo-canal" value={chName} onChange={e => setChName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} onKeyDown={e => e.key === 'Enter' && createCh()} autoFocus maxLength={32} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCh(false)} style={C.btnGhost}>Cancelar</button>
              <button onClick={createCh} disabled={crCh || !chName.trim()} style={{ ...C.btnPri, opacity: (!chName.trim() || crCh) ? 0.5 : 1 }}>{crCh ? 'A criar…' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal código convite */}
      {showInv && (
        <div style={C.overlay}>
          <div onClick={() => setShowInv(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#E8E0F0', margin: '0 0 12px' }}>Convidar pessoas</h2>
            <p style={{ color: '#9890B8', fontSize: 13, marginBottom: 16 }}>Código para entrar em <strong style={{ color: '#C9A84C' }}>{server.name}</strong>:</p>
            <div style={{ background: '#07080D', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', color: '#C9A84C', fontSize: 12, marginBottom: 16, userSelect: 'all', wordBreak: 'break-all' }}>{server.inviteCode}</div>
            <button onClick={() => { navigator.clipboard.writeText(server.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={C.btnSec}>{copied ? '✓ Copiado!' : '📋 Copiar código'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
