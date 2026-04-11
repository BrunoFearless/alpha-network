'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCommunitySocket } from '@/lib/socket';
import { Avatar } from '@/components/ui/Avatar';
import { DisplayName, FONT_OPTIONS, EFFECT_OPTIONS, COLOR_OPTIONS } from '@/components/ui/DisplayName';
import { AuroraBackground } from '@/components/ui/AuroraBackground';


// ─── ACCENT COLOR ────────────────────────────────────────────────────────────
const ACCENT = '#A5E600';
const ACCENT_DIM = 'rgba(165,230,0,0.15)';
const ACCENT_MED = 'rgba(165,230,0,0.25)';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const BG_DARKEST = '#000000ff';
const BG_DARK = '#000000ff';
const BG_MID = '#000000ff';
const BG_LIGHT = '#171717ff';
const BG_HOVER = '#2a2b30';
const TEXT_BRIGHT = '#e3e5e8';
const TEXT_NORMAL = '#b5bac1';
const TEXT_MUTED = '#747f8d';
const BORDER_SUBTLE = 'rgba(255,255,255,0.06)';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ChannelCategoryRow { id: string; name: string; position: number; }
interface Channel { id: string; name: string; position: number; categoryId: string | null; topic?: string | null; }
interface CommunityRole { id: string; name: string; position: number; color: string | null; canModerate: boolean; canManageServer: boolean; canManageChannels: boolean; }
interface Member { userId: string; role: string; communityRoleId: string | null; mutedUntil?: string | null; communityRole: CommunityRole | null; profile: { displayName?: string | null; username: string; avatarUrl?: string | null; bio?: string | null; bannerUrl?: string | null; bannerColor?: string | null; auroraTheme?: string | null; nameFont?: string | null; nameEffect?: string | null; nameColor?: string | null; status?: string | null; tags?: string | null; } | null; }
interface BotRow { id: string; isAdminBot: boolean; bot: { id: string; name: string; prefix: string }; }
interface Server { id: string; name: string; description?: string | null; imageUrl?: string | null; bannerUrl?: string | null; bannerColor?: string | null; inviteCode: string; ownerId: string; channelCategories: ChannelCategoryRow[]; channels: Channel[]; members: Member[]; bots: BotRow[]; roles: CommunityRole[]; membersCount: number; }
interface EmbedPayload { title?: string; description?: string; color?: string; footer?: string; imageUrl?: string; }
interface ReplySnippet { id: string; content: string; authorName: string; }
interface ReactionEntry { emoji: string; userId: string; }
interface CommunityEvent { id: string; title: string; description: string | null; startsAt: string; endsAt: string | null; location: string | null; creatorId: string; imageUrl?: string | null; coverColor?: string; rsvpCount?: number; myRsvp?: boolean; }
interface Msg { id: string; channelId: string; authorId: string; authorName: string; authorAvatarUrl?: string | null; authorType: 'user' | 'bot'; authorProfile?: Member['profile']; content: string; messageType?: string; imageUrl?: string | null; embedJson?: EmbedPayload | null; createdAt: string; editedAt?: string | null; replyToId?: string | null; replyTo?: ReplySnippet | null; attachmentUrls?: string[] | null; mentions?: { everyone?: boolean; userIds?: string[] } | null; reactions?: ReactionEntry[]; pinned?: boolean; }
interface MyServer { id: string; name: string; description?: string | null; inviteCode: string; membersCount: number; role: string; channels: { id: string; name: string }[]; imageUrl?: string | null; }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function nameColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 31) % 360;
  return `hsl(${h}, 55%, 72%)`;
}
function aggregateReactions(reactions: ReactionEntry[] | undefined, myId: string | undefined) {
  const map = new Map<string, { count: number; me: boolean }>();
  for (const r of reactions ?? []) {
    const x = map.get(r.emoji) ?? { count: 0, me: false };
    x.count++; if (myId && r.userId === myId) x.me = true;
    map.set(r.emoji, x);
  }
  return [...map.entries()].map(([emoji, v]) => ({ emoji, ...v }));
}
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }); }
function fmtDate(d: string) { const dt = new Date(d); const now = new Date(); const diff = now.getTime() - dt.getTime(); if (diff < 86400000) return 'Hoje às ' + fmtTime(d); if (diff < 172800000) return 'Ontem às ' + fmtTime(d); return dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' às ' + fmtTime(d); }
function fmtEventDate(d: string) { return new Date(d).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function isVideoUrl(url?: string | null) { 
  if (!url) return false;
  return url.match(/\.(mp4|webm|mov|ogg|m4v|3gp|flv|quicktime)(?:\?|#|$)/i) || url.startsWith('data:video/') || url.startsWith('blob:') || url.toLowerCase().includes('video');
}
function memberAccentColor(m: Member, ownerId: string): string {
  if (m.userId === ownerId) return '#F0B132';
  if (m.communityRole?.color) return m.communityRole.color;
  if (m.role === 'admin') return '#ED4245';
  return TEXT_NORMAL;
}

// ─── IMAGE UPLOAD HELPER ─────────────────────────────────────────────────────
async function uploadFile(file: File, serverId: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const result = await api.postForm<{ url: string }>(`/community/servers/${serverId}/upload`, fd);
  return result.url;
}

// Lê um ficheiro local como Data URL (preview imediato sem upload)
function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── ACCENT COLORS for pickers ───────────────────────────────────────────────
const BANNER_PRESETS = [
  '#0d0e10', '#1a1a2e', '#16213e', '#0f3460',
  '#1B1B2F', '#162447', '#1F4068', '#1B262C',
  '#4a0e0e', '#6b2737', '#7C2D12', '#92400E',
  '#14532d', '#166534', '#15803d', '#065f46',
  '#1e1b4b', '#312e81', '#4c1d95', '#581c87',
  '#0c4a6e', '#075985', '#0369a1', '#0284c7',
  '#422006', '#78350f', '#92400e', '#b45309',
];

// ─── EMOJI PICKER ────────────────────────────────────────────────────────────
const EMOJIS = ['👍', '👎', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '✅', '❌', '💯', '🙏', '👀', '💀', '🤔', '😎', '🚀', '⭐', '💪', '🤣', '😭', '🫡', '💥', '🎯', '✨', '💫', '🌟', '👑', '🍕', '🎮', '✍️', '💡', '🎸', '🌈', '🦄', '🎊', '🏆', '🫂', '🐛'];

function EmojiPickerPopover({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => document.addEventListener('click', onClose), 50);
    return () => { clearTimeout(t); document.removeEventListener('click', onClose); };
  }, [onClose]);
  return (
    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 6, background: '#0e0f11', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 12, padding: 10, display: 'grid', gridTemplateColumns: 'repeat(8, 30px)', gap: 3, zIndex: 50, boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(165,230,0,0.1)', animation: 'popIn 0.15s cubic-bezier(.4,0,.2,1)', backdropFilter: 'blur(12px)' }}>
      {EMOJIS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }} title={e}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s, transform 0.1s' }}
          onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,0.1)'; ev.currentTarget.style.transform = 'scale(1.2)'; }}
          onMouseLeave={ev => { ev.currentTarget.style.background = 'none'; ev.currentTarget.style.transform = 'scale(1)'; }}>{e}</button>
      ))}
    </div>
  );
}

// ─── SERVER ICON ─────────────────────────────────────────────────────────────
function ServerIcon({ server, active, onClick }: { server: MyServer; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const label = server.name.slice(0, 2).toUpperCase();
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 6 }}>
      {(active || hovered) && <div style={{ position: 'absolute', left: -4, width: 4, height: active ? 40 : 22, background: ACCENT, borderRadius: '0 4px 4px 0', transition: 'height 0.25s cubic-bezier(.4,0,.2,1)', boxShadow: `0 0 8px rgba(165,230,0,0.6)` }} />}
      <button type="button" onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} title={server.name}
        style={{ width: 48, height: 48, borderRadius: active ? 16 : hovered ? 14 : '50%', background: 'transparent', border: active ? `2px solid ${ACCENT}` : '2px solid transparent', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-radius 0.2s cubic-bezier(.4,0,.2,1), border-color 0.15s, transform 0.15s, box-shadow 0.15s', flexShrink: 0, marginLeft: 4, transform: hovered && !active ? 'scale(1.05)' : 'scale(1)', boxShadow: active ? `0 4px 16px rgba(165,230,0,0.25)` : 'none' }}>
        <Avatar src={server.imageUrl} name={server.name} size="md" className="w-full h-full" />
      </button>
    </div>
  );
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && <div style={{ position: 'absolute', left: '110%', top: '50%', transform: 'translateY(-50%)', background: '#111', color: TEXT_BRIGHT, fontSize: 12, padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 999, pointerEvents: 'none', border: `1px solid ${BORDER_SUBTLE}`, animation: 'fadeIn 0.1s ease' }}>{text}</div>}
    </div>
  );
}

// ─── IMAGE / COLOR PICKER SECTION (reutilizável) ─────────────────────────────
function ImageColorPicker({
  label, currentImageUrl, currentColor, colorPresets, onImageChange, onColorChange,
}: {
  label: string; currentImageUrl?: string | null; currentColor?: string | null;
  colorPresets: string[]; onImageChange: (file: File) => void; onColorChange: (color: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [activeColor, setActiveColor] = useState(currentColor ?? colorPresets[0]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    readAsDataURL(f).then(url => { setPreview(url); setActiveColor(''); });
    onImageChange(f);
  }
  function pickColor(c: string) { setActiveColor(c); setPreview(null); onColorChange(c); }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</label>
      {/* Preview */}
      <div style={{ height: 80, borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: preview ? 'transparent' : (activeColor || '#1a1a2e'), border: `1px solid ${BORDER_SUBTLE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {preview ? <Avatar src={preview} name="P" size="lg" className="w-full h-full" /> : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>Pré-visualização</span>}
        <button onClick={() => ref.current?.click()} style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.6)', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_BRIGHT, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
          📷 Mídia
        </button>
        <input ref={ref} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={handleFile} />
      </div>
      {/* Color grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {colorPresets.map(c => (
          <button key={c} onClick={() => pickColor(c)} title={c}
            style={{ width: 28, height: 28, borderRadius: 6, background: c, border: activeColor === c && !preview ? `3px solid ${ACCENT}` : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s', transform: activeColor === c && !preview ? 'scale(1.15)' : 'scale(1)' }} />
        ))}
        {/* Custom color */}
        <label title="Cor personalizada" style={{ position: 'relative', width: 28, height: 28, borderRadius: 6, background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', cursor: 'pointer', overflow: 'hidden', border: '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="color" onChange={e => pickColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
        </label>
      </div>
    </div>
  );
}

// ─── EDIT PROFILE MODAL ──────────────────────────────────────────────────────
function EditProfileModal({ user, serverId, onClose, onSave }: {
  user: { profile?: { displayName?: string | null; username: string; avatarUrl?: string | null; bio?: string | null; bannerUrl?: string | null; bannerColor?: string | null; auroraTheme?: string | null; nameFont?: string | null; nameEffect?: string | null; nameColor?: string | null; status?: string | null; tags?: string | null; } | null };
  serverId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.profile?.displayName ?? '');
  const [bio, setBio] = useState(user.profile?.bio ?? '');
  const [status, setStatus] = useState(user.profile?.status ?? '');
  const [tags, setTags] = useState(user.profile?.tags ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerColor, setBannerColor] = useState(user.profile?.bannerColor ?? BANNER_PRESETS[1]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.profile?.avatarUrl ?? null);
  const [nameFont, setNameFont] = useState(user.profile?.nameFont ?? 'inherit');
  const [nameEffect, setNameEffect] = useState(user.profile?.nameEffect ?? 'solido');
  const [nameColor, setNameColor] = useState(user.profile?.nameColor ?? ACCENT);
  const [auroraTheme, setAuroraTheme] = useState(user.profile?.auroraTheme ?? 'ALPHA');
  const avatarRef = useRef<HTMLInputElement>(null);

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setAvatarFile(f);
    readAsDataURL(f).then(setAvatarPreview);
  }

  async function handleSave() {
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      let bannerUrl: string | undefined;
      if (avatarFile) avatarUrl = await uploadFile(avatarFile, serverId);
      if (bannerFile) bannerUrl = await uploadFile(bannerFile, serverId);
      const profileUpdates: any = { displayName, bio, status, tags, bannerColor, auroraTheme, nameFont, nameEffect, nameColor };
      if (avatarUrl) profileUpdates.avatarUrl = avatarUrl;
      if (bannerUrl) profileUpdates.bannerUrl = bannerUrl;
      
      const updateUserProfile = useAuthStore.getState().updateUserProfile;
      await api.patch('/users/me', profileUpdates);
      updateUserProfile(profileUpdates);
      
      onSave();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  const name = displayName || user.profile?.username || 'U';
  const previewProfile = { displayName: name, username: user.profile?.username, nameFont, nameEffect, nameColor, status, tags };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />
      
      <div style={{ position: 'relative', zIndex: 10, width: '100vw', height: '100vh', maxWidth: 1100, maxHeight: 780, background: '#000000', borderRadius: 12, overflow: 'hidden', display: 'flex', boxShadow: '0 40px 100px rgba(0,0,0,0.9)', border: `1px solid ${BORDER_SUBTLE}`, animation: 'popIn 0.3s cubic-bezier(.4,0,.2,1)' }}>
        
        {/* Sidebar */}
        <div style={{ width: 260, background: '#000000', borderRight: `1px solid ${BORDER_SUBTLE}`, display: 'flex', flexDirection: 'column', padding: '60px 6px 20px 20px', flexShrink: 0 }}>
          <div style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, paddingLeft: 10 }}>Configurações de Usuário</div>
          {['Minha Conta', 'Perfis', 'Conteúdo e Social', 'Dados e Privacidade', 'Central da Família'].map((item, i) => (
            <div key={item} style={{ 
              padding: '10px 12px', borderRadius: 6, cursor: item === 'Perfis' ? 'default' : 'pointer', fontSize: 14, marginBottom: 4, 
              background: item === 'Perfis' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: item === 'Perfis' ? TEXT_BRIGHT : TEXT_NORMAL,
              fontWeight: item === 'Perfis' ? 600 : 500,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              {item === 'Perfis' ? '👤' : i === 0 ? '🏠' : '⚙️'} {item}
              {item === 'Central da Família' && <span style={{ background: '#5865F2', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 8, marginLeft: 'auto' }}>NOVO</span>}
            </div>
          ))}
        </div>

        {/* Content Window */}
        <div style={{ flex: 1, background: '#000000', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* Close button inside content area */}
          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 50 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: `2px solid ${TEXT_MUTED}`, color: TEXT_MUTED, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <div style={{ color: TEXT_MUTED, fontSize: 11, textAlign: 'center', marginTop: 4, fontWeight: 600 }}>ESC</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '60px 40px 100px' }}>
            <h1 style={{ color: TEXT_BRIGHT, fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Perfis</h1>

            <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
              
              {/* Settings Left Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
                
                {/* Experiment Nitro Flair */}
                <div style={{ background: 'linear-gradient(90deg, #444BD3 0%, #DA2BB3 100%)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Experimente o NITRO para muito mais estilos e extras.</div>
                  <button style={{ background: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Obter Nitro</button>
                </div>

                {/* Aurora Section */}
                <div>
                  <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Tema de Perfil (Aurora)</label>
                  <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 16 }}>Escolhe a aura que descreve o teu estado de espírito.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {[
                      { id: 'ALPHA', label: 'Alpha', colors: ['#c9a84c', '#7060c8'] },
                      { id: 'CRIMSON', label: 'Fogo', colors: ['#991b1b', '#ea580c'] },
                      { id: 'AQUA', label: 'Oceano', colors: ['#06b6d4', '#2563eb'] },
                      { id: 'VOID', label: 'Vazio', colors: ['#7e22ce', '#1e1b4b'] },
                    ].map(t => (
                      <button key={t.id} onClick={() => setAuroraTheme(t.id)}
                        style={{ 
                          position: 'relative', overflow: 'hidden', background: '#1e1f22', 
                          border: `2px solid ${auroraTheme === t.id ? ACCENT : 'transparent'}`, 
                          borderRadius: 8, padding: '12px 6px', cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.2, background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` }} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`, border: '2px solid rgba(255,255,255,0.1)' }} />
                          <span style={{ color: auroraTheme === t.id ? ACCENT : TEXT_NORMAL, fontSize: 10, fontWeight: 700 }}>{t.label}</span>
                        </div>
                      </button>
                    ))}
                    <label style={{ position: 'relative', overflow: 'hidden', background: '#1e1f22', border: `2px solid ${auroraTheme.startsWith('#') ? ACCENT : 'transparent'}`, borderRadius: 8, padding: '12px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <input type="color" value={auroraTheme.startsWith('#') ? auroraTheme : '#A5E600'} onChange={e => setAuroraTheme(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                      <div style={{ position: 'absolute', inset: 0, opacity: 0.2, background: auroraTheme.startsWith('#') ? auroraTheme : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} />
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: auroraTheme.startsWith('#') ? auroraTheme : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: '2px solid rgba(255,255,255,0.1)' }} />
                        <span style={{ color: auroraTheme.startsWith('#') ? ACCENT : TEXT_NORMAL, fontSize: 10, fontWeight: 700 }}>Custom</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Banner Section */}
                <div style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 24 }}>
                  <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Faixa do Perfil</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,video/mp4,video/webm';
                        input.onchange = (e: any) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setBannerFile(f);
                        };
                        input.click();
                      }} style={{ background: '#5865F2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Mudar banner</button>
                    <button onClick={() => { setBannerFile(null); setBannerColor(BANNER_PRESETS[0]); }} style={{ background: 'transparent', color: TEXT_BRIGHT, border: 'none', padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Remover banner</button>
                  </div>
                </div>

                {/* Avatar Section */}
                <div style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 24 }}>
                  <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Avatar Animação</label>
                  <button onClick={() => avatarRef.current?.click()} style={{ background: '#5865F2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Mudar Avatar</button>
                  <input ref={avatarRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={handleAvatarFile} />
                </div>

                {/* Name Styles Section */}
                <div style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 24 }}>
                  <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Estilos de Nome Exibido</label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                     <div>
                       <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Nome de exibição</p>
                       <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={user.profile?.username} maxLength={32}
                         style={{ width: '100%', background: '#1e1f22', border: 'none', borderRadius: 4, padding: '12px', color: TEXT_BRIGHT, fontSize: 15 }} />
                     </div>

                     <div>
                       <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Mensagem de Estado</p>
                       <input value={status} onChange={e => setStatus(e.target.value)} placeholder="O que estás a pensar?" maxLength={50}
                         style={{ width: '100%', background: '#1e1f22', border: 'none', borderRadius: 4, padding: '12px', color: TEXT_BRIGHT, fontSize: 13 }} />
                     </div>

                     <div>
                       <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Tags de Perfil (Separadas por vírgula)</p>
                       <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Ex: Caltech, USP, PUC, Dev"
                         style={{ width: '100%', background: '#1e1f22', border: 'none', borderRadius: 4, padding: '12px', color: TEXT_BRIGHT, fontSize: 13 }} />
                     </div>

                     <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: `1px solid ${BORDER_SUBTLE}` }}>
                        <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Fonte Exclusiva</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                          {FONT_OPTIONS.map(f => (
                            <button key={f.id} onClick={() => setNameFont(f.value)}
                              style={{ 
                                background: nameFont === f.value ? 'rgba(165,230,0,0.1)' : 'rgba(255,255,255,0.03)', 
                                border: `1.5px solid ${nameFont === f.value ? ACCENT : 'transparent'}`, 
                                borderRadius: 8, padding: '12px 6px', cursor: 'pointer', transition: 'all 0.15s',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                              }}>
                              <span style={{ fontFamily: f.value, fontSize: 18, color: nameFont === f.value ? ACCENT : TEXT_NORMAL, fontWeight: 'bold' }}>Gg</span>
                              <span style={{ color: nameFont === f.value ? ACCENT : TEXT_MUTED, fontSize: 9, fontWeight: 600 }}>{f.label}</span>
                            </button>
                          ))}
                        </div>

                        <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Efeito & Animação</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                          {EFFECT_OPTIONS.map(e => (
                            <button key={e.id} onClick={() => setNameEffect(e.id)}
                              style={{ 
                                background: nameEffect === e.id ? 'rgba(165,230,0,0.1)' : 'rgba(255,255,255,0.03)', 
                                border: `1.5px solid ${nameEffect === e.id ? ACCENT : 'transparent'}`, 
                                borderRadius: 8, padding: '8px 14px', cursor: 'pointer', transition: 'all 0.15s',
                                color: nameEffect === e.id ? ACCENT : TEXT_NORMAL, fontSize: 12, fontWeight: 600
                              }}>
                              {e.id === 'neon' ? <span style={{ color: '#fff', animation: 'neon-pulse 2s ease-in-out infinite', '--neon-color': nameColor } as any}>{e.label}</span>
                                : e.id === 'fluido' ? <span style={{ background: `linear-gradient(90deg, ${nameColor}, #fff, ${nameColor})`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'rainbow-text 3s linear infinite' }}>{e.label}</span>
                                : e.id === 'arco-iris' ? <span style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #8f00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'rainbow-text 3s linear infinite', backgroundSize: '200% auto' }}>{e.label}</span>
                                : e.id === 'glitch' ? <span style={{ color: '#fff', animation: 'glitch-anim 0.4s infinite alternate-reverse' }}>{e.label}</span>
                                : e.id === 'fogo' ? <span style={{ color: '#fff', animation: 'fire-glow 1.5s ease-in-out infinite' }}>{e.label}</span>
                                : e.id === 'diamante' ? <span style={{ background: `linear-gradient(90deg, ${nameColor} 0%, #fff 50%, ${nameColor} 100%)`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shine-sweep 2.5s infinite linear' }}>{e.label}</span>
                                : e.id === 'matrix' ? <span style={{ color: '#00ff00', textShadow: '0 0 8px #00ff00', animation: 'matrix-flicker 2s infinite', fontFamily: 'monospace' }}>{e.label}</span>
                                : e.id === 'holograma' ? <span style={{ color: nameColor, textShadow: `0 0 10px ${nameColor}`, animation: 'holographic-shift 4s infinite linear' }}>{e.label}</span>
                                : e.label}
                            </button>
                          ))}
                        </div>

                        <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Cor do Nome</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {COLOR_OPTIONS.map(c => (
                            <button key={c} onClick={() => setNameColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `2.5px solid ${nameColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', boxShadow: nameColor === c ? `0 0 10px ${c}60` : 'none' }} />
                          ))}
                          <label style={{ position: 'relative', width: 28, height: 28, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', cursor: 'pointer', border: `2px solid ${!COLOR_OPTIONS.includes(nameColor) ? '#fff' : 'transparent'}` }}>
                            <input type="color" value={nameColor} onChange={e => setNameColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                          </label>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 24 }}>
                  <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Sobre mim</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Conta algo sobre ti..." maxLength={200} rows={4}
                    style={{ width: '100%', background: '#1e1f22', border: 'none', borderRadius: 8, padding: '12px', color: TEXT_BRIGHT, fontSize: 14, resize: 'none' }} />
                  <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '8px 0 0', textAlign: 'right' }}>{bio.length}/200</p>
                </div>
              </div>

              {/* Preview Right Column (Sticky) */}
              <div style={{ width: 340, position: 'sticky', top: 0, flexShrink: 0 }}>
                <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Pré-visualização</label>
                
                <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid rgba(165,230,0,0.15)`, boxShadow: '0 32px 64px rgba(0,0,0,0.6)', position: 'relative', background: '#0d0e10' }}>
                  <AuroraBackground theme={auroraTheme as any} />
                  <div style={{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
                    <div style={{ height: 110, background: bannerColor, backgroundImage: user.profile?.bannerUrl && !isVideoUrl(user.profile.bannerUrl) ? `url(${user.profile.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
                      {isVideoUrl(user.profile?.bannerUrl) && <video src={user.profile?.bannerUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ padding: '0 16px 20px' }}>
                      <div style={{ position: 'relative', display: 'inline-block', marginTop: -35 }}>
                        <Avatar 
                          src={avatarPreview} 
                          name={name} 
                          size="md" 
                          style={{ width: 80, height: 80, border: '6px solid #111214', background: BG_LIGHT }} 
                        />
                      </div>
                      <div style={{ marginTop: 10, background: '#111214', borderRadius: 8, padding: 12 }}>
                        <p style={{ margin: '0 0 2px', lineHeight: 1.2 }}><DisplayName profile={previewProfile} fallbackName={name} style={{ fontWeight: 700, fontSize: 18 }} /></p>
                        <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>@{user.profile?.username}</p>
                        
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                          <p style={{ color: TEXT_BRIGHT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Sobre Mim</p>
                          <p style={{ color: TEXT_BRIGHT, fontSize: 13, margin: 0, opacity: 0.8 }}>{bio || 'Este utilizador não tem biografia.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer bar (floating/fixed bottom) */}
          <div style={{ height: 80, background: '#000000', borderTop: `1px solid ${BORDER_SUBTLE}`, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <p style={{ color: TEXT_NORMAL, fontSize: 14 }}>Cuidado — você tem alterações não salvas!</p>
             <div style={{ display: 'flex', gap: 12 }}>
               <button onClick={onClose} style={{ background: 'transparent', color: TEXT_BRIGHT, border: 'none', padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Redefinir</button>
               <button onClick={handleSave} disabled={saving} style={{ background: '#248046', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                 {saving ? 'A salvar...' : 'Salvar Alterações'}
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── USER PROFILE MODAL ──────────────────────────────────────────────────────
function UserProfileModal({ member, server, onClose, isOwn, isMod, isAdmin, onKick, onBan, onAssignRole }: {
  member: Member; server: Server; onClose: () => void; isOwn: boolean; isMod: boolean; isAdmin: boolean;
  onKick: (uid: string) => void; onBan: (uid: string) => void; onAssignRole: (uid: string, roleId: string) => void;
}) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const accent = memberAccentColor(member, server.ownerId);
  const isOwner = member.userId === server.ownerId;
  const name = member.profile?.displayName ?? member.profile?.username ?? 'Utilizador';
  const username = member.profile?.username ?? '';
  const bio = member.profile?.bio;
  const av = member.profile?.avatarUrl;
  const bannerUrl = member.profile?.bannerUrl;
  const bannerColor = member.profile?.bannerColor ?? '#1a1a2e';
  const statusMsg = member.profile?.status;
  const tagsStr = member.profile?.tags;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.15s ease' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} />
      
      <div style={{ position: 'relative', zIndex: 10, width: 380, borderRadius: 24, overflow: 'hidden', background: '#000', border: `1px solid rgba(165,230,0,0.1)`, boxShadow: '0 40px 100px rgba(0,0,0,0.9)', animation: 'slideUp 0.3s cubic-bezier(.4,0,.2,1)' }}>
        
        <AuroraBackground theme={(member.profile?.auroraTheme as any) || 'ALPHA'} />
        
        <div style={{ position: 'relative', zIndex: 10, background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Banner area */}
          <div style={{ height: 130, background: bannerColor, backgroundImage: bannerUrl && !isVideoUrl(bannerUrl) ? `url(${bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            {isVideoUrl(bannerUrl) && <video src={bannerUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }} />
            
            {/* Banner Actions */}
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
              {!isOwn && <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤+</button>}
              <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>•••</button>
            </div>
          </div>

          {/* Avatar Area */}
          <div style={{ position: 'absolute', top: 80, left: 20 }}>
            <div style={{ position: 'relative' }}>
              <Avatar 
                src={av} 
                name={name} 
                size="xl" 
                style={{ width: 92, height: 92, border: `6px solid #000`, boxShadow: `0 8px 30px rgba(0,0,0,0.8)` }} 
              />
              <div style={{ position: 'absolute', bottom: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: '#248046', border: '5px solid #000' }} />
            </div>
          </div>

          {/* Body Content */}
          <div style={{ padding: '24px 20px 20px', marginTop: 42, overflowY: 'auto', maxHeight: '60vh' }}>
            <div style={{ marginBottom: 16 }}>
              <DisplayName profile={member.profile} fallbackName={name} baseColor={accent} style={{ display: 'block', fontSize: 24, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.02em' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ color: TEXT_NORMAL, fontSize: 14, margin: 0, fontWeight: 600 }}>@{username}</p>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: TEXT_MUTED }} />
                <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0, fontStyle: 'italic', opacity: 0.9 }}>{statusMsg || 'Explorando a Alpha Network...'}</p>
              </div>
            </div>

            {/* Badges Row */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
               {['🛡️', '💎', '⏳', '🏠'].map((emoji, i) => (
                 <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', transition: 'transform 0.15s' }}
                   onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                   onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                 >{emoji}</div>
               ))}
               <div style={{ borderRadius: 6, padding: '0 8px', background: 'linear-gradient(90deg, #5865F2, #eb459e)', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', letterSpacing: '0.05em' }}>NITRO</div>
            </div>

            {/* Mutual Info Component */}
            <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', marginLeft: 4 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: '#333', border: '2px solid #000', marginLeft: i === 1 ? 0 : -8, overflow: 'hidden' }}>
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="" style={{ width: '100%', height: '100%', opacity: 0.8 }} />
                      </div>
                    ))}
                  </div>
                  <p style={{ color: TEXT_MUTED, fontSize: 12, margin: 0 }}>
                    <span style={{ color: TEXT_BRIGHT, fontWeight: 600 }}>12 amigos mútuos</span> • 3 servidores mútuos
                  </p>
               </div>
            </div>

            {/* Bio Section */}
            <div style={{ marginBottom: 20 }}>
               <p style={{ color: TEXT_BRIGHT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.6, maxHeight: bioExpanded ? 'none' : '60px', overflow: 'hidden' }}>
                 {bio || 'Este utilizador prefere manter o mistério sobre a sua biografia...'}
               </p>
               {bio && bio.length > 100 && (
                 <button onClick={() => setBioExpanded(!bioExpanded)} style={{ background: 'transparent', border: 'none', color: TEXT_NORMAL, fontSize: 12, fontWeight: 700, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
                   {bioExpanded ? 'Ler Menos' : 'Ver Biografia Completa'}
                 </button>
               )}
            </div>

            {/* Custom Tags Section */}
            {(tags.length > 0 || isOwn) && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Conquistas & Interesses</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                   {tags.map((t, i) => (
                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.2s', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                     >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ['#F0B132', '#3FB8AF', '#7C6FAD', '#ED4245'][i % 4] }} />
                        <span style={{ color: TEXT_BRIGHT, fontSize: 12, fontWeight: 600 }}>{t}</span>
                     </div>
                   ))}
                   {!tags.length && <p style={{ color: TEXT_MUTED, fontSize: 12, margin: 0, fontStyle: 'italic' }}>Nenhuma tag definida.</p>}
                </div>
              </div>
            )}

            {/* Role List */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Cargos</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {isOwner && <span style={{ fontSize: 11, background: 'rgba(240,177,50,0.12)', color: '#F0B132', border: '1px solid rgba(240,177,50,0.3)', borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>👑 Dono</span>}
                {member.role === 'admin' && !isOwner && <span style={{ fontSize: 11, background: 'rgba(237,66,69,0.12)', color: '#ED4245', border: '1px solid rgba(237,66,69,0.3)', borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>Admin</span>}
                {member.communityRole && <span style={{ fontSize: 11, background: (member.communityRole.color || '#7C6FAD') + '20', color: member.communityRole.color || '#7C6FAD', border: `1px solid ${member.communityRole.color || '#7C6FAD'}40`, borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>{member.communityRole.name}</span>}
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && !isOwner && !isOwn && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ fontSize: 11, color: TEXT_MUTED, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Moderação</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => onKick(member.userId)} style={{ flex: 1, background: 'rgba(237,66,69,0.1)', border: '1px solid rgba(237,66,69,0.3)', color: '#ED4245', borderRadius: 8, padding: '10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Expulsar</button>
                  <button onClick={() => onBan(member.userId)} style={{ flex: 1, background: '#ED4245', border: 'none', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Banir</button>
                </div>
              </div>
            )}
          </div>

          {/* Interaction Footer */}
          <div style={{ padding: '0 20px 24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <input type="text" placeholder={`Enviar mensagem para @${username}`} style={{ background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 13, flex: 1, outline: 'none' }} />
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 20 }}>🎁</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SERVER SETTINGS MODAL ───────────────────────────────────────────────────
function ServerSettingsModal({ server, serverId, onClose, onSave, onLeave, onDelete, onCreateRole, onDeleteRole }: {
  server: Server; serverId: string; onClose: () => void;
  onSave: (data: { name: string; description: string; bannerColor?: string; bannerFile?: File | null; iconFile?: File | null }) => Promise<void>;
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onCreateRole: (name: string, color: string, perms: { canModerate: boolean; canManageServer: boolean; canManageChannels: boolean }) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<'profile' | 'roles' | 'members' | 'bans' | 'integrations'>('profile');
  const [name, setName] = useState(server.name);
  const [desc, setDesc] = useState(server.description ?? '');
  const [saving, setSaving] = useState(false);
  const [leavingServer, setLeavingServer] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerColor, setBannerColor] = useState(server.bannerColor ?? BANNER_PRESETS[0]);
  const [iconPreview, setIconPreview] = useState<string | null>(server.imageUrl ?? null);
  const iconRef = useRef<HTMLInputElement>(null);

  // Roles
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#7C6FAD');
  const [roleCanMod, setRoleCanMod] = useState(false);
  const [roleCanManageSrv, setRoleCanManageSrv] = useState(false);
  const [roleCanManageCh, setRoleCanManageCh] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);

  function handleIconFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setIconFile(f); readAsDataURL(f).then(setIconPreview);
  }

  async function handleSave() {
    setSaving(true);
    try { await onSave({ name, description: desc, bannerColor, bannerFile, iconFile }); onClose(); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }
  async function handleLeave() {
    if (!confirm(`Sair de ${server.name}?`)) return;
    setLeavingServer(true);
    try { await onLeave(); } catch (e: any) { alert(e.message); setLeavingServer(false); }
  }
  async function handleCreateRole() {
    if (!roleName.trim()) return;
    setCreatingRole(true);
    try {
      await onCreateRole(roleName, roleColor, { canModerate: roleCanMod, canManageServer: roleCanManageSrv, canManageChannels: roleCanManageCh });
      setRoleName(''); setRoleColor('#7C6FAD'); setRoleCanMod(false); setRoleCanManageSrv(false); setRoleCanManageCh(false); setShowRoleForm(false);
    } catch (e: any) { alert(e.message); }
    finally { setCreatingRole(false); }
  }

  const tabs = [
    { id: 'profile', label: 'Perfil do servidor', icon: '🌐' },
    { id: 'roles', label: 'Cargos', icon: '🎖' },
    { id: 'members', label: 'Membros', icon: '👥' },
    { id: 'bans', label: 'Banimentos', icon: '🔨' },
    { id: 'integrations', label: 'Integrações', icon: '⚙️' },
  ] as const;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%', height: '100%', animation: 'fadeIn 0.15s ease' }}>
        {/* Sidebar */}
        <div style={{ width: 260, background: BG_DARK, padding: '24px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, paddingLeft: 8 }}>Servidor de {server.name}</div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ width: '100%', textAlign: 'left', background: tab === t.id ? BG_HOVER : 'transparent', border: 'none', color: tab === t.id ? TEXT_BRIGHT : TEXT_NORMAL, padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
          <div style={{ marginTop: 'auto', borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 12 }}>
            <button onClick={handleLeave} disabled={leavingServer} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ED4245', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: leavingServer ? 0.6 : 1 }}>
              🚪 {leavingServer ? 'A sair…' : 'Sair do servidor'}
            </button>
            <button onClick={onDelete} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ED4245', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>🗑 Eliminar servidor</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: '#111214', overflowY: 'auto', padding: '40px 40px 40px' }}>
          <button onClick={onClose} style={{ position: 'fixed', top: 20, right: 20, background: BG_LIGHT, border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>✕</button>

          {tab === 'profile' && (
            <div style={{ maxWidth: 680 }}>
              <h2 style={{ color: TEXT_BRIGHT, fontSize: 20, fontWeight: 700, marginBottom: 28 }}>Perfil do servidor</h2>

              {/* Server preview card */}
              <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 28, border: `1px solid ${BORDER_SUBTLE}` }}>
                <div style={{ height: 110, background: bannerColor, backgroundImage: server.bannerUrl && !isVideoUrl(server.bannerUrl) ? `url(${server.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
                  {isVideoUrl(server.bannerUrl) && <video src={server.bannerUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ background: '#18191c', padding: '0 20px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -28 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => iconRef.current?.click()}>
                      <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', background: BG_LIGHT, border: '4px solid #18191c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {iconPreview ? (isVideoUrl(iconPreview) ? <video src={iconPreview} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={iconPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : <span style={{ color: ACCENT, fontSize: 26, fontWeight: 700 }}>{server.name[0]}</span>}
                      </div>
                      <div style={{ position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: '50%', background: ACCENT, border: '2px solid #18191c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📷</div>
                      <input ref={iconRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={handleIconFile} />
                    </div>
                    <div>
                      <p style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 16, margin: 0 }}>{name}</p>
                      <p style={{ color: TEXT_MUTED, fontSize: 12, margin: '2px 0 0' }}>{server.membersCount} membros</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner picker */}
              <ImageColorPicker
                label="Capa do servidor"
                currentImageUrl={server.bannerUrl}
                currentColor={bannerColor}
                colorPresets={BANNER_PRESETS}
                onImageChange={f => setBannerFile(f)}
                onColorChange={c => setBannerColor(c)}
              />

              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Nome</label>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={50}
                  style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 15, boxSizing: 'border-box' }} />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Descrição</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} maxLength={200} rows={3}
                  style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <button onClick={handleSave} disabled={saving || !name.trim()}
                style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ A guardar…' : '✓ Guardar alterações'}
              </button>
            </div>
          )}

          {tab === 'roles' && (
            <div style={{ maxWidth: 680 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ color: TEXT_BRIGHT, fontSize: 20, fontWeight: 700, margin: 0 }}>Cargos</h2>
                <button onClick={() => setShowRoleForm(p => !p)} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Novo cargo</button>
              </div>
              {showRoleForm && (
                <div style={{ background: BG_DARK, borderRadius: 10, padding: 20, marginBottom: 20, border: `1px solid ${BORDER_SUBTLE}`, animation: 'slideDown 0.15s ease' }}>
                  <h3 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Criar cargo</h3>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Nome</label>
                      <input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Ex: Moderador" maxLength={32}
                        style={{ width: '100%', background: '#18191c', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 6, padding: '8px 12px', color: TEXT_BRIGHT, fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cor</label>
                      <input type="color" value={roleColor} onChange={e => setRoleColor(e.target.value)}
                        style={{ width: 60, height: 38, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 6, cursor: 'pointer', background: 'transparent', padding: 2 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Permissões</label>
                    {[
                      { label: 'Pode moderar', value: roleCanMod, set: setRoleCanMod },
                      { label: 'Gerir servidor', value: roleCanManageSrv, set: setRoleCanManageSrv },
                      { label: 'Gerir canais', value: roleCanManageCh, set: setRoleCanManageCh },
                    ].map(p => (
                      <label key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
                        <div onClick={() => p.set(!p.value)} style={{ width: 36, height: 20, borderRadius: 10, background: p.value ? ACCENT : BG_HOVER, position: 'relative', cursor: 'pointer', border: `1px solid ${p.value ? ACCENT : BORDER_SUBTLE}`, transition: 'background 0.2s' }}>
                          <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: p.value ? '#000' : TEXT_MUTED, top: 2, left: p.value ? 18 : 2, transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ color: TEXT_NORMAL, fontSize: 13 }}>{p.label}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowRoleForm(false)} style={{ background: 'transparent', color: TEXT_MUTED, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                    <button onClick={handleCreateRole} disabled={creatingRole || !roleName.trim()}
                      style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: creatingRole ? 0.7 : 1 }}>
                      {creatingRole ? 'A criar…' : 'Criar cargo'}
                    </button>
                  </div>
                </div>
              )}
              {server.roles.length === 0 && !showRoleForm && <p style={{ color: TEXT_MUTED }}>Nenhum cargo criado ainda.</p>}
              {server.roles.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: BG_DARK, borderRadius: 8, marginBottom: 6, border: `1px solid ${BORDER_SUBTLE}` }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.color || '#7C6FAD', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: TEXT_BRIGHT, fontSize: 14 }}>{r.name}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {r.canModerate && <span style={{ fontSize: 10, background: '#22C55E22', color: '#22C55E', padding: '2px 6px', borderRadius: 4 }}>mod</span>}
                    {r.canManageServer && <span style={{ fontSize: 10, background: '#F59E0B22', color: '#F59E0B', padding: '2px 6px', borderRadius: 4 }}>servidor</span>}
                    {r.canManageChannels && <span style={{ fontSize: 10, background: '#60A5FA22', color: '#60A5FA', padding: '2px 6px', borderRadius: 4 }}>canais</span>}
                    <button onClick={() => onDeleteRole(r.id)} title="Eliminar"
                      style={{ background: 'none', border: 'none', color: '#ED4245', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4, opacity: 0.6, transition: 'opacity 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'members' && (
            <div style={{ maxWidth: 680 }}>
              <h2 style={{ color: TEXT_BRIGHT, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Membros ({server.members.length})</h2>
              {server.members.map(m => {
                const n = m.profile?.displayName ?? m.profile?.username ?? 'Utilizador';
                return (
                  <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: BG_DARK, borderRadius: 8, marginBottom: 6, border: `1px solid ${BORDER_SUBTLE}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: BG_HOVER, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      <Avatar src={m.profile?.avatarUrl} name={n} size="sm" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <DisplayName profile={m.profile} fallbackName={n} baseColor={memberAccentColor(m, server.ownerId)} style={{ fontSize: 14, fontWeight: 600, display: 'block' }} />
                      <p style={{ margin: 0, color: TEXT_MUTED, fontSize: 12 }}>@{m.profile?.username}</p>
                    </div>
                    <span style={{ fontSize: 11, color: m.userId === server.ownerId ? '#F0B132' : TEXT_MUTED }}>
                      {m.userId === server.ownerId ? '👑 Dono' : m.role === 'admin' ? 'Admin' : 'Membro'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {(tab === 'bans' || tab === 'integrations') && (
            <div><h2 style={{ color: TEXT_BRIGHT, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{tab === 'bans' ? 'Banimentos' : 'Integrações'}</h2><p style={{ color: TEXT_MUTED }}>Em breve.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CHANNEL SETTINGS MODAL ──────────────────────────────────────────────────
function ChannelSettingsModal({ channel, onClose, onSave, onDelete }: {
  channel: Channel; onClose: () => void;
  onSave: (name: string, topic: string) => Promise<void>;
  onDelete: (channelId: string) => Promise<void>;
}) {
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic ?? '');
  const [tab, setTab] = useState<'overview' | 'permissions'>('overview');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.toLowerCase().replace(/\s+/g, '-'), topic); onClose(); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }
  async function handleDelete() {
    if (!confirm(`Eliminar #${channel.name}? Esta acção é permanente.`)) return;
    setDeleting(true);
    try { await onDelete(channel.id); onClose(); }
    catch (e: any) { alert(e.message); }
    finally { setDeleting(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%', height: '100%', maxWidth: 860, margin: '0 auto', animation: 'fadeIn 0.15s ease' }}>
        <div style={{ width: 220, background: BG_DARK, padding: '24px 12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, paddingLeft: 8 }}># {channel.name}</div>
          {(['overview', 'permissions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ width: '100%', textAlign: 'left', background: tab === t ? BG_HOVER : 'transparent', border: 'none', color: tab === t ? TEXT_BRIGHT : TEXT_NORMAL, padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14, marginBottom: 2 }}>
              {t === 'overview' ? '⚙️ Visão geral' : '🔒 Permissões'}
            </button>
          ))}
          <div style={{ marginTop: 8, borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 8 }}>
            <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ED4245', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14, opacity: deleting ? 0.6 : 1 }}>
              🗑 {deleting ? 'A eliminar…' : 'Excluir canal'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, background: '#111214', padding: 40, overflowY: 'auto' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: BG_LIGHT, border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          {tab === 'overview' && (
            <div style={{ maxWidth: 540 }}>
              <h2 style={{ color: TEXT_BRIGHT, fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Visão geral</h2>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Nome do canal</label>
                <div style={{ display: 'flex', alignItems: 'center', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', gap: 8 }}>
                  <span style={{ color: TEXT_MUTED, fontSize: 20 }}>#</span>
                  <input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 15 }} />
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Descrição do canal</label>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} maxLength={200}
                  placeholder="Uma pequena descrição do propósito deste canal…"
                  style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }} />
                <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '4px 0 0', textAlign: 'right' }}>{topic.length}/200</p>
              </div>
              <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'A guardar…' : 'Guardar alterações'}
              </button>
            </div>
          )}
          {tab === 'permissions' && <div><h2 style={{ color: TEXT_BRIGHT, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Permissões</h2><p style={{ color: TEXT_MUTED }}>Em breve.</p></div>}
        </div>
      </div>
    </div>
  );
}

// ─── CREATE EVENT MODAL (MELHORADO) ──────────────────────────────────────────
const EVENT_COVER_COLORS = ['#1a1a2e', '#2d1b69', '#0f3460', '#1B1B2F', '#14532d', '#4a0e0e', '#0c4a6e', '#422006', '#1e1b4b', '#162447', '#3d1a78', '#065f46'];

function CreateEventModal({ serverId, onClose, onCreate }: {
  serverId: string;
  onClose: () => void;
  onCreate: (ev: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [coverColor, setCoverColor] = useState(EVENT_COVER_COLORS[0]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setCoverFile(f); readAsDataURL(f).then(url => { setCoverPreview(url); });
  }

  async function handle() {
    if (!title.trim() || !startsAt) return;
    setSaving(true);
    let finalImageUrl = null;
    try {
      if (coverFile) {
        finalImageUrl = await uploadFile(coverFile, serverId);
      }
      const data = {
        title, description: description || null,
        startsAt, endsAt: endsAt || null,
        location: location || null,
        imageUrl: finalImageUrl,
        coverColor,
      };
      await onCreate(data);
    } catch (e: any) {
      console.error(e);
      alert('Erro ao criar evento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SimpleModal title="📅 Criar evento" onClose={onClose} maxWidth={560}>
      {/* Cover preview */}
      <div style={{ height: 120, borderRadius: 12, marginBottom: 20, background: coverColor, backgroundImage: coverPreview && !isVideoUrl(coverPreview) ? `url(${coverPreview})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden', border: `1px solid ${BORDER_SUBTLE}`, cursor: 'pointer' }} onClick={() => coverRef.current?.click()}>
        {isVideoUrl(coverPreview) && <video src={coverPreview!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Clica para adicionar imagem de capa</span>
        </div>
        <input ref={coverRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={handleCoverFile} />
      </div>

      {/* Cover colors */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {EVENT_COVER_COLORS.map(c => (
          <button key={c} onClick={() => { setCoverColor(c); setCoverPreview(null); }}
            style={{ width: 26, height: 26, borderRadius: 6, background: c, border: coverColor === c && !coverPreview ? `3px solid ${ACCENT}` : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s', transform: coverColor === c && !coverPreview ? 'scale(1.15)' : 'scale(1)' }} />
        ))}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nome do evento *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sessão de Gaming" maxLength={64} autoFocus
            style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Descrição</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreve o evento..." rows={2}
            style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Início *</label>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}
              style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, boxSizing: 'border-box', colorScheme: 'dark' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Fim</label>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
              style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, boxSizing: 'border-box', colorScheme: 'dark' }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>📍 Localização</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Canal de voz, Online, Lisboa…"
            style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={{ background: 'transparent', color: TEXT_MUTED, border: 'none', padding: '9px 16px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}>Cancelar</button>
        <button onClick={handle} disabled={saving || !title.trim() || !startsAt}
          style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || !title.trim() || !startsAt) ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          {saving ? '⏳ A criar…' : '📅 Criar evento'}
        </button>
      </div>
    </SimpleModal>
  );
}

// ─── EVENTS PANEL ────────────────────────────────────────────────────────────
function EventsPanel({ events, isAdmin, onNew, onRsvp, onClose, onClearPast }: {
  events: CommunityEvent[]; isAdmin: boolean;
  onNew: () => void; onRsvp: (id: string) => void; onClose: () => void;
  onClearPast: () => void;
}) {
  const now = new Date();
  const [confirmClear, setConfirmClear] = useState(false);
  const upcoming = events.filter(e => new Date(e.startsAt) > now).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const past = events.filter(e => new Date(e.startsAt) <= now).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return (
    <div style={{ width: 340, background: '#09090b', borderLeft: `1px solid rgba(255,255,255,0.06)`, overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', animation: 'slideLeft 0.2s cubic-bezier(.4,0,.2,1)' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 15 }}>📅 Eventos</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {isAdmin && <button onClick={onNew} style={{ background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, color: '#000', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(165,230,0,0.3)', transition: 'all 0.15s' }}
            onMouseEnter={e => (e.currentTarget as any).style.boxShadow = '0 4px 16px rgba(165,230,0,0.5)'}
            onMouseLeave={e => (e.currentTarget as any).style.boxShadow = '0 2px 10px rgba(165,230,0,0.3)'}>+ Novo</button>}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: TEXT_MUTED, cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as any).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as any).style.color = TEXT_MUTED; }}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {upcoming.length === 0 && past.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <p style={{ fontSize: 44, margin: '0 0 12px', animation: 'float 3s ease-in-out infinite' }}>📅</p>
            <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Nenhum evento agendado ainda.</p>
            {isAdmin && <button onClick={onNew} style={{ background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, color: '#000', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(165,230,0,0.3)' }}>Criar primeiro evento</button>}
          </div>
        )}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingLeft: 2 }}>Próximos</p>
            {upcoming.map(ev => <EventCard key={ev.id} ev={ev} onRsvp={onRsvp} />)}
          </div>
        )}
        {past.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 2, paddingRight: 2 }}>
              <p style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Passados</p>
              {isAdmin && (
                confirmClear ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setConfirmClear(false)}
                      style={{ background: 'transparent', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, borderRadius: 5, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={() => { onClearPast(); setConfirmClear(false); }}
                      style={{ background: 'rgba(237,66,69,0.15)', border: '1px solid rgba(237,66,69,0.4)', color: '#ED4245', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      Confirmar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClear(true)}
                    style={{ background: 'transparent', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, borderRadius: 5, padding: '2px 10px', fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'rgba(237,66,69,0.5)'; (e.currentTarget as any).style.color = '#ED4245'; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.borderColor = BORDER_SUBTLE; (e.currentTarget as any).style.color = TEXT_MUTED; }}>
                    🗑 Limpar histórico
                  </button>
                )
              )}
            </div>
            {past.map(ev => <EventCard key={ev.id} ev={ev} onRsvp={onRsvp} past />)}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ ev, onRsvp, past }: { ev: CommunityEvent; onRsvp: (id: string) => void; past?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 10, border: `1px solid ${hov && !past ? 'rgba(165,230,0,0.25)' : 'rgba(255,255,255,0.06)'}`, opacity: past ? 0.55 : 1, animation: 'fadeIn 0.2s ease', transition: 'all 0.2s', transform: hov && !past ? 'translateY(-2px)' : 'translateY(0)', boxShadow: hov && !past ? '0 8px 24px rgba(0,0,0,0.5)' : 'none' }}>
      {/* Cover */}
      <div style={{ height: 84, background: ev.coverColor ?? '#1a1a2e', backgroundImage: ev.imageUrl && !isVideoUrl(ev.imageUrl) ? `url(${ev.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
        {isVideoUrl(ev.imageUrl) && <video src={ev.imageUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%)', zIndex: 1 }} />
        {past && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>ENCERRADO</span></div>}
      </div>
      <div style={{ background: '#0f1012', padding: '10px 12px' }}>
        <p style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 13, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
        <p style={{ color: ACCENT, fontSize: 11, margin: '0 0 2px', fontWeight: 600 }}>📆 {fmtEventDate(ev.startsAt)}</p>
        {ev.endsAt && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 2px' }}>⏱ Até {fmtEventDate(ev.endsAt)}</p>}
        {ev.location && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 6px' }}>📍 {ev.location}</p>}
        {ev.description && <p style={{ color: TEXT_NORMAL, fontSize: 12, margin: '0 0 8px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</p>}
        {!past && (
          <button onClick={() => onRsvp(ev.id)}
            style={{ background: ev.myRsvp ? 'rgba(165,230,0,0.1)' : `linear-gradient(135deg, ${ACCENT}, #7BC800)`, color: ev.myRsvp ? ACCENT : '#000', border: ev.myRsvp ? `1px solid rgba(165,230,0,0.4)` : 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', width: '100%' }}
            onMouseEnter={e => !ev.myRsvp && ((e.currentTarget as any).style.boxShadow = '0 4px 12px rgba(165,230,0,0.3)')}
            onMouseLeave={e => !ev.myRsvp && ((e.currentTarget as any).style.boxShadow = 'none')}>
            {ev.myRsvp ? `✓ Vou lá · ${ev.rsvpCount ?? 0}` : `Participar · ${ev.rsvpCount ?? 0}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SIMPLE MODAL ────────────────────────────────────────────────────────────
function SimpleModal({ title, children, onClose, maxWidth = 480 }: { title: string; children: React.ReactNode; onClose: () => void; maxWidth?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.15s ease' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }} />
      <div style={{ position: 'relative', zIndex: 10, background: '#0d0e10', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 20, padding: 28, width: '100%', maxWidth, maxHeight: '88vh', overflowY: 'auto', animation: 'slideUp 0.2s cubic-bezier(.4,0,.2,1)', boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(165,230,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(255,255,255,0.08)`, color: TEXT_MUTED, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as any).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as any).style.color = TEXT_MUTED; }}
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── CHANNEL ROW ─────────────────────────────────────────────────────────────
function ChannelRow({ ch, active, canManage, onSelect, onSettings }: { ch: Channel; active: boolean; canManage: boolean; onSelect: (ch: Channel) => void; onSettings: (ch: Channel) => void; }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="ch-row" style={{ width: 'calc(100% - 16px)', margin: '1px 8px', display: 'flex', alignItems: 'center', borderRadius: 6, background: active ? 'rgba(165,230,0,0.08)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent', cursor: 'pointer', transition: 'background 0.12s, transform 0.12s' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => onSelect(ch)}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '6px 8px', gap: 6 }}>
        <span style={{ color: active ? ACCENT : hovered ? TEXT_NORMAL : TEXT_MUTED, fontSize: 17, fontWeight: 300, lineHeight: 1, transition: 'color 0.12s' }}>#</span>
        <span style={{ color: active ? TEXT_BRIGHT : hovered ? TEXT_NORMAL : TEXT_MUTED, fontSize: 14, fontWeight: active ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, transition: 'color 0.12s' }}>{ch.name}</span>
        {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: '0 0 6px rgba(165,230,0,0.8)', flexShrink: 0 }} />}
      </div>
      {canManage && hovered && (
        <div style={{ display: 'flex', gap: 2, paddingRight: 6 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onSettings(ch)} title="Editar canal" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: TEXT_MUTED, cursor: 'pointer', width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, transition: 'all 0.1s' }}
            onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.18)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; }}
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as any).style.color = TEXT_MUTED; }}>⚙</button>
        </div>
      )}
    </div>
  );
}

// ─── MESSAGE BODY ─────────────────────────────────────────────────────────────
function MessageBody({ msg, mt }: { msg: Msg; mt: string }) {
  if (msg.attachmentUrls?.length) return (
    <div>
      {msg.attachmentUrls.map((u, i) => /\.(png|jpe?g|gif|webp)$/i.test(u) ? (
        <img key={i} src={u} alt="" style={{ maxWidth: 400, maxHeight: 300, borderRadius: 8, display: 'block', marginBottom: 4, cursor: 'pointer' }} onClick={() => window.open(u, '_blank')} />
      ) : (
        <a key={i} href={u} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '8px 12px', marginBottom: 4, color: '#7EB6FF', fontSize: 13, textDecoration: 'none', width: 'fit-content' }}>
          📄 {u.split('/').pop()}
        </a>
      ))}
      {msg.content?.trim() && <p style={{ color: TEXT_NORMAL, fontSize: 15, margin: '4px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>}
    </div>
  );
  if (mt === 'image' && msg.imageUrl) return (
    <div>
      <img src={msg.imageUrl} alt="" style={{ maxWidth: 400, maxHeight: 300, borderRadius: 8, display: 'block', cursor: 'pointer' }} onClick={() => window.open(msg.imageUrl!, '_blank')} />
      {msg.content?.trim() && <p style={{ color: TEXT_NORMAL, fontSize: 14, margin: '6px 0 0' }}>{msg.content}</p>}
    </div>
  );
  if ((mt === 'embed' || msg.embedJson) && msg.embedJson) {
    const e = msg.embedJson as any;
    return (
      <div style={{ borderLeft: `4px solid ${e.color || '#7C6FAD'}`, background: 'rgba(0,0,0,0.2)', borderRadius: '0 8px 8px 0', padding: '10px 12px 10px 16px', marginTop: 2 }}>
        {e.title && <p style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>{e.title}</p>}
        {e.description && <p style={{ color: TEXT_NORMAL, fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{e.description}</p>}
        {e.imageUrl && <img src={e.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 6, marginTop: 8 }} />}
        {e.footer && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '6px 0 0' }}>{e.footer}</p>}
      </div>
    );
  }
  const content = msg.content ?? '';
  if (msg.mentions?.everyone) {
    const parts = content.split('@everyone');
    return (
      <p style={{ color: TEXT_NORMAL, fontSize: 15, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <mark style={{ background: 'rgba(250,168,26,0.2)', color: '#FAA81A', borderRadius: 3, padding: '0 2px' }}>@everyone</mark>}</span>)}
      </p>
    );
  }
  return <p style={{ color: TEXT_NORMAL, fontSize: 15, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</p>;
}

// ─── REACTIONS BAR ───────────────────────────────────────────────────────────
function ReactionsBar({ rx, onReact }: { rx: { emoji: string; count: number; me: boolean }[]; onReact: (e: string) => void }) {
  if (!rx.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {rx.map(r => (
        <button key={r.emoji} onClick={() => onReact(r.emoji)}
          style={{ background: r.me ? ACCENT_DIM : 'rgba(0,0,0,0.25)', border: `1px solid ${r.me ? ACCENT : BORDER_SUBTLE}`, borderRadius: 12, padding: '2px 8px', fontSize: 13, color: r.me ? ACCENT : TEXT_BRIGHT, cursor: 'pointer', transition: 'all 0.12s' }}
          onMouseEnter={ev => { if (!r.me) ev.currentTarget.style.borderColor = ACCENT + '66'; }}
          onMouseLeave={ev => { if (!r.me) ev.currentTarget.style.borderColor = BORDER_SUBTLE; }}>
          {r.emoji} {r.count}
        </button>
      ))}
    </div>
  );
}

// ─── MESSAGE ACTIONS ─────────────────────────────────────────────────────────
function MsgActions({ canDel, isOwn, isMod, isPinned, showEmojiPicker, onToggleEmojiPicker, onDelete, onEdit, onReply, onReact, onPin }: {
  canDel: boolean; isOwn: boolean; isMod: boolean; isPinned: boolean;
  showEmojiPicker: boolean; onToggleEmojiPicker: (e: React.MouseEvent) => void;
  onDelete: () => void; onEdit: () => void; onReply: () => void;
  onReact: (emoji: string) => void; onPin: () => void;
}) {
  return (
    <div className="msg-actions" style={{ position: 'absolute', right: 8, top: -22, background: '#0e0f11', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, display: 'flex', gap: 1, padding: '2px 4px', opacity: 0, transition: 'opacity 0.12s', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      {(['👍', '❤️', '😂', '🔥'] as const).map(e => (
        <Tooltip key={e} text={e}>
          <button onClick={() => onReact(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '3px 5px', borderRadius: 4 }}
            onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER}
            onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>{e}</button>
        </Tooltip>
      ))}
      <div style={{ position: 'relative' }}>
        <Tooltip text="Reagir">
          <button onClick={onToggleEmojiPicker} style={{ background: showEmojiPicker ? BG_HOVER : 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }}
            onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER}
            onMouseLeave={ev => { if (!showEmojiPicker) ev.currentTarget.style.background = 'none'; }}>😊</button>
        </Tooltip>
        {showEmojiPicker && <EmojiPickerPopover onSelect={onReact} onClose={() => onToggleEmojiPicker({ stopPropagation: () => { } } as any)} />}
      </div>
      <div style={{ width: 1, height: 18, background: BORDER_SUBTLE, alignSelf: 'center', margin: '0 1px' }} />
      <Tooltip text="Responder"><button onClick={onReply} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>↩</button></Tooltip>
      {isMod && <Tooltip text={isPinned ? 'Desafixar' : 'Fixar'}><button onClick={onPin} style={{ background: isPinned ? ACCENT_DIM : 'none', border: 'none', color: isPinned ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => { if (!isPinned) ev.currentTarget.style.background = BG_HOVER; }} onMouseLeave={ev => { if (!isPinned) ev.currentTarget.style.background = 'none'; }}>📌</button></Tooltip>}
      {isOwn && <Tooltip text="Editar"><button onClick={onEdit} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>✏️</button></Tooltip>}
      {canDel && <Tooltip text="Apagar"><button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ED4245', cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(237,66,69,0.15)'} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>🗑</button></Tooltip>}
    </div>
  );
}

// ─── SERVER GUIDE ────────────────────────────────────────────────────────────
function ServerGuide({ server, events, isAdmin, onClose, onEditServer, onCreateEvent, onInvite }: {
  server: Server;
  events: CommunityEvent[];
  isAdmin: boolean;
  onClose: () => void;
  onEditServer: () => void;
  onCreateEvent: () => void;
  onInvite: () => void;
}) {
  const upcomingEvs = events.filter(e => new Date(e.startsAt) > new Date()).slice(0, 3);
  const [copied, setCopied] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState(server.description ?? '');
  const [savingAbout, setSavingAbout] = useState(false);

  async function handleSaveAbout() {
    setSavingAbout(true);
    try { await api.patch(`/community/servers/${server.id}`, { description: aboutText }); }
    catch { /* best effort */ }
    finally { setSavingAbout(false); setEditingAbout(false); }
  }

  function copyInvite() {
    navigator.clipboard.writeText(server.inviteCode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const bannerBg = server.bannerUrl
    ? `url(${server.bannerUrl})`
    : server.bannerColor
      ? server.bannerColor
      : 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)';

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#000', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease' }}>
      {/* Hero Banner */}
      <div style={{ position: 'relative', height: 220, background: server.bannerUrl && !isVideoUrl(server.bannerUrl) ? 'transparent' : (server.bannerColor ?? '#0d1117'), backgroundImage: server.bannerUrl && !isVideoUrl(server.bannerUrl) ? `url(${server.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, overflow: 'hidden' }}>
        {isVideoUrl(server.bannerUrl) && <video src={server.bannerUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        {/* gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 70%, #000 100%)' }} />

        {/* top actions */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={onEditServer}
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: TEXT_NORMAL, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; }}
              onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(0,0,0,0.5)'; (e.currentTarget as any).style.color = TEXT_NORMAL; }}>
              ⚙️ Editar servidor
            </button>
          )}
          <button onClick={onInvite}
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, border: 'none', color: '#000', borderRadius: 8, padding: '6px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(165,230,0,0.3)', transition: 'all 0.15s' }}
            onMouseEnter={e => (e.currentTarget as any).style.boxShadow = '0 6px 24px rgba(165,230,0,0.5)'}
            onMouseLeave={e => (e.currentTarget as any).style.boxShadow = '0 4px 16px rgba(165,230,0,0.3)'}>
            👤 Convidar
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', padding: '64px 44px 48px', maxWidth: 860, width: '100%' }}>
        {/* floating server icon */}
        <div style={{ position: 'absolute', top: -48, left: 44 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, border: '4px solid #000', overflow: 'hidden', background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', animation: 'glow 4s ease-in-out infinite' }}>
            {server.imageUrl
              ? (isVideoUrl(server.imageUrl) ? <video src={server.imageUrl} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={server.imageUrl} alt={server.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
              : <span style={{ color: ACCENT, fontSize: 36, fontWeight: 800 }}>{server.name[0].toUpperCase()}</span>}
          </div>
        </div>

        {/* Name + stats row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: TEXT_BRIGHT, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{server.name}</h1>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <span style={{ color: TEXT_MUTED, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: '0 0 8px rgba(165,230,0,0.6)' }} />
                {server.membersCount} membros
              </span>
              <span style={{ color: TEXT_MUTED, fontSize: 13 }}>📢 {server.channels.length} canais</span>
              {upcomingEvs.length > 0 && <span style={{ color: ACCENT, fontSize: 13 }}>📅 {upcomingEvs.length} evento{upcomingEvs.length > 1 ? 's' : ''} próximos</span>}
            </div>
          </div>
          {/* Invite code pill */}
          <button onClick={copyInvite}
            style={{ background: copied ? 'rgba(165,230,0,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(165,230,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: copied ? ACCENT : TEXT_MUTED }}>{server.inviteCode}</span>
            <span style={{ fontSize: 12, color: copied ? ACCENT : TEXT_MUTED }}>{copied ? '✓ Copiado!' : '📋 Copiar convite'}</span>
          </button>
        </div>

        <div style={{ width: '100%', height: 1, background: BORDER_SUBTLE, margin: '20px 0' }} />

        {/* About — full width */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 700, margin: 0 }}>📋 Sobre o servidor</h2>
            {isAdmin && !editingAbout && (
              <button onClick={() => setEditingAbout(true)}
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as any).style.color = ACCENT; (e.currentTarget as any).style.borderColor = ACCENT + '66'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.color = TEXT_MUTED; (e.currentTarget as any).style.borderColor = BORDER_SUBTLE; }}>
                ✏️ Editar
              </button>
            )}
          </div>
          {editingAbout ? (
            <div>
              <textarea value={aboutText} onChange={e => setAboutText(e.target.value)} rows={8} maxLength={2000}
                placeholder="Descreve o teu servidor — regras, propósito, recursos, considerações…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(165,230,0,0.25)`, borderRadius: 8, padding: '12px 16px', color: TEXT_BRIGHT, fontSize: 14, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box', minHeight: 140 }} />
              <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '4px 0 10px', textAlign: 'right' }}>{aboutText.length}/2000</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingAbout(false)} style={{ background: 'transparent', color: TEXT_MUTED, border: 'none', padding: '7px 14px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}>Cancelar</button>
                <button onClick={handleSaveAbout} disabled={savingAbout}
                  style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 7, padding: '7px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: savingAbout ? 0.7 : 1 }}>
                  {savingAbout ? '⏳ A guardar…' : '✓ Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: aboutText ? TEXT_NORMAL : TEXT_MUTED, fontSize: 14, margin: 0, lineHeight: 1.8, fontStyle: aboutText ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
              {aboutText || (isAdmin ? 'Clica em "Editar" para adicionar uma descrição do servidor.' : 'Este servidor ainda não tem descrição.')}
            </p>
          )}
        </div>

        {/* Two-column layout — events+channels LEFT, members+roles RIGHT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {/* Upcoming Events */}
            {upcomingEvs.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 700, margin: 0 }}>📅 Próximos eventos</h2>
                  {isAdmin && (
                    <button onClick={onCreateEvent}
                      style={{ background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, border: 'none', color: '#000', borderRadius: 7, padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(165,230,0,0.25)', transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as any).style.boxShadow = '0 4px 16px rgba(165,230,0,0.45)'}
                      onMouseLeave={e => (e.currentTarget as any).style.boxShadow = '0 2px 10px rgba(165,230,0,0.25)'}>
                      + Novo evento
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcomingEvs.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 12, transition: 'all 0.15s', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.055)'; (e.currentTarget as any).style.borderColor = 'rgba(165,230,0,0.2)'; (e.currentTarget as any).style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as any).style.borderColor = BORDER_SUBTLE; (e.currentTarget as any).style.transform = 'none'; }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: ev.coverColor ?? '#1a1a2e', backgroundImage: ev.imageUrl ? `url(${ev.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!ev.imageUrl && <span style={{ fontSize: 22 }}>📅</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px', color: TEXT_BRIGHT, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                        <p style={{ margin: '0 0 4px', color: ACCENT, fontSize: 12 }}>{fmtEventDate(ev.startsAt)}</p>
                        {ev.location && <p style={{ margin: 0, color: TEXT_MUTED, fontSize: 12 }}>📍 {ev.location}</p>}
                      </div>
                      {(ev.rsvpCount ?? 0) > 0 && <span style={{ color: TEXT_MUTED, fontSize: 11, alignSelf: 'center', flexShrink: 0 }}>👥 {ev.rsvpCount}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Channels */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 16, padding: '20px 24px' }}>
              <h2 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>💬 Canais</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {server.channels.slice(0, 12).map(ch => (
                  <button key={ch.id} onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '6px 14px', color: TEXT_NORMAL, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(165,230,0,0.1)'; (e.currentTarget as any).style.color = ACCENT; (e.currentTarget as any).style.borderColor = 'rgba(165,230,0,0.3)'; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as any).style.color = TEXT_NORMAL; (e.currentTarget as any).style.borderColor = BORDER_SUBTLE; }}>
                    <span style={{ color: TEXT_MUTED, fontSize: 14 }}>#</span> {ch.name}
                  </button>
                ))}
                {server.channels.length > 12 && <span style={{ color: TEXT_MUTED, fontSize: 13, padding: '6px 0' }}>+{server.channels.length - 12} mais</span>}
              </div>
            </div>
          </div>

          {/* Right column — members + roles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 16, padding: '18px 20px' }}>
              <h3 style={{ color: TEXT_BRIGHT, fontSize: 13, fontWeight: 700, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>👥 Membros</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {server.members.slice(0, 6).map(m => {
                  const name = m.profile?.displayName ?? m.profile?.username ?? 'Utilizador';
                  const acc = memberAccentColor(m, server.ownerId);
                  return (
                    <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar src={m.profile?.avatarUrl} name={name} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <DisplayName profile={m.profile} fallbackName={name} baseColor={acc} style={{ fontSize: 13, fontWeight: 600 }} />
                      </div>
                      {m.userId === server.ownerId && <span style={{ fontSize: 10, color: '#F0B132', flexShrink: 0 }}>👑</span>}
                    </div>
                  );
                })}
                {server.members.length > 6 && <p style={{ color: TEXT_MUTED, fontSize: 12, margin: '4px 0 0' }}>e mais {server.members.length - 6} membros…</p>}
              </div>
            </div>
            {server.roles.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 16, padding: '18px 20px' }}>
                <h3 style={{ color: TEXT_BRIGHT, fontSize: 13, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎖 Cargos</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {server.roles.map(r => (
                    <span key={r.id} style={{ fontSize: 11, background: (r.color || '#7C6FAD') + '20', color: r.color || '#7C6FAD', border: `1px solid ${(r.color || '#7C6FAD')}40`, borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>{r.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enter channels — full width, always at bottom */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${BORDER_SUBTLE}` }}>
          <button onClick={onClose}
            style={{ width: '100%', background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, border: 'none', color: '#000', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 24px rgba(165,230,0,0.35)', transition: 'all 0.2s', letterSpacing: '0.01em' }}
            onMouseEnter={e => { (e.currentTarget as any).style.transform = 'translateY(-2px)'; (e.currentTarget as any).style.boxShadow = '0 10px 32px rgba(165,230,0,0.5)'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.transform = 'none'; (e.currentTarget as any).style.boxShadow = '0 6px 24px rgba(165,230,0,0.35)'; }}>
            💬 Entrar nos canais
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ServerPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const updateUserProfile = useAuthStore(s => s.updateUserProfile);
  const { socket, connected } = useCommunitySocket();

  // Data
  const [server, setServer] = useState<Server | null>(null);
  const [myServers, setMyServers] = useState<MyServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [events, setEvents] = useState<CommunityEvent[]>([]);

  // UI
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCh, setShowCh] = useState(false);
  const [chName, setChName] = useState('');
  const [chCategoryId, setChCategoryId] = useState('');
  const [showCat, setShowCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const [channelSettingsTarget, setChannelSettingsTarget] = useState<Channel | null>(null);
  const [memberMenuUserId, setMemberMenuUserId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [typingIds, setTypingIds] = useState<Record<string, boolean>>({});
  const [showPins, setShowPins] = useState(false);
  const [pins, setPins] = useState<Msg[]>([]);
  const [memberSearchQ, setMemberSearchQ] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef<string | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const myMember = server?.members.find(m => m.userId === user?.id);
  const isAdmin = myMember?.role === 'admin';
  const isMod = isAdmin || myMember?.communityRole?.canModerate === true;
  const canManageCh = isAdmin || myMember?.communityRole?.canManageChannels === true;

  useEffect(() => { api.get<MyServer[]>('/community/servers').then(setMyServers).catch(() => { }); }, []);

  const refreshServer = useCallback(async () => {
    if (!serverId) return;
    const d = await api.get<Server>(`/community/servers/${serverId}`);
    setServer(d);
  }, [serverId]);

  useEffect(() => {
    if (!serverId) return;
    api.get<Server>(`/community/servers/${serverId}`)
      .then(d => { setServer(d); setShowGuide(true); setShowMembersPanel(false); })
      .catch(() => router.push('/main/community'))
      .finally(() => setLoading(false));

    api.get<CommunityEvent[]>(`/community/servers/${serverId}/events`)
      .then(setEvents)
      .catch(console.error);
  }, [serverId, router]);

  useEffect(() => {
    if (!channel) return;
    setLoadingMsgs(true); setMsgs([]);
    api.get<Msg[]>(`/community/channels/${channel.id}/messages`).then(setMsgs).catch(console.error).finally(() => setLoadingMsgs(false));
  }, [channel]);

  useEffect(() => {
    if (!socket || !connected || !channel) return;
    if (joinedRef.current && joinedRef.current !== channel.id) socket.emit('channel.leave', { channelId: joinedRef.current });
    if (joinedRef.current !== channel.id) { socket.emit('channel.join', { channelId: channel.id }); joinedRef.current = channel.id; }
  }, [socket, connected, channel]);

  useEffect(() => {
    if (!socket) return;
    const h = (msg: Msg) => { if (msg.channelId !== channel?.id) return; setMsgs(p => p.some(m => m.id === msg.id) ? p : [...p, msg]); };
    const del = (payload: { id?: string; messageId?: string; channelId: string }) => { if (payload.channelId !== channel?.id) return; const mid = payload.id ?? payload.messageId; if (!mid) return; setMsgs(p => p.filter(m => m.id !== mid)); };
    const upd = (msg: Msg) => { if (msg.channelId !== channel?.id) return; setMsgs(p => p.map(m => m.id === msg.id ? msg : m)); };
    const react = (payload: { messageId: string; channelId: string; reactions: ReactionEntry[] }) => { if (payload.channelId !== channel?.id) return; setMsgs(p => p.map(m => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m)); };
    const typing = (payload: { channelId: string; userId: string; typing: boolean }) => { if (payload.channelId !== channel?.id || payload.userId === user?.id) return; setTypingIds(prev => { const next = { ...prev }; if (payload.typing) next[payload.userId] = true; else delete next[payload.userId]; return next; }); };
    socket.on('message.new', h); socket.on('message.deleted', del); socket.on('message.updated', upd); socket.on('reaction.updated', react); socket.on('typing.update', typing);
    return () => { socket.off('message.new', h); socket.off('message.deleted', del); socket.off('message.updated', upd); socket.off('reaction.updated', react); socket.off('typing.update', typing); };
  }, [socket, channel?.id, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    if (!emojiPickerMsgId) return;
    const h = () => setEmojiPickerMsgId(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [emojiPickerMsgId]);

  const emitTyping = useCallback(() => {
    if (!socket || !connected || !channel) return;
    socket.emit('typing.start', { channelId: channel.id });
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => { socket.emit('typing.stop', { channelId: channel.id }); typingStopRef.current = null; }, 2500);
  }, [socket, connected, channel]);

  const send = useCallback(() => {
    if (!text.trim() || !socket || !connected || !channel) return;
    if (editing) {
      socket.emit('message.edit', { channelId: channel.id, messageId: editing.id, content: text.trim() });
      setEditing(null);
    } else {
      socket.emit('message.send', { channelId: channel.id, content: text.trim(), replyToId: replyTo?.id ?? undefined });
    }
    setText(''); setReplyTo(null);
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    socket.emit('typing.stop', { channelId: channel.id });
  }, [text, socket, connected, channel, replyTo, editing]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleKick(targetUserId: string) {
    if (!server || !confirm('Expulsar este membro?')) return;
    try { await api.delete(`/community/servers/${server.id}/members/${targetUserId}`); setMemberMenuUserId(null); await refreshServer(); } catch (e: any) { alert(e.message); }
  }
  async function handleBan(targetUserId: string) {
    if (!server || !confirm('Banir este utilizador?')) return;
    try { await api.post(`/community/servers/${server.id}/ban/${targetUserId}`); setMemberMenuUserId(null); await refreshServer(); } catch (e: any) { alert(e.message); }
  }
  async function handleAssignRole(targetUserId: string, roleId: string) {
    if (!server) return;
    try { await api.patch(`/community/servers/${server.id}/members/${targetUserId}/role`, { communityRoleId: roleId || null }); setMemberMenuUserId(null); await refreshServer(); } catch (e: any) { alert(e.message); }
  }
  async function handleSaveServer(data: { name: string; description: string; bannerColor?: string; bannerFile?: File | null; iconFile?: File | null }) {
    if (!server) return;
    let bannerUrl: string | undefined;
    let imageUrl: string | undefined;
    if (data.bannerFile) bannerUrl = await uploadFile(data.bannerFile, server.id);
    if (data.iconFile) imageUrl = await uploadFile(data.iconFile, server.id);
    await api.patch(`/community/servers/${server.id}`, { name: data.name, description: data.description, bannerColor: data.bannerColor, bannerUrl, imageUrl });
    await refreshServer();
  }
  async function handleLeaveServer() {
    if (!server) return;
    await api.delete(`/community/servers/${server.id}/members/me`);
    router.push('/main/community');
  }
  async function handleDeleteServer() {
    if (!server) return;
    const input = prompt(`Para confirmar, escreve o nome do servidor: "${server.name}"`);
    if (input !== server.name) { if (input !== null) alert('Nome incorrecto.'); return; }
    try { await api.delete(`/community/servers/${server.id}`); router.push('/main/community'); } catch { alert('Não foi possível eliminar o servidor.'); }
  }
  async function handleDeleteChannel(channelId: string) {
    try { await api.delete(`/community/channels/${channelId}`); } catch { /* fallthrough */ }
    setServer(p => p ? { ...p, channels: p.channels.filter(c => c.id !== channelId) } : p);
    if (channel?.id === channelId) { const rest = server?.channels.filter(c => c.id !== channelId) ?? []; setChannel(rest[0] ?? null); }
    setChannelSettingsTarget(null);
  }
  async function handleSaveChannel(channelId: string, name: string, topic: string) {
    try { await api.patch(`/community/channels/${channelId}`, { name, topic }); } catch { /* optimistic */ }
    setServer(p => p ? { ...p, channels: p.channels.map(c => c.id === channelId ? { ...c, name, topic } : c) } : p);
    if (channel?.id === channelId) setChannel(p => p ? { ...p, name, topic } : p);
  }
  async function handleDeleteCategory(catId: string) {
    if (!server || !confirm('Eliminar esta categoria?')) return;
    try { await api.delete(`/community/servers/${server.id}/categories/${catId}`); } catch { /* optimistic */ }
    setServer(p => p ? { ...p, channelCategories: p.channelCategories.filter(c => c.id !== catId) } : p);
  }
  async function handleClearPastEvents() {
    if (!server) return;
    try {
      await api.delete(`/community/servers/${server.id}/events/past`);
      setEvents(p => p.filter(e => new Date(e.startsAt) > new Date()));
    } catch (e: any) { alert(e.message); }
  }
  async function handleCreateRole(name: string, color: string, perms: { canModerate: boolean; canManageServer: boolean; canManageChannels: boolean }) {
    if (!server) return;
    const role = await api.post<CommunityRole>(`/community/servers/${server.id}/roles`, { name, color, ...perms });
    setServer(p => p ? { ...p, roles: [...p.roles, role] } : p);
  }
  async function handleDeleteRole(roleId: string) {
    if (!server || !confirm('Eliminar este cargo?')) return;
    try { await api.delete(`/community/servers/${server.id}/roles/${roleId}`); setServer(p => p ? { ...p, roles: p.roles.filter(r => r.id !== roleId) } : p); } catch (e: any) { alert(e.message); }
  }
  async function handlePin(msg: Msg) {
    if (!channel) return;
    try {
      if (msg.pinned) await api.delete(`/community/channels/${channel.id}/pins/${msg.id}`);
      else await api.post(`/community/channels/${channel.id}/pins/${msg.id}`);
      setMsgs(p => p.map(m => m.id === msg.id ? { ...m, pinned: !m.pinned } : m));
    } catch (e: any) { alert(e.message); }
  }
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !channel || !socket || !server) return;
    setUploadingFile(true); setShowAttachMenu(false);
    try {
      const url = await uploadFile(file, server.id);
      const isImage = file.type.startsWith('image/');
      socket.emit('message.send', { channelId: channel.id, content: isImage ? '' : file.name, ...(isImage ? { imageUrl: url, messageType: 'image' } : { attachmentUrls: [url] }), replyToId: replyTo?.id ?? undefined });
      setReplyTo(null);
    } catch (err: any) { alert('Falha ao enviar: ' + err.message); }
    finally { setUploadingFile(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  async function handleSaveProfile() {
    setShowEditProfile(false);
    // Re-fetch the authenticated user so the auth store (and all UI that reads it)
    // gets the updated nameFont / nameEffect / nameColor / avatar / etc.
    try {
      const me = await api.get<{ id: string; email: string; profile?: any }>('/auth/me');
      updateUserProfile(me.profile ?? {});
    } catch { /* best-effort */ }
    await refreshServer(); // also refresh server members so the sidebar & guide update
  }
  async function createChannel() {
    if (!chName.trim() || !server) return;
    try { const ch = await api.post<Channel>(`/community/servers/${server.id}/channels`, { name: chName, categoryId: chCategoryId || null }); setServer(p => p ? { ...p, channels: [...p.channels, ch] } : p); setChannel(ch); setShowCh(false); setChName(''); setChCategoryId(''); } catch (e: any) { alert(e.message); }
  }
  async function createCategory() {
    if (!newCatName.trim() || !server) return;
    try { await api.post(`/community/servers/${server.id}/categories`, { name: newCatName }); await refreshServer(); setNewCatName(''); setShowCat(false); } catch (e: any) { alert(e.message); }
  }
  function handleRsvp(eventId: string) {
    setEvents(p => p.map(e => e.id === eventId ? { ...e, myRsvp: !e.myRsvp, rsvpCount: (e.rsvpCount ?? 0) + (e.myRsvp ? -1 : 1) } : e));
    api.post<{ rsvpCount: number; myRsvp: boolean }>(`/community/events/${eventId}/rsvp`)
      .then(res => setEvents(p => p.map(e => e.id === eventId ? { ...e, rsvpCount: res.rsvpCount, myRsvp: res.myRsvp } : e)))
      .catch(console.error);
  }

  function mname(m: Member) {
    if (m.userId === user?.id) return user?.profile?.displayName ?? user?.profile?.username ?? 'Tu';
    return m.profile?.displayName ?? m.profile?.username ?? `user_${m.userId.slice(0, 6)}`;
  }

  const typingNames = Object.keys(typingIds).map(uid => server?.members.find(x => x.userId === uid)).filter(Boolean).map(m => mname(m as Member)).slice(0, 3);
  const memberMenuTarget = memberMenuUserId ? server?.members.find(m => m.userId === memberMenuUserId) : undefined;

  const channelsByCategory = useMemo(() => {
    if (!server) return { uncategorized: [] as Channel[], byCat: new Map<string, Channel[]>() };
    const uncategorized: Channel[] = []; const byCat = new Map<string, Channel[]>();
    for (const ch of server.channels) {
      if (!ch.categoryId) uncategorized.push(ch);
      else { const arr = byCat.get(ch.categoryId) ?? []; arr.push(ch); byCat.set(ch.categoryId, arr); }
    }
    uncategorized.sort((a, b) => a.position - b.position);
    for (const arr of byCat.values()) arr.sort((a, b) => a.position - b.position);
    return { uncategorized, byCat };
  }, [server]);

  const upcomingEvents = events.filter(e => new Date(e.startsAt) > new Date());

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: BG_DARKEST }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${ACCENT_DIM}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!server) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: BG_DARKEST, overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes fadeIn     { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp    { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes slideDown  { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
        @keyframes slideLeft  { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: none; } }
        @keyframes popIn      { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
        @keyframes msgIn      { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes glow       { 0%,100% { box-shadow: 0 0 12px rgba(165,230,0,0.2); } 50% { box-shadow: 0 0 28px rgba(165,230,0,0.5); } }
        @keyframes float      { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes pulse      { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
        .ch-row:hover .ch-actions { opacity: 1 !important; }
        input, textarea, select { outline: none !important; color-scheme: dark; font-family: inherit; }
        input:focus, textarea:focus, select:focus { outline: none !important; box-shadow: none !important; border-color: inherit !important; }

        .msg-row:hover .msg-actions { opacity: 1 !important; }
        .msg-row { transition: background 0.1s; }
        .msg-row:hover { background: rgba(255,255,255,0.025); border-radius: 6px; }
        button { font-family: inherit; }
      `}</style>

      {/* ── 1. SERVERS SIDEBAR ─── */}
      <div style={{ width: 72, background: BG_DARKEST, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, overflowY: 'auto', flexShrink: 0, borderRight: `1px solid ${BORDER_SUBTLE}` }}>
        <button onClick={() => router.push('/main/community')} title="Início" style={{ width: 48, height: 48, borderRadius: '40%', background: BG_LIGHT, border: '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: ACCENT, fontSize: 20, flexShrink: 0, transition: 'border-radius 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderRadius = '50%'}
          onMouseLeave={e => e.currentTarget.style.borderRadius = '40%'}>✦</button>
        <div style={{ width: 32, height: 2, background: BORDER_SUBTLE, borderRadius: 1, marginBottom: 8 }} />
        {myServers.map(s => (
          <ServerIcon key={s.id} server={s} active={s.id === serverId} onClick={() => router.push(`/main/community/${s.id}`)} />
        ))}
        <button onClick={() => router.push('/main/community')} title="Ver todos os servidores"
          style={{ width: 48, height: 48, borderRadius: '40%', background: BG_LIGHT, border: `2px dashed rgba(165,230,0,0.3)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8, color: ACCENT, fontSize: 22, flexShrink: 0, transition: 'border-radius 0.2s, border-color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderRadius = '50%'; e.currentTarget.style.borderColor = ACCENT; }}
          onMouseLeave={e => { e.currentTarget.style.borderRadius = '40%'; e.currentTarget.style.borderColor = 'rgba(165,230,0,0.3)'; }}>+</button>
      </div>

      {/* ── 2. CHANNEL SIDEBAR ─── */}
      <div style={{ width: 240, background: '#07080a', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid rgba(255,255,255,0.04)` }}>
        {/* Banner do servidor */}
        {(server.bannerUrl || server.bannerColor) && (
          <div style={{ height: 80, background: server.bannerColor ?? '#1a1a2e', backgroundImage: server.bannerUrl && !isVideoUrl(server.bannerUrl) ? `url(${server.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            {isVideoUrl(server.bannerUrl) && <video src={server.bannerUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(7,8,10,0.7) 100%)', zIndex: 1 }} />
          </div>
        )}
        {/* Server header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid rgba(255,255,255,0.05)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, userSelect: 'none', transition: 'background 0.15s', flexShrink: 0 }}
          onClick={() => setShowServerMenu(p => !p)}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 800, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{server.name}</h2>
          <span style={{ color: TEXT_MUTED, fontSize: 10, transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)', display: 'inline-block', transform: showServerMenu ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>

        {/* Server dropdown */}
        {showServerMenu && (
          <div style={{ background: '#0b0c0e', margin: '4px 8px 8px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.08)`, overflow: 'hidden', animation: 'slideDown 0.15s cubic-bezier(.4,0,.2,1)', boxShadow: '0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(165,230,0,0.06)', backdropFilter: 'blur(8px)' }}>
            <div style={{ padding: '4px 0' }}>
              {[
                { label: 'Convidar para o servidor', icon: '👤', action: () => { setShowInvite(true); setShowServerMenu(false); } },
                { label: 'Configurações do servidor', icon: '⚙️', action: () => { setShowServerSettings(true); setShowServerMenu(false); }, admin: true },
                { label: 'Criar canal', icon: '#️⃣', action: () => { setShowCh(true); setShowServerMenu(false); }, admin: true },
                { label: 'Criar categoria', icon: '🏷️', action: () => { setShowCat(true); setShowServerMenu(false); }, admin: true },
                { label: 'Criar evento', icon: '📅', action: () => { setShowCreateEvent(true); setShowServerMenu(false); }, admin: true },
                null,
                { label: 'Sair do servidor', icon: '🚪', action: handleLeaveServer, danger: true },
              ].map((item, i) => item === null ? (
                <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
              ) : (
                (!item.admin || isAdmin) && (
                  <button key={i} onClick={item.action} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: (item as any).danger ? '#ED4245' : TEXT_NORMAL, padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.1s', borderRadius: 0 }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = (item as any).danger ? 'rgba(237,66,69,0.12)' : 'rgba(255,255,255,0.06)'; (e.currentTarget as any).style.color = (item as any).danger ? '#FF6B6B' : TEXT_BRIGHT; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'transparent'; (e.currentTarget as any).style.color = (item as any).danger ? '#ED4245' : TEXT_NORMAL; }}>
                    <span style={{ width: 20, textAlign: 'center', fontSize: 15 }}>{item.icon}</span>
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Channel list */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {/* Guide entry */}
          <button
            onClick={() => setShowGuide(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: showGuide ? 'rgba(165,230,0,0.1)' : 'transparent', border: 'none', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', color: showGuide ? ACCENT : TEXT_MUTED, fontSize: 13, fontWeight: showGuide ? 700 : 500, transition: 'all 0.12s', margin: '6px 4px 2px', boxSizing: 'border-box' }}
            onMouseEnter={e => { if (!showGuide) { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; } }}
            onMouseLeave={e => { if (!showGuide) { (e.currentTarget as any).style.background = 'transparent'; (e.currentTarget as any).style.color = TEXT_MUTED; } }}>
            <span style={{ fontSize: 15 }}>🗺️</span>
            <span>Guia do Servidor</span>
          </button>
          {channelsByCategory.uncategorized.length > 0 && (
            <div style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 4px 16px', marginBottom: 2 }}>
                <span style={{ flex: 1, color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Canais de texto</span>
                {canManageCh && <button onClick={() => setShowCh(true)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>+</button>}
              </div>
              {channelsByCategory.uncategorized.map(ch => <ChannelRow key={ch.id} ch={ch} active={channel?.id === ch.id} canManage={canManageCh} onSelect={ch => { setChannel(ch); setShowGuide(false); }} onSettings={setChannelSettingsTarget} />)}
            </div>
          )}
          {(server.channelCategories ?? []).map(cat => {
            const catChannels = channelsByCategory.byCat.get(cat.id) ?? [];
            const collapsed = collapsedCats[cat.id];
            return (
              <div key={cat.id} style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px 2px' }}>
                  <button type="button" onClick={() => setCollapsedCats(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', gap: 4, padding: '4px 8px', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = TEXT_BRIGHT}
                    onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}>
                    <span style={{ fontSize: 10, transition: 'transform 0.15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
                    <span style={{ flex: 1 }}>{cat.name}</span>
                  </button>
                  {canManageCh && <button onClick={() => { setShowCh(true); setChCategoryId(cat.id); }} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>+</button>}
                  {isAdmin && <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: 0.5, transition: 'opacity 0.1s, color 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ED4245'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = TEXT_MUTED; }}>×</button>}
                </div>
                {!collapsed && catChannels.map(ch => <ChannelRow key={ch.id} ch={ch} active={channel?.id === ch.id} canManage={canManageCh} onSelect={ch => { setChannel(ch); setShowGuide(false); }} onSettings={setChannelSettingsTarget} />)}
              </div>
            );
          })}

          {/* Próximos eventos na sidebar */}
          {upcomingEvents.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 8, borderTop: `1px solid ${BORDER_SUBTLE}` }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 4px 16px', marginBottom: 4 }}>
                <span style={{ flex: 1, color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Próximos eventos</span>
                <button onClick={() => setShowEventsPanel(p => !p)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 12, padding: '0 6px' }}>Ver todos</button>
              </div>
              {upcomingEvents.slice(0, 2).map(ev => (
                <div key={ev.id} onClick={() => setShowEventsPanel(true)} style={{ margin: '2px 8px', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${BORDER_SUBTLE}` }}>
                  <div style={{ height: 36, background: ev.coverColor ?? '#1a1a2e', backgroundImage: ev.imageUrl ? `url(${ev.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ background: '#18191c', padding: '6px 10px' }}>
                    <p style={{ margin: 0, color: TEXT_BRIGHT, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                    <p style={{ margin: 0, color: ACCENT, fontSize: 11 }}>{fmtEventDate(ev.startsAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User panel */}
        <div style={{ padding: '8px 10px', borderTop: `1px solid rgba(255,255,255,0.05)`, background: '#050607', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div onClick={() => setMemberMenuUserId(user?.id ?? null)} className="flex-shrink-0 border-2 border-accent/30 hover:border-accent hover:shadow-[0_0_10px_rgba(165,230,0,0.3)] transition-all rounded-full overflow-hidden cursor-pointer p-0.5">
            <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.displayName || user?.profile?.username || 'U'} size="sm" className="w-[30px] h-[30px]" />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#23A559', border: '2px solid #050607' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setMemberMenuUserId(user?.id ?? null)}>
            <DisplayName profile={user?.profile} fallbackName={user?.profile?.username || 'U'} style={{ fontSize: 13, fontWeight: 600 }} />
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: 11 }}>@{user?.profile?.username}</p>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip text="Editar perfil"><button onClick={() => setShowEditProfile(true)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 15, padding: '4px 6px', borderRadius: 6, transition: 'all 0.12s' }} onMouseEnter={e => { (e.currentTarget as any).style.color = ACCENT; (e.currentTarget as any).style.background = 'rgba(165,230,0,0.08)'; }} onMouseLeave={e => { (e.currentTarget as any).style.color = TEXT_MUTED; (e.currentTarget as any).style.background = 'none'; }}>✏️</button></Tooltip>
            <Tooltip text="Configurações"><button onClick={() => setShowServerSettings(true)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 15, padding: '4px 6px', borderRadius: 6, transition: 'all 0.12s' }} onMouseEnter={e => { (e.currentTarget as any).style.color = ACCENT; (e.currentTarget as any).style.background = 'rgba(165,230,0,0.08)'; }} onMouseLeave={e => { (e.currentTarget as any).style.color = TEXT_MUTED; (e.currentTarget as any).style.background = 'none'; }}>⚙️</button></Tooltip>
          </div>
        </div>
      </div>

      {/* ── 3. MAIN AREA (Guide or Chat) ─── */}
      {showGuide && server ? (
        <ServerGuide
          server={server}
          events={events}
          isAdmin={isAdmin}
          onClose={() => { setShowGuide(false); if (!channel && server.channels.length > 0) setChannel(server.channels[0]); }}
          onEditServer={() => { setShowServerSettings(true); }}
          onCreateEvent={() => { setShowCreateEvent(true); }}
          onInvite={() => setShowInvite(true)}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}>
          {/* Topbar */}
          {channel && (
            <div style={{ height: 48, borderBottom: `1px solid rgba(255,255,255,0.04)`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <span style={{ color: ACCENT, fontSize: 20, fontWeight: 300, opacity: 0.8 }}>#</span>
              <span style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 15 }}>{channel.name}</span>
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{channel.topic?.trim() || 'Canal de texto'}</span>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {isMod && <Tooltip text="Fixadas">
                  <button onClick={() => { setShowPins(p => !p); if (!showPins) api.get<Msg[]>(`/community/channels/${channel.id}/pins`).then(setPins).catch(() => { }); }}
                    style={{ background: showPins ? 'rgba(165,230,0,0.1)' : 'none', border: 'none', color: showPins ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 15, padding: '5px 7px', borderRadius: 7, transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!showPins) { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; } }}
                    onMouseLeave={e => { if (!showPins) { (e.currentTarget as any).style.background = 'none'; (e.currentTarget as any).style.color = TEXT_MUTED; } }}>📌</button>
                </Tooltip>}
                <Tooltip text="Eventos">
                  <button onClick={() => setShowEventsPanel(p => !p)} style={{ background: showEventsPanel ? 'rgba(165,230,0,0.1)' : 'none', border: 'none', color: showEventsPanel ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 15, padding: '5px 7px', borderRadius: 7, transition: 'all 0.12s', position: 'relative' }}
                    onMouseEnter={e => { if (!showEventsPanel) { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; } }}
                    onMouseLeave={e => { if (!showEventsPanel) { (e.currentTarget as any).style.background = 'none'; (e.currentTarget as any).style.color = TEXT_MUTED; } }}>
                    📅
                    {upcomingEvents.length > 0 && <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: ACCENT, boxShadow: '0 0 6px rgba(165,230,0,0.8)', animation: 'pulse 2s infinite' }} />}
                  </button>
                </Tooltip>
                <Tooltip text={showMembersPanel ? 'Ocultar membros' : 'Mostrar membros'}>
                  <button onClick={() => setShowMembersPanel(p => !p)} style={{ background: showMembersPanel ? 'rgba(165,230,0,0.1)' : 'none', border: 'none', color: showMembersPanel ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 15, padding: '5px 7px', borderRadius: 7, transition: 'all 0.12s' }}
                    onMouseEnter={e => { if (!showMembersPanel) { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; } }}
                    onMouseLeave={e => { if (!showMembersPanel) { (e.currentTarget as any).style.background = 'none'; (e.currentTarget as any).style.color = TEXT_MUTED; } }}>👥</button>
                </Tooltip>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 8, padding: '4px 10px', gap: 6, marginLeft: 4 }}>
                  <input placeholder={`Buscar em #${channel.name}`} style={{ background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 13, width: 140 }} />
                  <span style={{ color: TEXT_MUTED, fontSize: 13 }}>🔍</span>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }} onClick={() => setEmojiPickerMsgId(null)}>
            {loadingMsgs && <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div style={{ width: 28, height: 28, border: `2px solid ${ACCENT_DIM}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
            {!loadingMsgs && msgs.length === 0 && channel && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 12, opacity: 0.4 }}>#</div>
                <h3 style={{ color: TEXT_BRIGHT, margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Bem-vindo a #{channel.name}!</h3>
                <p style={{ color: TEXT_MUTED, fontSize: 14 }}>Nenhuma mensagem ainda. Sê o primeiro a escrever algo.</p>
              </div>
            )}
            {msgs.map((msg, i) => {
              const prev = msgs[i - 1];
              const mt = msg.messageType || 'text';
              const grouped = !!(prev && prev.authorId === msg.authorId && prev.authorType === msg.authorType && !msg.replyTo && new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 300000);
              const isOwn = msg.authorId === user?.id && msg.authorType === 'user';
              const isBot = msg.authorType === 'bot';
              const canDel = (isOwn && msg.authorType === 'user') || isMod;
              const rx = aggregateReactions(msg.reactions, user?.id);
              const nameClr = isBot ? '#7EB6FF' : nameColor(msg.authorName);
              const av = msg.authorAvatarUrl;
              const showEmoji = emojiPickerMsgId === msg.id;
              const authorMember = server?.members.find(x => x.userId === msg.authorId);

              const actions = (
                <MsgActions
                  canDel={canDel} isOwn={isOwn && !isBot} isMod={isMod} isPinned={!!msg.pinned}
                  showEmojiPicker={showEmoji}
                  onToggleEmojiPicker={e => { e.stopPropagation(); setEmojiPickerMsgId(p => p === msg.id ? null : msg.id); }}
                  onReact={emoji => { socket?.emit('reaction.toggle', { channelId: channel?.id, messageId: msg.id, emoji }); setEmojiPickerMsgId(null); }}
                  onDelete={() => socket?.emit('message.delete', { messageId: msg.id, channelId: channel?.id })}
                  onEdit={() => { setEditing({ id: msg.id, text: msg.content }); setText(msg.content); setTimeout(() => inputRef.current?.focus(), 50); }}
                  onReply={() => { setReplyTo(msg); setTimeout(() => inputRef.current?.focus(), 50); }}
                  onPin={() => handlePin(msg)}
                />
              );

              if (grouped) return (
                <div key={msg.id} className="msg-row" style={{ display: 'flex', alignItems: 'flex-start', padding: '1px 0 1px 56px', position: 'relative', animation: 'fadeIn 0.12s ease' }}>
                  <div style={{ flex: 1 }}><MessageBody msg={msg} mt={mt} /><ReactionsBar rx={rx} onReact={emoji => socket?.emit('reaction.toggle', { channelId: channel?.id, messageId: msg.id, emoji })} /></div>
                  {actions}
                </div>
              );

              return (
                <div key={msg.id} className="msg-row" style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 0 2px', gap: 16, position: 'relative', animation: 'fadeIn 0.12s ease', marginTop: 8 }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: isBot ? '1px solid rgba(96,165,250,0.4)' : 'none', transition: 'opacity 0.1s' }}
                    onClick={() => { const m = server?.members.find(x => x.userId === msg.authorId); if (m) setMemberMenuUserId(m.userId); }}>
                    {isBot ? <span style={{ fontSize: 14, fontWeight: 800, color: '#93C5FD' }}>B</span> :
                      av ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                        <span style={{ color: nameClr, fontWeight: 700, fontSize: 16 }}>{msg.authorName[0]?.toUpperCase()}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {msg.replyTo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: TEXT_MUTED, fontSize: 12 }}>
                        <div style={{ width: 32, height: 10, borderTop: `2px solid ${BORDER_SUBTLE}`, borderLeft: `2px solid ${BORDER_SUBTLE}`, borderTopLeftRadius: 4, flexShrink: 0 }} />
                        <span style={{ color: nameColor(msg.replyTo.authorName), fontWeight: 600 }}>{msg.replyTo.authorName}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{msg.replyTo.content}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      {isBot
                        ? <span style={{ color: '#7EB6FF', fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => { const m = server?.members.find(x => x.userId === msg.authorId); if (m) setMemberMenuUserId(m.userId); }}>{msg.authorName}</span>
                        : <DisplayName profile={msg.authorProfile || authorMember?.profile} fallbackName={msg.authorName} baseColor={nameClr} style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => { const m = server?.members.find(x => x.userId === msg.authorId); if (m) setMemberMenuUserId(m.userId); }} />}
                      {isBot && <span style={{ fontSize: 10, background: 'rgba(96,165,250,0.15)', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>BOT</span>}
                      {msg.pinned && <span style={{ fontSize: 10, background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 3, padding: '1px 5px' }}>📌 FIXADA</span>}
                      <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{fmtDate(msg.createdAt)}</span>
                      {msg.editedAt && <span style={{ color: TEXT_MUTED, fontSize: 10, fontStyle: 'italic' }}>(editado)</span>}
                    </div>
                    <MessageBody msg={msg} mt={mt} />
                    <ReactionsBar rx={rx} onReact={emoji => socket?.emit('reaction.toggle', { channelId: channel?.id, messageId: msg.id, emoji })} />
                  </div>
                  {actions}
                </div>
              );
            })}
            {typingNames.length > 0 && <p style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: 'italic', padding: '4px 0 8px', animation: 'fadeIn 0.2s' }}>{typingNames.join(', ')} a escrever…</p>}
            <div ref={bottomRef} style={{ height: 8 }} />
          </div>

          {/* Pins inline */}
          {showPins && (
            <div style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, padding: '12px 16px', maxHeight: 240, overflowY: 'auto', background: '#0e0f13', flexShrink: 0, animation: 'slideDown 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: TEXT_BRIGHT, fontWeight: 600, fontSize: 14 }}>📌 Mensagens fixadas</span>
                <button onClick={() => setShowPins(false)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              {pins.length === 0 ? <p style={{ color: TEXT_MUTED, fontSize: 13 }}>Nenhuma mensagem fixada.</p> : pins.map(p => (
                <div key={p.id} style={{ padding: '8px 10px', background: BG_DARK, borderRadius: 6, marginBottom: 6, border: `1px solid ${BORDER_SUBTLE}` }}>
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600 }}>{p.authorName}</span>
                  <p style={{ color: TEXT_NORMAL, fontSize: 13, margin: '3px 0 0', whiteSpace: 'pre-wrap' }}>{p.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
            {(replyTo || editing) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', marginBottom: 0, background: 'rgba(165,230,0,0.05)', borderRadius: '12px 12px 0 0', border: `1px solid rgba(165,230,0,0.15)`, borderBottom: 'none', animation: 'slideDown 0.12s ease' }}>
                <span style={{ fontSize: 12, color: editing ? ACCENT : TEXT_MUTED, fontWeight: 500 }}>{editing ? '✏️ A editar mensagem' : `↩ A responder a ${replyTo?.authorName}`}</span>
                {!editing && replyTo && <span style={{ color: TEXT_MUTED, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>&ldquo;{replyTo.content}&rdquo;</span>}
                <button onClick={() => { setReplyTo(null); setEditing(null); setText(''); }} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 15, transition: 'color 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as any).style.color = '#fff'}
                  onMouseLeave={e => (e.currentTarget as any).style.color = TEXT_MUTED}>✕</button>
              </div>
            )}
            {showAttachMenu && (
              <div style={{ background: '#0b0c0e', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, padding: 6, marginBottom: 6, animation: 'slideDown 0.12s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                {[{ icon: '🖼️', label: 'Enviar imagem', accept: 'image/*' }, { icon: '📎', label: 'Enviar ficheiro', accept: '*' }].map(item => (
                  <button key={item.label} onClick={() => { if (fileRef.current) { fileRef.current.accept = item.accept; fileRef.current.click(); } setShowAttachMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', color: TEXT_NORMAL, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14, transition: 'all 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as any).style.color = TEXT_BRIGHT; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'none'; (e.currentTarget as any).style.color = TEXT_NORMAL; }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: (replyTo || editing) ? '0 0 14px 14px' : 14, padding: '0 14px', border: `1px solid rgba(255,255,255,0.08)`, gap: 8, opacity: connected ? 1 : 0.5, transition: 'opacity 0.2s, border-color 0.15s, box-shadow 0.15s' }}>
              <input ref={fileRef} type="file" hidden onChange={handleFileUpload} />
              <button onClick={() => setShowAttachMenu(p => !p)} disabled={uploadingFile}
                style={{ background: 'none', border: 'none', color: uploadingFile ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 22, padding: '10px 2px', lineHeight: 1, flexShrink: 0, transition: 'all 0.12s', transform: showAttachMenu ? 'rotate(45deg)' : 'rotate(0)' }}
                onMouseEnter={e => { if (!uploadingFile) (e.currentTarget as any).style.color = TEXT_BRIGHT; }}
                onMouseLeave={e => { if (!uploadingFile) (e.currentTarget as any).style.color = TEXT_MUTED; }}>
                {uploadingFile ? '⏳' : '+'}
              </button>
              <input ref={inputRef} value={text}
                onChange={e => { setText(e.target.value); emitTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'Escape') { setReplyTo(null); setEditing(null); setText(''); } }}
                placeholder={channel ? (connected ? `Mensagem em #${channel.name}` : 'A reconectar…') : 'Seleciona um canal'}
                disabled={!connected || !channel}
                style={{ flex: 1, background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 15, padding: '13px 0', minHeight: 46 }}
              />
              <button onClick={send} disabled={!text.trim() || !connected || !channel}
                style={{ background: text.trim() && connected && channel ? `linear-gradient(135deg, ${ACCENT}, #7BC800)` : 'rgba(255,255,255,0.05)', border: 'none', color: text.trim() && connected && channel ? '#000' : TEXT_MUTED, borderRadius: 9, padding: '7px 15px', fontSize: 14, fontWeight: 700, cursor: text.trim() && connected && channel ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0, boxShadow: text.trim() && connected && channel ? '0 4px 12px rgba(165,230,0,0.3)' : 'none' }}
                onMouseEnter={e => { if (text.trim() && connected && channel) (e.currentTarget as any).style.boxShadow = '0 6px 20px rgba(165,230,0,0.5)'; }}
                onMouseLeave={e => { if (text.trim() && connected && channel) (e.currentTarget as any).style.boxShadow = '0 4px 12px rgba(165,230,0,0.3)'; }}>➤</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. EVENTS PANEL ─── */}
      {showEventsPanel && (
        <EventsPanel events={events} isAdmin={isAdmin} onNew={() => setShowCreateEvent(true)} onRsvp={handleRsvp} onClose={() => setShowEventsPanel(false)} onClearPast={handleClearPastEvents} />
      )}

      {/* ── 5. MEMBERS SIDEBAR ─── */}
      {showMembersPanel && !showEventsPanel && (
        <div style={{ width: 240, background: '#07080a', overflowY: 'auto', flexShrink: 0, borderLeft: `1px solid rgba(255,255,255,0.04)`, animation: 'slideLeft 0.18s cubic-bezier(.4,0,.2,1)' }}>
          <div style={{ padding: '12px 12px 8px', position: 'sticky', top: 0, background: '#07080a', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 8, padding: '5px 10px', gap: 6, transition: 'border-color 0.15s' }}>
              <span style={{ color: TEXT_MUTED, fontSize: 13 }}>🔍</span>
              <input value={memberSearchQ} onChange={e => setMemberSearchQ(e.target.value)} placeholder="Pesquisar membros" style={{ background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 13, flex: 1 }} />
            </div>
          </div>
          {(() => {
            const filtered = server.members.filter(m => {
              if (!memberSearchQ) return true;
              const n = mname(m).toLowerCase();
              const u = (m.profile?.username ?? '').toLowerCase();
              return n.includes(memberSearchQ.toLowerCase()) || u.includes(memberSearchQ.toLowerCase());
            });
            const owners = filtered.filter(m => m.userId === server.ownerId);
            const admins = filtered.filter(m => m.role === 'admin' && m.userId !== server.ownerId && !m.communityRoleId);
            const roleGroups = server.roles.map(r => ({ role: r, members: filtered.filter(m => m.communityRoleId === r.id) })).filter(g => g.members.length > 0);
            const members = filtered.filter(m => m.role !== 'admin' && m.userId !== server.ownerId && !m.communityRoleId);
            const sections = [
              ...(owners.length ? [{ title: `DONO — ${owners.length}`, members: owners, color: '#F0B132' }] : []),
              ...roleGroups.map(g => ({ title: `${g.role.name.toUpperCase()} — ${g.members.length}`, members: g.members, color: g.role.color || TEXT_MUTED })),
              ...(admins.length ? [{ title: `ADMIN — ${admins.length}`, members: admins, color: '#ED4245' }] : []),
              ...(members.length ? [{ title: `MEMBROS — ${members.length}`, members, color: TEXT_MUTED }] : []),
            ];
            return sections.map(sec => (
              <div key={sec.title} style={{ marginBottom: 8 }}>
                <div style={{ padding: '8px 12px 4px', color: sec.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{sec.title}</div>
                {sec.members.map(m => {
                  const n = mname(m);
                  const typing = typingIds[m.userId];
                  const accent = memberAccentColor(m, server.ownerId);
                  return (
                    <button key={m.userId} onClick={() => setMemberMenuUserId(m.userId)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: 'calc(100% - 16px)', margin: '1px 8px', padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = BG_HOVER}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Avatar src={m.profile?.avatarUrl} name={n} size="sm" />
                        </div>
                        <div style={{ position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: '50%', background: typing ? '#F0B232' : ACCENT, border: `2px solid ${BG_DARK}`, transition: 'background 0.3s' }} />
                      </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><DisplayName profile={m.profile} fallbackName={n} baseColor={accent} style={{ fontSize: 14, fontWeight: 600 }} /></p>
                        {typing && <p style={{ margin: 0, color: '#F0B232', fontSize: 11, fontStyle: 'italic', animation: 'fadeIn 0.2s' }}>a escrever…</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── MODAIS ─── */}
      {memberMenuTarget && (
        <UserProfileModal member={memberMenuTarget} server={server} onClose={() => setMemberMenuUserId(null)}
          isOwn={memberMenuTarget.userId === user?.id} isMod={isMod} isAdmin={isAdmin}
          onKick={handleKick} onBan={handleBan} onAssignRole={handleAssignRole} />
      )}
      {channelSettingsTarget && (
        <ChannelSettingsModal channel={channelSettingsTarget} onClose={() => setChannelSettingsTarget(null)}
          onSave={async (name, topic) => { await handleSaveChannel(channelSettingsTarget.id, name, topic); }}
          onDelete={handleDeleteChannel} />
      )}
      {showServerSettings && (
        <ServerSettingsModal server={server} serverId={server.id} onClose={() => setShowServerSettings(false)}
          onSave={handleSaveServer} onLeave={handleLeaveServer} onDelete={handleDeleteServer}
          onCreateRole={handleCreateRole} onDeleteRole={handleDeleteRole} />
      )}
      {showEditProfile && user && (
        <EditProfileModal user={user} serverId={server.id} onClose={() => setShowEditProfile(false)} onSave={handleSaveProfile} />
      )}
      {showInvite && (
        <SimpleModal title="Convidar para o servidor" onClose={() => setShowInvite(false)}>
          <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 12 }}>Código para entrar em <strong style={{ color: TEXT_BRIGHT }}>{server.name}</strong></p>
          <div style={{ background: '#0c0d0f', border: `1px solid ${ACCENT}44`, borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', color: ACCENT, fontSize: 13, marginBottom: 16, wordBreak: 'break-all', userSelect: 'all' }}>{server.inviteCode}</div>
          <button onClick={() => { navigator.clipboard.writeText(server.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: copied ? ACCENT_DIM : ACCENT, color: copied ? ACCENT : '#000', border: copied ? `1px solid ${ACCENT}` : 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            {copied ? '✓ Copiado!' : '📋 Copiar código'}
          </button>
        </SimpleModal>
      )}
      {showCh && (
        <SimpleModal title="Criar canal" onClose={() => { setShowCh(false); setChName(''); setChCategoryId(''); }}>
          <label style={{ color: TEXT_MUTED, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Categoria (opcional)</label>
          <select value={chCategoryId} onChange={e => setChCategoryId(e.target.value)}
            style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '8px 12px', color: TEXT_BRIGHT, fontSize: 13, marginBottom: 16 }}>
            <option value="">— sem categoria —</option>
            {(server.channelCategories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label style={{ color: TEXT_MUTED, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nome do canal</label>
          <div style={{ display: 'flex', alignItems: 'center', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '8px 12px', gap: 8, marginBottom: 20 }}>
            <span style={{ color: TEXT_MUTED, fontSize: 20 }}>#</span>
            <input value={chName} onChange={e => setChName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} onKeyDown={e => e.key === 'Enter' && createChannel()} autoFocus placeholder="novo-canal" style={{ flex: 1, background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 14 }} maxLength={32} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCh(false)} style={{ background: 'transparent', color: TEXT_MUTED, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}>Cancelar</button>
            <button onClick={createChannel} disabled={!chName.trim()} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !chName.trim() ? 0.5 : 1 }}>Criar canal</button>
          </div>
        </SimpleModal>
      )}
      {showCat && (
        <SimpleModal title="Nova categoria" onClose={() => { setShowCat(false); setNewCatName(''); }}>
          <label style={{ color: TEXT_MUTED, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nome da categoria</label>
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus placeholder="Canais de texto" maxLength={64}
            style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCat(false)} style={{ background: 'transparent', color: TEXT_MUTED, border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}>Cancelar</button>
            <button onClick={createCategory} disabled={!newCatName.trim()} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !newCatName.trim() ? 0.5 : 1 }}>Criar</button>
          </div>
        </SimpleModal>
      )}
      {showCreateEvent && <CreateEventModal serverId={server.id} onClose={() => setShowCreateEvent(false)} onCreate={async ev => {
        try {
          const newEv = await api.post<CommunityEvent>(`/community/servers/${server.id}/events`, ev);
          setEvents(p => [...p, newEv]);
          setShowCreateEvent(false);
          setShowEventsPanel(true);
        } catch (e: any) { alert(e.message); }
      }} />}
    </div>
  );
}
