'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Server { id: string; name: string; description?: string | null; imageUrl?: string | null; inviteCode: string; membersCount: number; role: string; channels: { id: string; name: string }[]; }

export default function CommunityPage() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [createStep, setCreateStep] = useState<0 | 1 | 2 | 3>(0);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string>('');

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
      
      if (newImage) {
        try {
          const form = new FormData();
          form.append('file', newImage);
          await api.postForm(`/community/servers/${s.id}/upload`, form);
        } catch (imgErr) {
          console.error("Erro ao upload imagem", imgErr);
        }
      }

      setServers(p => [s, ...p]); setNewCode(s.inviteCode);
      setCreateStep(3);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setNewImagePreview(URL.createObjectURL(file));
    }
  };

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
    inp: { width: '100%', background: '#1E1F22', border: '1px solid transparent', borderRadius: 4, padding: '10px 12px', color: '#DBDEE1', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.2s ease' },
    lbl: { display: 'block' as const, fontSize: 12, color: '#B5BAC1', fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 8 },
    err: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', color: '#f87171', fontSize: 12, marginBottom: 12 },
    overlay: { position: 'fixed' as const, inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    bg: { position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' },
    modal: { position: 'relative' as const, zIndex: 10, background: '#313338', borderRadius: 8, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
    modalHeader: { padding: '24px 24px 0', textAlign: 'center' as const, position: 'relative' as const },
    modalTitle: { fontSize: 24, fontWeight: 800, color: '#F2F3F5', margin: '0 0 8px' },
    modalSub: { color: '#B5BAC1', fontSize: 15, lineHeight: 1.4, margin: '0 0 24px' },
    modalBody: { padding: '0 24px 24px', overflowY: 'auto' as const, maxHeight: '60vh' },
    modalFooter: { background: '#2B2D31', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    closeBtn: { position: 'absolute' as const, top: 16, right: 16, background: 'transparent', border: 'none', color: '#80848E', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 4 },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div><h1 style={S.h1}>🏘️ Comunidade</h1><p style={S.sub}>Os teus servidores</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowJoin(true); setJoinErr(''); setCode(''); }} style={S.btnSec}>Entrar com código</button>
          <button onClick={() => { setCreateStep(1); setCreateErr(''); setNewCode(''); setNewName(''); setNewDesc(''); setNewImage(null); setNewImagePreview(''); }} style={S.btnPri}>+ Criar servidor</button>
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
            <button onClick={() => setCreateStep(1)} style={S.btnPri}>+ Criar servidor</button>
          </div>
        </div>
      ) : (
        <div style={S.grid}>
          {servers.map(s => (
            <div key={s.id} onClick={() => router.push(`/main/community/${s.id}`)} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{...S.avatar, backgroundImage: s.imageUrl ? `url(${s.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', color: s.imageUrl ? 'transparent' : S.avatar.color}}>
                  {!s.imageUrl && s.name[0].toUpperCase()}
                </div>
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

      {createStep > 0 && (
        <div style={S.overlay}>
          <div onClick={() => setCreateStep(0)} style={S.bg} />
          <div style={S.modal}>
            <button onClick={() => setCreateStep(0)} style={S.closeBtn}>×</button>
            
            {createStep === 1 && (
              <>
                <div style={S.modalHeader}>
                  <h2 style={S.modalTitle}>Conte-nos mais sobre o seu servidor</h2>
                  <p style={S.modalSub}>Para podermos te ajudar com as configurações, seu novo servidor é para alguns amigos ou uma grande comunidade?</p>
                </div>
                <div style={S.modalBody}>
                  <button 
                    onClick={() => { setCreateStep(2); setNewDesc('Para um clube ou comunidade'); }}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '16px', background: '#2B2D31', border: '1px solid #1E1F22', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#3F4147'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2B2D31'}
                  >
                    <span style={{ fontSize: 24, marginRight: 12 }}>🌍</span>
                    <span style={{ color: '#DBDEE1', fontSize: 16, fontWeight: 600, flex: 1, textAlign: 'left' }}>Para um clube ou comunidade</span>
                    <span style={{ color: '#80848E', fontSize: 20 }}>›</span>
                  </button>
                  <button 
                    onClick={() => { setCreateStep(2); setNewDesc('Para meus amigos e eu'); }}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '16px', background: '#2B2D31', border: '1px solid #1E1F22', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#3F4147'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2B2D31'}
                  >
                    <span style={{ fontSize: 24, marginRight: 12 }}>👾</span>
                    <span style={{ color: '#DBDEE1', fontSize: 16, fontWeight: 600, flex: 1, textAlign: 'left' }}>Para meus amigos e eu</span>
                    <span style={{ color: '#80848E', fontSize: 20 }}>›</span>
                  </button>
                  
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <span style={{ color: '#B5BAC1', fontSize: 14 }}>Não sabe? Você pode </span>
                    <button onClick={() => setCreateStep(2)} style={{ background: 'none', border: 'none', color: '#A5E600', fontSize: 14, cursor: 'pointer', padding: 0 }}>pular essa pergunta</button>
                    <span style={{ color: '#B5BAC1', fontSize: 14 }}> por enquanto.</span>
                  </div>
                </div>
                <div style={S.modalFooter}>
                  <button onClick={() => setCreateStep(0)} style={{ background: 'none', border: 'none', color: '#F2F3F5', fontSize: 14, cursor: 'pointer', padding: '8px 16px' }}>Voltar</button>
                </div>
              </>
            )}

            {createStep === 2 && (
              <>
                <div style={S.modalHeader}>
                  <h2 style={S.modalTitle}>Personalize o seu servidor</h2>
                  <p style={S.modalSub}>Deixe seu novo servidor com a sua cara dando um nome e um ícone a ele. Se quiser, é possível mudar depois.</p>
                </div>
                <div style={S.modalBody}>
                  {createErr && <p style={S.err}>{createErr}</p>}
                  
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <div style={{ position: 'relative', width: 80, height: 80 }}>
                      <label style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        width: '100%', height: '100%', borderRadius: '50%',
                        border: newImagePreview ? 'none' : '2px dashed #4E5058',
                        background: newImagePreview ? 'transparent' : '#1E1F22',
                        cursor: 'pointer', overflow: 'hidden'
                      }}>
                        {newImagePreview ? (
                          <img src={newImagePreview} alt="Icon preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <>
                            <span style={{ fontSize: 20 }}>📷</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#DBDEE1', marginTop: 4 }}>UPLOAD</span>
                          </>
                        )}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                      </label>
                      <div style={{ 
                        position: 'absolute', top: 0, right: 0, width: 24, height: 24, 
                        background: '#A5E600', borderRadius: '50%', color: '#000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 'bold', pointerEvents: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.4)', border: '4px solid #313338'
                      }}>
                        +
                      </div>
                    </div>
                  </div>

                  <label style={{...S.lbl, color: '#F2F3F5'}}>Nome do servidor <span style={{color: '#ED4245'}}>*</span></label>
                  <input style={S.inp} placeholder="Servidor de Fearless" value={newName} onChange={e => setNewName(e.target.value)} maxLength={50} 
                    onFocus={e => e.currentTarget.style.border = '1px solid #A5E600'}
                    onBlur={e => e.currentTarget.style.border = '1px solid transparent'}
                  />
                  
                  <p style={{ color: '#B5BAC1', fontSize: 12, marginTop: 12, lineHeight: 1.4 }}>
                    Ao criar um servidor, você concorda com as <span style={{ color: '#A5E600', cursor: 'pointer', fontWeight: 600 }}>diretrizes da comunidade</span> do Discord.
                  </p>
                </div>
                <div style={S.modalFooter}>
                  <button onClick={() => setCreateStep(1)} style={{ background: 'none', border: 'none', color: '#F2F3F5', fontSize: 14, cursor: 'pointer', padding: '8px 16px' }}>Voltar</button>
                  <button onClick={handleCreate} style={{ background: '#A5E600', color: '#000', border: 'none', borderRadius: 4, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: (!newName.trim() || creating) ? 'not-allowed' : 'pointer', opacity: (!newName.trim() || creating) ? 0.5 : 1, transition: 'background 0.2s' }} disabled={creating || !newName.trim()}>
                    {creating ? 'A criar…' : 'Criar'}
                  </button>
                </div>
              </>
            )}

            {createStep === 3 && (
              <>
                <div style={S.modalHeader}>
                  <h2 style={S.modalTitle}>✅ Servidor criado!</h2>
                  <p style={S.modalSub}>Convida os teus amigos para o teu novo servidor.</p>
                </div>
                <div style={S.modalBody}>
                  <label style={S.lbl}>Código de convite:</label>
                  <div style={{ background: '#1E1F22', border: '1px solid #A5E600', borderRadius: 4, padding: '12px 16px', fontFamily: 'monospace', color: '#A5E600', fontSize: 14, marginBottom: 20, wordBreak: 'break-all', userSelect: 'all' as const }}>{newCode}</div>
                </div>
                <div style={S.modalFooter}>
                  <button onClick={() => navigator.clipboard.writeText(newCode)} style={{ background: 'none', border: 'none', color: '#F2F3F5', fontSize: 14, cursor: 'pointer', padding: '8px 16px' }}>📋 Copiar</button>
                  <button onClick={() => { setCreateStep(0); setNewCode(''); const s = servers[0]; if (s) router.push(`/main/community/${s.id}`); }} style={{ background: '#A5E600', color: '#000', border: 'none', borderRadius: 4, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Entrar no servidor
                  </button>
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
