'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Server {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  membersCount: number;
  role: string;
  channels: { id: string; name: string }[];
}

// ── Discord Design Tokens ────────────────────────────────────────────
const D = {
  bg_primary:   '#000000ff',
  bg_secondary: '#000000ff',
  bg_tertiary:  '#1E1F22',
  bg_modifier:  '#232428',
  text_normal:  '#DBDEE1',
  text_muted:   '#949BA4',
  text_link:    '#00A8FC',
  brand:        '#A5E600',
  brand_hover:  '#4752C4',
  green:        '#23A559',
  red:          '#F23F43',
  gold:         '#C9A84C',
  border:       'rgba(255,255,255,0.06)',
  hover:        'rgba(255,255,255,0.06)',
};

function getInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function getServerColor(name: string) {
  const colors = ['#5865F2','#EB459E','#57F287','#FEE75C','#ED4245','#00B0F4','#FF7043','#AB47BC'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 31) % colors.length;
  return colors[h];
}

export default function CommunityPage() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCode, setNewCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [createdServer, setCreatedServer] = useState<Server | null>(null);
  // Wizard steps for create: 'type' | 'details'
  const [createStep, setCreateStep] = useState<'type' | 'details'>('type');
  const [serverType, setServerType] = useState<'community' | 'friends'>('community');

  useEffect(() => {
    api.get<Server[]>('/community/servers')
      .then(d => setServers(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true); setCreateErr('');
    try {
      const s = await api.post<Server>('/community/servers', {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setServers(p => [s, ...p]);
      setCreatedServer(s);
      setNewName(''); setNewDesc('');
    } catch (e: any) { setCreateErr(e.message ?? 'Erro ao criar.'); }
    finally { setCreating(false); }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoining(true); setJoinErr('');
    try {
      const s = await api.post<Server>(`/community/servers/join/${joinCode.trim()}`);
      setServers(p => p.some(x => x.id === s.id) ? p : [s, ...p]);
      setShowJoin(false); setJoinCode('');
      router.push(`/main/community/${s.id}`);
    } catch (e: any) { setJoinErr(e.message ?? 'Código inválido.'); }
    finally { setJoining(false); }
  }

  function openCreate() {
    setShowCreate(true); setCreateErr(''); setCreatedServer(null);
    setCreateStep('type'); setNewName(''); setNewDesc('');
  }

  function closeCreate() {
    setShowCreate(false); setCreatedServer(null);
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: D.bg_tertiary,
    border: `1px solid rgba(0,0,0,0.3)`,
    borderRadius: 3,
    padding: '10px 12px',
    color: D.text_normal,
    fontSize: 16,
    outline: 'none',
  };

  const lbl: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: D.text_muted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 8,
  };

  const btnPri: React.CSSProperties = {
    background: D.brand,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  };

  const btnGhost: React.CSSProperties = {
    background: 'transparent',
    color: D.text_normal,
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    padding: '10px 16px',
    borderRadius: 12,
    transition: 'background 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg_primary, color: D.text_normal, fontFamily: "'gg sans', 'Noto Sans', sans-serif" }}>
      {/* ── Header ── */}
      <div style={{
        background: D.bg_secondary,
        borderBottom: `1px solid ${D.border}`,
        padding: '0 20px',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: D.text_normal }}>Comunidade</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowJoin(true)} style={{
            ...btnGhost,
            fontSize: 13,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '6px 14px',
          }}>
            Entrar com convite
          </button>
          <button onClick={openCreate} style={{
            ...btnPri,
            padding: '6px 14px',
            fontSize: 13,
            borderRadius: 8,
          }}>
            + Criar servidor
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Hero quando vazio ── */}
        {!loading && servers.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'rgba(88,101,242,0.2)',
              border: `3px dashed ${D.brand}`,
              margin: '0 auto 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
            }}>🏘️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: D.text_normal }}>
              Ainda não estás em nenhum servidor
            </h2>
            <p style={{ color: D.text_muted, fontSize: 16, marginBottom: 32 }}>
              Os servidores são onde a tua comunidade cresce. Cria o teu ou entra num existente.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowJoin(true)} style={{
                ...btnGhost,
                background: 'rgba(255,255,255,0.06)',
                padding: '12px 24px',
              }}>
                Entrar com convite
              </button>
              <button onClick={openCreate} style={{ ...btnPri, padding: '12px 24px' }}>
                Criar um servidor
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{
              width: 36, height: 36,
              border: `3px solid rgba(88,101,242,0.3)`,
              borderTopColor: D.brand,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        {/* ── Server Grid ── */}
        {!loading && servers.length > 0 && (
          <>
            <h2 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: D.text_muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Os teus servidores — {servers.length}
            </h2>
            <p style={{ color: D.text_muted, fontSize: 13, marginBottom: 20, margin: '0 0 20px' }}>
              Clica num servidor para abrires os canais.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 12,
            }}>
              {servers.map(s => {
                const color = getServerColor(s.name);
                return (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/main/community/${s.id}`)}
                    style={{
                      background: D.bg_secondary,
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: `1px solid ${D.border}`,
                      transition: 'background 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = D.bg_modifier;
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = D.bg_secondary;
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Banner */}
                    <div style={{
                      height: 72,
                      background: `linear-gradient(135deg, ${color}66, ${color}22)`,
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: -20,
                        left: 16,
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: color,
                        border: `3px solid ${D.bg_secondary}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#fff',
                      }}>
                        {getInitials(s.name)}
                      </div>
                      {s.role === 'admin' && (
                        <div style={{
                          position: 'absolute',
                          top: 8, right: 8,
                          background: 'rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: D.gold,
                        }}>
                          Admin
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ padding: '28px 16px 16px' }}>
                      <h3 style={{
                        margin: '0 0 4px',
                        fontSize: 16,
                        fontWeight: 700,
                        color: D.text_normal,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{s.name}</h3>
                      {s.description && (
                        <p style={{
                          margin: '0 0 12px',
                          fontSize: 13,
                          color: D.text_muted,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>{s.description}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: D.text_muted }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: D.green, display: 'inline-block' }} />
                          Online
                        </span>
                        <span>👥 {s.membersCount} membros</span>
                        {s.channels.length > 0 && (
                          <span style={{ marginLeft: 'auto', color: D.text_muted, fontSize: 12 }}>
                            # {s.channels[0]?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add server card */}
              <div
                onClick={openCreate}
                style={{
                  background: D.bg_secondary,
                  borderRadius: 8,
                  border: `2px dashed rgba(255,255,255,0.1)`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 160,
                  color: D.text_muted,
                  fontSize: 14,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = D.brand;
                  (e.currentTarget as HTMLElement).style.color = D.brand;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = D.text_muted;
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>+</div>
                <span style={{ fontWeight: 600 }}>Adicionar servidor</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal: Criar servidor (wizard) ── */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#313338',
            borderRadius: 8,
            width: '100%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {/* Close */}
            <button
              onClick={closeCreate}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'none', border: 'none',
                color: D.text_muted, fontSize: 22, cursor: 'pointer',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
              }}
            >✕</button>

            {/* ── Sucesso ── */}
            {createdServer && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: getServerColor(createdServer.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 700, color: '#fff',
                  margin: '0 auto 16px',
                }}>
                  {getInitials(createdServer.name)}
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>
                  {createdServer.name}
                </h2>
                <p style={{ color: D.text_muted, fontSize: 14, marginBottom: 24 }}>
                  Servidor criado! Código de convite:
                </p>
                <div style={{
                  background: D.bg_tertiary,
                  border: `1px solid rgba(88,101,242,0.4)`,
                  borderRadius: 6,
                  padding: '12px 16px',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: D.text_normal,
                  wordBreak: 'break-all',
                  marginBottom: 20,
                  userSelect: 'all',
                }}>
                  {createdServer.inviteCode}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(createdServer.inviteCode)}
                    style={{ ...btnGhost, flex: 1, background: 'rgba(255,255,255,0.06)', padding: '12px' }}
                  >
                    📋 Copiar código
                  </button>
                  <button
                    onClick={() => { closeCreate(); router.push(`/main/community/${createdServer.id}`); }}
                    style={{ ...btnPri, flex: 1 }}
                  >
                    Entrar no servidor
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 1: Tipo ── */}
            {!createdServer && createStep === 'type' && (
              <div style={{ padding: '24px 32px 32px' }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, textAlign: 'center', }}>
                  Cria o teu servidor
                </h2>
                <p style={{ color: D.text_muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                  O teu servidor é onde tu e os teus amigos se reúnem. Para começares, diz-nos mais sobre o teu servidor.
                </p>

                {['community', 'friends'].map(t => (
                  <div
                    key={t}
                    onClick={() => setServerType(t as any)}
                    style={{
                      border: `1px solid ${serverType === t ? D.brand : D.border}`,
                      borderRadius: 8,
                      padding: '16px',
                      marginBottom: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      background: serverType === t ? 'rgba(88,101,242,0.1)' : D.bg_modifier,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 8,
                      background: t === 'community' ? 'rgba(88,101,242,0.2)' : 'rgba(87,242,135,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, flexShrink: 0,
                    }}>
                      {t === 'community' ? '🌐' : '👥'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
                        {t === 'community' ? 'Para um clube ou comunidade' : 'Para meus amigos e eu'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: D.text_muted }}>
                        {t === 'community'
                          ? 'Cria um hub para a tua comunidade crescer.'
                          : 'Apenas para o teu grupo de amigos.'}
                      </p>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: `2px solid ${serverType === t ? D.brand : D.text_muted}`,
                      background: serverType === t ? D.brand : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {serverType === t && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setCreateStep('details')}
                  style={{ ...btnPri, width: '100%', marginTop: 16 }}
                >
                  Próximo
                </button>
              </div>
            )}

            {/* ── Step 2: Detalhes ── */}
            {!createdServer && createStep === 'details' && (
              <div>
                {/* Header com imagem */}
                <div style={{
                  background: `linear-gradient(180deg, rgba(88,101,242,0.3) 0%, #313338 100%)`,
                  padding: '32px 32px 0',
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 20,
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px dashed rgba(255,255,255,0.3)',
                    margin: '0 auto 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, cursor: 'pointer',
                    position: 'relative',
                  }}>
                    {newName ? (
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: 20 }}>
                        {getInitials(newName)}
                      </span>
                    ) : (
                      <span>📷</span>
                    )}
                    <div style={{
                      position: 'absolute', bottom: -4, right: -4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: D.brand,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: '#fff',
                    }}>+</div>
                  </div>
                  <p style={{ color: D.text_muted, fontSize: 12, marginBottom: 24 }}>
                    Personaliza o teu servidor com um ícone
                  </p>
                </div>

                <div style={{ padding: '16px 32px 32px' }}>
                  {createErr && (
                    <div style={{
                      background: 'rgba(242,63,67,0.1)',
                      border: '1px solid rgba(242,63,67,0.3)',
                      borderRadius: 4, padding: '8px 12px',
                      fontSize: 13, color: '#F23F43',
                      marginBottom: 16,
                    }}>{createErr}</div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Nome do servidor *</label>
                    <input
                      style={inp}
                      placeholder={serverType === 'community' ? 'A Minha Comunidade' : 'Servidor dos Amigos'}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      maxLength={50}
                      autoFocus
                    />
                    <p style={{ fontSize: 12, color: D.text_muted, marginTop: 6 }}>
                      Ao criar um servidor, aceitas as Diretrizes da Comunidade do Discord.
                    </p>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={lbl}>Descrição</label>
                    <input
                      style={inp}
                      placeholder="Sobre o quê?"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      maxLength={200}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setCreateStep('type')}
                      style={btnGhost}
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={creating || !newName.trim()}
                      style={{ ...btnPri, opacity: (!newName.trim() || creating) ? 0.5 : 1 }}
                    >
                      {creating ? 'A criar…' : 'Criar servidor'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Entrar com código ── */}
      {showJoin && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#313338',
            borderRadius: 8,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <button
              onClick={() => setShowJoin(false)}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'none', border: 'none',
                color: D.text_muted, fontSize: 22, cursor: 'pointer',
              }}
            >✕</button>

            <div style={{ padding: '32px 32px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, textAlign: 'center' }}>
                Entra num servidor
              </h2>
              <p style={{ color: D.text_muted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                Introduz um convite abaixo para entrares num servidor existente.
              </p>

              {joinErr && (
                <div style={{
                  background: 'rgba(242,63,67,0.1)',
                  border: '1px solid rgba(242,63,67,0.3)',
                  borderRadius: 4, padding: '8px 12px',
                  fontSize: 13, color: '#F23F43',
                  marginBottom: 16,
                }}>{joinErr}</div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Código de convite</label>
                <input
                  style={inp}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.trim())}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  autoFocus
                />
                <p style={{ fontSize: 12, color: D.text_muted, marginTop: 6 }}>
                  Os convites têm o aspecto de um UUID. Pede ao admin do servidor o código.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowJoin(false)} style={btnGhost}>Voltar</button>
                <button
                  onClick={handleJoin}
                  disabled={joining || !joinCode.trim()}
                  style={{ ...btnPri, opacity: (!joinCode.trim() || joining) ? 0.5 : 1 }}
                >
                  {joining ? 'A entrar…' : 'Entrar no servidor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}