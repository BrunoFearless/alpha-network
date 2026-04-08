'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCommunitySocket } from '@/lib/socket';

// ─── ACCENT COLOR ────────────────────────────────────────────────────────────
const ACCENT     = '#A5E600';
const ACCENT_DIM = 'rgba(165,230,0,0.15)';
const ACCENT_MED = 'rgba(165,230,0,0.25)';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const BG_DARKEST    = '#000000ff';
const BG_DARK       = '#000000ff';
const BG_MID        = '#000000ff';
const BG_LIGHT      = '#171717ff';
const BG_HOVER      = '#2a2b30';
const TEXT_BRIGHT   = '#e3e5e8';
const TEXT_NORMAL   = '#b5bac1';
const TEXT_MUTED    = '#747f8d';
const BORDER_SUBTLE = 'rgba(255,255,255,0.06)';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ChannelCategoryRow { id: string; name: string; position: number; }
interface Channel { id: string; name: string; position: number; categoryId: string | null; }
interface CommunityRole { id: string; name: string; position: number; color: string | null; canModerate: boolean; canManageServer: boolean; canManageChannels: boolean; }
interface Member { userId: string; role: string; communityRoleId: string | null; mutedUntil?: string | null; communityRole: CommunityRole | null; profile: { displayName?: string | null; username: string; avatarUrl?: string | null; bio?: string | null; bannerUrl?: string | null; bannerColor?: string | null; } | null; }
interface BotRow { id: string; isAdminBot: boolean; bot: { id: string; name: string; prefix: string }; }
interface Server { id: string; name: string; description?: string | null; imageUrl?: string | null; bannerUrl?: string | null; bannerColor?: string | null; inviteCode: string; ownerId: string; channelCategories: ChannelCategoryRow[]; channels: Channel[]; members: Member[]; bots: BotRow[]; roles: CommunityRole[]; membersCount: number; }
interface EmbedPayload { title?: string; description?: string; color?: string; footer?: string; imageUrl?: string; }
interface ReplySnippet { id: string; content: string; authorName: string; }
interface ReactionEntry { emoji: string; userId: string; }
interface CommunityEvent { id: string; title: string; description: string | null; startsAt: string; endsAt: string | null; location: string | null; creatorId: string; imageUrl?: string | null; coverColor?: string; rsvpCount?: number; myRsvp?: boolean; }
interface Msg { id: string; channelId: string; authorId: string; authorName: string; authorAvatarUrl?: string | null; authorType: 'user' | 'bot'; content: string; messageType?: string; imageUrl?: string | null; embedJson?: EmbedPayload | null; createdAt: string; editedAt?: string | null; replyToId?: string | null; replyTo?: ReplySnippet | null; attachmentUrls?: string[] | null; mentions?: { everyone?: boolean; userIds?: string[] } | null; reactions?: ReactionEntry[]; pinned?: boolean; }
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
const EMOJIS = ['👍','👎','❤️','🔥','😂','😮','😢','😡','🎉','✅','❌','💯','🙏','👀','💀','🤔','😎','🚀','⭐','💪','🤣','😭','🫡','💥','🎯','✨','💫','🌟','👑','🍕','🎮','✍️','💡','🎸','🌈','🦄','🎊','🏆','🫂','🐛'];

function EmojiPickerPopover({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => document.addEventListener('click', onClose), 50);
    return () => { clearTimeout(t); document.removeEventListener('click', onClose); };
  }, [onClose]);
  return (
    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 4, background: '#18191c', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(8, 28px)', gap: 2, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.7)', animation: 'popIn 0.12s ease' }}>
      {EMOJIS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }} title={e}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, width: 28, height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER}
          onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>{e}</button>
      ))}
    </div>
  );
}

// ─── SERVER ICON ─────────────────────────────────────────────────────────────
function ServerIcon({ server, active, onClick }: { server: MyServer; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const label = server.name.slice(0, 2).toUpperCase();
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 8 }}>
      {(active || hovered) && <div style={{ position: 'absolute', left: -4, width: 4, height: active ? 40 : 20, background: ACCENT, borderRadius: '0 4px 4px 0', transition: 'height 0.2s cubic-bezier(.4,0,.2,1)' }} />}
      <button type="button" onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} title={server.name}
        style={{ width: 48, height: 48, borderRadius: active ? 16 : hovered ? 16 : '50%', background: server.imageUrl ? 'transparent' : active ? ACCENT_DIM : BG_LIGHT, border: active ? `2px solid ${ACCENT}` : '2px solid transparent', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-radius 0.2s cubic-bezier(.4,0,.2,1), border-color 0.15s', flexShrink: 0, marginLeft: 4 }}>
        {server.imageUrl ? <img src={server.imageUrl} alt={server.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: active ? ACCENT : TEXT_NORMAL, fontSize: 14, fontWeight: 700 }}>{label}</span>}
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
        {preview ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>Pré-visualização</span>}
        <button onClick={() => ref.current?.click()} style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.6)', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_BRIGHT, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
          📷 Imagem
        </button>
        <input ref={ref} type="file" accept="image/*" hidden onChange={handleFile} />
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
  user: { profile?: { displayName?: string | null; username: string; avatarUrl?: string | null; bio?: string | null; bannerUrl?: string | null; bannerColor?: string | null; } | null };
  serverId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.profile?.displayName ?? '');
  const [bio, setBio] = useState(user.profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerColor, setBannerColor] = useState(user.profile?.bannerColor ?? BANNER_PRESETS[1]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.profile?.avatarUrl ?? null);
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
      await api.patch('/users/me', { displayName, bio, avatarUrl, bannerUrl, bannerColor });
      onSave();
    } catch { onClose(); }
    finally { setSaving(false); }
  }

  const name = displayName || user.profile?.username || 'U';
  const bannerDisplay = user.profile?.bannerUrl ?? null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 560, background: '#111214', borderRadius: 18, overflow: 'hidden', border: `1px solid ${BORDER_SUBTLE}`, boxShadow: '0 24px 80px rgba(0,0,0,0.8)', animation: 'slideUp 0.2s cubic-bezier(.4,0,.2,1)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER_SUBTLE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 18, fontWeight: 700, margin: 0 }}>✏️ Editar perfil</h2>
          <button onClick={onClose} style={{ background: BG_LIGHT, border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: 24, maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Live preview card */}
          <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 24, border: `1px solid ${BORDER_SUBTLE}` }}>
            <div style={{ height: 90, background: bannerColor, backgroundImage: bannerDisplay ? `url(${bannerDisplay})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: 4 }}>Pré-visualização</span>
            </div>
            <div style={{ background: '#18191c', padding: '0 16px 16px' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginTop: -28 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', border: '4px solid #18191c', overflow: 'hidden', background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => avatarRef.current?.click()}>
                  {avatarPreview ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: ACCENT, fontSize: 22, fontWeight: 700 }}>{name[0]?.toUpperCase()}</span>}
                </div>
                <div onClick={() => avatarRef.current?.click()} style={{ position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: '50%', background: ACCENT, border: '2px solid #18191c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📷</div>
                <input ref={avatarRef} type="file" accept="image/*" hidden onChange={handleAvatarFile} />
              </div>
              <p style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 16, margin: '8px 0 2px' }}>{name}</p>
              <p style={{ color: TEXT_MUTED, fontSize: 12, margin: 0 }}>@{user.profile?.username}</p>
              {bio && <p style={{ color: TEXT_NORMAL, fontSize: 13, margin: '8px 0 0', lineHeight: 1.4 }}>{bio}</p>}
            </div>
          </div>

          {/* Banner */}
          <ImageColorPicker
            label="Capa do perfil"
            currentImageUrl={bannerDisplay}
            currentColor={bannerColor}
            colorPresets={BANNER_PRESETS}
            onImageChange={f => setBannerFile(f)}
            onColorChange={c => setBannerColor(c)}
          />

          {/* Display name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Nome de exibição</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={user.profile?.username} maxLength={32}
              style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sobre mim</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Conta algo sobre ti..." maxLength={200} rows={3}
              style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '4px 0 0', textAlign: 'right' }}>{bio.length}/200</p>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'transparent', color: TEXT_MUTED, border: 'none', padding: '9px 16px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s' }}>
              {saving ? '⏳ A guardar…' : '✓ Guardar'}
            </button>
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
  const accent   = memberAccentColor(member, server.ownerId);
  const isOwner  = member.userId === server.ownerId;
  const name     = member.profile?.displayName ?? member.profile?.username ?? 'Utilizador';
  const username = member.profile?.username ?? '';
  const bio      = member.profile?.bio;
  const av       = member.profile?.avatarUrl;
  const bannerUrl   = member.profile?.bannerUrl;
  const bannerColor = member.profile?.bannerColor ?? '#1a1a2e';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', zIndex: 10, width: 340, background: '#111214', borderRadius: 18, overflow: 'hidden', border: `1px solid ${BORDER_SUBTLE}`, boxShadow: '0 24px 80px rgba(0,0,0,0.8)', animation: 'slideUp 0.18s cubic-bezier(.4,0,.2,1)' }}>
        {/* Banner */}
        <div style={{ height: 100, background: bannerColor, backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, backdropFilter: 'blur(4px)' }}>✕</button>
        </div>
        {/* Avatar */}
        <div style={{ position: 'absolute', top: 58, left: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid #111214`, overflow: 'hidden', background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {av ? <img src={av} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: accent, fontSize: 28, fontWeight: 700 }}>{name[0]?.toUpperCase()}</span>}
          </div>
        </div>
        <div style={{ padding: '16px 20px 20px', marginTop: 36 }}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{name}</h2>
          {username && <p style={{ color: TEXT_MUTED, fontSize: 13, margin: '0 0 8px' }}>@{username}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: bio ? 12 : 0 }}>
            {isOwner && <span style={{ fontSize: 11, background: '#F0B13222', color: '#F0B132', border: '1px solid #F0B13244', borderRadius: 4, padding: '2px 8px' }}>👑 Dono</span>}
            {member.role === 'admin' && !isOwner && <span style={{ fontSize: 11, background: '#ED424522', color: '#ED4245', border: '1px solid #ED424544', borderRadius: 4, padding: '2px 8px' }}>Admin</span>}
            {member.communityRole && <span style={{ fontSize: 11, background: (member.communityRole.color || '#7C6FAD') + '22', color: member.communityRole.color || '#7C6FAD', border: `1px solid ${member.communityRole.color || '#7C6FAD'}44`, borderRadius: 4, padding: '2px 8px' }}>{member.communityRole.name}</span>}
            {isOwn && <span style={{ fontSize: 11, background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 4, padding: '2px 8px' }}>Tu</span>}
          </div>
          {bio && <div style={{ background: BG_DARK, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}><p style={{ color: TEXT_NORMAL, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{bio}</p></div>}
          {isAdmin && !isOwner && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: TEXT_MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cargo</label>
              <select value={member.communityRoleId ?? ''} onChange={e => onAssignRole(member.userId, e.target.value)}
                style={{ width: '100%', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_BRIGHT, borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                <option value="">— sem cargo —</option>
                {server.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          {isMod && !isOwner && !isOwn && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onKick(member.userId)} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(237,66,69,0.4)', color: '#ED4245', borderRadius: 8, padding: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Expulsar</button>
              <button onClick={() => onBan(member.userId)} style={{ flex: 1, background: 'rgba(237,66,69,0.12)', border: '1px solid rgba(237,66,69,0.5)', color: '#ED4245', borderRadius: 8, padding: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Banir</button>
            </div>
          )}
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
                <div style={{ height: 110, background: bannerColor, backgroundImage: server.bannerUrl ? `url(${server.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ background: '#18191c', padding: '0 20px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -28 }}>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => iconRef.current?.click()}>
                      <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', background: BG_LIGHT, border: '4px solid #18191c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {iconPreview ? <img src={iconPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: ACCENT, fontSize: 26, fontWeight: 700 }}>{server.name[0]}</span>}
                      </div>
                      <div style={{ position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: '50%', background: ACCENT, border: '2px solid #18191c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📷</div>
                      <input ref={iconRef} type="file" accept="image/*" hidden onChange={handleIconFile} />
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
                      {m.profile?.avatarUrl ? <img src={m.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: memberAccentColor(m, server.ownerId), fontWeight: 700 }}>{n[0]}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: TEXT_BRIGHT, fontSize: 14 }}>{n}</p>
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
  onSave: (name: string) => Promise<void>;
  onDelete: (channelId: string) => Promise<void>;
}) {
  const [name, setName] = useState(channel.name);
  const [tab, setTab] = useState<'overview' | 'permissions'>('overview');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.toLowerCase().replace(/\s+/g, '-')); onClose(); }
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
const EVENT_COVER_COLORS = ['#1a1a2e','#2d1b69','#0f3460','#1B1B2F','#14532d','#4a0e0e','#0c4a6e','#422006','#1e1b4b','#162447','#3d1a78','#065f46'];

function CreateEventModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (ev: CommunityEvent) => void;
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
    const ev: CommunityEvent = {
      id: `local_${Date.now()}`,
      title, description: description || null,
      startsAt, endsAt: endsAt || null,
      location: location || null,
      creatorId: '', imageUrl: coverPreview,
      coverColor, rsvpCount: 0, myRsvp: false,
    };
    try { onCreate(ev); } finally { setSaving(false); }
  }

  return (
    <SimpleModal title="📅 Criar evento" onClose={onClose} maxWidth={560}>
      {/* Cover preview */}
      <div style={{ height: 120, borderRadius: 12, marginBottom: 20, background: coverColor, backgroundImage: coverPreview ? `url(${coverPreview})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden', border: `1px solid ${BORDER_SUBTLE}`, cursor: 'pointer' }} onClick={() => coverRef.current?.click()}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Clica para adicionar imagem de capa</span>
        </div>
        <input ref={coverRef} type="file" accept="image/*" hidden onChange={handleCoverFile} />
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
function EventsPanel({ events, isAdmin, onNew, onRsvp, onClose }: {
  events: CommunityEvent[]; isAdmin: boolean;
  onNew: () => void; onRsvp: (id: string) => void; onClose: () => void;
}) {
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startsAt) > now).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const past     = events.filter(e => new Date(e.startsAt) <= now).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return (
    <div style={{ width: 340, background: '#0e0f13', borderLeft: `1px solid ${BORDER_SUBTLE}`, overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', animation: 'slideLeft 0.2s cubic-bezier(.4,0,.2,1)' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER_SUBTLE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 15 }}>📅 Eventos</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {isAdmin && <button onClick={onNew} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Novo</button>}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 18, padding: '2px 6px' }}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {upcoming.length === 0 && past.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>📅</p>
            <p style={{ color: TEXT_MUTED, fontSize: 14 }}>Nenhum evento agendado.</p>
            {isAdmin && <button onClick={onNew} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>Criar primeiro evento</button>}
          </div>
        )}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Próximos</p>
            {upcoming.map(ev => <EventCard key={ev.id} ev={ev} onRsvp={onRsvp} />)}
          </div>
        )}
        {past.length > 0 && (
          <div>
            <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Passados</p>
            {past.map(ev => <EventCard key={ev.id} ev={ev} onRsvp={onRsvp} past />)}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ ev, onRsvp, past }: { ev: CommunityEvent; onRsvp: (id: string) => void; past?: boolean }) {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 10, border: `1px solid ${BORDER_SUBTLE}`, opacity: past ? 0.6 : 1, animation: 'fadeIn 0.2s ease' }}>
      {/* Cover */}
      <div style={{ height: 80, background: ev.coverColor ?? '#1a1a2e', backgroundImage: ev.imageUrl ? `url(${ev.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        {past && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700 }}>ENCERRADO</span></div>}
      </div>
      <div style={{ background: '#18191c', padding: '10px 12px' }}>
        <p style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 14, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
        <p style={{ color: ACCENT, fontSize: 12, margin: '0 0 2px', fontWeight: 500 }}>📆 {fmtEventDate(ev.startsAt)}</p>
        {ev.endsAt && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 2px' }}>⏱ Até {fmtEventDate(ev.endsAt)}</p>}
        {ev.location && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 6px' }}>📍 {ev.location}</p>}
        {ev.description && <p style={{ color: TEXT_NORMAL, fontSize: 12, margin: '0 0 8px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</p>}
        {!past && (
          <button onClick={() => onRsvp(ev.id)}
            style={{ background: ev.myRsvp ? ACCENT_DIM : ACCENT, color: ev.myRsvp ? ACCENT : '#000', border: ev.myRsvp ? `1px solid ${ACCENT}` : 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', width: '100%' }}>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', zIndex: 10, background: '#111214', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 18, padding: 28, width: '100%', maxWidth, maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.18s cubic-bezier(.4,0,.2,1)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: BG_LIGHT, border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
    <div className="ch-row" style={{ width: 'calc(100% - 16px)', margin: '1px 8px', display: 'flex', alignItems: 'center', borderRadius: 4, background: active ? BG_HOVER : hovered ? 'rgba(255,255,255,0.04)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => onSelect(ch)}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '5px 8px', gap: 6 }}>
        <span style={{ color: active ? TEXT_BRIGHT : TEXT_MUTED, fontSize: 18, fontWeight: 300, lineHeight: 1 }}>#</span>
        <span style={{ color: active ? TEXT_BRIGHT : TEXT_MUTED, fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ch.name}</span>
      </div>
      {canManage && hovered && (
        <div style={{ display: 'flex', gap: 2, paddingRight: 6 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onSettings(ch)} title="Editar canal" style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: TEXT_MUTED, cursor: 'pointer', width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚙</button>
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
    <div className="msg-actions" style={{ position: 'absolute', right: 8, top: -20, background: '#18191c', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 6, display: 'flex', gap: 1, padding: 2, opacity: 0, transition: 'opacity 0.1s', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
      {(['👍','❤️','😂','🔥'] as const).map(e => (
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
        {showEmojiPicker && <EmojiPickerPopover onSelect={onReact} onClose={() => onToggleEmojiPicker({ stopPropagation: () => {} } as any)} />}
      </div>
      <div style={{ width: 1, height: 18, background: BORDER_SUBTLE, alignSelf: 'center', margin: '0 1px' }} />
      <Tooltip text="Responder"><button onClick={onReply} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>↩</button></Tooltip>
      {isMod && <Tooltip text={isPinned ? 'Desafixar' : 'Fixar'}><button onClick={onPin} style={{ background: isPinned ? ACCENT_DIM : 'none', border: 'none', color: isPinned ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => { if (!isPinned) ev.currentTarget.style.background = BG_HOVER; }} onMouseLeave={ev => { if (!isPinned) ev.currentTarget.style.background = 'none'; }}>📌</button></Tooltip>}
      {isOwn && <Tooltip text="Editar"><button onClick={onEdit} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>✏️</button></Tooltip>}
      {canDel && <Tooltip text="Apagar"><button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ED4245', cursor: 'pointer', fontSize: 14, padding: '3px 6px', borderRadius: 4 }} onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(237,66,69,0.15)'} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>🗑</button></Tooltip>}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ServerPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const { socket, connected } = useCommunitySocket();

  // Data
  const [server,     setServer]     = useState<Server | null>(null);
  const [myServers,  setMyServers]  = useState<MyServer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [channel,    setChannel]    = useState<Channel | null>(null);
  const [msgs,       setMsgs]       = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text,       setText]       = useState('');
  const [events,     setEvents]     = useState<CommunityEvent[]>([]);

  // UI
  const [showServerMenu,     setShowServerMenu]     = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showInvite,         setShowInvite]         = useState(false);
  const [copied,             setCopied]             = useState(false);
  const [showCh,             setShowCh]             = useState(false);
  const [chName,             setChName]             = useState('');
  const [chCategoryId,       setChCategoryId]       = useState('');
  const [showCat,            setShowCat]            = useState(false);
  const [newCatName,         setNewCatName]         = useState('');
  const [collapsedCats,      setCollapsedCats]      = useState<Record<string, boolean>>({});
  const [channelSettingsTarget, setChannelSettingsTarget] = useState<Channel | null>(null);
  const [memberMenuUserId,   setMemberMenuUserId]   = useState<string | null>(null);
  const [showAttachMenu,     setShowAttachMenu]     = useState(false);
  const [replyTo,            setReplyTo]            = useState<Msg | null>(null);
  const [editing,            setEditing]            = useState<{ id: string; text: string } | null>(null);
  const [typingIds,          setTypingIds]          = useState<Record<string, boolean>>({});
  const [showPins,           setShowPins]           = useState(false);
  const [pins,               setPins]               = useState<Msg[]>([]);
  const [memberSearchQ,      setMemberSearchQ]      = useState('');
  const [showEditProfile,    setShowEditProfile]    = useState(false);
  const [showMembersPanel,   setShowMembersPanel]   = useState(true);
  const [showEventsPanel,    setShowEventsPanel]    = useState(false);
  const [showCreateEvent,    setShowCreateEvent]    = useState(false);
  const [emojiPickerMsgId,   setEmojiPickerMsgId]  = useState<string | null>(null);
  const [uploadingFile,      setUploadingFile]      = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const joinedRef   = useRef<string | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  const myMember  = server?.members.find(m => m.userId === user?.id);
  const isAdmin   = myMember?.role === 'admin';
  const isMod     = isAdmin || myMember?.communityRole?.canModerate === true;
  const canManageCh = isAdmin || myMember?.communityRole?.canManageChannels === true;

  useEffect(() => { api.get<MyServer[]>('/community/servers').then(setMyServers).catch(() => {}); }, []);

  const refreshServer = useCallback(async () => {
    if (!serverId) return;
    const d = await api.get<Server>(`/community/servers/${serverId}`);
    setServer(d);
  }, [serverId]);

  useEffect(() => {
    if (!serverId) return;
    api.get<Server>(`/community/servers/${serverId}`)
      .then(d => { setServer(d); if (d.channels.length > 0) setChannel(d.channels[0]); })
      .catch(() => router.push('/main/community'))
      .finally(() => setLoading(false));
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
    const h   = (msg: Msg) => { if (msg.channelId !== channel?.id) return; setMsgs(p => p.some(m => m.id === msg.id) ? p : [...p, msg]); };
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
    if (data.iconFile)   imageUrl  = await uploadFile(data.iconFile, server.id);
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
  async function handleSaveChannel(channelId: string, name: string) {
    try { await api.patch(`/community/channels/${channelId}`, { name }); } catch { /* optimistic */ }
    setServer(p => p ? { ...p, channels: p.channels.map(c => c.id === channelId ? { ...c, name } : c) } : p);
    if (channel?.id === channelId) setChannel(p => p ? { ...p, name } : p);
  }
  async function handleDeleteCategory(catId: string) {
    if (!server || !confirm('Eliminar esta categoria?')) return;
    try { await api.delete(`/community/servers/${server.id}/categories/${catId}`); } catch { /* optimistic */ }
    setServer(p => p ? { ...p, channelCategories: p.channelCategories.filter(c => c.id !== catId) } : p);
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
    await refreshServer();
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
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
        @keyframes popIn   { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .ch-row:hover .ch-actions { opacity: 1 !important; }
        input, textarea, select { outline: none; color-scheme: dark; }
        .msg-row:hover .msg-actions { opacity: 1 !important; }
        .msg-row { transition: background 0.08s; }
        .msg-row:hover { background: rgba(255,255,255,0.02); border-radius: 4px; }
      `}</style>

      {/* ── 1. SERVERS SIDEBAR ─── */}
      <div style={{ width: 72, background: BG_DARKEST, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, overflowY: 'auto', flexShrink: 0, borderRight: `1px solid ${BORDER_SUBTLE}` }}>
        <button onClick={() => router.push('/main')} title="Início" style={{ width: 48, height: 48, borderRadius: '40%', background: BG_LIGHT, border: '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: ACCENT, fontSize: 20, flexShrink: 0, transition: 'border-radius 0.2s' }}
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
      <div style={{ width: 240, background: BG_DARK, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Banner do servidor */}
        {(server.bannerUrl || server.bannerColor) && (
          <div style={{ height: 72, background: server.bannerColor ?? '#1a1a2e', backgroundImage: server.bannerUrl ? `url(${server.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
        )}
        {/* Server header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BORDER_SUBTLE}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, userSelect: 'none', transition: 'background 0.1s' }}
          onClick={() => setShowServerMenu(p => !p)}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 700, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{server.name}</h2>
          <span style={{ color: TEXT_MUTED, fontSize: 11, transition: 'transform 0.2s', transform: showServerMenu ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>

        {/* Server dropdown */}
        {showServerMenu && (
          <div style={{ background: '#18191c', margin: 8, borderRadius: 8, border: `1px solid ${BORDER_SUBTLE}`, overflow: 'hidden', animation: 'slideDown 0.12s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            {[
              { label: 'Convidar para o servidor', icon: '👤', action: () => { setShowInvite(true); setShowServerMenu(false); } },
              { label: 'Configurações do servidor', icon: '⚙️', action: () => { setShowServerSettings(true); setShowServerMenu(false); }, admin: true },
              { label: 'Criar canal', icon: '#', action: () => { setShowCh(true); setShowServerMenu(false); }, admin: true },
              { label: 'Criar categoria', icon: '🏷️', action: () => { setShowCat(true); setShowServerMenu(false); }, admin: true },
              { label: 'Criar evento', icon: '📅', action: () => { setShowCreateEvent(true); setShowServerMenu(false); }, admin: true },
              null,
              { label: 'Sair do servidor', icon: '🚪', action: handleLeaveServer, danger: true },
            ].map((item, i) => item === null ? (
              <div key={i} style={{ height: 1, background: BORDER_SUBTLE, margin: '4px 0' }} />
            ) : (
              (!item.admin || isAdmin) && (
                <button key={i} onClick={item.action} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: (item as any).danger ? '#ED4245' : TEXT_BRIGHT, padding: '9px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.08s' }}
                  onMouseEnter={e => e.currentTarget.style.background = (item as any).danger ? 'rgba(237,66,69,0.12)' : BG_HOVER}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 18, textAlign: 'center' }}>{item.icon}</span>{item.label}
                </button>
              )
            ))}
          </div>
        )}

        {/* Channel list */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {channelsByCategory.uncategorized.length > 0 && (
            <div style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 4px 16px', marginBottom: 2 }}>
                <span style={{ flex: 1, color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Canais de texto</span>
                {canManageCh && <button onClick={() => setShowCh(true)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>+</button>}
              </div>
              {channelsByCategory.uncategorized.map(ch => <ChannelRow key={ch.id} ch={ch} active={channel?.id === ch.id} canManage={canManageCh} onSelect={setChannel} onSettings={setChannelSettingsTarget} />)}
            </div>
          )}
          {(server.channelCategories ?? []).map(cat => {
            const catChannels = channelsByCategory.byCat.get(cat.id) ?? [];
            const collapsed   = collapsedCats[cat.id];
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
                {!collapsed && catChannels.map(ch => <ChannelRow key={ch.id} ch={ch} active={channel?.id === ch.id} canManage={canManageCh} onSelect={setChannel} onSettings={setChannelSettingsTarget} />)}
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
        <div style={{ padding: 8, borderTop: `1px solid ${BORDER_SUBTLE}`, background: '#0c0d0f', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div onClick={() => setMemberMenuUserId(user?.id ?? null)} style={{ width: 32, height: 32, borderRadius: '50%', background: BG_LIGHT, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${ACCENT}44`, transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
            onMouseLeave={e => e.currentTarget.style.borderColor = `${ACCENT}44`}>
            {user?.profile?.avatarUrl ? <img src={user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: ACCENT, fontWeight: 700, fontSize: 13 }}>{(user?.profile?.username ?? 'U')[0].toUpperCase()}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setMemberMenuUserId(user?.id ?? null)}>
            <p style={{ margin: 0, color: TEXT_BRIGHT, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.profile?.displayName ?? user?.profile?.username}</p>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: 11 }}>@{user?.profile?.username}</p>
          </div>
          <Tooltip text="Editar perfil"><button onClick={() => setShowEditProfile(true)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 15, padding: 4, borderRadius: 4, transition: 'color 0.1s' }} onMouseEnter={e => e.currentTarget.style.color = ACCENT} onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}>✏️</button></Tooltip>
          <Tooltip text="Configurações"><button onClick={() => setShowServerSettings(true)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 15, padding: 4, borderRadius: 4, transition: 'color 0.1s' }} onMouseEnter={e => e.currentTarget.style.color = ACCENT} onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}>⚙️</button></Tooltip>
        </div>
      </div>

      {/* ── 3. MAIN CHAT ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: BG_MID }}>
        {/* Topbar */}
        {channel && (
          <div style={{ height: 48, borderBottom: `1px solid ${BORDER_SUBTLE}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, background: BG_MID }}>
            <span style={{ color: TEXT_MUTED, fontSize: 22, fontWeight: 300 }}>#</span>
            <span style={{ color: TEXT_BRIGHT, fontWeight: 600, fontSize: 15 }}>{channel.name}</span>
            <div style={{ width: 1, height: 20, background: BORDER_SUBTLE }} />
            <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Canal de texto</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isMod && <Tooltip text="Fixadas">
                <button onClick={() => { setShowPins(p => !p); if (!showPins) api.get<Msg[]>(`/community/channels/${channel.id}/pins`).then(setPins).catch(() => {}); }}
                  style={{ background: showPins ? ACCENT_DIM : 'none', border: 'none', color: showPins ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 4, transition: 'all 0.1s' }}>📌</button>
              </Tooltip>}
              <Tooltip text="Eventos">
                <button onClick={() => setShowEventsPanel(p => !p)} style={{ background: showEventsPanel ? ACCENT_DIM : 'none', border: 'none', color: showEventsPanel ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 4, transition: 'all 0.1s', position: 'relative' }}>
                  📅
                  {upcomingEvents.length > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: ACCENT }}/>}
                </button>
              </Tooltip>
              <Tooltip text={showMembersPanel ? 'Ocultar membros' : 'Mostrar membros'}>
                <button onClick={() => setShowMembersPanel(p => !p)} style={{ background: showMembersPanel ? ACCENT_DIM : 'none', border: 'none', color: showMembersPanel ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 4, transition: 'all 0.1s' }}>👥</button>
              </Tooltip>
              <div style={{ display: 'flex', alignItems: 'center', background: BG_DARK, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 4, padding: '2px 8px', gap: 6, marginLeft: 4 }}>
                <input placeholder={`Buscar em #${channel.name}`} style={{ background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 13, width: 150 }} />
                <span style={{ color: TEXT_MUTED, fontSize: 14 }}>🔍</span>
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
            const prev    = msgs[i - 1];
            const mt      = msg.messageType || 'text';
            const grouped = !!(prev && prev.authorId === msg.authorId && prev.authorType === msg.authorType && !msg.replyTo && new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 300000);
            const isOwn   = msg.authorId === user?.id && msg.authorType === 'user';
            const isBot   = msg.authorType === 'bot';
            const canDel  = (isOwn && msg.authorType === 'user') || isMod;
            const rx      = aggregateReactions(msg.reactions, user?.id);
            const nameClr = isBot ? '#7EB6FF' : nameColor(msg.authorName);
            const av      = msg.authorAvatarUrl;
            const showEmoji = emojiPickerMsgId === msg.id;

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
                    <span style={{ color: nameClr, fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => { const m = server?.members.find(x => x.userId === msg.authorId); if (m) setMemberMenuUserId(m.userId); }}>{msg.authorName}</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', marginBottom: 0, background: '#0e0f13', borderRadius: '10px 10px 0 0', border: `1px solid ${BORDER_SUBTLE}`, borderBottom: 'none', animation: 'slideDown 0.1s ease' }}>
              <span style={{ fontSize: 12, color: editing ? ACCENT : TEXT_MUTED }}>{editing ? '✏️ A editar' : `↩ Responder a ${replyTo?.authorName}`}</span>
              {!editing && replyTo && <span style={{ color: TEXT_MUTED, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.content}</span>}
              <button onClick={() => { setReplyTo(null); setEditing(null); setText(''); }} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          )}
          {showAttachMenu && (
            <div style={{ background: '#0e0f13', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: 8, marginBottom: 4, animation: 'slideDown 0.1s ease' }}>
              {[{ icon: '🖼️', label: 'Enviar imagem', accept: 'image/*' }, { icon: '📎', label: 'Enviar ficheiro', accept: '*' }].map(item => (
                <button key={item.label} onClick={() => { if (fileRef.current) { fileRef.current.accept = item.accept; fileRef.current.click(); } setShowAttachMenu(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', color: TEXT_NORMAL, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 14, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = BG_HOVER}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', background: BG_LIGHT, borderRadius: (replyTo || editing) ? '0 0 12px 12px' : 12, padding: '0 12px', border: `1px solid ${BORDER_SUBTLE}`, gap: 8, opacity: connected ? 1 : 0.6, transition: 'opacity 0.2s' }}>
            <input ref={fileRef} type="file" hidden onChange={handleFileUpload} />
            <button onClick={() => setShowAttachMenu(p => !p)} disabled={uploadingFile}
              style={{ background: 'none', border: 'none', color: uploadingFile ? ACCENT : TEXT_MUTED, cursor: 'pointer', fontSize: 22, padding: '10px 4px', lineHeight: 1, flexShrink: 0, transition: 'color 0.1s' }}
              onMouseEnter={e => { if (!uploadingFile) e.currentTarget.style.color = TEXT_BRIGHT; }}
              onMouseLeave={e => { if (!uploadingFile) e.currentTarget.style.color = TEXT_MUTED; }}>
              {uploadingFile ? '⏳' : '+'}
            </button>
            <input ref={inputRef} value={text}
              onChange={e => { setText(e.target.value); emitTyping(); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'Escape') { setReplyTo(null); setEditing(null); setText(''); } }}
              placeholder={channel ? (connected ? `Mensagem em #${channel.name}` : 'A reconectar…') : 'Seleciona um canal'}
              disabled={!connected || !channel}
              style={{ flex: 1, background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 15, padding: '12px 0', minHeight: 44 }}
            />
            <button onClick={send} disabled={!text.trim() || !connected || !channel}
              style={{ background: text.trim() && connected && channel ? ACCENT : 'transparent', border: text.trim() && connected && channel ? 'none' : `1px solid ${BORDER_SUBTLE}`, color: text.trim() ? '#000' : TEXT_MUTED, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0 }}>➤</button>
          </div>
        </div>
      </div>

      {/* ── 4. EVENTS PANEL ─── */}
      {showEventsPanel && (
        <EventsPanel events={events} isAdmin={isAdmin} onNew={() => setShowCreateEvent(true)} onRsvp={handleRsvp} onClose={() => setShowEventsPanel(false)} />
      )}

      {/* ── 5. MEMBERS SIDEBAR ─── */}
      {showMembersPanel && !showEventsPanel && (
        <div style={{ width: 240, background: BG_DARK, overflowY: 'auto', flexShrink: 0, borderLeft: `1px solid ${BORDER_SUBTLE}`, animation: 'slideLeft 0.15s ease' }}>
          <div style={{ padding: '12px 12px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0c0d0f', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 6, padding: '4px 10px', gap: 6 }}>
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
            const owners    = filtered.filter(m => m.userId === server.ownerId);
            const admins    = filtered.filter(m => m.role === 'admin' && m.userId !== server.ownerId && !m.communityRoleId);
            const roleGroups = server.roles.map(r => ({ role: r, members: filtered.filter(m => m.communityRoleId === r.id) })).filter(g => g.members.length > 0);
            const members   = filtered.filter(m => m.role !== 'admin' && m.userId !== server.ownerId && !m.communityRoleId);
            const sections  = [
              ...(owners.length ? [{ title: `DONO — ${owners.length}`, members: owners, color: '#F0B132' }] : []),
              ...roleGroups.map(g => ({ title: `${g.role.name.toUpperCase()} — ${g.members.length}`, members: g.members, color: g.role.color || TEXT_MUTED })),
              ...(admins.length ? [{ title: `ADMIN — ${admins.length}`, members: admins, color: '#ED4245' }] : []),
              ...(members.length ? [{ title: `MEMBROS — ${members.length}`, members, color: TEXT_MUTED }] : []),
            ];
            return sections.map(sec => (
              <div key={sec.title} style={{ marginBottom: 8 }}>
                <div style={{ padding: '8px 12px 4px', color: sec.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{sec.title}</div>
                {sec.members.map(m => {
                  const n      = mname(m);
                  const typing = typingIds[m.userId];
                  const accent = memberAccentColor(m, server.ownerId);
                  return (
                    <button key={m.userId} onClick={() => setMemberMenuUserId(m.userId)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: 'calc(100% - 16px)', margin: '1px 8px', padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = BG_HOVER}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {m.profile?.avatarUrl ? <img src={m.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: accent, fontSize: 14, fontWeight: 700 }}>{n[0]?.toUpperCase()}</span>}
                        </div>
                        <div style={{ position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: '50%', background: typing ? '#F0B232' : ACCENT, border: `2px solid ${BG_DARK}`, transition: 'background 0.3s' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: accent, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</p>
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
          onSave={async name => { await handleSaveChannel(channelSettingsTarget.id, name); }}
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
      {showCreateEvent && <CreateEventModal onClose={() => setShowCreateEvent(false)} onCreate={ev => { setEvents(p => [...p, ev]); setShowCreateEvent(false); setShowEventsPanel(true); }} />}
    </div>
  );
}
