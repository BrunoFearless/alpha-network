'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Server {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  inviteCode: string;
  membersCount: number;
  role: string;
  channels: { id: string; name: string }[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function getInitials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function getServerColor(name: string) {
  const colors = ['#5865F2', '#EB459E', '#57F287', '#FEE75C', '#ED4245', '#00B0F4', '#FF7043', '#AB47BC', '#A5E600', '#7289DA'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 31) % colors.length;
  return colors[h];
}

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return !!url.match(/\.(mp4|webm|mov|ogg)(?:\?|#|$)/i) || url.startsWith('data:video/');
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const ACCENT = '#A5E600';
const ACCENT_DIM = 'rgba(165,230,0,0.12)';
const BG = '#000';
const BG_CARD = '#0e0e0e';
const BG_MODAL = '#111214';
const BG_FIELD = '#18191c';
const BG_HOVER = '#1a1a1a';
const TEXT_BRIGHT = '#f2f3f5';
const TEXT_NORMAL = '#b5bac1';
const TEXT_MUTED = '#6d6f78';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_ACCENT = 'rgba(165,230,0,0.3)';

const BANNER_PRESETS = [
  '#0d0e10', '#1a1a2e', '#16213e', '#1B1B2F', '#2d1b69',
  '#4a0e0e', '#7C2D12', '#14532d', '#0c4a6e', '#422006',
  '#1e1b4b', '#3d1a78',
];

// ─── SERVER CARD ─────────────────────────────────────────────────────────────
function ServerCard({ server, onClick }: { server: Server; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = server.bannerColor || getServerColor(server.name);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: BG_CARD,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${hovered ? BORDER_ACCENT : BORDER}`,
        transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px ${BORDER_ACCENT}` : '0 4px 16px rgba(0,0,0,0.3)',
        position: 'relative',
      }}
    >
      {/* Banner */}
      <div style={{
        height: 88,
        background: server.bannerUrl && !isVideoUrl(server.bannerUrl) ? `url(${server.bannerUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${color}cc 0%, ${color}44 50%, transparent 100%)`,
        backgroundColor: color,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {server.bannerUrl && isVideoUrl(server.bannerUrl) && <video src={server.bannerUrl} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        {/* Shimmer overlay on hover */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.4s',
        }} />

        {/* Role badge */}
        {server.role === 'admin' && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11, fontWeight: 700,
            color: '#F0B132',
            border: '1px solid rgba(240,177,50,0.3)',
            letterSpacing: '0.04em',
          }}>
            👑 Admin
          </div>
        )}
      </div>

      {/* Server icon */}
      <div style={{
        position: 'absolute',
        top: 66, left: 18,
        width: 48, height: 48,
        borderRadius: 12,
        overflow: 'hidden',
        border: `3px solid ${BG_CARD}`,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        zIndex: 10,
      }}>
        {server.imageUrl
          ? (isVideoUrl(server.imageUrl) ? <video src={server.imageUrl} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={server.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
          : <span>{getInitials(server.name)}</span>}
      </div>

      {/* Body */}
      <div style={{ padding: '30px 18px 18px' }}>
        <h3 style={{
          margin: '0 0 4px',
          fontSize: 16, fontWeight: 700,
          color: TEXT_BRIGHT,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}>
          {hovered ? <span style={{ color: ACCENT }}>{server.name}</span> : server.name}
        </h3>

        {server.description && (
          <p style={{
            margin: '0 0 14px', fontSize: 13, color: TEXT_MUTED,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5,
          }}>
            {server.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: server.description ? 0 : 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: TEXT_MUTED }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#23A559', boxShadow: '0 0 6px #23A559' }} />
            Online
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
            👥 <strong style={{ color: TEXT_NORMAL }}>{server.membersCount}</strong> membros
          </div>
          {server.channels.length > 0 && (
            <div style={{ marginLeft: 'auto', fontSize: 11, color: TEXT_MUTED, background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 8px' }}>
              # {server.channels[0]?.name}
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line on hover */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.3s',
      }} />
    </div>
  );
}

// ─── ADD SERVER CARD ─────────────────────────────────────────────────────────
function AddServerCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        border: `2px dashed ${hovered ? ACCENT : 'rgba(255,255,255,0.12)'}`,
        background: hovered ? ACCENT_DIM : 'transparent',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, minHeight: 180,
        color: hovered ? ACCENT : TEXT_MUTED,
        fontSize: 14, fontWeight: 600,
        transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: hovered ? ACCENT_DIM : 'rgba(255,255,255,0.06)',
        border: `2px solid ${hovered ? ACCENT : 'rgba(255,255,255,0.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, transition: 'all 0.25s',
        transform: hovered ? 'rotate(90deg) scale(1.1)' : 'rotate(0deg)',
      }}>
        +
      </div>
      <span>Adicionar servidor</span>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Join state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState('');

  // Create wizard state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [createdServer, setCreatedServer] = useState<Server | null>(null);
  const [createStep, setCreateStep] = useState<'type' | 'details' | 'success'>('type');
  const [serverType, setServerType] = useState<'community' | 'friends'>('community');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerColor, setBannerColor] = useState(BANNER_PRESETS[1]);
  const iconRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
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
      let finalImageUrl: string | undefined;
      let finalBannerUrl: string | undefined;
      let needsUpdate = false;
      if (iconFile) {
        const fd = new FormData(); fd.append('file', iconFile);
        const r = await api.postForm<{ url: string }>(`/community/servers/${s.id}/upload`, fd);
        finalImageUrl = r.url; needsUpdate = true;
      }
      if (bannerFile) {
        const fd = new FormData(); fd.append('file', bannerFile);
        const r = await api.postForm<{ url: string }>(`/community/servers/${s.id}/upload`, fd);
        finalBannerUrl = r.url; needsUpdate = true;
      }
      let finalServer = s;
      if (needsUpdate || bannerColor !== BANNER_PRESETS[1]) {
        const patch = await api.patch<Partial<Server>>(`/community/servers/${s.id}`, {
          imageUrl: finalImageUrl, bannerUrl: finalBannerUrl, bannerColor,
        });
        finalServer = { ...s, imageUrl: patch.imageUrl ?? finalImageUrl, bannerUrl: patch.bannerUrl ?? finalBannerUrl, bannerColor: patch.bannerColor ?? bannerColor };
      }
      setServers(p => [finalServer, ...p]);
      setCreatedServer(finalServer);
      setCreateStep('success');
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
    setIconFile(null); setIconPreview(null);
    setBannerFile(null); setBannerPreview(null);
    setBannerColor(BANNER_PRESETS[1]);
    setServerType('community');
  }

  function closeCreate() { setShowCreate(false); setCreatedServer(null); }

  // Shared input style
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: BG_FIELD,
    border: `1px solid rgba(255,255,255,0.1)`,
    borderRadius: 10, padding: '12px 16px',
    color: TEXT_BRIGHT, fontSize: 15,
    outline: 'none', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: TEXT_MUTED, textTransform: 'uppercase',
    letterSpacing: '0.07em', marginBottom: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT_NORMAL, fontFamily: "'gg sans', 'Inter', 'Noto Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes stepSlide { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(165,230,0,0.2); } 50% { box-shadow: 0 0 40px rgba(165,230,0,0.5); } }
        .server-card-appear { animation: fadeUp 0.4s cubic-bezier(.4,0,.2,1) both; }
        .modal-enter { animation: slideUp 0.25s cubic-bezier(.4,0,.2,1) both; }
        .step-enter { animation: stepSlide 0.2s cubic-bezier(.4,0,.2,1) both; }
        input:focus, textarea:focus { border-color: ${ACCENT} !important; box-shadow: 0 0 0 2px rgba(165,230,0,0.15) !important; outline: none !important; }
        button { font-family: inherit; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: `0 0 12px rgba(165,230,0,0.4)`,
          }}>🌐</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: TEXT_BRIGHT }}>Comunidade</span>
          {!loading && servers.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
              background: 'rgba(255,255,255,0.08)', borderRadius: 20,
              padding: '2px 10px',
            }}>{servers.length}</span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowJoin(true)} style={{
            background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 600,
            color: TEXT_NORMAL, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; }}
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as any).style.color = TEXT_NORMAL; }}
          >
            Entrar com convite
          </button>
          <button onClick={openCreate} style={{
            background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`,
            border: 'none', borderRadius: 10, padding: '7px 18px',
            fontSize: 13, fontWeight: 700, color: '#000', cursor: 'pointer',
            transition: 'all 0.2s', boxShadow: `0 4px 16px rgba(165,230,0,0.25)`,
          }}
            onMouseEnter={e => { (e.currentTarget as any).style.transform = 'translateY(-1px)'; (e.currentTarget as any).style.boxShadow = '0 8px 24px rgba(165,230,0,0.4)'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.transform = 'translateY(0)'; (e.currentTarget as any).style.boxShadow = '0 4px 16px rgba(165,230,0,0.25)'; }}
          >
            + Criar servidor
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, paddingTop: 120 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: `3px solid rgba(165,230,0,0.15)`,
              borderTopColor: ACCENT,
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: TEXT_MUTED, fontSize: 14 }}>A carregar servidores…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && servers.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80, animation: 'fadeUp 0.5s ease' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(165,230,0,0.15) 0%, transparent 70%)',
              border: `2px dashed rgba(165,230,0,0.3)`,
              margin: '0 auto 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 52, animation: 'float 3s ease-in-out infinite',
            }}>🌐</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800, color: TEXT_BRIGHT }}>
              Sem servidores ainda
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: 16, marginBottom: 36, maxWidth: 360, margin: '0 auto 36px', lineHeight: 1.6 }}>
              Cria o teu servidor e começa a tua comunidade, ou entra num com um código de convite.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowJoin(true)} style={{
                background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 600,
                color: TEXT_NORMAL, cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'}
              >
                🔗 Entrar com convite
              </button>
              <button onClick={openCreate} style={{
                background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`,
                border: 'none', borderRadius: 12, padding: '12px 28px',
                fontSize: 14, fontWeight: 700, color: '#000', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(165,230,0,0.3)', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as any).style.transform = 'translateY(-2px)'; (e.currentTarget as any).style.boxShadow = '0 8px 28px rgba(165,230,0,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.transform = 'translateY(0)'; (e.currentTarget as any).style.boxShadow = '0 4px 20px rgba(165,230,0,0.3)'; }}
              >
                🌟 Criar servidor
              </button>
            </div>
          </div>
        )}

        {/* Server grid */}
        {!loading && servers.length > 0 && (
          <>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Os teus servidores
              </p>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {servers.map((s, i) => (
                <div key={s.id} className="server-card-appear" style={{ animationDelay: `${i * 0.06}s` }}>
                  <ServerCard server={s} onClick={() => router.push(`/main/community/${s.id}`)} />
                </div>
              ))}
              <div className="server-card-appear" style={{ animationDelay: `${servers.length * 0.06}s` }}>
                <AddServerCard onClick={openCreate} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CRIAR SERVIDOR
      ══════════════════════════════════════════════════════════════ */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease',
          padding: 16,
        }}>
          <div className="modal-enter" style={{
            background: BG_MODAL,
            borderRadius: 20,
            width: '100%', maxWidth: 460,
            maxHeight: '92vh',
            overflow: 'hidden',
            position: 'relative',
            border: `1px solid rgba(255,255,255,0.08)`,
            boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          }}>
            {/* Close button */}
            <button onClick={closeCreate} style={{
              position: 'absolute', top: 14, right: 14, zIndex: 10,
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: TEXT_MUTED, fontSize: 16, cursor: 'pointer',
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.15)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; }}
              onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as any).style.color = TEXT_MUTED; }}
            >✕</button>

            <div style={{ overflowY: 'auto', maxHeight: '92vh' }}>

              {/* ── SUCCESS ── */}
              {createStep === 'success' && createdServer && (
                <div className="step-enter" style={{ padding: '40px 32px', textAlign: 'center' }}>
                  {/* Success icon with glow */}
                  <div style={{
                    width: 100, height: 100, borderRadius: 24,
                    background: createdServer.imageUrl ? 'transparent' : (createdServer.bannerColor || getServerColor(createdServer.name)),
                    margin: '0 auto 20px',
                    overflow: 'hidden',
                    border: `3px solid rgba(255,255,255,0.1)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, fontWeight: 800, color: '#fff',
                    boxShadow: `0 0 0 6px rgba(165,230,0,0.1), 0 0 40px rgba(165,230,0,0.2)`,
                    animation: 'glow 2s ease-in-out infinite',
                  }}>
                    {createdServer.imageUrl
                      ? (isVideoUrl(createdServer.imageUrl) ? <video src={createdServer.imageUrl} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={createdServer.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />)
                      : iconPreview
                        ? (isVideoUrl(iconPreview) ? <video src={iconPreview} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={iconPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />)
                        : getInitials(createdServer.name)}
                  </div>

                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: TEXT_BRIGHT }}>
                    {createdServer.name}
                  </h2>
                  <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                    O teu servidor foi criado com sucesso!<br />Partilha o código de convite para convidar membros.
                  </p>

                  {/* Invite code */}
                  <div style={{
                    background: BG_FIELD,
                    border: `1px solid ${BORDER_ACCENT}`,
                    borderRadius: 12, padding: '14px 18px',
                    marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Código de convite</p>
                      <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 13, color: ACCENT, wordBreak: 'break-all' }}>{createdServer.inviteCode}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(createdServer!.inviteCode)}
                      style={{
                        background: ACCENT_DIM, border: `1px solid ${BORDER_ACCENT}`,
                        borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600,
                        color: ACCENT, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => (e.currentTarget as any).style.background = 'rgba(165,230,0,0.2)'}
                      onMouseLeave={e => (e.currentTarget as any).style.background = ACCENT_DIM}
                    >📋 Copiar</button>
                  </div>

                  <button
                    onClick={() => { closeCreate(); router.push(`/main/community/${createdServer!.id}`); }}
                    style={{
                      width: '100%',
                      background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`,
                      border: 'none', borderRadius: 12, padding: '14px',
                      fontSize: 15, fontWeight: 700, color: '#000', cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(165,230,0,0.3)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget as any).style.boxShadow = '0 8px 28px rgba(165,230,0,0.5)'}
                    onMouseLeave={e => (e.currentTarget as any).style.boxShadow = '0 4px 20px rgba(165,230,0,0.3)'}
                  >
                    🚀 Entrar no servidor
                  </button>
                </div>
              )}

              {/* ── STEP 1: TIPO ── */}
              {createStep === 'type' && (
                <div className="step-enter" style={{ padding: '32px 28px 28px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 48, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🌐</div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: TEXT_BRIGHT }}>
                      Cria o teu servidor
                    </h2>
                    <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      O teu servidor é onde tu e os teus amigos se reúnem.<br />Escolhe um tipo para começar.
                    </p>
                  </div>

                  {/* Type cards */}
                  {([
                    { key: 'community', icon: '🌐', label: 'Para uma comunidade', sub: 'Cria um hub público para a tua comunidade crescer.' },
                    { key: 'friends', icon: '👥', label: 'Para amigos', sub: 'Um espaço privado para o teu grupo de amigos.' },
                  ] as const).map(t => (
                    <div
                      key={t.key}
                      onClick={() => setServerType(t.key)}
                      style={{
                        border: `1.5px solid ${serverType === t.key ? ACCENT : BORDER}`,
                        borderRadius: 12, padding: '16px 18px',
                        marginBottom: 10, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 16,
                        background: serverType === t.key ? ACCENT_DIM : 'rgba(255,255,255,0.03)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (serverType !== t.key) (e.currentTarget as any).style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (serverType !== t.key) (e.currentTarget as any).style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: serverType === t.key ? ACCENT_DIM : 'rgba(255,255,255,0.08)',
                        border: `1px solid ${serverType === t.key ? BORDER_ACCENT : BORDER}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, flexShrink: 0, transition: 'all 0.2s',
                      }}>{t.icon}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: TEXT_BRIGHT }}>{t.label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: TEXT_MUTED, lineHeight: 1.4 }}>{t.sub}</p>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${serverType === t.key ? ACCENT : TEXT_MUTED}`,
                        background: serverType === t.key ? ACCENT : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        {serverType === t.key && <div style={{ width: 7, height: 7, background: '#000', borderRadius: '50%' }} />}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setCreateStep('details')}
                    style={{
                      width: '100%', marginTop: 8,
                      background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`,
                      border: 'none', borderRadius: 12, padding: '13px',
                      fontSize: 15, fontWeight: 700, color: '#000', cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(165,230,0,0.25)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget as any).style.boxShadow = '0 8px 24px rgba(165,230,0,0.45)'}
                    onMouseLeave={e => (e.currentTarget as any).style.boxShadow = '0 4px 16px rgba(165,230,0,0.25)'}
                  >
                    Próximo →
                  </button>
                </div>
              )}

              {/* ── STEP 2: DETALHES ── */}
              {createStep === 'details' && (
                <div className="step-enter">
                  {/* Banner area — full clickable */}
                  <div style={{
                    position: 'relative', height: 130, cursor: 'pointer',
                    background: bannerColor,
                    backgroundImage: bannerPreview && !isVideoUrl(bannerPreview) ? `url(${bannerPreview})` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    overflow: 'visible',
                  }} onClick={() => bannerRef.current?.click()}>
                    {bannerPreview && isVideoUrl(bannerPreview) && <video src={bannerPreview} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
                    {/* Dark overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 100%)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 24 }}></span>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        borderRadius: 6, padding: '4px 12px',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}>
                        Clica para definir a capa
                      </span>
                    </div>
                    <input ref={bannerRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setBannerFile(f); readAsDataURL(f).then(setBannerPreview);
                    }} />

                    {/* Server icon — bottom left, overflows banner */}
                    <div
                      style={{
                        position: 'absolute', bottom: -30, left: 20,
                        width: 60, height: 60, borderRadius: 16,
                        background: BG_MODAL,
                        border: `3px solid ${BG_MODAL}`,
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        cursor: 'pointer', zIndex: 2,
                      }}
                      onClick={e => { e.stopPropagation(); iconRef.current?.click(); }}
                    >
                      <div style={{
                        width: '100%', height: '100%', borderRadius: 13,
                        background: iconPreview ? 'transparent' : (bannerColor || '#2d2d2d'),
                        border: `2px dashed rgba(255,255,255,0.4)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, position: 'relative', overflow: 'hidden',
                      }}>
                        {iconPreview
                          ? (isVideoUrl(iconPreview) ? <video src={iconPreview} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={iconPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />)
                          : '📷'}
                        <div style={{
                          position: 'absolute', bottom: -3, right: -3,
                          width: 20, height: 20, borderRadius: '50%',
                          background: ACCENT, border: '2px solid #111214',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#000',
                        }}>+</div>
                      </div>
                      <input ref={iconRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setIconFile(f); readAsDataURL(f).then(setIconPreview);
                      }} />
                    </div>
                  </div>

                  <div style={{ padding: '44px 28px 28px' }}>
                    {/* Banner color picker */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={lbl}>Cor da capa</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {BANNER_PRESETS.map(c => (
                          <button key={c} onClick={() => { setBannerColor(c); setBannerPreview(null); setBannerFile(null); }} title={c}
                            style={{
                              width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer',
                              border: (bannerColor === c && !bannerPreview) ? `3px solid ${ACCENT}` : '2px solid transparent',
                              transition: 'all 0.15s', transform: (bannerColor === c && !bannerPreview) ? 'scale(1.2)' : 'scale(1)',
                              boxShadow: (bannerColor === c && !bannerPreview) ? `0 0 10px rgba(165,230,0,0.5)` : 'none',
                            }} />
                        ))}
                      </div>
                    </div>

                    {createErr && (
                      <div style={{
                        background: 'rgba(242,63,67,0.1)', border: '1px solid rgba(242,63,67,0.3)',
                        borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#F23F43', marginBottom: 16,
                      }}>{createErr}</div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <label style={lbl}>Nome do servidor *</label>
                      <input
                        style={inp}
                        placeholder={serverType === 'community' ? 'A Minha Comunidade' : 'Servidor dos Amigos'}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        maxLength={50} autoFocus
                        onKeyDown={e => e.key === 'Enter' && newName.trim() && handleCreate()}
                      />
                      <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6, margin: '6px 0 0' }}>
                        Podes sempre alterar isto depois.
                      </p>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={lbl}>Descrição</label>
                      <textarea
                        style={{ ...inp, resize: 'vertical' } as any}
                        placeholder="Sobre o quê é este servidor?"
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        maxLength={200} rows={2}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setCreateStep('type')}
                        style={{
                          background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`,
                          borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600,
                          color: TEXT_NORMAL, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.12)'}
                        onMouseLeave={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'}
                      >
                        ← Voltar
                      </button>
                      <button
                        onClick={handleCreate}
                        disabled={creating || !newName.trim()}
                        style={{
                          flex: 1,
                          background: !newName.trim() || creating ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${ACCENT}, #7BC800)`,
                          border: 'none', borderRadius: 10, padding: '11px 20px',
                          fontSize: 14, fontWeight: 700,
                          color: !newName.trim() || creating ? TEXT_MUTED : '#000',
                          cursor: !newName.trim() || creating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        {creating ? (
                          <>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid rgba(0,0,0,0.3)`, borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }} />
                            A criar…
                          </>
                        ) : '✨ Criar servidor'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: ENTRAR COM CONVITE
      ══════════════════════════════════════════════════════════════ */}
      {showJoin && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease', padding: 16,
        }}>
          <div className="modal-enter" style={{
            background: BG_MODAL, borderRadius: 20,
            width: '100%', maxWidth: 420,
            border: `1px solid rgba(255,255,255,0.08)`,
            boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            overflow: 'hidden', position: 'relative',
          }}>
            <button onClick={() => setShowJoin(false)} style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: TEXT_MUTED, fontSize: 16, cursor: 'pointer',
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>

            <div style={{ padding: '36px 28px 28px' }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 48, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>🔗</div>
                <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: TEXT_BRIGHT }}>
                  Entra num servidor
                </h2>
                <p style={{ color: TEXT_MUTED, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                  Introduz um código de convite para te juntares a um servidor.
                </p>
              </div>

              {joinErr && (
                <div style={{
                  background: 'rgba(242,63,67,0.1)', border: '1px solid rgba(242,63,67,0.3)',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#F23F43', marginBottom: 16,
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
                <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
                  Pede ao administrador do servidor o código de convite.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowJoin(false)} style={{
                  background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`,
                  borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600,
                  color: TEXT_NORMAL, cursor: 'pointer', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.12)'}
                  onMouseLeave={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joining || !joinCode.trim()}
                  style={{
                    flex: 1,
                    background: !joinCode.trim() || joining ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${ACCENT}, #7BC800)`,
                    border: 'none', borderRadius: 10, padding: '11px',
                    fontSize: 14, fontWeight: 700,
                    color: !joinCode.trim() || joining ? TEXT_MUTED : '#000',
                    cursor: !joinCode.trim() || joining ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {joining ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }} />
                      A entrar…
                    </>
                  ) : '🔗 Entrar no servidor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}