'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Server { id: string; name: string; description?: string | null; inviteCode: string; membersCount: number; role: string; channels: { id: string; name: string }[]; }

export default function CommunityPage() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [newCode, setNewCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState('');

  useEffect(() => {
    api.get<Server[]>('/community/servers').then(d => setServers(d)).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true); setCreateErr('');
    try {
      const s = await api.post<Server>('/community/servers', { name: newName.trim(), description: newDesc.trim() || undefined });
      setServers(p => [s, ...p]); setNewCode(s.inviteCode); setNewName(''); setNewDesc('');
    } catch (e: any) { setCreateErr(e.message ?? 'Erro ao criar.'); }
    finally { setCreating(false); }
  }

  async function handleJoin() {
    if (!code.trim()) return;
    setJoining(true); setJoinErr('');
    try {
      const s = await api.post<Server>(`/community/servers/join/${code.trim()}`);
      setServers(p => p.some(x => x.id === s.id) ? p : [s, ...p]);
      setShowJoin(false); setCode('');
      router.push(`/main/community/${s.id}`);
    } catch (e: any) { setJoinErr(e.message ?? 'Código inválido.'); }
    finally { setJoining(false); }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    h1: { fontFamily: 'Cinzel, serif', fontSize: 22, color: '#E8E0F0', margin: 0 },
    sub: { color: '#504870', fontSize: 13, margin: '4px 0 0' },
    btnPri: { background: '#C9A84C', color: '#07080D', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    btnSec: { background: 'transparent', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
    btnGhost: { background: 'transparent', color: '#504870', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
    card: { background: '#141620', border: '1px solid rgba(180,160,255,0.12)', borderRadius: 12, padding: 16, cursor: 'pointer' },
    avatar: { width: 40, height: 40, borderRadius: 10, background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', color: '#C9A84C', fontSize: 18, flexShrink: 0 },
    inp: { width: '100%', background: '#07080D', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 8, padding: '10px 12px', color: '#E8E0F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    lbl: { display: 'block' as const, fontSize: 11, color: '#504870', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
    err: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 12, marginBottom: 12 },
    overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    bg: { position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' },
    modal: { position: 'relative' as const, zIndex: 10, background: '#0F1019', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 },
    modalTitle: { fontFamily: 'Cinzel, serif', fontSize: 18, color: '#E8E0F0', margin: '0 0 16px' },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div><h1 style={S.h1}>🏘️ Comunidade</h1><p style={S.sub}>Os teus servidores</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowJoin(true); setJoinErr(''); setCode(''); }} style={S.btnSec}>Entrar com código</button>
          <button onClick={() => { setShowCreate(true); setCreateErr(''); setNewCode(''); setNewName(''); setNewDesc(''); }} style={S.btnPri}>+ Criar servidor</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : servers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🏘️</p>
          <p style={{ color: '#9890B8', fontSize: 15, marginBottom: 20 }}>Ainda não estás em nenhum servidor.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => setShowJoin(true)} style={S.btnSec}>Entrar com código</button>
            <button onClick={() => setShowCreate(true)} style={S.btnPri}>+ Criar servidor</button>
          </div>
        </div>
      ) : (
        <div style={S.grid}>
          {servers.map(s => (
            <div key={s.id} onClick={() => router.push(`/main/community/${s.id}`)} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={S.avatar}>{s.name[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#E8E0F0', fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                  <p style={{ color: '#504870', fontSize: 12, margin: '2px 0 0' }}>{s.membersCount} membros</p>
                </div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: s.role === 'admin' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', color: s.role === 'admin' ? '#C9A84C' : '#504870' }}>{s.role}</span>
              </div>
              {s.description && <p style={{ color: '#9890B8', fontSize: 12, margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{s.description}</p>}
              <p style={{ color: '#383356', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>{s.inviteCode.slice(0, 18)}…</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={S.overlay}>
          <div onClick={() => setShowCreate(false)} style={S.bg} />
          <div style={S.modal}>
            <h2 style={S.modalTitle}>{newCode ? '✅ Servidor criado!' : 'Criar servidor'}</h2>
            {newCode ? (
              <>
                <p style={{ color: '#9890B8', fontSize: 13, marginBottom: 16 }}>Código de convite:</p>
                <div style={{ background: '#07080D', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', color: '#C9A84C', fontSize: 12, marginBottom: 20, wordBreak: 'break-all', userSelect: 'all' as const }}>{newCode}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigator.clipboard.writeText(newCode)} style={S.btnSec}>📋 Copiar</button>
                  <button onClick={() => { setShowCreate(false); setNewCode(''); const s = servers[0]; if (s) router.push(`/main/community/${s.id}`); }} style={S.btnPri}>Entrar no servidor</button>
                </div>
              </>
            ) : (
              <>
                {createErr && <p style={S.err}>{createErr}</p>}
                <label style={S.lbl}>Nome *</label>
                <input style={S.inp} placeholder="O meu servidor" value={newName} onChange={e => setNewName(e.target.value)} maxLength={50} />
                <label style={{ ...S.lbl, marginTop: 12 }}>Descrição</label>
                <input style={S.inp} placeholder="Sobre o quê?" value={newDesc} onChange={e => setNewDesc(e.target.value)} maxLength={200} />
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCreate(false)} style={S.btnGhost}>Cancelar</button>
                  <button onClick={handleCreate} style={{ ...S.btnPri, opacity: (!newName.trim() || creating) ? 0.5 : 1 }} disabled={creating || !newName.trim()}>{creating ? 'A criar…' : 'Criar'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showJoin && (
        <div style={S.overlay}>
          <div onClick={() => setShowJoin(false)} style={S.bg} />
          <div style={S.modal}>
            <h2 style={S.modalTitle}>Entrar num servidor</h2>
            {joinErr && <p style={S.err}>{joinErr}</p>}
            <label style={S.lbl}>Código de convite</label>
            <input style={{ ...S.inp, fontFamily: 'monospace' }} placeholder="uuid do código" value={code} onChange={e => setCode(e.target.value.trim())} onKeyDown={e => e.key === 'Enter' && handleJoin()} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowJoin(false)} style={S.btnGhost}>Cancelar</button>
              <button onClick={handleJoin} style={{ ...S.btnPri, opacity: (!code.trim() || joining) ? 0.5 : 1 }} disabled={joining || !code.trim()}>{joining ? 'A entrar…' : 'Entrar'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
