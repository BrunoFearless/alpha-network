'use client';
import { useEffect, useRef, useState, useCallback, useMemo, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, uploadUserFile } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCommunitySocket } from '@/lib/socket';
import { Avatar } from '@/components/ui/Avatar';
import { DisplayName, FONT_OPTIONS, EFFECT_OPTIONS, COLOR_OPTIONS } from '@/components/ui/DisplayName';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { EmojiRenderer, getAnimatedUrl } from '@/components/ui/EmojiRenderer';
import { EmojiPicker, useEmojiPickerPopup } from '@/components/community/EmojiPicker';


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
function fmtDate(d: string) {
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString()) return 'Hoje às ' + fmtTime(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dt.toDateString() === yesterday.toDateString()) return 'Ontem às ' + fmtTime(d);
  return dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' às ' + fmtTime(d);
}
function fmtEventDate(d: string) { return new Date(d).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

function getLuminance(hex: string): number {
  if (!hex?.startsWith('#')) return 0;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isDifferentDay(d1: string, d2: string) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getFullYear() !== date2.getFullYear() || date1.getMonth() !== date2.getMonth() || date1.getDate() !== date2.getDate();
}

function formatDateLabel(d: string) {
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString()) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dt.toDateString() === yesterday.toDateString()) return 'Ontem';
  return dt.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isSameColor(c1?: string | null, c2?: string | null) {
  if (!c1 || !c2) return c1 === c2;
  return c1.toLowerCase() === c2.toLowerCase();
}
function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return url.match(/\.(mp4|webm|mov|ogg|m4v|3gp|flv|quicktime)(?:\?|#|$)/i)
    || url.startsWith('data:video/')
    || url.startsWith('blob:');
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
    r.onload  = () => res(r.result as string);
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

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface IconProps { size?: number; color?: string; style?: React.CSSProperties; stroke?: number; className?: string; }

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconHome({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconUser({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IconHammer({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="m15 5 4 4"/><path d="M7 7a2 2 0 1 0 2 2M2.7 2.7l4.3 4.3M11 10a2 2 0 1 0 2 2l-3.5 3.5"/><path d="m20 10-4 4M10 20l4-4"/></svg>;
}
function IconMedal({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><circle cx="12" cy="15" r="5"/><path d="M12 18l-2 4h4l-2-4z"/></svg>;
}
function IconShield({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconDiamond({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></svg>;
}
function IconClock({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IconCheck({ size = 20, color = 'currentColor', style, stroke = 2 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconPlus({ size = 20, color = 'currentColor', stroke = 2, style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function IconMenu({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
}
function IconSettings({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M12.22 2h-.44a2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconClose({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
function IconHashtag({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="m4 9 16 0M4 15 20 15M10 3 8 21M16 3 14 21"/></svg>;
}
function IconEmoji({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
}
function IconReply({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>;
}
function IconPin({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>;
}
function IconEdit({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
}
function IconTrash({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
}
function IconSend({ size = 20, color = 'currentColor', stroke = 2, style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function IconCalendar({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IconChevronDown({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="m6 9 6 6 6-6"/></svg>;
}
function IconUsers({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconGlobe({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>;
}
function IconCamera({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}
function IconDotsVertical({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
}
function IconDownload({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
function IconExternalLink({ size = 20, color = 'currentColor', style }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
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
        <button onClick={() => ref.current?.click()} style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.6)', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_BRIGHT, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}>
          <IconCamera size={14} /> Mídia
        </button>
        <input ref={ref} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={handleFile} />
      </div>
      {/* Color grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {colorPresets.map(c => (
          <button key={c} onClick={() => pickColor(c)} title={c}
            style={{ width: 28, height: 28, borderRadius: 6, background: c, border: isSameColor(activeColor, c) && !preview ? `3px solid ${ACCENT}` : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s', transform: isSameColor(activeColor, c) && !preview ? 'scale(1.15)' : 'scale(1)' }} />
        ))}
        {/* Custom color */}
        <label title="Cor personalizada" style={{ position: 'relative', width: 28, height: 28, borderRadius: 6, background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', cursor: 'pointer', overflow: 'hidden', border: isSameColor(activeColor, currentColor) ? '2px solid transparent' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input type="color" value={activeColor && activeColor.startsWith('#') ? activeColor : '#ffffff'} onChange={e => pickColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
        </label>
      </div>
    </div>
  );
}
// ─── tipos ────────────────────────────────────────────────────────────────────
 
export interface EditProfileModalProps {
  user: {
    profile?: {
      displayName?:  string | null;
      username:      string;
      avatarUrl?:    string | null;
      bio?:          string | null;
      bannerUrl?:    string | null;
      bannerColor?:  string | null;
      auroraTheme?:  string | null;
      nameFont?:     string | null;
      nameEffect?:   string | null;
      nameColor?:    string | null;
      status?:       string | null;
      tags?:         string | null;
    } | null;
  };
  onClose: () => void;
  onSave:  () => void;
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
                        <span style={{ color: auroraTheme.startsWith('#') ? ACCENT : TEXT_NORMAL, fontSize: 10, fontWeight: 700 }}>Personalizada</span>
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
                            <button key={c} onClick={() => setNameColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `2.5px solid ${isSameColor(nameColor, c) ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', boxShadow: isSameColor(nameColor, c) ? `0 0 10px ${c}60` : 'none' }} />
                          ))}
                          <label style={{ position: 'relative', width: 28, height: 28, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', cursor: 'pointer', border: `2px solid ${!COLOR_OPTIONS.some(opt => isSameColor(opt, nameColor)) ? '#fff' : 'transparent'}` }}>
                            <input type="color" value={nameColor && nameColor.startsWith('#') ? nameColor : '#ffffff'} onChange={e => setNameColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
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
                
                <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${getLuminance(auroraTheme) > 0.65 ? 'rgba(0,0,0,0.1)' : 'rgba(165,230,0,0.15)'}`, boxShadow: '0 32px 64px rgba(0,0,0,0.6)', position: 'relative', background: getLuminance(auroraTheme) > 0.65 ? '#f8fafc' : '#0d0e10' }}>
                  <AuroraBackground theme={auroraTheme as any} />
                  <div style={{ position: 'relative', zIndex: 1, background: getLuminance(auroraTheme) > 0.65 ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
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
                      <div style={{ marginTop: 10, background: getLuminance(auroraTheme) > 0.65 ? 'rgba(0,0,0,0.05)' : '#111214', borderRadius: 8, padding: 12 }}>
                        <p style={{ margin: '0 0 2px', lineHeight: 1.2 }}><DisplayName profile={previewProfile} fallbackName={name} style={{ fontWeight: 700, fontSize: 18, color: getLuminance(auroraTheme) > 0.65 ? '#000' : TEXT_BRIGHT }} /></p>
                        <p style={{ color: getLuminance(auroraTheme) > 0.65 ? 'rgba(0,0,0,0.6)' : TEXT_MUTED, fontSize: 13, margin: 0 }}>@{user.profile?.username}</p>
                        
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${getLuminance(auroraTheme) > 0.65 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)'}` }}>
                          <p style={{ color: getLuminance(auroraTheme) > 0.65 ? '#000' : TEXT_BRIGHT, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Sobre Mim</p>
                          <p style={{ color: getLuminance(auroraTheme) > 0.65 ? 'rgba(0,0,0,0.8)' : TEXT_BRIGHT, fontSize: 13, margin: 0, opacity: 0.8 }}>
                            <EmojiRenderer content={bio || 'Este utilizador não tem biografia.'} emojiSize={14} />
                          </p>
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
               <button onClick={onClose} style={{ background: 'transparent', color: TEXT_NORMAL, border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.1s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'}>Redefinir</button>
               <button onClick={handleSave} disabled={saving} style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(165,230,0,0.3)' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(165,230,0,0.5)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(165,230,0,0.3)'}>
                 {saving ? '⏳ A salvar...' : <><IconCheck size={18} stroke={3} /> Salvar Alterações</>}
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
  const [showRoleSelector, setShowRoleSelector] = useState(false);
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
      
      <div style={{ position: 'relative', zIndex: 10, width: 380, borderRadius: 24, overflow: 'hidden', background: getLuminance(member.profile?.auroraTheme || '') > 0.65 ? '#f8fafc' : '#000', border: `1px solid ${getLuminance(member.profile?.auroraTheme || '') > 0.65 ? 'rgba(0,0,0,0.1)' : 'rgba(165,230,0,0.1)'}`, boxShadow: '0 40px 100px rgba(0,0,0,0.9)', animation: 'slideUp 0.3s cubic-bezier(.4,0,.2,1)' }}>
        
        <AuroraBackground theme={(member.profile?.auroraTheme as any) || 'ALPHA'} />
        
        <div style={{ position: 'relative', zIndex: 10, background: getLuminance(member.profile?.auroraTheme || '') > 0.65 ? 'rgba(255,255,255,0.4)' : 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Banner area */}
          <div style={{ height: 130, background: bannerColor, backgroundImage: bannerUrl && !isVideoUrl(bannerUrl) ? `url(${bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
            {isVideoUrl(bannerUrl) && <video src={bannerUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }} />
            
            {/* Banner Actions */}
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
              {!isOwn && <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}><IconPlus size={18} /></button>}
              <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}><IconDotsVertical size={20} /></button>
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
                <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0, fontStyle: 'italic', opacity: 0.9 }}>
                  <EmojiRenderer content={statusMsg || 'Explorando a Alpha Network...'} emojiSize={16} />
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
               {[
                 { icon: <IconShield size={16} />, color: '#ED4245', tooltip: 'Staff' },
                 { icon: <IconDiamond size={16} />, color: '#A5E600', tooltip: 'Boost' },
                 { icon: <IconClock size={16} />, color: '#7C6FAD', tooltip: 'Legacy' },
                 { icon: <IconHome size={16} />, color: '#5865F2', tooltip: 'Origin' },
               ].map((badge, i) => (
                 <Tooltip key={i} text={badge.tooltip}>
                   <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', color: badge.color }}
                     onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                     onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                   >{badge.icon}</div>
                 </Tooltip>
               ))}
               <div style={{ height: 28, borderRadius: 8, padding: '0 10px', background: 'linear-gradient(45deg, #A5E600, #5865F2)', color: '#000', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', letterSpacing: '0.1em', boxShadow: '0 0 15px rgba(165,230,0,0.2)' }}>NITRO</div>
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
                 <EmojiRenderer content={bio || 'Este utilizador prefere manter o mistério sobre a sua biografia...'} emojiSize={18} />
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
                        <span style={{ color: TEXT_BRIGHT, fontSize: 12, fontWeight: 600 }}>
                           <EmojiRenderer content={t} emojiSize={14} />
                        </span>
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
                {member.communityRole && <span style={{ fontSize: 11, background: (member.communityRole.color || '#7C6FAD') + '20', color: member.communityRole.color || '#7C6FAD', border: `1px solid ${member.communityRole.color || '#7C6FAD'}40`, borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>
                  <EmojiRenderer content={member.communityRole.name} emojiSize={12} />
                </span>}
                
                {isAdmin && !isOwner && !isOwn && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowRoleSelector(!showRoleSelector)}
                      style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: `1px solid ${showRoleSelector ? ACCENT : 'rgba(255,255,255,0.1)'}`, color: showRoleSelector ? ACCENT : TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all 0.15s' }}
                      onMouseEnter={e => !showRoleSelector && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                      onMouseLeave={e => !showRoleSelector && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    >+</button>
                    
                    {showRoleSelector && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 50, width: 200, background: '#111214', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 10, padding: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.8)', animation: 'slideDown 0.12s ease' }}>
                        <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '6px 8px', marginBottom: 4 }}>Atribuir Cargo</p>
                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {server.roles.map(r => (
                            <button key={r.id} onClick={() => { onAssignRole(member.userId, r.id); setShowRoleSelector(false); }}
                              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: member.communityRoleId === r.id ? ACCENT : TEXT_NORMAL, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color || '#7C6FAD' }} />
                              <EmojiRenderer content={r.name} emojiSize={14} />
                            </button>
                          ))}
                          <div style={{ height: 1, background: BORDER_SUBTLE, margin: '6px 0' }} />
                           <button onClick={() => { onAssignRole(member.userId, ''); setShowRoleSelector(false); }}
                            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ED4245', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,66,69,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <IconTrash size={14} /> Remover cargo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

          <div style={{ padding: '0 20px 24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s' }} onFocusCapture={e => e.currentTarget.style.borderColor = ACCENT}>
              <input type="text" placeholder={`Enviar mensagem para @${username}`} style={{ background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 13, flex: 1, outline: 'none' }} />
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }} onMouseEnter={e => e.currentTarget.style.color = TEXT_BRIGHT}><IconEmoji size={20} /></button>
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
    { id: 'profile', label: 'Perfil do servidor', icon: <IconGlobe size={18} /> },
    { id: 'roles', label: 'Cargos', icon: <IconMedal size={18} /> },
    { id: 'members', label: 'Membros', icon: <IconUsers size={18} /> },
    { id: 'bans', label: 'Banimentos', icon: <IconHammer size={18} /> },
    { id: 'integrations', label: 'Integrações', icon: <IconSettings size={18} /> },
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
          <div style={{ marginTop: 'auto', borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={handleLeave} disabled={leavingServer} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ED4245', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, opacity: leavingServer ? 0.6 : 1, transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,66,69,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <IconClose size={16} /> {leavingServer ? 'A sair…' : 'Sair do servidor'}
            </button>
            <button onClick={onDelete} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ED4245', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.4, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(237,66,69,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.background = 'transparent'; }}>
              <IconTrash size={16} /> Eliminar servidor
            </button>
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
                      <p style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 16, margin: 0 }}>
                        <EmojiRenderer content={name} emojiSize={20} />
                      </p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Ex: Moderador" maxLength={32}
                          style={{ flex: 1, background: '#18191c', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 6, padding: '8px 12px', color: TEXT_BRIGHT, fontSize: 14, boxSizing: 'border-box' }} />
                        {roleName.trim() && (
                          <div style={{ padding: '0 8px', borderLeft: `1px solid ${BORDER_SUBTLE}` }}>
                            <EmojiRenderer content={roleName} emojiSize={18} />
                          </div>
                        )}
                      </div>
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
                  <span style={{ flex: 1, color: TEXT_BRIGHT, fontSize: 14 }}>
                    <EmojiRenderer content={r.name} emojiSize={16} />
                  </span>
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
            <button key={t} onClick={() => setTab(t)} style={{ width: '100%', textAlign: 'left', background: tab === t ? BG_HOVER : 'transparent', border: 'none', color: tab === t ? TEXT_BRIGHT : TEXT_NORMAL, padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}>
              {t === 'overview' ? <IconSettings size={16} /> : <IconShield size={16} />} 
              {t === 'overview' ? 'Visão geral' : 'Permissões'}
            </button>
          ))}
          <div style={{ marginTop: 8, borderTop: `1px solid ${BORDER_SUBTLE}`, paddingTop: 8 }}>
            <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#ED4245', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14, opacity: deleting ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,66,69,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <IconTrash size={18} /> {deleting ? 'A eliminar…' : 'Excluir canal'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, background: '#111214', padding: 40, overflowY: 'auto' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = TEXT_BRIGHT; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = TEXT_MUTED; }}>
            <IconClose size={20} />
          </button>
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
    <SimpleModal title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconCalendar size={22} color={ACCENT} /> Criar evento</div>} onClose={onClose} maxWidth={560}>
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
          style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || !title.trim() || !startsAt) ? 0.5 : 1, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving ? '⏳ A criar…' : <><IconPlus size={18} stroke={3} /> Criar evento</>}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconCalendar size={18} color={ACCENT} />
          <span style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 15 }}>Eventos</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isAdmin && <button onClick={onNew} style={{ background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, color: '#000', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(165,230,0,0.3)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => (e.currentTarget as any).style.boxShadow = '0 4px 16px rgba(165,230,0,0.5)'}
            onMouseLeave={e => (e.currentTarget as any).style.boxShadow = '0 2px 10px rgba(165,230,0,0.3)'}>
            <IconPlus size={14} stroke={3} /> Novo
          </button>}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: TEXT_MUTED, cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as any).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as any).style.color = TEXT_MUTED; }}>
            <IconClose size={16} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {upcoming.length === 0 && past.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <IconCalendar size={48} color={BORDER_SUBTLE} style={{ animation: 'float 3s ease-in-out infinite' }} />
            </div>
            <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Nenhum evento agendado ainda.</p>
            {isAdmin && <button onClick={onNew} style={{ background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, color: '#000', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(165,230,0,0.3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconPlus size={18} stroke={3} /> Criar primeiro evento
            </button>}
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
                    style={{ background: 'transparent', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, borderRadius: 5, padding: '2px 10px', fontSize: 10, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}
                    onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'rgba(237,66,69,0.5)'; (e.currentTarget as any).style.color = '#ED4245'; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.borderColor = BORDER_SUBTLE; (e.currentTarget as any).style.color = TEXT_MUTED; }}>
                    <IconTrash size={12} /> Limpar histórico
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
        <p style={{ color: ACCENT, fontSize: 11, margin: '0 0 4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconCalendar size={12} /> {fmtEventDate(ev.startsAt)}
        </p>
        {ev.endsAt && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconClock size={12} /> {fmtEventDate(ev.endsAt)}
        </p>}
        {ev.location && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconGlobe size={12} /> {ev.location}
        </p>}
        {ev.description && (
          <div style={{ color: TEXT_NORMAL, fontSize: 12, margin: '0 0 8px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <EmojiRenderer content={ev.description} emojiSize={14} />
          </div>
        )}
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
function SimpleModal({ title, children, onClose, maxWidth = 480 }: { title: React.ReactNode; children: React.ReactNode; onClose: () => void; maxWidth?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.15s ease' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }} />
      <div style={{ position: 'relative', zIndex: 10, background: '#0d0e10', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 20, padding: 28, width: '100%', maxWidth, maxHeight: '88vh', overflowY: 'auto', animation: 'slideUp 0.2s cubic-bezier(.4,0,.2,1)', boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(165,230,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid rgba(255,255,255,0.08)`, color: TEXT_MUTED, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = TEXT_MUTED; }}
          ><IconClose size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── CHANNEL ROW ─────────────────────────────────────────────────────────────
function ChannelRow({ ch, active, canManage, onSelect, onSettings, unreadCount, hasUnseenPins }: { ch: Channel; active: boolean; canManage: boolean; onSelect: (ch: Channel) => void; onSettings: (ch: Channel) => void; unreadCount?: number; hasUnseenPins?: boolean; }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="ch-row" style={{ width: 'calc(100% - 16px)', margin: '1px 8px', display: 'flex', alignItems: 'center', borderRadius: 6, background: active ? 'rgba(165,230,0,0.08)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent', cursor: 'pointer', transition: 'background 0.12s, transform 0.12s' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => onSelect(ch)}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '6px 8px', gap: 8, minWidth: 0 }}>
        <IconHashtag size={16} color={active ? ACCENT : hovered ? TEXT_NORMAL : TEXT_MUTED} />
        <span style={{ color: active ? TEXT_BRIGHT : hovered ? TEXT_NORMAL : TEXT_MUTED, fontSize: 13, fontWeight: active ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, transition: 'color 0.12s' }}>
          <EmojiRenderer content={ch.name} emojiSize={14} />
        </span>
        {hasUnseenPins && <div className="blink-green-dot" title="Novas mensagens fixadas" />}
        {(unreadCount ?? 0) > 0 && <div className="unread-badge">{unreadCount}</div>}
        {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: '0 0 6px rgba(165,230,0,0.8)', flexShrink: 0 }} />}
      </div>
      {canManage && hovered && (
        <div style={{ display: 'flex', gap: 2, paddingRight: 6 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onSettings(ch)} title="Editar canal" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: TEXT_MUTED, cursor: 'pointer', width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = TEXT_BRIGHT; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = TEXT_MUTED; }}>
            <IconSettings size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MESSAGE BODY ─────────────────────────────────────────────────────────────
function MessageBody({ msg, mt, members, userId, onMediaClick }: { msg: Msg; mt: string; members: Member[]; userId: string | undefined; onMediaClick: (url: string, type: 'image' | 'video') => void }) {
  if (msg.attachmentUrls?.length) return (
    <div>
      {msg.attachmentUrls.map((u, i) => {
        const isImg = /\.(png|jpe?g|gif|webp)$/i.test(u);
        const isVid = /\.(mp4|webm|mov|ogg)$/i.test(u);
        
        if (isImg) return <img key={i} src={u} alt="" style={{ maxWidth: 400, maxHeight: 300, borderRadius: 8, display: 'block', marginBottom: 4, cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => onMediaClick(u, 'image')} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />;
        
        if (isVid) return (
          <div key={i} style={{ position: 'relative', width: 'fit-content', cursor: 'pointer', marginBottom: 4 }} 
            onClick={() => onMediaClick(u, 'video')}
            onMouseEnter={e => {
              const v = e.currentTarget.querySelector('video');
              if (v) v.play().catch(() => {});
            }}
            onMouseLeave={e => {
              const v = e.currentTarget.querySelector('video');
              if (v) { v.pause(); v.currentTime = 0; }
            }}
          >
            <video src={u} muted loop playsInline style={{ maxWidth: 400, maxHeight: 300, borderRadius: 8, display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: 8, opacity: 0.8 }}>
              <IconMenu size={32} color="#fff" />
            </div>
          </div>
        );

        return (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', marginBottom: 6, color: '#7EB6FF', fontSize: 13, textDecoration: 'none', width: 'fit-content', transition: 'all 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}>
            <IconPlus size={16} /> <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 200, whiteSpace: 'nowrap' }}>{u.split('/').pop()}</span>
          </a>
        );
      })}
      {msg.content?.trim() && (
        <div style={{ color: TEXT_NORMAL, fontSize: 15, margin: '4px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <EmojiRenderer content={msg.content} />
        </div>
      )}
    </div>
  );
  if (mt === 'image' && msg.imageUrl) return (
    <div>
      <img src={msg.imageUrl} alt="" style={{ maxWidth: 400, maxHeight: 300, borderRadius: 8, display: 'block', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => onMediaClick(msg.imageUrl!, 'image')} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
      {msg.content?.trim() && <p style={{ color: TEXT_NORMAL, fontSize: 14, margin: '6px 0 0' }}>{msg.content}</p>}
    </div>
  );
  if ((mt === 'embed' || msg.embedJson) && msg.embedJson) {
    const e = msg.embedJson as any;
    return (
      <div style={{ borderLeft: `4px solid ${e.color || '#7C6FAD'}`, background: 'rgba(0,0,0,0.2)', borderRadius: '0 8px 8px 0', padding: '10px 12px 10px 16px', marginTop: 2 }}>
        {e.title && <p style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>{e.title}</p>}
        {e.description && (
          <div style={{ color: TEXT_NORMAL, fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
            <EmojiRenderer content={e.description} emojiSize={18} />
          </div>
        )}
        {e.imageUrl && <img src={e.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 6, marginTop: 8 }} />}
        {e.footer && <p style={{ color: TEXT_MUTED, fontSize: 11, margin: '6px 0 0' }}>{e.footer}</p>}
      </div>
    );
  }
  const content = msg.content ?? '';
  const contentTrimmed = content.trim();
  const isOnlyEmoji = /^:[a-z0-9_]+:$/.test(contentTrimmed) || !!getAnimatedUrl(contentTrimmed);

  // Highlighting logic
  function renderContent(text: string) {
    // Split by @everyone and @username mentions
    const parts = text.split(/(@everyone|@todos|@[\w.]+)/g);
    return parts.map((part, i) => {
      const pLower = part.toLowerCase();
      if (pLower === '@everyone' || pLower === '@todos') {
        return <mark key={i} style={{ background: 'rgba(250,168,26,0.15)', color: '#FAA81A', borderRadius: 3, padding: '0 2px', fontWeight: 600 }}>{part}</mark>;
      }
      if (part.startsWith('@')) {
        const username = part.slice(1).toLowerCase();
        const member = members.find(m => m.profile?.username.toLowerCase() === username);
        if (member) {
          const isMe = member.userId === userId;
          return (
            <span key={i} style={{ 
              background: isMe ? 'rgba(165,230,0,0.15)' : 'rgba(88,101,242,0.15)', 
              color: isMe ? ACCENT : '#7EB6FF', 
              borderRadius: 3, 
              padding: '0 2px', 
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              @{member.profile?.displayName || member.profile?.username}
            </span>
          );
        }
      }
      return <EmojiRenderer key={i} content={part} emojiSize={isOnlyEmoji ? 32 : 20} />;
    });
  }

  return (
    <div style={{ color: TEXT_NORMAL, fontSize: 15, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {renderContent(content)}
    </div>
  );
}

// ─── REACTIONS BAR ───────────────────────────────────────────────────────────
function ReactionsBar({ rx, onReact }: { rx: { emoji: string; count: number; me: boolean }[]; onReact: (e: string) => void }) {
  if (!rx.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {rx.map(r => (
        <button key={r.emoji} onClick={() => onReact(r.emoji)}
          style={{ background: r.me ? ACCENT_DIM : 'rgba(0,0,0,0.25)', border: `1px solid ${r.me ? ACCENT : BORDER_SUBTLE}`, borderRadius: 12, padding: '2px 8px', fontSize: 13, color: r.me ? ACCENT : TEXT_BRIGHT, cursor: 'pointer', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={ev => { if (!r.me) ev.currentTarget.style.borderColor = ACCENT + '66'; }}
          onMouseLeave={ev => { if (!r.me) ev.currentTarget.style.borderColor = BORDER_SUBTLE; }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {(() => {
              const url = getAnimatedUrl(r.emoji);
              if (url) {
                return <img src={url} alt={r.emoji} style={{ width: 14, height: 14, objectFit: 'contain' }} />;
              }
              return r.emoji;
            })()}
          </span>
          <span>{r.count}</span>
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
          <button onClick={() => onReact(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '3px 5px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER}
            onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>
            <EmojiRenderer content={e} emojiSize={16} />
          </button>
        </Tooltip>
      ))}
      <div style={{ position: 'relative' }}>
        <Tooltip text="Reagir">
          <button onClick={onToggleEmojiPicker} style={{ background: showEmojiPicker ? BG_HOVER : 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 14, padding: '4px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
            onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER}
            onMouseLeave={ev => { if (!showEmojiPicker) ev.currentTarget.style.background = 'none'; }}>
            <IconEmoji size={18} />
          </button>
        </Tooltip>
        {showEmojiPicker && <EmojiPickerPopover onSelect={onReact} onClose={() => onToggleEmojiPicker({ stopPropagation: () => { } } as any)} />}
      </div>
      <div style={{ width: 1, height: 18, background: BORDER_SUBTLE, alignSelf: 'center', margin: '0 1px' }} />
      <Tooltip text="Responder">
        <button onClick={onReply} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: '4px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }} onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>
          <IconReply size={18} />
        </button>
      </Tooltip>
      {isMod && (
        <Tooltip text={isPinned ? 'Desafixar' : 'Fixar'}>
          <button onClick={onPin} style={{ background: isPinned ? ACCENT_DIM : 'none', border: 'none', color: isPinned ? ACCENT : TEXT_MUTED, cursor: 'pointer', padding: '4px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }} onMouseEnter={ev => { if (!isPinned) ev.currentTarget.style.background = BG_HOVER; }} onMouseLeave={ev => { if (!isPinned) ev.currentTarget.style.background = 'none'; }}>
            <IconPin size={18} />
          </button>
        </Tooltip>
      )}
      {isOwn && (
        <Tooltip text="Editar">
          <button onClick={onEdit} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: '4px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }} onMouseEnter={ev => ev.currentTarget.style.background = BG_HOVER} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>
            <IconEdit size={18} />
          </button>
        </Tooltip>
      )}
      {canDel && (
        <Tooltip text="Apagar">
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ED4245', cursor: 'pointer', padding: '4px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }} onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(237,66,69,0.15)'} onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>
            <IconTrash size={18} />
          </button>
        </Tooltip>
      )}
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
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#000', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease' }}>
      {/* Hero Banner */}
      <div style={{ position: 'relative', height: 220, background: server.bannerUrl && !isVideoUrl(server.bannerUrl) ? 'transparent' : (server.bannerColor ?? '#0d1117'), backgroundImage: server.bannerUrl && !isVideoUrl(server.bannerUrl) ? `url(${server.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, overflow: 'hidden' }}>
        {isVideoUrl(server.bannerUrl) && <video src={server.bannerUrl!} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
        {/* gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 70%, #000 100%)' }} />

        {/* top actions */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={onEditServer}
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: TEXT_NORMAL, borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = TEXT_BRIGHT; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = TEXT_NORMAL; }}>
              <IconSettings size={16} /> Editar servidor
            </button>
          )}
          <button onClick={onInvite}
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #7BC800)`, border: 'none', color: '#000', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(165,230,0,0.3)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(165,230,0,0.5)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(165,230,0,0.3)'}>
            <IconPlus size={18} stroke={3} /> Convidar
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
            <h1 style={{ color: TEXT_BRIGHT, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              <EmojiRenderer content={server.name} emojiSize={32} />
            </h1>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <span style={{ color: TEXT_MUTED, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: '0 0 8px rgba(165,230,0,0.6)' }} />
                {server.membersCount} membros
              </span>
              <span style={{ color: TEXT_MUTED, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><IconPlus size={14} color={ACCENT} /> {server.channels.length} canais</span>
              {upcomingEvs.length > 0 && <span style={{ color: ACCENT, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><IconCalendar size={14} /> {upcomingEvs.length} evento{upcomingEvs.length > 1 ? 's' : ''} próximos</span>}
            </div>
          </div>
          {/* Invite code pill */}
          <button onClick={copyInvite}
            style={{ background: copied ? 'rgba(165,230,0,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(165,230,0,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: copied ? ACCENT : TEXT_MUTED }}>{server.inviteCode}</span>
            <span style={{ fontSize: 12, color: copied ? ACCENT : TEXT_MUTED }}>{copied ? '✓ Copiado!' : <><IconPlus size={14} /> Copiar convite</>}</span>
          </button>
        </div>

        <div style={{ width: '100%', height: 1, background: BORDER_SUBTLE, margin: '20px 0' }} />

        {/* About — full width */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><IconEdit size={18} color={ACCENT} /> Sobre o servidor</h2>
            {isAdmin && !editingAbout && (
              <button onClick={() => setEditingAbout(true)}
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER_SUBTLE}`, color: TEXT_MUTED, borderRadius: 8, padding: '5px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = ACCENT + '66'; }}
                onMouseLeave={e => { e.currentTarget.style.color = TEXT_MUTED; e.currentTarget.style.borderColor = BORDER_SUBTLE; }}>
                <IconEdit size={14} /> Editar
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
              <EmojiRenderer content={aboutText || (isAdmin ? 'Clica em "Editar" para adicionar uma descrição do servidor.' : 'Este servidor ainda não tem descrição.')} emojiSize={20} />
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
                        <p style={{ margin: '0 0 3px', color: TEXT_BRIGHT, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <EmojiRenderer content={ev.title} emojiSize={14} />
                        </p>
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
                    <span style={{ color: TEXT_MUTED, fontSize: 14 }}>#</span> 
                    <EmojiRenderer content={ch.name} emojiSize={14} />
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
                      {m.userId === server.ownerId && <span style={{ fontSize: 12, display: 'flex' }}><IconShield size={12} color="#F0B132" /></span>}
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
                    <span key={r.id} style={{ fontSize: 11, background: (r.color || '#7C6FAD') + '20', color: r.color || '#7C6FAD', border: `1px solid ${(r.color || '#7C6FAD')}40`, borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                      <EmojiRenderer content={r.name} emojiSize={12} />
                    </span>
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
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
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
  const [previewMedia, setPreviewMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [showPins, setShowPins] = useState(false);
  const [pins, setPins] = useState<Msg[]>([]);
  const [memberSearchQ, setMemberSearchQ] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [randomEmoji, setRandomEmoji] = useState(EMOJIS[0]);
  const handleEmojiHover = () => {
    const next = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    setRandomEmoji(next);
  };
  const [showGuide, setShowGuide] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [typingIds, setTypingIds] = useState<Record<string, boolean>>({});
  const [verifyInput, setVerifyInput] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    isDanger?: boolean; 
    confirmText?: string; 
    verifyText?: string; // for server deletion
  } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [unseenPins, setUnseenPins] = useState<Record<string, boolean>>({});

  const isModalOpen = !!(memberMenuUserId || channelSettingsTarget || showServerSettings || showEditProfile || showInvite || showCh || showCat || showCreateEvent || confirmConfig || pendingFile);

  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef<string | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showPicker, setShowPicker, triggerRef, onEmojiSelect } = useEmojiPickerPopup();

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
    const h = (msg: Msg) => { 
      if (msg.channelId === channel?.id) {
        setMsgs(p => p.some(m => m.id === msg.id) ? p : [...p, msg]); 
      } else {
        setUnreadCounts(prev => ({ ...prev, [msg.channelId]: (prev[msg.channelId] || 0) + 1 }));
      }
    };
    const del = (payload: { id?: string; messageId?: string; channelId: string }) => { if (payload.channelId !== channel?.id) return; const mid = payload.id ?? payload.messageId; if (!mid) return; setMsgs(p => p.filter(m => m.id !== mid)); };
    const upd = (msg: Msg) => { 
      if (msg.channelId === channel?.id) {
        setMsgs(p => p.map(m => m.id === msg.id ? msg : m)); 
      }
      if (msg.pinned) {
        if (msg.channelId !== channel?.id || !showPins) {
          setUnseenPins(prev => ({ ...prev, [msg.channelId]: true }));
        }
      }
    };
    const react = (payload: { messageId: string; channelId: string; reactions: ReactionEntry[] }) => { if (payload.channelId !== channel?.id) return; setMsgs(p => p.map(m => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m)); };
    const typing = (payload: { channelId: string; userId: string; typing: boolean }) => { if (payload.channelId !== channel?.id || payload.userId === user?.id) return; setTypingIds(prev => { const next = { ...prev }; if (payload.typing) next[payload.userId] = true; else delete next[payload.userId]; return next; }); };
    socket.on('message.new', h); socket.on('message.deleted', del); socket.on('message.updated', upd); socket.on('reaction.updated', react); socket.on('typing.update', typing);
    return () => { socket.off('message.new', h); socket.off('message.deleted', del); socket.off('message.updated', upd); socket.off('reaction.updated', react); socket.off('typing.update', typing); };
  }, [socket, channel?.id, user?.id, showPins]);

  useEffect(() => {
    if (channel) {
      setUnreadCounts(prev => {
        if (prev[channel.id]) { const next = { ...prev }; delete next[channel.id]; return next; }
        return prev;
      });
    }
  }, [channel]);

  useEffect(() => {
    if (showPins && channel) {
      setUnseenPins(prev => {
        if (prev[channel.id]) { const next = { ...prev }; delete next[channel.id]; return next; }
        return prev;
      });
    }
  }, [showPins, channel]);

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
    if (!server) return;
    setConfirmConfig({
      title: 'Expulsar Membro',
      message: 'Tens a certeza que desejas expulsar este membro do servidor?',
      isDanger: true,
      onConfirm: async () => {
        try { await api.delete(`/community/servers/${server.id}/members/${targetUserId}`); setMemberMenuUserId(null); await refreshServer(); } catch (e: any) { alert(e.message); }
        setConfirmConfig(null);
      }
    });
  }
  async function handleBan(targetUserId: string) {
    if (!server) return;
    setConfirmConfig({
      title: 'Banir Utilizador',
      message: 'Tens a certeza que desejas banir este utilizador? Ele não poderá voltar a entrar.',
      isDanger: true,
      onConfirm: async () => {
        try { await api.post(`/community/servers/${server.id}/ban/${targetUserId}`); setMemberMenuUserId(null); await refreshServer(); } catch (e: any) { alert(e.message); }
        setConfirmConfig(null);
      }
    });
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
    setConfirmConfig({
      title: 'Sair do Servidor',
      message: `Tens a certeza que desejas sair do servidor "${server.name}"?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/community/servers/${server.id}/members/me`);
          router.push('/main/community');
        } catch (e: any) { alert(e.message); }
        setConfirmConfig(null);
      }
    });
  }
  async function handleDeleteServer() {
    if (!server) return;
    setConfirmConfig({
      title: 'Eliminar Servidor',
      message: `Esta ação é irreversível. Todas as mensagens, canais e membros serão perdidos para sempre.\nPara confirmar, escreve o nome do servidor: "${server.name}"`,
      isDanger: true,
      verifyText: server.name,
      confirmText: 'Eliminar Servidor',
      onConfirm: async () => {
        try { await api.delete(`/community/servers/${server.id}`); router.push('/main/community'); } catch { alert('Não foi possível eliminar o servidor.'); }
        setConfirmConfig(null);
      }
    });
  }
  async function handleDeleteChannel(channelId: string) {
    const chToDel = server?.channels.find(c => c.id === channelId);
    setConfirmConfig({
      title: 'Eliminar Canal',
      message: `Tens a certeza que desejas eliminar o canal #${chToDel?.name}? Todas as mensagens serão perdidas.`,
      isDanger: true,
      onConfirm: async () => {
        try { await api.delete(`/community/channels/${channelId}`); } catch { /* fallthrough */ }
        setServer(p => p ? { ...p, channels: p.channels.filter(c => c.id !== channelId) } : p);
        if (channel?.id === channelId) { const rest = server?.channels.filter(c => c.id !== channelId) ?? []; setChannel(rest[0] ?? null); }
        setChannelSettingsTarget(null);
        setConfirmConfig(null);
      }
    });
  }
  async function handleSaveChannel(channelId: string, name: string, topic: string) {
    try { await api.patch(`/community/channels/${channelId}`, { name, topic }); } catch { /* optimistic */ }
    setServer(p => p ? { ...p, channels: p.channels.map(c => c.id === channelId ? { ...c, name, topic } : c) } : p);
    if (channel?.id === channelId) setChannel(p => p ? { ...p, name, topic } : p);
  }
  async function handleDeleteCategory(catId: string) {
    if (!server) return;
    setConfirmConfig({
      title: 'Eliminar Categoria',
      message: 'Tens a certeza que desejas eliminar esta categoria e todos os canais nela contidos?',
      isDanger: true,
      onConfirm: async () => {
        try { await api.delete(`/community/servers/${server.id}/categories/${catId}`); } catch { /* optimistic */ }
        setServer(p => p ? { ...p, channelCategories: p.channelCategories.filter(c => c.id !== catId) } : p);
        setConfirmConfig(null);
      }
    });
  }
  async function handleClearPastEvents() {
    if (!server) return;
    setConfirmConfig({
      title: 'Limpar Eventos Passados',
      message: 'Tens a certeza que desejas remover todos os eventos que já terminaram?',
      onConfirm: async () => {
        try {
          await api.delete(`/community/servers/${server.id}/events/past`);
          setEvents(p => p.filter(e => new Date(e.startsAt) > new Date()));
        } catch (e: any) { alert(e.message); }
        setConfirmConfig(null);
      }
    });
  }
  async function handleCreateRole(name: string, color: string, perms: { canModerate: boolean; canManageServer: boolean; canManageChannels: boolean }) {
    if (!server) return;
    const role = await api.post<CommunityRole>(`/community/servers/${server.id}/roles`, { name, color, ...perms });
    setServer(p => p ? { ...p, roles: [...p.roles, role] } : p);
  }
  async function handleDeleteRole(roleId: string) {
    if (!server) return;
    setConfirmConfig({
      title: 'Eliminar Cargo',
      message: 'Tens a certeza que desejas eliminar este cargo?',
      isDanger: true,
      onConfirm: async () => {
        try { await api.delete(`/community/servers/${server.id}/roles/${roleId}`); setServer(p => p ? { ...p, roles: p.roles.filter(r => r.id !== roleId) } : p); } catch (e: any) { alert(e.message); }
        setConfirmConfig(null);
      }
    });
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
    setPendingFile(file);
    if (fileRef.current) fileRef.current.value = '';
  }
  async function performFileUpload(file: File) {
    if (!channel || !socket || !server) return;
    setUploadingFile(true); setShowAttachMenu(false);
    try {
      const url = await uploadFile(file, server.id);
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const hasPreview = isImage || isVideo;
      socket.emit('message.send', { 
        channelId: channel.id, 
        content: hasPreview ? '' : file.name, 
        ...(isImage ? { imageUrl: url, messageType: 'image' } : { attachmentUrls: [url] }), 
        replyToId: replyTo?.id ?? undefined 
      });
      setReplyTo(null);
    } catch (err: any) { alert('Falha ao enviar: ' + err.message); }
    finally { setUploadingFile(false); }
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
  
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const dist = scrollHeight - (scrollTop + clientHeight);
    setShowScrollBtn(dist > 300);
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

  const mentionResults = useMemo(() => {
    if (mentionSearch === null || !server) return [];
    const q = mentionSearch.toLowerCase();
    const results: (Member | { id: string; type: 'everyone' })[] = [];
    
    if ('everyone'.includes(q) || 'todos'.includes(q)) {
      results.push({ id: 'everyone', type: 'everyone' });
    }

    const filteredMembers = (server?.members || []).filter(m => 
      m.profile?.username.toLowerCase().includes(q) || 
      m.profile?.displayName?.toLowerCase().includes(q)
    );
    
    return [...results, ...filteredMembers].slice(0, 10);
  }, [server?.members, mentionSearch]);

  const insertMention = useCallback((item: Member | { type: 'everyone' }) => {
    if (mentionSearch === null || !inputRef.current) return;
    const pos = inputRef.current.selectionStart || 0;
    const before = text.slice(0, pos).replace(/@[\w.]*$/, '');
    const after = text.slice(pos);
    
    const mentionText = (item as any).type === 'everyone' ? 'todos' : (item as Member).profile?.username;
    const newText = before + `@${mentionText} ` + after;
    
    setText(newText);
    setMentionSearch(null);
    setMentionIndex(0);
    setTimeout(() => {
      if (inputRef.current) {
        const newPos = (before + `@${mentionText} `).length;
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }
    }, 0);
  }, [text, mentionSearch]);

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

        .msg-row:hover { background: rgba(255,255,255,0.025); border-radius: 6px; }
        .msg-row:hover .msg-actions { opacity: 1 !important; pointer-events: auto !important; }
        button { font-family: inherit; }

        @keyframes blink-green {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 4px rgba(165,230,0,0.8)); transform: scale(1); }
          50% { opacity: 0.5; filter: drop-shadow(0 0 1px rgba(165,230,0,0.4)); transform: scale(0.9); }
        }
        @keyframes blink-red {
          0%, 100% { transform: scale(1); box-shadow: 0 0 6px rgba(237,66,69,0.3); }
          50% { transform: scale(1.1); box-shadow: 0 0 12px rgba(237,66,69,0.6); }
        }
        .blink-green-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #A5E600;
          animation: blink-green 1.5s infinite ease-in-out;
        }
        .unread-badge {
          background: #ED4245; color: #fff; border-radius: 10px; padding: 1px 6px;
          font-size: 10px; fontWeight: 800; animation: blink-red 1.5s infinite ease-in-out;
          min-width: 16px; text-align: center;
        }
      `}</style>

      {/* ── 1. SERVERS SIDEBAR ─── */}
      <div style={{ width: 72, background: BG_DARKEST, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, overflowY: 'auto', flexShrink: 0, borderRight: `1px solid ${BORDER_SUBTLE}` }}>
        <button onClick={() => router.push('/main/community')} title="Início" style={{ width: 48, height: 48, borderRadius: '40%', background: BG_LIGHT, border: '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: ACCENT, flexShrink: 0, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderRadius = '50%'; e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#000'; }}
          onMouseLeave={e => { e.currentTarget.style.borderRadius = '40%'; e.currentTarget.style.background = BG_LIGHT; e.currentTarget.style.color = ACCENT; }}>
          <IconHome size={24} />
        </button>
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
        {(server?.bannerUrl || server?.bannerColor) && (
          <div style={{ height: 80, background: server?.bannerColor ?? '#1a1a2e', backgroundImage: server?.bannerUrl && !isVideoUrl(server?.bannerUrl) ? `url(${server?.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            {server?.bannerUrl && isVideoUrl(server.bannerUrl) && <video src={server.bannerUrl} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(7,8,10,0.7) 100%)', zIndex: 1 }} />
          </div>
        )}
        {/* Server header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid rgba(255,255,255,0.05)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, userSelect: 'none', transition: 'background 0.15s', flexShrink: 0 }}
          onClick={() => setShowServerMenu(p => !p)}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
          <h2 style={{ color: TEXT_BRIGHT, fontSize: 15, fontWeight: 800, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            <EmojiRenderer content={server?.name ?? ''} emojiSize={18} />
          </h2>
          <IconChevronDown size={14} color={TEXT_MUTED} style={{ transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)', transform: showServerMenu ? 'rotate(180deg)' : 'none' }} />
        </div>

        {/* Server dropdown */}
        {showServerMenu && (
          <div style={{ background: '#0b0c0e', margin: '4px 8px 8px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.08)`, overflow: 'hidden', animation: 'slideDown 0.15s cubic-bezier(.4,0,.2,1)', boxShadow: '0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(165,230,0,0.06)', backdropFilter: 'blur(8px)' }}>
            <div style={{ padding: '4px 0' }}>
              {[
                { label: 'Convidar para o servidor', icon: <IconPlus size={16} />, action: () => { setShowInvite(true); setShowServerMenu(false); } },
                { label: 'Configurações do servidor', icon: <IconSettings size={16} />, action: () => { setShowServerSettings(true); setShowServerMenu(false); }, admin: true },
                { label: 'Criar canal', icon: <IconHashtag size={16} />, action: () => { setShowCh(true); setShowServerMenu(false); }, admin: true },
                { label: 'Criar categoria', icon: <IconMenu size={16} />, action: () => { setShowCat(true); setShowServerMenu(false); }, admin: true },
                { label: 'Criar evento', icon: <IconCalendar size={16} />, action: () => { setShowCreateEvent(true); setShowServerMenu(false); }, admin: true },
                null,
                { label: 'Sair do servidor', icon: <IconClose size={16} />, action: handleLeaveServer, danger: true },
              ].map((item, i) => item === null ? (
                <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
              ) : (
                (!item.admin || isAdmin) && (
                  <button key={i} onClick={item.action} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: (item as any).danger ? '#ED4245' : TEXT_NORMAL, padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.1s', borderRadius: 0 }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = (item as any).danger ? 'rgba(237,66,69,0.12)' : 'rgba(255,255,255,0.06)'; (e.currentTarget as any).style.color = (item as any).danger ? '#FF6B6B' : TEXT_BRIGHT; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'transparent'; (e.currentTarget as any).style.color = (item as any).danger ? '#ED4245' : TEXT_NORMAL; }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'currentColor', opacity: 0.7 }}>{item.icon}</span>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
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
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: showGuide ? 'rgba(165,230,0,0.1)' : 'transparent', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: showGuide ? ACCENT : TEXT_MUTED, fontSize: 13, fontWeight: showGuide ? 700 : 600, transition: 'all 0.12s', margin: '4px 0', boxSizing: 'border-box' }}
              onMouseEnter={e => { if (!showGuide) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = TEXT_BRIGHT; } }}
              onMouseLeave={e => { if (!showGuide) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_MUTED; } }}>
              <IconGlobe size={18} />
            <span>Guia do Servidor</span>
          </button>
          {channelsByCategory.uncategorized.length > 0 && (
            <div style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px 4px 16px', marginBottom: 2 }}>
                <span style={{ flex: 1, color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Canais de texto</span>
                {canManageCh && <button onClick={() => setShowCh(true)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 4px', transition: 'color 0.1s' }} onMouseEnter={e => e.currentTarget.style.color = TEXT_BRIGHT} onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}><IconPlus size={16} /></button>}
              </div>
              {channelsByCategory.uncategorized.map(ch => <ChannelRow key={ch.id} ch={ch} active={channel?.id === ch.id} canManage={canManageCh} unreadCount={unreadCounts[ch.id]} hasUnseenPins={unseenPins[ch.id]} onSelect={ch => { setChannel(ch); setShowGuide(false); }} onSettings={setChannelSettingsTarget} />)}
            </div>
          )}
          {(server?.channelCategories ?? []).map(cat => {
            const catChannels = channelsByCategory.byCat.get(cat.id) ?? [];
            const collapsed = collapsedCats[cat.id];
            return (
              <div key={cat.id} style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px 2px' }}>
                  <button type="button" onClick={() => setCollapsedCats(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', gap: 4, padding: '4px 8px', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = TEXT_BRIGHT}
                    onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}>
                    <IconChevronDown size={10} style={{ transition: 'transform 0.15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                    <span style={{ flex: 1 }}>
                      <EmojiRenderer content={cat.name} emojiSize={14} />
                    </span>
                  </button>
                  {canManageCh && <button onClick={() => { setShowCh(true); setChCategoryId(cat.id); }} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px 6px', transition: 'color 0.1s' }} onMouseEnter={e => e.currentTarget.style.color = TEXT_BRIGHT} onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}><IconPlus size={14} /></button>}
                  {isAdmin && <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px 4px', opacity: 0.5, transition: 'all 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ED4245'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = TEXT_MUTED; }}><IconClose size={14} /></button>}
                </div>
                {!collapsed && catChannels.map(ch => <ChannelRow key={ch.id} ch={ch} active={channel?.id === ch.id} canManage={canManageCh} unreadCount={unreadCounts[ch.id]} hasUnseenPins={unseenPins[ch.id]} onSelect={ch => { setChannel(ch); setShowGuide(false); }} onSettings={setChannelSettingsTarget} />)}
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
          <div style={{ display: 'flex', gap: 4 }}>
            <Tooltip text="Editar perfil"><button onClick={() => setShowEditProfile(true)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: TEXT_MUTED, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }} onMouseEnter={e => { e.currentTarget.style.color = TEXT_BRIGHT; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_MUTED; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}><IconEdit size={16} /></button></Tooltip>
            {isAdmin && <Tooltip text="Configurações do servidor"><button onClick={() => setShowServerSettings(true)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: TEXT_MUTED, cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }} onMouseEnter={e => { e.currentTarget.style.color = TEXT_BRIGHT; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_MUTED; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}><IconSettings size={16} /></button></Tooltip>}
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
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', background: '#000', overflow: 'hidden' }}>
          {/* 1. Floating Menu Button (Always on top) */}
          <button onClick={() => setShowServerMenu(p => !p)}
            style={{ position: 'absolute', top: 24, left: 10, zIndex: 110, width: 34, height: 34, background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(10px)', border: `1px solid ${ACCENT}88`, borderRadius: 10, color: ACCENT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', transition: 'all 0.2s', animation: 'float 3s ease-in-out infinite', opacity: isModalOpen ? 0 : 1, visibility: isModalOpen ? 'hidden' : 'visible' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(5,5,5,0.85)'; e.currentTarget.style.color = ACCENT; }}>
            <IconMenu size={18} />
          </button>

          {/* 2. Server Identity Bar (Discord style) */}
          {server && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 34, zIndex: 105, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', opacity: isModalOpen ? 0 : 1, visibility: isModalOpen ? 'hidden' : 'visible' }}>
              <span style={{ color: TEXT_MUTED, fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                <EmojiRenderer content={server.name} emojiSize={14} />
              </span>
            </div>
          )}

          {/* 3. Channel Topbar (Shifted down) */}
          {channel && (
            <div style={{ position: 'absolute', top: 34, left: 0, right: 0, height: 48, zIndex: 100, background: '#050505', borderBottom: `1px solid rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', padding: '0 16px 0 56px', gap: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.8)', opacity: isModalOpen ? 0 : 1, visibility: isModalOpen ? 'hidden' : 'visible' }}>
              <IconHashtag size={20} color={ACCENT} style={{ opacity: 0.8 }} />
              <span style={{ color: TEXT_BRIGHT, fontWeight: 700, fontSize: 15 }}>
                <EmojiRenderer content={channel.name} emojiSize={18} />
              </span>
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ color: TEXT_MUTED, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <EmojiRenderer content={channel?.topic?.trim() || 'Canal de texto'} emojiSize={16} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {channel && isMod && <Tooltip text="Fixadas">
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => { if (!channel) return; setShowPins(p => !p); if (!showPins) api.get<Msg[]>(`/community/channels/${channel.id}/pins`).then(setPins).catch(() => { }); }}
                      style={{ background: showPins ? 'rgba(165,230,0,0.1)' : 'none', border: 'none', color: showPins ? ACCENT : TEXT_MUTED, cursor: 'pointer', padding: '5px 7px', borderRadius: 7, transition: 'all 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { if (!showPins) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = TEXT_BRIGHT; } }}
                      onMouseLeave={e => { if (!showPins) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = TEXT_MUTED; } }}><IconPin size={18} /></button>
                    {unseenPins[channel.id] && <div className="blink-green-dot" style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6 }} />}
                  </div>
                </Tooltip>}
                <Tooltip text="Eventos">
                  <button onClick={() => setShowEventsPanel(p => !p)} style={{ background: showEventsPanel ? 'rgba(165,230,0,0.1)' : 'none', border: 'none', color: showEventsPanel ? ACCENT : TEXT_MUTED, cursor: 'pointer', padding: '5px 7px', borderRadius: 7, transition: 'all 0.12s', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { if (!showEventsPanel) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = TEXT_BRIGHT; } }}
                    onMouseLeave={e => { if (!showEventsPanel) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = TEXT_MUTED; } }}>
                    <IconCalendar size={18} />
                    {upcomingEvents.length > 0 && <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: ACCENT, boxShadow: '0 0 6px rgba(165,230,0,0.8)', animation: 'pulse 2s infinite' }} />}
                  </button>
                </Tooltip>
                <Tooltip text={showMembersPanel ? 'Ocultar membros' : 'Mostrar membros'}>
                  <button onClick={() => setShowMembersPanel(p => !p)} style={{ background: showMembersPanel ? 'rgba(165,230,0,0.1)' : 'none', border: 'none', color: showMembersPanel ? ACCENT : TEXT_MUTED, cursor: 'pointer', padding: '5px 7px', borderRadius: 7, transition: 'all 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { if (!showMembersPanel) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = TEXT_BRIGHT; } }}
                    onMouseLeave={e => { if (!showMembersPanel) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = TEXT_MUTED; } }}><IconUsers size={18} /></button>
                </Tooltip>
              </div>
            </div>
          )}

          {/* 4. Messages Area */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 0', marginTop: 82 }} onClick={() => setEmojiPickerMsgId(null)} onScroll={handleScroll}>
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
              const showDateHeader = !prev || isDifferentDay(msg.createdAt, prev.createdAt);
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
                  onDelete={() => setConfirmConfig({
                    title: 'Apagar Mensagem',
                    message: 'Tens a certeza que desejas apagar esta mensagem? Esta ação não pode ser desfeita.',
                    isDanger: true,
                    onConfirm: () => {
                      socket?.emit('message.delete', { messageId: msg.id, channelId: channel?.id });
                      setConfirmConfig(null);
                    }
                  })}
                  onEdit={() => { setEditing({ id: msg.id, text: msg.content }); setText(msg.content); setTimeout(() => inputRef.current?.focus(), 50); }}
                  onReply={() => { setReplyTo(msg); setTimeout(() => inputRef.current?.focus(), 50); }}
                  onPin={() => handlePin(msg)}
                />
              );

              if (grouped && !showDateHeader) return (
                <div key={msg.id} className="msg-row" style={{ display: 'flex', alignItems: 'flex-start', padding: '1px 0 1px 56px', position: 'relative', animation: 'fadeIn 0.12s ease' }}>
                  <div style={{ flex: 1 }}><MessageBody msg={msg} mt={mt} members={server?.members || []} userId={user?.id} onMediaClick={(url, type) => setPreviewMedia({ url, type })} /><ReactionsBar rx={rx} onReact={emoji => socket?.emit('reaction.toggle', { channelId: channel?.id, messageId: msg.id, emoji })} /></div>
                  {actions}
                </div>
              );

              const isMentioned = msg.mentions?.everyone || msg.mentions?.userIds?.includes(user?.id || '');

              return (
                <Fragment key={msg.id}>
                  {showDateHeader && <DateSeparator label={formatDateLabel(msg.createdAt)} />}
                  <div className="msg-row" style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    padding: '8px 0 2px', 
                    gap: 16, 
                    position: 'relative', 
                    animation: 'fadeIn 0.12s ease', 
                    marginTop: grouped ? 2 : 8,
                    background: isMentioned ? 'rgba(165,230,0,0.03)' : 'transparent',
                    borderLeft: isMentioned ? `2px solid ${ACCENT}` : 'none'
                  }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: isBot ? '1px solid rgba(96,165,250,0.4)' : 'none', transition: 'opacity 0.1s' }}
                    onClick={() => { const m = server?.members.find(x => x.userId === msg.authorId); if (m) setMemberMenuUserId(m.userId); }}>
                    {isBot ? <span style={{ fontSize: 14, fontWeight: 800, color: '#93C5FD' }}>B</span> :
                      av ? <Avatar src={av} name={msg.authorName} className="w-full h-full" style={{ width: '100%', height: '100%' }} /> :
                        <span style={{ color: nameClr, fontWeight: 700, fontSize: 16 }}>{msg.authorName[0]?.toUpperCase()}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {msg.replyTo && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: TEXT_MUTED, fontSize: 12 }}>
                        <div style={{ width: 32, height: 10, borderTop: `2px solid ${BORDER_SUBTLE}`, borderLeft: `2px solid ${BORDER_SUBTLE}`, borderTopLeftRadius: 4, flexShrink: 0 }} />
                        <span style={{ color: nameColor(msg.replyTo.authorName), fontWeight: 600 }}>
                          <EmojiRenderer content={msg.replyTo.authorName} emojiSize={14} />
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{msg.replyTo.content}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      {isBot
                        ? <span style={{ color: '#7EB6FF', fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => { const m = server?.members.find(x => x.userId === msg.authorId); if (m) setMemberMenuUserId(m.userId); }}>
                            <EmojiRenderer content={msg.authorName} emojiSize={16} />
                          </span>
                        : <DisplayName profile={msg.authorProfile || authorMember?.profile} fallbackName={msg.authorName} baseColor={nameClr} style={{ fontWeight: 600, fontSize: 15, cursor: 'pointer' }} onClick={() => { const m = server?.members.find(x => x.userId === msg.authorId); if (m) setMemberMenuUserId(m.userId); }} />}
                      {isBot && <span style={{ fontSize: 10, background: 'rgba(96,165,250,0.15)', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>BOT</span>}
                      {msg.pinned && <span style={{ fontSize: 10, background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT}44`, borderRadius: 3, padding: '1px 5px' }}>📌 FIXADA</span>}
                      <span style={{ color: TEXT_MUTED, fontSize: 11 }}>{fmtDate(msg.createdAt)}</span>
                      {msg.editedAt && <span style={{ color: TEXT_MUTED, fontSize: 10, fontStyle: 'italic' }}>(editado)</span>}
                    </div>
                    <MessageBody msg={msg} mt={mt} members={server?.members || []} userId={user?.id} onMediaClick={(url, type) => setPreviewMedia({ url, type })} />
                    <ReactionsBar rx={rx} onReact={emoji => socket?.emit('reaction.toggle', { channelId: channel?.id, messageId: msg.id, emoji })} />
                  </div>
                  {actions}
                </div>
              </Fragment>
            );
          })}
            {typingNames.length > 0 && (
              <p style={{ color: TEXT_MUTED, fontSize: 13, fontStyle: 'italic', padding: '4px 0 8px', animation: 'fadeIn 0.2s', display: 'flex', alignItems: 'center', gap: 4 }}>
                {typingNames.map((name, i) => (
                  <Fragment key={i}>
                    <EmojiRenderer content={name} emojiSize={14} />
                    {i < typingNames.length - 1 ? ', ' : ''}
                  </Fragment>
                ))} a escrever…
              </p>
            )}
            <div ref={bottomRef} style={{ height: 8 }} />
          </div>

          {/* Floating Scroll to Bottom Button */}
          {showScrollBtn && (
            <button
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{ position: 'absolute', bottom: 100, right: 32, zIndex: 1000, width: 42, height: 42, background: 'rgba(5,5,5,0.7)', backdropFilter: 'blur(10px)', border: `1px solid ${ACCENT}55`, borderRadius: '50%', color: ACCENT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.scale = '1.1'; e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.scale = '1'; e.currentTarget.style.background = 'rgba(5,5,5,0.7)'; e.currentTarget.style.color = ACCENT; }}
            >
              ↓
            </button>
          )}

          {/* Pins inline */}
          {showPins && (
            <div style={{ borderTop: `1px solid ${BORDER_SUBTLE}`, padding: '12px 16px', maxHeight: 240, overflowY: 'auto', background: '#0e0f13', flexShrink: 0, animation: 'slideDown 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: TEXT_BRIGHT, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}><IconPin size={16} color={ACCENT} /> Mensagens fixadas</span>
                <button onClick={() => setShowPins(false)} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              {pins.length === 0 ? <p style={{ color: TEXT_MUTED, fontSize: 13 }}>Nenhuma mensagem fixada.</p> : pins.map(p => (
                <div key={p.id} style={{ padding: '8px 10px', background: BG_DARK, borderRadius: 6, marginBottom: 6, border: `1px solid ${BORDER_SUBTLE}` }}>
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 600 }}>
                    <EmojiRenderer content={p.authorName} emojiSize={12} />
                  </span>
                  <p style={{ color: TEXT_NORMAL, fontSize: 13, margin: '3px 0 0', whiteSpace: 'pre-wrap' }}>
                    <EmojiRenderer content={p.content} />
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
            {(replyTo || editing) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 0, background: 'rgba(165,230,0,0.06)', borderRadius: '12px 12px 0 0', border: `1px solid rgba(165,230,0,0.15)`, borderBottom: 'none', animation: 'slideDown 0.12s ease' }}>
                <span style={{ color: editing ? ACCENT : TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {editing ? <IconEdit size={14} /> : <IconReply size={14} />}
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{editing ? 'A editar mensagem' : `A responder a ${replyTo?.authorName}`}</span>
                </span>
                {!editing && replyTo && <span style={{ color: TEXT_MUTED, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>&ldquo;{replyTo.content}&rdquo;</span>}
                <button onClick={() => { setReplyTo(null); setEditing(null); setText(''); }} style={{ background: 'transparent', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}><IconClose size={16} /></button>
              </div>
            )}
            {showAttachMenu && (
              <div style={{ background: '#0b0c0e', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, padding: 6, marginBottom: 6, animation: 'slideDown 0.12s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                {[
                  { icon: <IconCamera size={18} />, label: 'Enviar imagem', accept: 'image/*' },
                  { icon: <IconGlobe size={18} />, label: 'Mais opções', accept: '*' }
                ].map(item => (
                  <button key={item.label} onClick={() => { if (fileRef.current) { fileRef.current.accept = item.accept; fileRef.current.click(); } setShowAttachMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', color: TEXT_NORMAL, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14, transition: 'all 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = TEXT_BRIGHT; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = TEXT_NORMAL; }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, opacity: 0.8 }}>{item.icon}</span>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: (replyTo || editing) ? '0 0 14px 14px' : 14, padding: '0 14px', border: `1px solid rgba(255,255,255,0.08)`, gap: 8, opacity: connected ? 1 : 0.5, transition: 'opacity 0.2s, border-color 0.15s, box-shadow 0.15s' }}>
              <input ref={fileRef} type="file" hidden onChange={handleFileUpload} />
              <button onClick={() => setShowAttachMenu(p => !p)} disabled={uploadingFile}
                style={{ background: 'none', border: 'none', color: uploadingFile ? ACCENT : TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 2px', flexShrink: 0, transition: 'all 0.12s', transform: showAttachMenu ? 'rotate(45deg)' : 'rotate(0)' }}
                onMouseEnter={e => { if (!uploadingFile) e.currentTarget.style.color = TEXT_BRIGHT; }}
                onMouseLeave={e => { if (!uploadingFile) e.currentTarget.style.color = TEXT_MUTED; }}>
                {uploadingFile ? '⏳' : <IconPlus size={22} stroke={3} />}
              </button>
              <input ref={inputRef} value={text}
                onChange={e => { 
                  const val = e.target.value;
                  setText(val); 
                  emitTyping(); 
                  
                  const pos = e.target.selectionStart || 0;
                  const textBeforeCursor = val.slice(0, pos);
                  const match = textBeforeCursor.match(/@([\w.]*)$/);
                  if (match) {
                    setMentionSearch(match[1]);
                    setMentionIndex(0);
                  } else {
                    setMentionSearch(null);
                  }
                }}
                onKeyDown={e => { 
                  if (mentionSearch !== null && mentionResults.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(p => (p + 1) % mentionResults.length); return; }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(p => (p - 1 + mentionResults.length) % mentionResults.length); return; }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionResults[mentionIndex] as any); return; }
                    if (e.key === 'Escape') { e.preventDefault(); setMentionSearch(null); return; }
                  }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } 
                  if (e.key === 'Escape') { setReplyTo(null); setEditing(null); setText(''); } 
                }}
                placeholder={channel ? (connected ? `Mensagem em #${channel.name}` : 'A reconectar…') : 'Seleciona um canal'}
                disabled={!connected || !channel}
                style={{ flex: 1, background: 'transparent', border: 'none', color: TEXT_BRIGHT, fontSize: 15, padding: '13px 0', minHeight: 46 }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {mentionSearch !== null && mentionResults.length > 0 && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 12, background: '#0b0c0e', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', zIndex: 1000, animation: 'slideDown 0.12s ease' }}>
                    <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sugestões de Menção</p>
                      <span style={{ fontSize: 10, color: TEXT_MUTED }}>{mentionResults.length} resultados</span>
                    </div>
                    {mentionResults.map((item, i) => {
                      const isEveryone = (item as any).type === 'everyone';
                      const m = item as Member;
                      return (
                        <div key={isEveryone ? 'everyone' : m.userId} 
                          onClick={() => insertMention(item as any)}
                          onMouseEnter={() => setMentionIndex(i)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12, 
                            padding: '10px 16px', 
                            cursor: 'pointer', 
                            background: i === mentionIndex ? 'rgba(165,230,0,0.08)' : 'transparent',
                            transition: 'all 0.1s',
                            borderLeft: i === mentionIndex ? `3px solid ${ACCENT}` : '3px solid transparent'
                          }}>
                          {isEveryone ? (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontWeight: 800, fontSize: 16 }}>@</div>
                          ) : (
                            <Avatar src={m.profile?.avatarUrl} name={(m.profile?.displayName || m.profile?.username) || 'User'} size="sm" />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEveryone ? (
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: i === mentionIndex ? ACCENT : TEXT_BRIGHT }}>Mencionar Todos</p>
                            ) : (
                              <DisplayName profile={m.profile} fallbackName={m.profile?.username || 'U'} style={{ fontSize: 14, fontWeight: 700 }} />
                            )}
                            <p style={{ margin: 0, fontSize: 11, color: TEXT_MUTED }}>
                              {isEveryone ? '@todos ou @everyone' : `@${m.profile?.username}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  ref={triggerRef}
                  onClick={() => setShowPicker(!showPicker)}
                  onMouseEnter={handleEmojiHover}
                  style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 8px', transition: 'all 0.12s' }}
                >
                  <span onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2) rotate(10deg)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }} style={{ fontSize: 22, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EmojiRenderer content={randomEmoji} emojiSize={22} />
                  </span>
                </button>
                {showPicker && (
                  <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 12, zIndex: 100, transform: 'translateX(-240px)' }}>
                    <EmojiPicker 
                      onSelect={(emoji) => { setText(p => p + emoji); setShowPicker(false); inputRef.current?.focus(); }}
                      onClose={() => setShowPicker(false)}
                      position="top"
                    />
                  </div>
                )}
              </div>

              <button onClick={send} disabled={!text.trim() || !connected || !channel}
                style={{ background: text.trim() && connected && channel ? `linear-gradient(135deg, ${ACCENT}, #7BC800)` : 'rgba(255,255,255,0.05)', border: 'none', color: text.trim() && connected && channel ? '#000' : TEXT_MUTED, borderRadius: 9, padding: '8px 16px', cursor: text.trim() && connected && channel ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: text.trim() && connected && channel ? '0 4px 12px rgba(165,230,0,0.3)' : 'none' }}
                onMouseEnter={e => { if (text.trim() && connected && channel) e.currentTarget.style.boxShadow = '0 6px 20px rgba(165,230,0,0.5)'; }}
                onMouseLeave={e => { if (text.trim() && connected && channel) e.currentTarget.style.boxShadow = '0 4px 12px rgba(165,230,0,0.3)'; }}>
                <IconSend size={18} stroke={3} />
              </button>
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
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 10, padding: '6px 14px', gap: 10, transition: 'all 0.2s' }} onFocusCapture={(e: any) => e.currentTarget.style.borderColor = ACCENT} onBlurCapture={(e: any) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
              <IconGlobe size={14} color={TEXT_MUTED} />
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
              ...(owners.length ? [{ title: `DONO — ${owners.length}`, members: owners, color: '#F0B132', icon: <IconShield size={12} /> }] : []),
              ...roleGroups.map(g => ({ title: `${g.role.name.toUpperCase()} — ${g.members.length}`, members: g.members, color: g.role.color || TEXT_MUTED, icon: <IconMedal size={12} /> })),
              ...(admins.length ? [{ title: `ADMIN — ${admins.length}`, members: admins, color: '#ED4245', icon: <IconHammer size={12} /> }] : []),
              ...(members.length ? [{ title: `MEMBROS — ${members.length}`, members, color: TEXT_MUTED, icon: <IconUsers size={12} /> }] : []),
            ];
            return sections.map(sec => (
              <div key={sec.title} style={{ marginBottom: 8 }}>
                <div style={{ padding: '12px 12px 4px', color: sec.color, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {sec.icon} <EmojiRenderer content={sec.title} emojiSize={12} />
                </div>
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
<div style={{ position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: '50%', background: typing ? '#F0B232' : ACCENT, border: `2px solid #07080a`, transition: 'background 0.3s' }} />
                      </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}><DisplayName profile={m.profile} fallbackName={n} baseColor={accent} style={{ fontSize: 14, fontWeight: 600 }} /></p>
                          {m.userId === server.ownerId && <IconShield size={12} color="#F0B132" />}
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
      {memberMenuTarget && server && (
        <UserProfileModal member={memberMenuTarget} server={server} onClose={() => setMemberMenuUserId(null)}
          isOwn={memberMenuTarget.userId === user?.id} isMod={isMod} isAdmin={isAdmin}
          onKick={handleKick} onBan={handleBan} onAssignRole={handleAssignRole} />
      )}
      {channelSettingsTarget && (
        <ChannelSettingsModal channel={channelSettingsTarget} onClose={() => setChannelSettingsTarget(null)}
          onSave={async (name, topic) => { await handleSaveChannel(channelSettingsTarget.id, name, topic); }}
          onDelete={handleDeleteChannel} />
      )}
      {showServerSettings && server && (
        <ServerSettingsModal server={server} serverId={server.id} onClose={() => setShowServerSettings(false)}
          onSave={handleSaveServer} onLeave={handleLeaveServer} onDelete={handleDeleteServer}
          onCreateRole={handleCreateRole} onDeleteRole={handleDeleteRole} />
      )}
      {showEditProfile && user && server && (
        <EditProfileModal user={user as any} serverId={server.id} onClose={() => setShowEditProfile(false)} onSave={handleSaveProfile} />
      )}
      {showInvite && server && (
        <SimpleModal title="Convidar para o servidor" onClose={() => setShowInvite(false)}>
          <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 12 }}>Código para entrar em <strong style={{ color: TEXT_BRIGHT }}>{server.name}</strong></p>
          <div style={{ background: '#0c0d0f', border: `1px solid ${ACCENT}44`, borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', color: ACCENT, fontSize: 13, marginBottom: 16, wordBreak: 'break-all', userSelect: 'all' }}>{server.inviteCode}</div>
          <button onClick={() => { navigator.clipboard.writeText(server.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: copied ? ACCENT_DIM : ACCENT, color: copied ? ACCENT : '#000', border: copied ? `1px solid ${ACCENT}` : 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
            {copied ? <IconCheck size={16} /> : <IconPlus size={16} />}
            {copied ? 'Copiado!' : 'Copiar código'}
          </button>
        </SimpleModal>
      )}
      {showCh && server && (
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

      {previewMedia && (() => {
        const media = previewMedia;
        return (
          <div 
            onClick={() => setPreviewMedia(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease', cursor: 'zoom-out' }}
          >
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 12, zIndex: 10001 }}>
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(media.url, '_blank'); }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer', transition: 'all 0.1s' }}
                onMouseEnter={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => (e.currentTarget as any).style.background = 'rgba(255,255,255,0.1)'}
                title="Abrir no navegador"
              >
                <IconExternalLink size={20} />
              </button>
              <button 
                onClick={async (e) => { 
                  e.stopPropagation();
                  try {
                    const resp = await fetch(media.url);
                    const blob = await resp.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = media.url.split('/').pop() || 'download';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    window.open(media.url, '_blank'); 
                  }
                }}
                style={{ background: ACCENT, border: 'none', color: '#000', borderRadius: 8, padding: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}
                title="Descarregar ficheiro"
              >
                <IconDownload size={20} /> Descarregar
              </button>
              <button 
                onClick={() => setPreviewMedia(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: 10, cursor: 'pointer' }}
              >
                <IconClose size={20} />
              </button>
            </div>

            <div 
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '85vh', position: 'relative', animation: 'popIn 0.3s cubic-bezier(.4,0,.2,1.2)', cursor: 'default' }}
            >
              {media.type === 'image' ? (
                <img src={media.url} alt="" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }} />
              ) : (
                <video src={media.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }} />
              )}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <p style={{ color: TEXT_MUTED, fontSize: 12, margin: 0 }}>{media.url.split('/').pop()}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {confirmConfig && (() => {
        const config = confirmConfig;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: '#111214', border: `1px solid ${config.isDanger ? 'rgba(237,66,69,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 16, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.8)', animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <h2 style={{ color: config.isDanger ? '#ED4245' : TEXT_BRIGHT, fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>{config.title}</h2>
              <p style={{ color: TEXT_NORMAL, fontSize: 14, margin: '0 0 20px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{config.message}</p>
              
              {config.verifyText && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>Escreve o nome para confirmar</p>
                  <input 
                    autoFocus 
                    type="text" 
                    placeholder={config.verifyText}
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    style={{ width: '100%', background: '#000', border: `1px solid ${BORDER_SUBTLE}`, borderRadius: 8, padding: '10px 14px', color: TEXT_BRIGHT, fontSize: 14 }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => { setConfirmConfig(null); setVerifyInput(''); }}
                  style={{ background: 'transparent', border: 'none', color: TEXT_BRIGHT, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '10px 16px' }}>
                  Cancelar
                </button>
                <button 
                  disabled={!!config.verifyText && verifyInput !== config.verifyText}
                  onClick={() => { config.onConfirm(); setConfirmConfig(null); setVerifyInput(''); }}
                  style={{ 
                    background: config.isDanger ? '#ED4245' : ACCENT, 
                    color: config.isDanger ? '#fff' : '#000', 
                    border: 'none', 
                    borderRadius: 10, 
                    padding: '10px 24px', 
                    fontSize: 13, 
                    fontWeight: 800, 
                    cursor: 'pointer',
                    opacity: config.verifyText ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}>
                  {config.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {pendingFile && (() => {
        const file = pendingFile;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: '#111214', border: `1px solid ${ACCENT}33`, borderRadius: 16, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.8)', animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <h2 style={{ color: TEXT_BRIGHT, fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>Confirmar Envio</h2>
              
              <div style={{ background: '#000', borderRadius: 12, padding: 12, marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${BORDER_SUBTLE}` }}>
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                ) : file.type.startsWith('video/') ? (
                  <video src={URL.createObjectURL(file)} controls muted style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                ) : (
                  <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <IconPlus size={48} color={ACCENT} />
                    <span style={{ color: TEXT_NORMAL, fontSize: 16, fontWeight: 600 }}>{file.name}</span>
                  </div>
                )}
                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: TEXT_MUTED, fontSize: 12 }}>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>{file.type || 'Ficheiro'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setPendingFile(null)}
                  style={{ background: 'transparent', border: 'none', color: TEXT_BRIGHT, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '10px 16px' }}>
                  Cancelar
                </button>
                <button 
                  onClick={() => { performFileUpload(file); setPendingFile(null); }}
                  style={{ background: ACCENT, color: '#000', border: 'none', borderRadius: 10, padding: '10px 32px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  Enviar Ficheiro
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '24px 8px 16px', gap: 16, animation: 'fadeIn 0.2s ease' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'lowercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}
