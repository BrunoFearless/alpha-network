'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Cmd { id: string; trigger: string; response: string; }
interface SrvEntry { server: { id: string; name: string; }; }
interface Bot { id: string; name: string; description?: string | null; prefix: string; token: string; commands: Cmd[]; servers: SrvEntry[]; }
interface MyServer { id: string; name: string; role: string; }

export default function BotPage() {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const [bot, setBot] = useState<Bot | null>(null);
  const [myServers, setMyServers] = useState<MyServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');
  const [addingCmd, setAddingCmd] = useState(false);
  const [cmdErr, setCmdErr] = useState('');
  const [selServer, setSelServer] = useState('');
  const [addingSrv, setAddingSrv] = useState(false);
  const [srvErr, setSrvErr] = useState('');

  useEffect(() => {
    Promise.all([api.get<Bot>(`/bots/${botId}`), api.get<MyServer[]>('/community/servers')])
      .then(([b, srvs]) => {
        setBot(b);
        const inBot = new Set(b.servers.map(s => s.server.id));
        setMyServers(srvs.filter(s => s.role === 'admin' && !inBot.has(s.id)));
      })
      .catch(() => router.push('/main/bots'))
      .finally(() => setLoading(false));
  }, [botId]);

  async function addCmd() {
    if (!trigger.trim() || !response.trim() || !bot) return;
    setAddingCmd(true); setCmdErr('');
    try {
      const cmd = await api.post<Cmd>(`/bots/${bot.id}/commands`, { trigger: trigger.toLowerCase().trim(), response: response.trim() });
      setBot(p => p ? { ...p, commands: [...p.commands, cmd] } : p);
      setTrigger(''); setResponse('');
    } catch (e: any) { setCmdErr(e.message ?? 'Erro.'); }
    finally { setAddingCmd(false); }
  }

  async function removeCmd(id: string) {
    try { await api.delete(`/bots/commands/${id}`); setBot(p => p ? { ...p, commands: p.commands.filter(c => c.id !== id) } : p); }
    catch (e: any) { alert(e.message ?? 'Erro.'); }
  }

  async function addToServer() {
    if (!selServer || !bot) return;
    setAddingSrv(true); setSrvErr('');
    try {
      await api.post(`/community/servers/${selServer}/bots/${bot.id}`);
      const n = myServers.find(s => s.id === selServer)?.name ?? '';
      setBot(p => p ? { ...p, servers: [...p.servers, { server: { id: selServer, name: n } }] } : p);
      setMyServers(p => p.filter(s => s.id !== selServer)); setSelServer('');
    } catch (e: any) { setSrvErr(e.message ?? 'Erro.'); }
    finally { setAddingSrv(false); }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 700, margin: '0 auto', padding: '24px 16px' },
    section: { background: '#141620', border: '1px solid rgba(180,160,255,0.1)', borderRadius: 12, padding: 20, marginBottom: 16 },
    secTitle: { fontFamily: 'Cinzel, serif', fontSize: 14, color: '#E8E0F0', margin: '0 0 14px' },
    inp: { background: '#07080D', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 8, padding: '8px 12px', color: '#E8E0F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    btnPri: { background: '#C9A84C', color: '#07080D', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    btnSec: { background: 'transparent', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
    err: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 12 },
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div style={{ width: 28, height: 28, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>;
  if (!bot) return null;

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => router.push('/main/bots')} style={{ background: 'none', border: 'none', color: '#504870', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Bots</button>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#E8E0F0', margin: 0 }}>{bot.name}</h1>
          {bot.description && <p style={{ color: '#504870', fontSize: 13, margin: '2px 0 0' }}>{bot.description}</p>}
        </div>
        <code style={{ background: '#07080D', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '6px 12px', color: '#C9A84C', fontSize: 13 }}>{bot.prefix}cmd</code>
      </div>

      {/* Token */}
      <div style={S.section}>
        <p style={S.secTitle}>Token do bot</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, background: '#07080D', border: '1px solid rgba(180,160,255,0.1)', borderRadius: 6, padding: '8px 12px', color: '#9890B8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bot.token}</code>
          <button onClick={() => navigator.clipboard.writeText(bot.token)} style={{ background: 'transparent', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 6, padding: '6px 10px', color: '#504870', fontSize: 12, cursor: 'pointer' }}>📋</button>
        </div>
        <p style={{ color: '#383356', fontSize: 11, marginTop: 6 }}>⚠️ Não partilhes este token.</p>
      </div>

      {/* Comandos */}
      <div style={S.section}>
        <p style={S.secTitle}>Comandos ({bot.commands.length})</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#07080D', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 8, padding: '8px 12px', minWidth: 140 }}>
            <span style={{ color: '#C9A84C', fontSize: 13, fontFamily: 'monospace' }}>{bot.prefix}</span>
            <input style={{ ...S.inp, border: 'none', padding: 0, width: 90, fontFamily: 'monospace' }} placeholder="trigger" value={trigger} onChange={e => setTrigger(e.target.value.toLowerCase().replace(/\s+/g, ''))} maxLength={32} />
          </div>
          <input style={{ ...S.inp, flex: 1, minWidth: 180 }} placeholder="Resposta do bot…" value={response} onChange={e => setResponse(e.target.value)} maxLength={500} onKeyDown={e => e.key === 'Enter' && addCmd()} />
          <button onClick={addCmd} disabled={addingCmd || !trigger.trim() || !response.trim()} style={{ ...S.btnPri, opacity: (!trigger.trim() || !response.trim()) ? 0.5 : 1 }}>{addingCmd ? '…' : 'Adicionar'}</button>
        </div>
        {cmdErr && <p style={{ ...S.err, marginBottom: 12 }}>{cmdErr}</p>}
        {bot.commands.length === 0 ? (
          <p style={{ color: '#383356', fontSize: 13, fontStyle: 'italic' }}>Nenhum comando ainda.</p>
        ) : bot.commands.map(cmd => (
          <div key={cmd.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#07080D', border: '1px solid rgba(180,160,255,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
            <code style={{ color: '#C9A84C', fontFamily: 'monospace', fontSize: 13, flexShrink: 0 }}>{bot.prefix}{cmd.trigger}</code>
            <span style={{ color: '#504870', fontSize: 12 }}>→</span>
            <p style={{ color: '#9890B8', fontSize: 13, flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.response}</p>
            <button onClick={() => removeCmd(cmd.id)} style={{ background: 'none', border: 'none', color: '#383356', fontSize: 14, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>

      {/* Servidores */}
      <div style={S.section}>
        <p style={S.secTitle}>Servidores ({bot.servers.length})</p>
        {bot.servers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {bot.servers.map(s => (
              <span key={s.server.id} style={{ background: '#07080D', border: '1px solid rgba(180,160,255,0.1)', borderRadius: 8, padding: '4px 12px', color: '#9890B8', fontSize: 12 }}>🏘️ {s.server.name}</span>
            ))}
          </div>
        )}
        {myServers.length > 0 && (
          <>
            <p style={{ color: '#504870', fontSize: 12, marginBottom: 8 }}>Adicionar a servidor (onde és admin):</p>
            {srvErr && <p style={{ ...S.err, marginBottom: 8 }}>{srvErr}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={selServer} onChange={e => setSelServer(e.target.value)} style={{ flex: 1, background: '#07080D', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 8, padding: '8px 12px', color: '#E8E0F0', fontSize: 13, outline: 'none' }}>
                <option value="">Escolhe um servidor…</option>
                {myServers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={addToServer} disabled={!selServer || addingSrv} style={{ ...S.btnSec, opacity: !selServer ? 0.5 : 1 }}>{addingSrv ? '…' : 'Adicionar'}</button>
            </div>
          </>
        )}
        {myServers.length === 0 && bot.servers.length === 0 && (
          <p style={{ color: '#383356', fontSize: 13, fontStyle: 'italic' }}>Não tens servidores onde sejas admin.</p>
        )}
      </div>
    </div>
  );
}
