'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Bot { id: string; name: string; description?: string | null; prefix: string; commands: { id: string }[]; _count: { servers: number }; }

export default function BotsPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [prefix, setPrefix] = useState('!');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.get<Bot[]>('/bots').then(setBots).catch(console.error).finally(() => setLoading(false)); }, []);

  async function create() {
    if (!name.trim()) return;
    setCreating(true); setErr('');
    try {
      const b = await api.post<Bot>('/bots', { name: name.trim(), description: desc.trim() || undefined, prefix: prefix.trim() || '!' });
      setBots(p => [b, ...p]); setShowCreate(false); setName(''); setDesc(''); setPrefix('!');
      router.push(`/main/bots/${b.id}`);
    } catch (e: any) { setErr(e.message ?? 'Erro ao criar bot.'); }
    finally { setCreating(false); }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
    h1: { fontFamily: 'Cinzel, serif', fontSize: 22, color: '#E8E0F0', margin: 0 },
    sub: { color: '#504870', fontSize: 13, margin: '4px 0 0' },
    btnPri: { background: '#C9A84C', color: '#07080D', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    btnGhost: { background: 'transparent', color: '#504870', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
    card: { background: '#141620', border: '1px solid rgba(180,160,255,0.12)', borderRadius: 12, padding: 16, cursor: 'pointer' },
    inp: { width: '100%', background: '#07080D', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 8, padding: '10px 12px', color: '#E8E0F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    lbl: { display: 'block' as const, fontSize: 11, color: '#504870', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
    err: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 12, marginBottom: 12 },
    overlay: { position: 'fixed' as const, inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    obg: { position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' },
    modal: { position: 'relative' as const, zIndex: 10, background: '#0F1019', border: '1px solid rgba(180,160,255,0.15)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 },
  };

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><h1 style={S.h1}>🤖 Bots</h1><p style={S.sub}>Os teus bots personalizados</p></div>
        <button onClick={() => { setShowCreate(true); setErr(''); }} style={S.btnPri}>+ Criar bot</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /></div>
      ) : bots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🤖</p>
          <p style={{ color: '#9890B8', fontSize: 15, marginBottom: 20 }}>Ainda não tens bots.</p>
          <button onClick={() => setShowCreate(true)} style={S.btnPri}>+ Criar primeiro bot</button>
        </div>
      ) : (
        <div style={S.grid}>
          {bots.map(b => (
            <div key={b.id} onClick={() => router.push(`/main/bots/${b.id}`)} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🤖</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#E8E0F0', fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                  {b.description && <p style={{ color: '#504870', fontSize: 12, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#504870' }}>
                <code style={{ background: '#07080D', border: '1px solid rgba(180,160,255,0.1)', borderRadius: 4, padding: '2px 8px', color: '#C9A84C' }}>{b.prefix}cmd</code>
                <span>{b.commands.length} cmd</span>
                <span style={{ marginLeft: 'auto' }}>{b._count.servers} serv.</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={S.overlay}>
          <div onClick={() => setShowCreate(false)} style={S.obg} />
          <div style={S.modal}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#E8E0F0', margin: '0 0 16px' }}>Criar bot</h2>
            {err && <p style={S.err}>{err}</p>}
            <label style={S.lbl}>Nome *</label>
            <input style={S.inp} placeholder="Sombra Bot" value={name} onChange={e => setName(e.target.value)} maxLength={32} />
            <label style={{ ...S.lbl, marginTop: 12 }}>Descrição</label>
            <input style={S.inp} placeholder="O que faz este bot?" value={desc} onChange={e => setDesc(e.target.value)} maxLength={200} />
            <label style={{ ...S.lbl, marginTop: 12 }}>Prefixo dos comandos</label>
            <input style={{ ...S.inp, width: 80 }} placeholder="!" value={prefix} onChange={e => setPrefix(e.target.value.slice(0, 5))} />
            <p style={{ color: '#383356', fontSize: 11, marginTop: 4 }}>Ex: com "!" o bot responde a "!ajuda"</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={S.btnGhost}>Cancelar</button>
              <button onClick={create} disabled={creating || !name.trim()} style={{ ...S.btnPri, opacity: (!name.trim() || creating) ? 0.5 : 1 }}>{creating ? 'A criar…' : 'Criar bot'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
