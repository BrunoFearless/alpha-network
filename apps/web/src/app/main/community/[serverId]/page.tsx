'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCommunitySocket } from '@/lib/socket';

interface ChannelCategoryRow {
  id: string;
  name: string;
  position: number;
}
interface Channel {
  id: string;
  name: string;
  position: number;
  categoryId: string | null;
}
interface CommunityRole {
  id: string;
  name: string;
  position: number;
  color: string | null;
  canModerate: boolean;
  canManageServer: boolean;
  canManageChannels: boolean;
}
interface Member {
  userId: string;
  role: string;
  communityRoleId: string | null;
  mutedUntil?: string | null;
  communityRole: CommunityRole | null;
  profile: { displayName?: string | null; username: string; avatarUrl?: string | null } | null;
}
interface BotRow {
  id: string;
  isAdminBot: boolean;
  bot: { id: string; name: string; prefix: string };
}
interface Server {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  ownerId: string;
  channelCategories: ChannelCategoryRow[];
  channels: Channel[];
  members: Member[];
  bots: BotRow[];
  roles: CommunityRole[];
  membersCount: number;
}
interface EmbedPayload {
  title?: string;
  description?: string;
  color?: string;
  footer?: string;
  imageUrl?: string;
}
interface ReplySnippet {
  id: string;
  content: string;
  authorName: string;
}
interface ReactionEntry {
  emoji: string;
  userId: string;
}
interface Msg {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorType: 'user' | 'bot';
  content: string;
  messageType?: string;
  imageUrl?: string | null;
  embedJson?: EmbedPayload | null;
  createdAt: string;
  editedAt?: string | null;
  replyToId?: string | null;
  replyTo?: ReplySnippet | null;
  attachmentUrls?: string[] | null;
  mentions?: { everyone?: boolean; userIds?: string[] } | null;
  reactions?: ReactionEntry[];
  pinned?: boolean;
}

// Verde Palette - Inspired by 7Wise + Discord Design
const COLORS = {
  BG_PRIMARY: '#0E0F11',
  BG_SECONDARY: '#1E1F22',
  BG_TERTIARY: '#2C2F33',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#B5BAC1',
  TEXT_MUTED: '#949BA4',
  GREEN_ACCENT: '#A5E600',
  GREEN_DARK: '#1B5E20',
  ROLE_OWNER: '#F0B132',
  ROLE_ADMIN: '#ED4245',
};

const UNIGRAM_GREEN = COLORS.GREEN_ACCENT;
const BOT_GREEN = '#B8E21F';
const ALPHA_BG = COLORS.BG_PRIMARY;
const SIDEBAR_BG = COLORS.BG_SECONDARY;
const CHAT_BG = `linear-gradient(180deg, rgba(14,15,17,0.97) 0%, rgba(14,15,17,0.99) 100%), repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(255,255,255,0.018) 32px, rgba(255,255,255,0.018) 33px), repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(255,255,255,0.012) 32px, rgba(255,255,255,0.012) 33px), ${COLORS.BG_PRIMARY}`;
const TG_BUBBLE_IN = 'linear-gradient(160deg, rgba(30,31,34,0.95) 0%, rgba(44,47,51,0.92) 100%)';
const TG_BUBBLE_OUT = 'linear-gradient(160deg, rgba(165,230,0,0.18) 0%, rgba(27,94,32,0.45) 100%)';

function nameColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 17) % 360;
  return `hsl(${h}, 48%, 70%)`;
}

function aggregateReactions(reactions: ReactionEntry[] | undefined, myId: string | undefined) {
  const map = new Map<string, { count: number; me: boolean }>();
  for (const r of reactions ?? []) {
    const x = map.get(r.emoji) ?? { count: 0, me: false };
    x.count++;
    if (myId && r.userId === myId) x.me = true;
    map.set(r.emoji, x);
  }
  return [...map.entries()].map(([emoji, v]) => ({ emoji, ...v }));
}

const DISCORD_CHANNEL_ACTIVE = 'rgba(79, 84, 92, 0.48)';
const DISCORD_CHANNEL_HOVER = 'rgba(79, 84, 92, 0.32)';
const DISCORD_TEXT_MUTED = '#949BA4';
const DISCORD_TEXT_BRIGHT = '#DBDEE1';

function memberAccentColor(m: Member, server: Server): string {
  if (m.userId === server.ownerId) return '#F0B132';
  if (m.communityRole?.color) return m.communityRole.color;
  if (m.role === 'admin') return '#ED4245';
  return DISCORD_TEXT_BRIGHT;
}

type MemberSection = { title: string; members: Member[]; accent?: string };

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
  const [chCategoryId, setChCategoryId] = useState<string>('');
  const [crCh, setCrCh] = useState(false);
  const [showInv, setShowInv] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEditSrv, setShowEditSrv] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingSrv, setSavingSrv] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#7C6FAD');
  const [crRole, setCrRole] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [typingIds, setTypingIds] = useState<Record<string, boolean>>({});
  const [showPins, setShowPins] = useState(false);
  const [pins, setPins] = useState<Msg[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [audits, setAudits] = useState<{ id: string; action: string; actorId: string; targetId: string | null; createdAt: string; metadata: unknown }[]>([]);
  const [showCat, setShowCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  /** categorias colapsadas: id → true = fechada */
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  /** membro selecionado no painel (clique no avatar) */
  const [memberMenuUserId, setMemberMenuUserId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef<string | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const myMember = server?.members.find(m => m.userId === user?.id);
  const isAdmin = myMember?.role === 'admin';
  const isMod = isAdmin || myMember?.communityRole?.canModerate === true;
  const canEditServer = isAdmin || myMember?.communityRole?.canManageServer === true;

  const refreshServer = useCallback(async () => {
    if (!serverId) return;
    const d = await api.get<Server>(`/community/servers/${serverId}`);
    setServer(d);
  }, [serverId]);

  const channelsByCategory = useMemo(() => {
    if (!server) return { uncategorized: [] as Channel[], byCat: new Map<string, Channel[]>() };
    const uncategorized: Channel[] = [];
    const byCat = new Map<string, Channel[]>();
    for (const ch of server.channels) {
      if (!ch.categoryId) uncategorized.push(ch);
      else {
        const arr = byCat.get(ch.categoryId) ?? [];
        arr.push(ch);
        byCat.set(ch.categoryId, arr);
      }
    }
    uncategorized.sort((a, b) => a.position - b.position);
    for (const arr of byCat.values()) arr.sort((a, b) => a.position - b.position);
    return { uncategorized, byCat };
  }, [server]);

  const memberRoleSections = useMemo((): MemberSection[] => {
    if (!server) return [];
    const out: MemberSection[] = [];
    const ownerMembers = server.members.filter(m => m.userId === server.ownerId);
    if (ownerMembers.length) out.push({ title: `DONO — ${ownerMembers.length}`, members: ownerMembers, accent: '#F0B132' });

    const rolesSorted = [...(server.roles ?? [])].sort((a, b) => a.position - b.position);
    for (const role of rolesSorted) {
      const mems = server.members.filter(m => m.communityRoleId === role.id && m.userId !== server.ownerId);
      if (mems.length) out.push({ title: `${role.name.toUpperCase()} — ${mems.length}`, members: mems, accent: role.color ?? DISCORD_TEXT_MUTED });
    }

    const nonOwner = server.members.filter(m => m.userId !== server.ownerId);
    const withoutCustomRole = nonOwner.filter(m => !m.communityRoleId);
    const legacyAdmins = withoutCustomRole.filter(m => m.role === 'admin');
    const plain = withoutCustomRole.filter(m => m.role !== 'admin');
    if (legacyAdmins.length) out.push({ title: `ADMIN — ${legacyAdmins.length}`, members: legacyAdmins, accent: '#ED4245' });
    if (plain.length) out.push({ title: `MEMBROS — ${plain.length}`, members: plain });
    const key = (m: Member) => (m.profile?.displayName ?? m.profile?.username ?? m.userId).toLowerCase();
    for (const s of out) s.members.sort((a, b) => key(a).localeCompare(key(b)));
    return out;
  }, [server]);

  const toggleCategoryCollapse = useCallback((catKey: string) => {
    setCollapsedCats(p => ({ ...p, [catKey]: !p[catKey] }));
  }, []);

  useEffect(() => {
    if (!serverId) return;
    api
      .get<Server>(`/community/servers/${serverId}`)
      .then(d => {
        setServer(d);
        if (d.channels.length > 0) setChannel(d.channels[0]);
      })
      .catch(() => router.push('/main/community'))
      .finally(() => setLoading(false));
  }, [serverId, router]);

  useEffect(() => {
    if (!channel) return;
    setLoadingMsgs(true);
    setMsgs([]);
    api
      .get<Msg[]>(`/community/channels/${channel.id}/messages`)
      .then(setMsgs)
      .catch(console.error)
      .finally(() => setLoadingMsgs(false));
  }, [channel]);

  useEffect(() => {
    if (!socket || !connected || !channel) return;
    if (joinedRef.current && joinedRef.current !== channel.id) socket.emit('channel.leave', { channelId: joinedRef.current });
    if (joinedRef.current !== channel.id) {
      socket.emit('channel.join', { channelId: channel.id });
      joinedRef.current = channel.id;
    }
  }, [socket, connected, channel]);

  useEffect(() => {
    if (!socket) return;
    const h = (msg: Msg) => {
      if (msg.channelId !== channel?.id) return;
      setMsgs(p => (p.some(m => m.id === msg.id) ? p : [...p, msg]));
    };
    const del = (payload: { id?: string; messageId?: string; channelId: string }) => {
      if (payload.channelId !== channel?.id) return;
      const mid = payload.id ?? payload.messageId;
      if (!mid) return;
      setMsgs(p => p.filter(m => m.id !== mid));
    };
    const upd = (msg: Msg) => {
      if (msg.channelId !== channel?.id) return;
      setMsgs(p => p.map(m => (m.id === msg.id ? msg : m)));
    };
    const react = (payload: { messageId: string; channelId: string; reactions: ReactionEntry[] }) => {
      if (payload.channelId !== channel?.id) return;
      setMsgs(p => p.map(m => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m)));
    };
    const typing = (payload: { channelId: string; userId: string; typing: boolean }) => {
      if (payload.channelId !== channel?.id || payload.userId === user?.id) return;
      setTypingIds(prev => {
        const next = { ...prev };
        if (payload.typing) next[payload.userId] = true;
        else delete next[payload.userId];
        return next;
      });
    };
    socket.on('message.new', h);
    socket.on('message.deleted', del);
    socket.on('message.updated', upd);
    socket.on('reaction.updated', react);
    socket.on('typing.update', typing);
    return () => {
      socket.off('message.new', h);
      socket.off('message.deleted', del);
      socket.off('message.updated', upd);
      socket.off('reaction.updated', react);
      socket.off('typing.update', typing);
    };
  }, [socket, channel?.id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const emitTyping = useCallback(() => {
    if (!socket || !connected || !channel) return;
    socket.emit('typing.start', { channelId: channel.id });
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => {
      socket.emit('typing.stop', { channelId: channel.id });
      typingStopRef.current = null;
    }, 2500);
  }, [socket, connected, channel]);

  const send = useCallback(() => {
    if (!text.trim() || !socket || !connected || !channel) return;
    socket.emit('message.send', {
      channelId: channel.id,
      content: text.trim(),
      replyToId: replyTo?.id ?? undefined,
      attachmentUrls: pendingUrls.length ? pendingUrls : undefined,
    });
    setText('');
    setReplyTo(null);
    setPendingUrls([]);
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    socket.emit('typing.stop', { channelId: channel.id });
  }, [text, socket, connected, channel, replyTo, pendingUrls]);

  async function createCh() {
    if (!chName.trim() || !server) return;
    setCrCh(true);
    try {
      const ch = await api.post<Channel>(`/community/servers/${server.id}/channels`, {
        name: chName.trim(),
        categoryId: chCategoryId || null,
      });
      setServer(p => (p ? { ...p, channels: [...p.channels, ch] } : p));
      setChannel(ch);
      setShowCh(false);
      setChName('');
      setChCategoryId('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    } finally {
      setCrCh(false);
    }
  }

  async function createCategory() {
    if (!server || !newCatName.trim()) return;
    try {
      await api.post(`/community/servers/${server.id}/categories`, { name: newCatName.trim() });
      await refreshServer();
      setNewCatName('');
      setShowCat(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    }
  }

  async function openPins() {
    if (!channel) return;
    setShowPins(true);
    try {
      const list = await api.get<Msg[]>(`/community/channels/${channel.id}/pins`);
      setPins(list);
    } catch {
      setPins([]);
    }
  }

  async function openAudit() {
    if (!server) return;
    setShowAudit(true);
    try {
      const list = await api.get<typeof audits>(`/community/servers/${server.id}/audit`);
      setAudits(list);
    } catch {
      setAudits([]);
    }
  }

  async function saveServer() {
    if (!server) return;
    setSavingSrv(true);
    try {
      await api.patch(`/community/servers/${server.id}`, { name: editName.trim(), description: editDesc || null });
      await refreshServer();
      setShowEditSrv(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    } finally {
      setSavingSrv(false);
    }
  }

  async function createRole() {
    if (!server || !newRoleName.trim()) return;
    setCrRole(true);
    try {
      await api.post(`/community/servers/${server.id}/roles`, {
        name: newRoleName.trim(),
        color: newRoleColor,
        canModerate: false,
        canManageServer: false,
        canManageChannels: false,
      });
      await refreshServer();
      setNewRoleName('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    } finally {
      setCrRole(false);
    }
  }

  async function assignRole(targetUserId: string, roleId: string) {
    if (!server) return;
    try {
      await api.patch(`/community/servers/${server.id}/members/${targetUserId}/role`, {
        communityRoleId: roleId === '' ? null : roleId,
      });
      await refreshServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    }
  }

  async function kickUser(targetUserId: string) {
    if (!server || !confirm('Expulsar este membro?')) return;
    try {
      await api.delete(`/community/servers/${server.id}/members/${targetUserId}`);
      setMemberMenuUserId(null);
      await refreshServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    }
  }

  async function banUser(targetUserId: string) {
    if (!server || !confirm('Banir este utilizador? Não poderá voltar a entrar.')) return;
    try {
      await api.post(`/community/servers/${server.id}/ban/${targetUserId}`);
      setMemberMenuUserId(null);
      await refreshServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    }
  }

  async function toggleAdminBot(botId: string, current: boolean) {
    if (!server) return;
    try {
      await api.patch(`/community/servers/${server.id}/bots/${botId}`, { isAdminBot: !current });
      await refreshServer();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    }
  }

  function deleteMsg(m: Msg) {
    if (!socket || !channel) return;
    socket.emit('message.delete', { messageId: m.id, channelId: channel.id });
  }

  function toggleReactionLocal(m: Msg, emoji: string) {
    if (!socket || !channel) return;
    socket.emit('reaction.toggle', { channelId: channel.id, messageId: m.id, emoji });
  }

  async function pinMsg(m: Msg) {
    if (!channel) return;
    try {
      await api.post(`/community/channels/${channel.id}/pins/${m.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro.');
    }
  }

  function saveEdit() {
    if (!socket || !channel || !editing?.text.trim()) return;
    socket.emit('message.edit', {
      channelId: channel.id,
      messageId: editing.id,
      content: editing.text.trim(),
    });
    setEditing(null);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !server) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const { url } = await api.postForm<{ url: string }>(`/community/servers/${server.id}/upload`, form);
      setPendingUrls(p => [...p, url].slice(0, 6));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload falhou.');
    } finally {
      setUploading(false);
    }
  }

  function mname(m: Member) {
    if (m.userId === user?.id) return user.profile?.displayName ?? user.profile?.username ?? 'Tu';
    return m.profile?.displayName ?? m.profile?.username ?? `user_${m.userId.slice(0, 6)}`;
  }

  function openEditSrv() {
    if (!server) return;
    setEditName(server.name);
    setEditDesc(server.description ?? '');
    setShowEditSrv(true);
  }

  const typingNames = Object.keys(typingIds)
    .map(uid => server?.members.find(x => x.userId === uid))
    .filter(Boolean)
    .map(m => mname(m as Member))
    .slice(0, 3);

  const C: Record<string, React.CSSProperties> = {
    wrap: { display: 'flex', height: 'calc(100vh - 56px)', background: ALPHA_BG },
    side: {
      width: 240,
      background: SIDEBAR_BG,
      borderRight: `1px solid ${COLORS.BG_TERTIARY}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    },
    sideTop: { 
      padding: '12px 12px 10px', 
      borderBottom: `1px solid ${COLORS.BG_TERTIARY}`, 
      boxShadow: `0 1px 0 rgba(255,255,255,0.02)` 
    },
    backBtn: { 
      background: 'none', 
      border: 'none', 
      color: COLORS.TEXT_MUTED, 
      fontSize: 12, 
      cursor: 'pointer', 
      padding: 0, 
      marginBottom: 8, 
      display: 'block',
      transition: 'color 0.12s'
    },
    srvName: { 
      fontFamily: 'system-ui, sans-serif', 
      color: COLORS.TEXT_PRIMARY, 
      fontSize: 15, 
      fontWeight: 700, 
      margin: 0, 
      overflow: 'hidden', 
      textOverflow: 'ellipsis', 
      whiteSpace: 'nowrap' 
    },
    chList: { flex: 1, overflowY: 'auto', padding: '8px 0' },
    chLabel: { color: COLORS.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, fontWeight: 600 },
    addBtn: { background: 'none', border: 'none', color: UNIGRAM_GREEN, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 0, transition: 'opacity 0.12s' },
    chat: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: CHAT_BG },
    chHeader: {
      padding: '12px 18px',
      borderBottom: `1px solid ${COLORS.BG_TERTIARY}`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: COLORS.BG_SECONDARY,
      backdropFilter: 'blur(10px)',
      flexShrink: 0,
    },
    msgs: { flex: 1, overflowY: 'auto', padding: '16px 20px 12px' },
    inputWrap: { 
      padding: '12px 20px 20px', 
      flexShrink: 0, 
      background: `${COLORS.BG_SECONDARY}E6`,
    },
    inputRow: {
      display: 'flex',
      gap: 8,
      background: COLORS.BG_TERTIARY,
      border: `1px solid ${COLORS.BG_TERTIARY}`,
      borderRadius: 28,
      padding: '8px 12px 8px 16px',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    },
    members: {
      width: 240,
      background: SIDEBAR_BG,
      borderLeft: `1px solid ${COLORS.BG_TERTIARY}`,
      overflowY: 'auto',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    overlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    obg: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' },
    modal: { 
      position: 'relative', 
      zIndex: 10, 
      background: COLORS.BG_SECONDARY, 
      border: `1px solid ${COLORS.BG_TERTIARY}`, 
      borderRadius: 12, 
      padding: 24, 
      width: '100%', 
      maxWidth: 440 
    },
    btnPri: { 
      background: UNIGRAM_GREEN, 
      color: '#000', 
      border: 'none', 
      borderRadius: 4, 
      padding: '8px 16px', 
      fontSize: 14, 
      fontWeight: 600, 
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    btnSec: { 
      background: 'transparent', 
      color: UNIGRAM_GREEN, 
      border: `1px solid ${UNIGRAM_GREEN}`, 
      borderRadius: 4, 
      padding: '8px 16px', 
      fontSize: 14, 
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    btnGhost: { 
      background: 'transparent', 
      color: COLORS.TEXT_MUTED, 
      border: 'none', 
      borderRadius: 4, 
      padding: '8px 16px', 
      fontSize: 14, 
      cursor: 'pointer',
      transition: 'color 0.12s'
    },
  };

  function renderDiscordChannelRow(ch: Channel) {
    const active = channel?.id === ch.id;
    return (
      <button
        type="button"
        key={ch.id}
        onClick={() => setChannel(ch)}
        style={{
          width: 'calc(100% - 16px)',
          margin: '2px 8px',
          textAlign: 'left',
          background: active ? `${UNIGRAM_GREEN}18` : 'transparent',
          border: 'none',
          borderRadius: 4,
          color: active ? UNIGRAM_GREEN : COLORS.TEXT_MUTED,
          padding: '6px 8px',
          fontSize: 15,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = `${COLORS.BG_TERTIARY}80`;
            e.currentTarget.style.color = COLORS.TEXT_SECONDARY;
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = COLORS.TEXT_MUTED;
          }
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.5, fontWeight: 300, lineHeight: 1 }}>#</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ch.name}</span>
      </button>
    );
  }

  function renderCollapsibleCategory(catKey: string, headerLabel: string, channelList: Channel[]) {
    if (channelList.length === 0) return null;
    const expanded = collapsedCats[catKey] !== true;
    
    return (
      <div key={catKey}>
        <button
          type="button"
          onClick={() => toggleCategoryCollapse(catKey)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            width: 'calc(100% - 16px)',
            margin: '8px 8px 2px',
            padding: '4px 6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 4,
            color: COLORS.TEXT_MUTED,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textAlign: 'left',
            transition: 'color 0.12s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = COLORS.TEXT_SECONDARY;
            e.currentTarget.style.background = `${COLORS.BG_TERTIARY}50`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = COLORS.TEXT_MUTED;
            e.currentTarget.style.background = 'none';
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              width: 14,
              justifyContent: 'center',
              fontSize: 10,
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.12s ease',
              opacity: 0.7,
            }}
          >
            ›
          </span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerLabel}</span>
        </button>
        {expanded && channelList.map(renderDiscordChannelRow)}
      </div>
    );
  }

  if (loading)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: ALPHA_BG }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: `2px solid rgba(61,220,132,0.2)`,
            borderTopColor: UNIGRAM_GREEN,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  if (!server) return null;

  const menuMember = memberMenuUserId ? server.members.find(m => m.userId === memberMenuUserId) : undefined;

  return (
    <div style={C.wrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={C.side}>
        <div style={C.sideTop}>
          <button onClick={() => router.push('/main/community')} style={C.backBtn}>
            ← Voltar
          </button>
          {canEditServer ? (
            <button
              type="button"
              onClick={openEditSrv}
              title="Editar nome, descrição e opções do servidor"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '6px 4px 10px',
                background: 'rgba(165,230,0,0.08)',
                border: `1px solid rgba(165,230,0,0.12)`,
                cursor: 'pointer',
                borderRadius: 8,
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(165,230,0,0.15)';
                e.currentTarget.style.borderColor = `rgba(165,230,0,0.25)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(165,230,0,0.08)';
                e.currentTarget.style.borderColor = `rgba(165,230,0,0.12)`;
              }}
            >
              <span style={{ fontSize: 16 }}>📍</span>
              <p style={{ ...C.srvName, flex: 1, color: UNIGRAM_GREEN, margin: 0 }}>{server.name}</p>
              <span style={{ color: DISCORD_TEXT_MUTED, fontSize: 10, opacity: 0.85 }} aria-hidden>
                ▼
              </span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px 10px' }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <p style={{ ...C.srvName, flex: 1, color: UNIGRAM_GREEN, margin: 0 }}>{server.name}</p>
              <span style={{ color: DISCORD_TEXT_MUTED, fontSize: 10, opacity: 0.85 }} aria-hidden>
                ▼
              </span>
        </div>
          )}
          <p style={{ color: DISCORD_TEXT_MUTED, fontSize: 11, margin: '8px 0 10px', paddingLeft: 4 }}>👥 {server.membersCount} membros</p>
          {isMod && (
            <button type="button" onClick={openAudit} style={{ ...C.btnGhost, fontSize: 11, padding: '6px 8px', color: DISCORD_TEXT_MUTED, width: '100%', textAlign: 'left', transition: 'all 0.12s ease' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = UNIGRAM_GREEN;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = DISCORD_TEXT_MUTED;
              }}
            >
              📋 Auditoria
            </button>
          )}
          </div>
        <div style={C.chList}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 10px 8px',
              gap: 6,
              borderBottom: '1px solid rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ flex: 1, color: DISCORD_TEXT_MUTED, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Canais
            </span>
            {(isAdmin || myMember?.communityRole?.canManageChannels) && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCat(true)}
                  style={{ ...C.addBtn, fontSize: 16, color: DISCORD_TEXT_MUTED }}
                  title="Nova categoria"
                >
                  ⊞
            </button>
                <button type="button" onClick={() => setShowCh(true)} style={{ ...C.addBtn, fontSize: 18, color: DISCORD_TEXT_MUTED }} title="Criar canal">
                  +
                </button>
              </>
            )}
          </div>
          {renderCollapsibleCategory('__uncat__', 'Canais de texto', channelsByCategory.uncategorized)}
          {(server.channelCategories ?? []).map(cat =>
            renderCollapsibleCategory(cat.id, cat.name, channelsByCategory.byCat.get(cat.id) ?? []),
          )}
        </div>
        {server.bots.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.25)', padding: '12px 12px 10px', marginBottom: 10 }}>
            <p style={{ color: UNIGRAM_GREEN, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 700 }}>🤖 Bots</p>
            {server.bots.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', flexWrap: 'wrap', marginBottom: 6 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(165,230,0,0.25), rgba(184,226,31,0.15))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: UNIGRAM_GREEN,
                    fontWeight: 700,
                    flexShrink: 0,
                    border: `1px solid rgba(165,230,0,0.2)`,
                  }}
                >
                  B
                </div>
                <span style={{ color: '#9CA8B8', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{b.bot.name}</span>
                <code style={{ color: '#5A6B7D', fontSize: 9, fontFamily: 'monospace' }}>{b.bot.prefix}</code>
                {isAdmin && (
                  <label style={{ fontSize: 8, color: '#5A6B7D', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                    <input type="checkbox" checked={b.isAdminBot} onChange={() => toggleAdminBot(b.bot.id, b.isAdminBot)} />
                    admin
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.25)', padding: '10px 8px', marginTop: 'auto' }}>
          <button
            onClick={() => setShowInv(true)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'rgba(165,230,0,0.1)',
              border: `1px solid rgba(165,230,0,0.15)`,
              color: UNIGRAM_GREEN,
              fontSize: 12,
              cursor: 'pointer',
              padding: '8px 10px',
              borderRadius: 6,
              fontWeight: 500,
              transition: 'all 0.12s ease',
              marginBottom: 8,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(165,230,0,0.18)';
              e.currentTarget.style.borderColor = `rgba(165,230,0,0.3)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(165,230,0,0.1)';
              e.currentTarget.style.borderColor = `rgba(165,230,0,0.15)`;
            }}
          >
            🔗 Convidar
          </button>
          {canEditServer && (
            <button
              onClick={() => router.push('/main/bots')}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: `1px solid ${DISCORD_TEXT_MUTED}33`,
                color: DISCORD_TEXT_MUTED,
                fontSize: 12,
                cursor: 'pointer',
                padding: '8px 10px',
                borderRadius: 6,
                fontWeight: 500,
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = UNIGRAM_GREEN;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = DISCORD_TEXT_MUTED;
              }}
            >
              🤖 Bots
            </button>
          )}
        </div>
      </div>

      <div style={C.chat}>
        {channel && (
          <div style={C.chHeader}>
            <span style={{ color: '#6B7785', fontSize: 18 }}>#</span>
            <span style={{ color: '#F2F5F8', fontWeight: 600, fontSize: 15 }}>{channel.name}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMod && (
                <button type="button" onClick={openPins} style={{ background: 'none', border: 'none', color: '#7A8B9C', cursor: 'pointer', fontSize: 12 }}>
                  📌 Fixadas
                </button>
              )}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? UNIGRAM_GREEN : '#E85454' }} />
              <span style={{ color: '#6B7785', fontSize: 11 }}>{connected ? 'online' : 'offline'}</span>
            </div>
          </div>
        )}
        <div style={C.msgs}>
          {loadingMsgs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  border: `2px solid rgba(61,220,132,0.15)`,
                  borderTopColor: UNIGRAM_GREEN,
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          ) : msgs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 64 }}>
              <p style={{ fontSize: 40, marginBottom: 10, opacity: 0.35 }}>💬</p>
              <p style={{ color: '#7A8B9C', fontSize: 14 }}>Nenhuma mensagem — começa a conversa.</p>
            </div>
          ) : (
            msgs.map((msg, i) => {
            const prev = msgs[i - 1];
              const mt = msg.messageType || 'text';
              const prevMt = prev ? prev.messageType || 'text' : '';
              const grouped = !!(
                prev &&
                prev.authorId === msg.authorId &&
                prev.authorType === msg.authorType &&
                mt === 'text' &&
                prevMt === 'text' &&
                !msg.replyTo
              );
            const isOwn = msg.authorId === user?.id && msg.authorType === 'user';
            const isBot = msg.authorType === 'bot';
              const canDel = (isOwn && msg.authorType === 'user') || isMod;
              const displayNameColor = isBot ? '#7EB6FF' : isOwn ? UNIGRAM_GREEN : nameColor(msg.authorName);

              const bubbleBase: React.CSSProperties = {
                maxWidth: 'min(78%, 520px)',
                borderRadius: isOwn ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                padding: '6px 10px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: isOwn ? TG_BUBBLE_OUT : TG_BUBBLE_IN,
                position: 'relative',
              };

              const rx = aggregateReactions(msg.reactions, user?.id);
              const quick = ['👍', '❤️', '😂', '🙏'];

              const bubbleInner = (
                <>
                  {!isOwn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: displayNameColor }}>{msg.authorName}</span>
                      {isBot && (
                        <span
                          style={{
                            fontSize: 9,
                            background: 'rgba(96,165,250,0.15)',
                            color: '#93C5FD',
                            border: '1px solid rgba(96,165,250,0.35)',
                            borderRadius: 4,
                            padding: '2px 6px',
                          }}
                        >
                          BOT
                        </span>
                      )}
                    </div>
                  )}
                  {msg.replyTo && (
                    <div
                      style={{
                        borderLeft: `3px solid ${UNIGRAM_GREEN}`,
                        paddingLeft: 8,
                        marginBottom: 8,
                        opacity: 0.85,
                        fontSize: 12,
                        color: COLORS.TEXT_SECONDARY,
                      }}
                    >
                      <span style={{ color: UNIGRAM_GREEN, fontWeight: 600 }}>{msg.replyTo.authorName}</span>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{msg.replyTo.content}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <MessageBody msg={msg} mt={mt} />
                      {msg.editedAt && (
                        <span style={{ fontSize: 10, color: COLORS.TEXT_MUTED, marginTop: 4, display: 'block', opacity: 0.7 }}>(editado)</span>
                      )}
                      {msg.pinned && (
                        <span style={{ fontSize: 10, color: UNIGRAM_GREEN, marginTop: 2, display: 'block' }}>📌 fixada</span>
                      )}
                    </div>
                    <span style={{ color: COLORS.TEXT_MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {(selectedMsgId === msg.id || rx.length > 0) && (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, alignItems: 'center' }}>
                        {rx.map(r => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => toggleReactionLocal(msg, r.emoji)}
                            style={{
                              background: r.me ? 'rgba(61,220,132,0.2)' : 'rgba(0,0,0,0.25)',
                              border: `1px solid ${r.me ? UNIGRAM_GREEN : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 8,
                              padding: '3px 8px',
                              fontSize: 11,
                              color: COLORS.TEXT_PRIMARY,
                              cursor: 'pointer',
                            }}
                          >
                            {r.emoji} {r.count}
                          </button>
                        ))}
                        {selectedMsgId === msg.id && quick.filter(em => !rx.some(r => r.emoji === em)).map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => toggleReactionLocal(msg, em)}
                            style={{
                              background: 'transparent',
                              border: '1px dashed rgba(255,255,255,0.12)',
                              borderRadius: 6,
                              padding: '2px 6px',
                              fontSize: 11,
                              cursor: 'pointer',
                              opacity: 0.6,
                            }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                      {selectedMsgId === msg.id && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, fontSize: 11 }}>
                          {canDel && (
                            <button
                              type="button"
                              onClick={() => deleteMsg(msg)}
                              style={{ background: 'none', border: 'none', color: COLORS.TEXT_MUTED, cursor: 'pointer', padding: 0 }}
                            >
                              apagar
                            </button>
                          )}
                          {isOwn && !isBot && (
                            <button
                              type="button"
                              onClick={() => setEditing({ id: msg.id, text: msg.content })}
                              style={{ background: 'none', border: 'none', color: UNIGRAM_GREEN, cursor: 'pointer', padding: 0 }}
                            >
                              editar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setReplyTo(msg)}
                            style={{ background: 'none', border: 'none', color: COLORS.TEXT_MUTED, cursor: 'pointer', padding: 0 }}
                          >
                            responder
                          </button>
                          {isMod && (
                            <button
                              type="button"
                              onClick={() => pinMsg(msg)}
                              style={{ background: 'none', border: 'none', color: COLORS.TEXT_MUTED, cursor: 'pointer', padding: 0 }}
                            >
                              fixar
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              );

              if (grouped) {
            return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                      marginBottom: 4,
                      paddingLeft: isOwn ? 0 : 48,
                      paddingRight: isOwn ? 48 : 0,
                    }}
                  >
                    <div
                      style={bubbleBase}
                      onClick={() => setSelectedMsgId(selectedMsgId === msg.id ? null : msg.id)}
                      role="button"
                      tabIndex={0}
                    >
                      {bubbleInner}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginTop: 18,
                    marginBottom: 2,
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                  }}
                >
                {isBot ? (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(96,165,250,0.35), rgba(61,220,132,0.15))',
                        border: '1px solid rgba(96,165,250,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: '#93C5FD',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      B
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(61,220,132,0.25), rgba(36,47,61,0.8))',
                        border: `1px solid rgba(61,220,132,0.35)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: UNIGRAM_GREEN,
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {msg.authorName[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: 'calc(100% - 48px)' }}>
                    <div
                      style={bubbleBase}
                      onClick={() => setSelectedMsgId(selectedMsgId === msg.id ? null : msg.id)}
                      role="button"
                      tabIndex={0}
                    >
                      {bubbleInner}
                    </div>
                  </div>
              </div>
            );
            })
          )}
          {typingNames.length > 0 && (
            <p style={{ color: '#6B7785', fontSize: 12, fontStyle: 'italic', padding: '8px 0' }}>{typingNames.join(', ')} a escrever…</p>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={C.inputWrap}>
          {replyTo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                marginBottom: 8,
                background: 'rgba(61,220,132,0.08)',
                borderRadius: 12,
                border: `1px solid rgba(61,220,132,0.2)`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 10, color: UNIGRAM_GREEN }}>Responder a {replyTo.authorName}</span>
                <div style={{ fontSize: 12, color: '#9CA8B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.content}</div>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#9CA8B8', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          )}
          {pendingUrls.length > 0 && (
            <div style={{ fontSize: 11, color: '#7A8B9C', marginBottom: 8 }}>
              Anexos: {pendingUrls.length}{' '}
              <button type="button" style={{ ...C.btnGhost, fontSize: 11, padding: 0, display: 'inline' }} onClick={() => setPendingUrls([])}>
                limpar
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" hidden accept="image/*,.pdf" onChange={onPickFile} />
          <div style={C.inputRow}>
            <button
              type="button"
              title="Anexo"
              disabled={uploading || !server}
              onClick={() => fileRef.current?.click()}
              style={{ background: 'none', border: 'none', color: '#7A8B9C', cursor: 'pointer', fontSize: 18, padding: '4px' }}
            >
              📎
            </button>
            <input
              value={text}
              onChange={e => {
                setText(e.target.value);
                emitTyping();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={channel ? 'Mensagem' : 'Canal'}
              disabled={!connected || !channel}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#F2F5F8', fontSize: 14, outline: 'none' }}
            />
            <span style={{ color: '#5A6570', fontSize: 16, padding: '0 4px', opacity: 0.7 }} title="Emoji">
              😊
            </span>
            <span style={{ color: '#5A6570', fontSize: 16, padding: '0 4px', opacity: 0.7 }} title="Voz">
              🎤
            </span>
            <button
              type="button"
              onClick={send}
              disabled={!connected || !text.trim() || !channel}
              style={{
                background: UNIGRAM_GREEN,
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                color: '#0B121A',
                fontSize: 18,
                cursor: 'pointer',
                opacity: !connected || !text.trim() ? 0.35 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      <div style={C.members}>
        <p
          style={{
            color: DISCORD_TEXT_MUTED,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '14px 12px 10px',
            borderBottom: '1px solid rgba(0,0,0,0.2)',
            marginBottom: 0,
          }}
        >
          👥 Membros — {server.members.length}
        </p>
        {memberRoleSections.map(section => (
          <div key={section.title} style={{ marginBottom: 12 }}>
            <div
              style={{
                padding: '12px 12px 8px',
                color: section.accent ?? DISCORD_TEXT_MUTED,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                borderTop: '1px solid rgba(0,0,0,0.15)',
                background: `${section.accent ?? DISCORD_TEXT_MUTED}08`,
                marginTop: 4,
              }}
            >
              {section.title}
            </div>
            {section.members.map(m => {
              const accent = section.accent ?? memberAccentColor(m, server);
              const typing = typingIds[m.userId];
              const showAvatar = m.profile?.avatarUrl;
          return (
                <div key={m.userId} style={{ padding: '6px 10px 8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setMemberMenuUserId(m.userId)}
                      title={`Ver ${mname(m)}`}
                      aria-label={`Opções de ${mname(m)}`}
                      style={{
                        position: 'relative',
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        borderRadius: '50%',
                      }}
                    >
                      {showAvatar ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.profile!.avatarUrl!}
                            alt=""
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: `2px solid ${accent}55`,
                              display: 'block',
                            }}
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: `${accent}28`,
                            border: `2px solid ${accent}66`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            color: accent,
                          }}
                        >
                          {mname(m)[0]?.toUpperCase() ?? '?'}
                </div>
                      )}
                      <span
                        style={{
                          position: 'absolute',
                          right: -1,
                          bottom: -1,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: typing ? '#F0B232' : '#3BA55D',
                          border: '3px solid #2B2D31',
                          boxSizing: 'content-box',
                          pointerEvents: 'none',
                        }}
                        title={typing ? 'A escrever' : 'Online'}
                      />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: accent,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.25,
                        }}
                      >
                        {mname(m)}
                      </span>
                      <span style={{ fontSize: 11, color: '#6D7278', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typing ? (
                          <em style={{ color: UNIGRAM_GREEN, fontStyle: 'normal' }}>A escrever…</em>
                        ) : (
                          `@${m.profile?.username ?? m.userId.slice(0, 8)}`
                        )}
                      </span>
                      {m.mutedUntil && new Date(m.mutedUntil) > new Date() && (
                        <span style={{ fontSize: 10, color: '#ED4245', marginTop: 2, display: 'inline-block' }}>🔇 silenciado</span>
                      )}
                    </div>
                  </div>
            </div>
          );
        })}
          </div>
        ))}
      </div>

      {menuMember && (
        <div style={C.overlay}>
          <div onClick={() => setMemberMenuUserId(null)} style={C.obg} />
          <div style={C.modal}>
            {(() => {
              const accent = memberAccentColor(menuMember, server);
              const av = menuMember.profile?.avatarUrl;
              const isOwn = menuMember.userId === user?.id;
              const isOwner = menuMember.userId === server.ownerId;
              return (
                <>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ width: 56, height: 56, flexShrink: 0, position: 'relative' }}>
                      {av ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={av}
                            alt=""
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: `3px solid ${accent}55`,
                            }}
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            background: `${accent}28`,
                            border: `3px solid ${accent}66`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            fontWeight: 700,
                            color: accent,
                          }}
                        >
                          {mname(menuMember)[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ margin: 0, color: '#F2F5F8', fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{mname(menuMember)}</h2>
                      <p style={{ color: DISCORD_TEXT_MUTED, fontSize: 13, margin: '6px 0 0', wordBreak: 'break-all' }}>
                        @{menuMember.profile?.username ?? menuMember.userId.slice(0, 8)}
                      </p>
                      {isOwn && (
                        <span style={{ fontSize: 12, color: UNIGRAM_GREEN, marginTop: 6, display: 'inline-block' }}>Este és tu</span>
                      )}
                      {isOwner && (
                        <span style={{ fontSize: 12, color: ALPHA_BG, marginTop: 6, display: 'block' }}>Dono do servidor</span>
                      )}
                    </div>
                  </div>
                  {menuMember.mutedUntil && new Date(menuMember.mutedUntil) > new Date() && (
                    <p style={{ fontSize: 12, color: '#ED4245', marginBottom: 14 }}>🔇 Silenciado neste servidor</p>
                  )}
                  {isAdmin && !isOwner && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, color: DISCORD_TEXT_MUTED, display: 'block', marginBottom: 6 }}>Atribuir cargo</label>
                      <select
                        value={menuMember.communityRoleId ?? ''}
                        onChange={e => assignRole(menuMember.userId, e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: 13,
                          background: '#0B121A',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#E8EDF2',
                          borderRadius: 10,
                          padding: '10px 12px',
                        }}
                      >
                        <option value="">— sem cargo personalizado —</option>
                        {(server.roles ?? []).map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isMod && !isOwner && !isOwn && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <button type="button" onClick={() => kickUser(menuMember.userId)} style={{ ...C.btnSec, borderColor: 'rgba(237,66,69,0.5)', color: '#ED4245' }}>
                        Expulsar
                      </button>
                      <button
                        type="button"
                        onClick={() => banUser(menuMember.userId)}
                        style={{
                          background: 'rgba(237,66,69,0.15)',
                          border: '1px solid rgba(237,66,69,0.55)',
                          color: '#ED4245',
                          borderRadius: 10,
                          padding: '9px 18px',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Banir
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => setMemberMenuUserId(null)} style={{ ...C.btnGhost, marginTop: 8, width: '100%' }}>
                    Fechar
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showCh && (
        <div style={C.overlay}>
          <div onClick={() => setShowCh(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontFamily: 'system-ui', fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Criar canal</h2>
            <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 6 }}>Categoria (opcional)</label>
            <select
              value={chCategoryId}
              onChange={e => setChCategoryId(e.target.value)}
              style={{ width: '100%', marginBottom: 12, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 13 }}
            >
              <option value="">— sem categoria —</option>
              {(server.channelCategories ?? []).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ color: '#6B7785' }}>#</span>
              <input
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#E8EDF2', fontSize: 14, outline: 'none' }}
                placeholder="novo-canal"
                value={chName}
                onChange={e => setChName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                onKeyDown={e => e.key === 'Enter' && createCh()}
                autoFocus
                maxLength={32}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCh(false)} style={C.btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={createCh} disabled={crCh || !chName.trim()} style={{ ...C.btnPri, opacity: !chName.trim() || crCh ? 0.5 : 1 }}>
                {crCh ? '…' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCat && (
        <div style={C.overlay}>
          <div onClick={() => setShowCat(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Nova categoria</h2>
            <input
              style={{ width: '100%', boxSizing: 'border-box', background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              placeholder="Nome"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              maxLength={64}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCat(false)} style={C.btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={createCategory} disabled={!newCatName.trim()} style={{ ...C.btnPri, opacity: !newCatName.trim() ? 0.5 : 1 }}>
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPins && (
        <div style={C.overlay}>
          <div onClick={() => setShowPins(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Mensagens fixadas</h2>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {pins.length === 0 ? (
                <p style={{ color: '#6B7785', fontSize: 13 }}>Nenhuma fixada neste canal.</p>
              ) : (
                pins.map(p => (
                  <div key={p.id} style={{ padding: 10, marginBottom: 8, background: '#0B121A', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: UNIGRAM_GREEN, fontSize: 12, fontWeight: 600 }}>{p.authorName}</span>
                    <p style={{ color: '#C5D0DC', fontSize: 13, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{p.content}</p>
                  </div>
                ))
              )}
            </div>
            <button type="button" onClick={() => setShowPins(false)} style={{ ...C.btnGhost, marginTop: 16 }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {showAudit && (
        <div style={C.overlay}>
          <div onClick={() => setShowAudit(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Registo de auditoria</h2>
            <div style={{ maxHeight: 360, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
              {audits.length === 0 ? (
                <p style={{ color: '#6B7785' }}>Sem entradas.</p>
              ) : (
                audits.map(a => (
                  <div key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#9CA8B8' }}>
                    <span style={{ color: UNIGRAM_GREEN }}>{a.action}</span> · {new Date(a.createdAt).toLocaleString('pt-PT')}
                    <div style={{ opacity: 0.8 }}>ator: {a.actorId.slice(0, 8)}… {a.targetId ? `→ ${a.targetId.slice(0, 8)}…` : ''}</div>
                  </div>
                ))
              )}
            </div>
            <button type="button" onClick={() => setShowAudit(false)} style={{ ...C.btnGhost, marginTop: 16 }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {showInv && (
        <div style={C.overlay}>
          <div onClick={() => setShowInv(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 12px' }}>Convidar</h2>
            <p style={{ color: '#9CA8B8', fontSize: 13, marginBottom: 16 }}>
              Código — <strong style={{ color: UNIGRAM_GREEN }}>{server.name}</strong>
            </p>
            <div
              style={{
                background: '#0B121A',
                border: `1px solid rgba(61,220,132,0.35)`,
                borderRadius: 10,
                padding: '14px 16px',
                fontFamily: 'monospace',
                color: UNIGRAM_GREEN,
                fontSize: 12,
                marginBottom: 16,
                wordBreak: 'break-all',
              }}
            >
              {server.inviteCode}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(server.inviteCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={C.btnSec}
            >
              {copied ? '✓ Copiado' : '📋 Copiar'}
            </button>
          </div>
        </div>
      )}

      {showEditSrv && (
        <div style={C.overlay}>
          <div onClick={() => setShowEditSrv(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Editar servidor</h2>
            <label style={{ color: '#6B7785', fontSize: 11 }}>Nome</label>
            <input
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              maxLength={50}
            />
            <label style={{ color: '#6B7785', fontSize: 11 }}>Descrição</label>
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 72, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 13, resize: 'vertical' }}
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              maxLength={500}
            />
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowEditSrv(false);
                  setShowRoles(true);
                }}
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: '10px 14px',
                  background: '#1E1F22',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: DISCORD_TEXT_BRIGHT,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ⚙ Gerir cargos personalizados…
              </button>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowEditSrv(false)} style={C.btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={saveServer} disabled={savingSrv || editName.trim().length < 2} style={{ ...C.btnPri, opacity: editName.trim().length < 2 ? 0.5 : 1 }}>
                {savingSrv ? '…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoles && (
        <div style={C.overlay}>
          <div onClick={() => setShowRoles(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Cargos personalizados</h2>
            <p style={{ color: '#7A8B9C', fontSize: 12, marginBottom: 12 }}>Cores, nomes e permissões de moderação / servidor / canais.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                style={{ flex: 1, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#E8EDF2', fontSize: 13 }}
                placeholder="Nome do cargo"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                maxLength={32}
              />
              <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
              <button type="button" onClick={createRole} disabled={crRole || !newRoleName.trim()} style={{ ...C.btnPri, opacity: !newRoleName.trim() ? 0.5 : 1 }}>
                {crRole ? '…' : 'Criar'}
              </button>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {(server.roles ?? []).length === 0 ? (
                <p style={{ color: '#5A6B7D', fontSize: 12 }}>Sem cargos ainda.</p>
              ) : (
                (server.roles ?? []).map(r => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: '#0B121A',
                      borderRadius: 8,
                      marginBottom: 6,
                      border: `1px solid ${r.color || 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.color || UNIGRAM_GREEN }} />
                    <span style={{ color: '#E8EDF2', fontSize: 13, flex: 1 }}>{r.name}</span>
                    <span style={{ fontSize: 10, color: '#5A6B7D' }}>
                      {r.canModerate ? 'mod' : ''}
                      {r.canManageServer ? ' srv' : ''}
                      {r.canManageChannels ? ' ch' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button type="button" onClick={() => setShowRoles(false)} style={{ ...C.btnGhost, marginTop: 16 }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div style={C.overlay}>
          <div onClick={() => setEditing(null)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Editar mensagem</h2>
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 100, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              value={editing.text}
              onChange={e => setEditing({ ...editing, text: e.target.value })}
              maxLength={4000}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditing(null)} style={C.btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={saveEdit} style={C.btnPri}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBody({ msg, mt }: { msg: Msg; mt: string }) {
  if (msg.attachmentUrls?.length) {
    return (
      <div>
        {msg.attachmentUrls.map((u, i) =>
          /\.(png|jpe?g|gif|webp)$/i.test(u) ? (
            <div key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" style={{ maxWidth: '100%', borderRadius: 12, display: 'block', marginBottom: 8 }} />
            </div>
          ) : (
            <a key={i} href={u} target="_blank" rel="noopener noreferrer" style={{ color: '#7EB6FF', fontSize: 13, display: 'block', marginBottom: 6 }}>
              📄 Anexo {i + 1}
            </a>
          ),
        )}
        {mt === 'text' && msg.content?.trim() && <p style={{ color: '#D4DDE6', fontSize: 14, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>}
      </div>
    );
  }
  if (mt === 'image' && msg.imageUrl) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- URLs externas de bots */}
        <img src={msg.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 12, display: 'block' }} />
        {msg.content?.trim() && <p style={{ color: '#C5D0DC', fontSize: 13, margin: '8px 0 0', lineHeight: 1.45 }}>{msg.content}</p>}
      </div>
    );
  }
  if (mt === 'embed' && msg.embedJson && typeof msg.embedJson === 'object') {
    const e = msg.embedJson;
    const border = (e.color as string) || '#7C6FAD';
    return (
      <div style={{ borderLeft: `4px solid ${border}`, paddingLeft: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
        {e.title && <p style={{ color: '#E8EDF2', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>{e.title}</p>}
        {e.description && <p style={{ color: '#9CA8B8', fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{e.description}</p>}
        {e.imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.imageUrl as string} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8, display: 'block' }} />
          </>
        )}
        {e.footer && <p style={{ color: '#5A6B7D', fontSize: 10, margin: '8px 0 0' }}>{e.footer}</p>}
      </div>
    );
  }
  return <p style={{ color: '#D4DDE6', fontSize: 14, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>;
}
