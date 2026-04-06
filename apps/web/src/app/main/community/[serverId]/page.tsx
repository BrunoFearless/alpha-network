'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCommunitySocket } from '@/lib/socket';
import { ReactionsBar } from '@/components/community/ReactionsBar';
import { EmojiPicker } from '@/components/community/EmojiPicker';
import { useMultipleReactions } from '@/hooks/useReactions';

interface ChannelCategoryRow {
  id: string;
  name: string;
  icon: string;
  position: number;
}
interface Channel {
  id: string;
  name: string;
  icon: string;
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
  profile: { displayName?: string | null; username: string; avatarUrl?: string | null; bio?: string | null } | null;
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
  [key: string]: any; // Allow poll data and other extensions
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

// Discord Ultra Dark Palette
const COLORS = {
  BG_PRIMARY: '#000000',
  BG_SECONDARY: '#000000',
  BG_TERTIARY: '#1A2038',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#ffffff',
  TEXT_MUTED: '#949BA4',
  GREEN_ACCENT: '#A5E600',
  GREEN_DARK: '#1B5E20',
  ROLE_OWNER: '#F0B132',
  ROLE_ADMIN: '#ED4245',
};

const UNIGRAM_GREEN = COLORS.GREEN_ACCENT;
const BOT_GREEN = '#B8E21F';
const ALPHA_BG = '#000000';
const SIDEBAR_BG = '#000000';
const CHAT_BG = '#000000';
const TG_BUBBLE_IN = 'linear-gradient(160deg, rgba(15,18,25,0.95) 0%, rgba(26,32,56,0.92) 100%)';
const TG_BUBBLE_OUT = 'linear-gradient(160deg, rgba(165,230,0,0.18) 0%, rgba(27,94,32,0.45) 100%)';

function nameColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 17) % 360;
  return `hsl(${h}, 48%, 70%)`;
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

  const { 
    toggleReaction: toggleReact, 
    syncReactions, 
    getAggregated,
    isLoading: isReactLoading 
  } = useMultipleReactions({
    userId: user?.id,
    onToggle: async (messageId, emoji) => {
      if (!socket || !channel) return;
      socket.emit('reaction.toggle', { channelId: channel.id, messageId, emoji });
    }
  });

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
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileBio, setEditProfileBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const profileAvatarInput = useRef<HTMLInputElement>(null);
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

  // ==================== CHANNEL & CATEGORY MANAGEMENT ====================
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelIcon, setEditChannelIcon] = useState('');
  const [editChannelPrivate, setEditChannelPrivate] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<'channel' | 'category' | 'message' | null>(null);
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);

  const [showEditCategory, setShowEditCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryIcon, setEditCategoryIcon] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // ==================== SERVER SIDEBAR ====================
  const [myServers, setMyServers] = useState<Server[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showServerMenu, setShowServerMenu] = useState(false);

  // ==================== CHANNEL HEADER CONTROLS ====================
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Msg[]>([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [channelMuted, setChannelMuted] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [typingDots, setTypingDots] = useState('');
  const [msgMenuOpen, setMsgMenuOpen] = useState<string | null>(null);
  const [msgHovered, setMsgHovered] = useState<string | null>(null);
  const [showInputMenu, setShowInputMenu] = useState(false);

  // ==================== EVENTS ====================
  const [events, setEvents] = useState<any[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [eventFlowStep, setEventFlowStep] = useState(0);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', location: '', locationType: 'external', imageUrl: '', startDate: '', endDate: '', startTime: '', endTime: '', frequency: 'none'
  });
  const [eventUploading, setEventUploading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<any | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEventOptions, setShowEventOptions] = useState(false);
  const [activeEventTab, setActiveEventTab] = useState<'info' | 'interested'>('info');

  const eventUploadRef = useRef<HTMLInputElement>(null);

  // ==================== TÓPICOS ====================
  // Topic = channel of type "forum" created via existing channel API
  interface ForumTopic { id: string; title: string; labelIds: string[]; authorName: string; createdAt: string; replyCount: number; }
  const [showTopicsSection, setShowTopicsSection] = useState(false);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicBody, setNewTopicBody] = useState('');
  const [newTopicLabels, setNewTopicLabels] = useState<string[]>([]);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [viewingTopic, setViewingTopic] = useState<ForumTopic | null>(null);

  // ==================== ETIQUETAS ====================
  interface Label { id: string; name: string; color: string; }
  const [labels, setLabels] = useState<Label[]>([]);
  const [showManageLabels, setShowManageLabels] = useState(false);
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#A5E600');
  const [creatingLabel, setCreatingLabel] = useState(false);
 
  // ==================== ENQUETES (POLLS) ====================
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']); // Start with 2 empty options
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollDuration, setPollDuration] = useState('24h');
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [selectedPollOptions, setSelectedPollOptions] = useState<Record<string, string[]>>({}); // msgId -> [optionId, ...]
 
  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef<string | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const myMember = server?.members.find(m => m.userId === user?.id);
  const isAdmin = myMember?.role === 'admin';
  const isMod = isAdmin || myMember?.communityRole?.canModerate === true;
  const canEditServer = isAdmin || myMember?.communityRole?.canManageServer === true;

  const refreshServer = useCallback(async () => {
    if (!serverId) return;
    const d = await api.get<Server>(`/community/servers/${serverId}`);
    setServer(d);
  }, [serverId]);

  const renderEventsModal = () => {
    if (eventFlowStep === 0) {
      return (
        <div style={C.overlay}>
          <div onClick={() => setShowEvents(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 480, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 16px', background: '#2B2D31', borderBottom: '1px solid rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 20, margin: 0, color: '#F2F3F5', fontWeight: 600 }}>{events.length} Evento{events.length !== 1 && 's'}</h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setEventFlowStep(1)} style={{ background: UNIGRAM_GREEN, color: '#000', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Criar evento</button>
                  <button onClick={() => setShowEvents(false)} style={{ background: 'transparent', border: 'none', color: DISCORD_TEXT_MUTED, cursor: 'pointer', fontSize: 20 }}>✕</button>
                </div>
              </div>
            </div>
            <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: DISCORD_TEXT_MUTED }}>Nenhum evento agendado.</div>
              ) : (
                events.map(ev => (
                  <div key={ev.id} onClick={(e) => { e.stopPropagation(); setViewingEvent(ev); setShowEvents(false); }} style={{ background: '#1E1F22', borderRadius: 8, overflow: 'hidden', marginBottom: 16, cursor: 'pointer', transition: 'transform 0.1s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    {ev.imageUrl && (
                      <div style={{ width: '100%', height: 140, background: `url(${ev.imageUrl}) center/cover no-repeat` }} />
                    )}
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: UNIGRAM_GREEN, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                          📅 {new Date(ev.startDate).toLocaleString()}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: DISCORD_TEXT_MUTED, fontSize: 12 }}>
                          {ev.creator?.avatarUrl && <img src={ev.creator.avatarUrl} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />}
                          <span>👥 {ev.interests?.length || 0}</span>
                        </div>
                      </div>
                      <h3 style={{ margin: '4px 0 8px', color: '#F2F3F5', fontSize: 18 }}>{ev.title}</h3>
                      {ev.description && <p style={{ margin: '0 0 12px', color: DISCORD_TEXT_BRIGHT, fontSize: 14, whiteSpace: 'pre-wrap' }}>{ev.description}</p>}
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: DISCORD_TEXT_MUTED, fontSize: 13 }}>
                          <span>📍</span> {ev.locationType === 'voice' ? 'Canal de voz' : ev.location || 'Local externo'}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => {}} style={{ background: 'transparent', border: `1px solid ${DISCORD_TEXT_MUTED}`, color: '#F2F3F5', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Copiar link</button>
                          <button 
                            onClick={async () => {
                              try {
                                const { data } = await api.post<any>(`/community/events/${ev.id}/interest`, {});
                                loadEvents();
                              } catch(e) {}
                            }}
                            style={{ background: ev.interests?.some((i:any) => i.userId === user?.id) ? 'transparent' : UNIGRAM_GREEN, border: ev.interests?.some((i:any) => i.userId === user?.id) ? `1px solid ${UNIGRAM_GREEN}` : 'none', color: ev.interests?.some((i:any) => i.userId === user?.id) ? UNIGRAM_GREEN : '#000', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            {ev.interests?.some((i:any) => i.userId === user?.id) ? '✓ Interessado' : 'Me interessa'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    if (eventFlowStep === 1) {
      return (
        <div style={C.overlay}>
          <div onClick={() => setShowEvents(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 440, padding: 0 }}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <span onClick={()=>setEventFlowStep(1)} style={{ color: UNIGRAM_GREEN, fontSize: 12, textTransform: 'uppercase', fontWeight: 600, borderBottom: `2px solid ${UNIGRAM_GREEN}`, paddingBottom: 4, cursor: 'pointer' }}>Localização</span>
                <span style={{ color: DISCORD_TEXT_MUTED, fontSize: 12, textTransform: 'uppercase', fontWeight: 600, paddingBottom: 4 }}>Informações do evento</span>
                <span style={{ color: DISCORD_TEXT_MUTED, fontSize: 12, textTransform: 'uppercase', fontWeight: 600, paddingBottom: 4 }}>Revisar</span>
              </div>
              <h2 style={{ fontSize: 24, margin: '0 0 8px', color: '#F2F3F5', fontWeight: 700 }}>Onde é seu evento?</h2>
              <p style={{ margin: '0 0 24px', color: DISCORD_TEXT_BRIGHT, fontSize: 14 }}>Para ninguém ficar perdido e saber aonde ir.</p>

              <div 
                onClick={() => setNewEvent(p => ({ ...p, locationType: 'voice' }))}
                style={{ display: 'flex', background: newEvent.locationType === 'voice' ? 'rgba(79, 84, 92, 0.4)' : '#2B2D31', padding: 16, borderRadius: 8, marginBottom: 12, cursor: 'pointer', alignItems: 'center', gap: 12 }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${newEvent.locationType === 'voice' ? UNIGRAM_GREEN : DISCORD_TEXT_MUTED}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {newEvent.locationType === 'voice' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: UNIGRAM_GREEN }} />}
                </div>
                <div>
                  <div style={{ color: '#F2F3F5', fontSize: 16, fontWeight: 600, marginBottom: 4 }}><span style={{ marginRight: 6 }}>🔊</span>Canal de voz</div>
                  <div style={{ color: DISCORD_TEXT_BRIGHT, fontSize: 13 }}>Encontrem-se com voz, vídeo, compartilhamento de tela e pelo Transmitir.</div>
                </div>
              </div>

              <div 
                onClick={() => setNewEvent(p => ({ ...p, locationType: 'external' }))}
                style={{ display: 'flex', background: newEvent.locationType === 'external' ? 'rgba(79, 84, 92, 0.4)' : '#2B2D31', padding: 16, borderRadius: 8, marginBottom: 12, cursor: 'pointer', alignItems: 'center', gap: 12 }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${newEvent.locationType === 'external' ? UNIGRAM_GREEN : DISCORD_TEXT_MUTED}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {newEvent.locationType === 'external' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: UNIGRAM_GREEN }} />}
                </div>
                <div>
                  <div style={{ color: '#F2F3F5', fontSize: 16, fontWeight: 600, marginBottom: 4 }}><span style={{ marginRight: 6 }}>📍</span>Em outro lugar</div>
                  <div style={{ color: DISCORD_TEXT_BRIGHT, fontSize: 13 }}>Canal de texto, link externo, ou local em pessoa.</div>
                </div>
              </div>

              {newEvent.locationType === 'external' && (
                <div style={{ marginTop: 24 }}>
                  <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Insira uma localização <span style={{color:'#ED4245'}}>*</span></label>
                  <input value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} placeholder="Coloque a localização, um link ou algo assim." style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none' }} />
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', background: '#2B2D31', marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12, borderRadius: '0 0 8px 8px' }}>
              <button disabled={creatingEvent} onClick={() => setShowEvents(false)} style={{ background: 'transparent', border: 'none', color: '#F2F3F5', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button disabled={newEvent.locationType === 'external' && !newEvent.location} onClick={() => setEventFlowStep(2)} style={{ background: UNIGRAM_GREEN, color: '#000', border: 'none', padding: '8px 24px', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: (newEvent.locationType === 'external' && !newEvent.location) ? 0.5 : 1 }}>Próximo</button>
            </div>
          </div>
        </div>
      );
    }

    if (eventFlowStep === 2) {
      const handleEventUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEventUploading(true);
        const form = new FormData();
        form.append('file', file);
        try {
          const data = await api.postForm<{ url: string }>(`/community/servers/${serverId}/upload`, form);
          if (data?.url) setNewEvent(p => ({ ...p, imageUrl: data.url }));
        } catch(err) {
          console.error(err);
        } finally {
          setEventUploading(false);
        }
      };

      const handleSaveEvent = async () => {
        if (!newEvent.title || !newEvent.startDate) return;
        setCreatingEvent(true);
        try {
          const ds = newEvent.startDate + (newEvent.startTime ? `T${newEvent.startTime}:00` : 'T00:00:00');
          const de = (newEvent.endDate || newEvent.startDate) + (newEvent.endTime ? `T${newEvent.endTime}:00` : 'T23:59:59');
          
          const payload = {
            title: newEvent.title,
            description: newEvent.description,
            location: newEvent.location,
            locationType: newEvent.locationType,
            imageUrl: newEvent.imageUrl,
            startDate: ds,
            endDate: de,
            frequency: newEvent.frequency,
          };

          if (editingEventId) {
            await api.patch(`/community/events/${editingEventId}`, payload);
          } else {
            await api.post(`/community/servers/${serverId}/events`, payload);
          }
          
          await loadEvents();
          setEventFlowStep(0);
          setEditingEventId(null);
          setNewEvent({ title: '', description: '', location: '', locationType: 'external', imageUrl: '', startDate: '', endDate: '', startTime: '', endTime: '', frequency: 'none' });
        } catch(e) {
          console.error(e);
        } finally {
          setCreatingEvent(false);
        }
      };

      return (
        <div style={C.overlay}>
          <div onClick={() => setShowEvents(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 440, padding: 0 }}>
            <div style={{ padding: '24px 24px 0', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <span onClick={()=>setEventFlowStep(1)} style={{ color: DISCORD_TEXT_MUTED, fontSize: 12, textTransform: 'uppercase', fontWeight: 600, paddingBottom: 4, cursor: 'pointer' }}>Localização</span>
                <span style={{ color: UNIGRAM_GREEN, fontSize: 12, textTransform: 'uppercase', fontWeight: 600, borderBottom: `2px solid ${UNIGRAM_GREEN}`, paddingBottom: 4 }}>Informações do evento</span>
                <span style={{ color: DISCORD_TEXT_MUTED, fontSize: 12, textTransform: 'uppercase', fontWeight: 600, paddingBottom: 4 }}>Revisar</span>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Assunto do evento <span style={{color:'#ED4245'}}>*</span></label>
                <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Treino, Reunião..." style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Data de inicio <span style={{color:'#ED4245'}}>*</span></label>
                  <input type="date" value={newEvent.startDate} onChange={e => setNewEvent(p => ({ ...p, startDate: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none', colorScheme: 'dark' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Hora de inicio <span style={{color:'#ED4245'}}>*</span></label>
                  <input type="time" value={newEvent.startTime} onChange={e => setNewEvent(p => ({ ...p, startTime: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none', colorScheme: 'dark' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Data de encerramento <span style={{color:'#ED4245'}}>*</span></label>
                  <input type="date" value={newEvent.endDate} onChange={e => setNewEvent(p => ({ ...p, endDate: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none', colorScheme: 'dark' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Hora de encerramento <span style={{color:'#ED4245'}}>*</span></label>
                  <input type="time" value={newEvent.endTime} onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none', colorScheme: 'dark' }} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Frequência do evento <span style={{color:'#ED4245'}}>*</span></label>
                <select value={newEvent.frequency} onChange={e => setNewEvent(p => ({ ...p, frequency: e.target.value }))} style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none' }}>
                  <option value="none">Não se repete</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase' }}>Descrição</label>
                <textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder="Descrição..." style={{ width: '100%', marginTop: 8, padding: '10px 12px', background: '#1E1F22', border: 'none', color: '#FFF', borderRadius: 4, outline: 'none', minHeight: 80, resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#DBDEE1', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Imagem de apresentação</label>
                <p style={{ color: DISCORD_TEXT_MUTED, fontSize: 11, margin: '0 0 12px' }}>Recomendamos uma imagem que tenha pelo menos 800px de largura e 320px de altura.</p>
                <input type="file" accept="image/*" style={{ display: 'none' }} ref={eventUploadRef} onChange={handleEventUpload} />
                
                {newEvent.imageUrl ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '100%', height: 160, background: `url(${newEvent.imageUrl}) center/cover no-repeat`, borderRadius: 8 }} />
                    <button onClick={() => eventUploadRef.current?.click()} style={{ position: 'absolute', top: 8, right: 8, background: '#FFF', color: '#000', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>Alterar</button>
                  </div>
                ) : (
                  <button disabled={eventUploading} onClick={() => eventUploadRef.current?.click()} style={{ background: 'rgba(79, 84, 92, 0.4)', color: '#F2F3F5', border: 'none', padding: '10px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                    {eventUploading ? 'Enviando...' : 'Enviar imagem de apresentação'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#000000', display: 'flex', justifyContent: 'space-between', borderRadius: '0 0 8px 8px' }}>
              <button disabled={creatingEvent} onClick={() => setEventFlowStep(1)} style={{ background: 'transparent', border: 'none', color: '#F2F3F5', cursor: 'pointer', fontSize: 14 }}>Voltar</button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button disabled={creatingEvent} onClick={() => setShowEvents(false)} style={{ background: 'transparent', border: 'none', color: '#F2F3F5', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
                <button disabled={!newEvent.title || !newEvent.startDate || creatingEvent} onClick={handleSaveEvent} style={{ background: UNIGRAM_GREEN, color: '#000', border: 'none', padding: '8px 24px', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: (!newEvent.title || !newEvent.startDate) ? 0.5 : 1 }}>{creatingEvent ? 'Salvando...' : (editingEventId ? 'Guardar Alterações' : 'Criar Evento')}</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderEventDetailModal = () => {
    if (!viewingEvent || !server) return null;

    const dtStart = new Date(viewingEvent.startDate);
    const dtEnd = new Date(viewingEvent.endDate);
    
    // Quick formatter: "Ter set 1º - 14:00"
    const formatDateObj = (d: Date) => {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const mos = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${days[d.getDay()]} ${mos[d.getMonth()]} ${d.getDate()}º - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const dateRangeStr = `${formatDateObj(dtStart)} — ${formatDateObj(dtEnd)}`;

    const canEdit = viewingEvent.creatorId === user?.id || isAdmin || isMod;

    const handleEditClick = () => {
      setViewingEvent(null);
      setEditingEventId(viewingEvent.id);
      
      const stDate = dtStart.toISOString().split('T')[0];
      const stTime = dtStart.toTimeString().split(' ')[0].substring(0,5);
      
      const enDate = dtEnd.toISOString().split('T')[0];
      const enTime = dtEnd.toTimeString().split(' ')[0].substring(0,5);

      setNewEvent({
        title: viewingEvent.title,
        description: viewingEvent.description || '',
        location: viewingEvent.location || '',
        locationType: viewingEvent.locationType || 'external',
        imageUrl: viewingEvent.imageUrl || '',
        startDate: stDate,
        endDate: enDate,
        startTime: stTime,
        endTime: enTime,
        frequency: viewingEvent.frequency || 'none',
      });
      setEventFlowStep(1);
      setShowEvents(true);
      setShowEventOptions(false);
    };

    const handleDeleteClick = async () => {
      if (!window.confirm("Certeza que deseja excluir este evento? Esta ação é irreversível.")) return;
      try {
        await api.delete(`/community/events/${viewingEvent.id}`);
        await loadEvents();
        setViewingEvent(null);
        setShowEventOptions(false);
      } catch (e) {
        console.error(e);
      }
    };

    return (
      <div style={C.overlay}>
        <div onClick={() => { setViewingEvent(null); setShowEventOptions(false); }} style={C.obg} />
        <div style={{ ...C.modal, maxWidth: 640, padding: 0, overflow: 'visible', background: '#070707ff' }}>
          
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🛡️</span>
              <h2 style={{ fontSize: 18, margin: 0, color: '#F2F3F5', fontWeight: 600 }}>{viewingEvent.title}</h2>
            </div>
            <button onClick={() => { setViewingEvent(null); setShowEventOptions(false); }} style={{ background: 'transparent', border: 'none', color: DISCORD_TEXT_MUTED, cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          {/* Banner Image */}
          <div style={{ width: '100%', height: 240, background: viewingEvent.imageUrl ? `url(${viewingEvent.imageUrl}) center/cover no-repeat` : '#1E1F22' }} />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 24, padding: '0 24px', borderBottom: '1px solid rgba(0,0,0,0.2)' }}>
            <span onClick={() => setActiveEventTab('info')} style={{ padding: '16px 0', borderBottom: activeEventTab === 'info' ? '2px solid #F2F3F5' : 'none', color: activeEventTab === 'info' ? '#F2F3F5' : DISCORD_TEXT_MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Informações do evento</span>
            <span onClick={() => setActiveEventTab('interested')} style={{ padding: '16px 0', borderBottom: activeEventTab === 'interested' ? '2px solid #F2F3F5' : 'none', color: activeEventTab === 'interested' ? '#F2F3F5' : DISCORD_TEXT_MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{viewingEvent.interests?.length || 0} Têm interesse</span>
          </div>

          {/* Content Body */}
          <div style={{ padding: '24px', minHeight: 200, maxHeight: '40vh', overflowY: 'auto' }}>
            {activeEventTab === 'info' ? (
              <>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={{ background: '#2B2D31', width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📅</div>
                  <div>
                    <div style={{ color: '#F2F3F5', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{dateRangeStr}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={{ background: '#2B2D31', width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
                  <div>
                    <div style={{ color: '#F2F3F5', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{viewingEvent.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: UNIGRAM_GREEN }} />
                      <span style={{ color: DISCORD_TEXT_BRIGHT, fontSize: 13 }}>{server.name} ✨</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={{ background: '#2B2D31', width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: UNIGRAM_GREEN }} />
                    <span style={{ color: UNIGRAM_GREEN, fontSize: 14 }}>{server.name} ✨ › {viewingEvent.locationType === 'voice' ? 'Canal de voz' : viewingEvent.location || 'Local externo'}</span>
                  </div>
                </div>

                {viewingEvent.description && (
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ color: '#F2F3F5', fontSize: 13, textTransform: 'uppercase', marginBottom: 12 }}>Sobre</h4>
                    <p style={{ color: DISCORD_TEXT_BRIGHT, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{viewingEvent.description}</p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {viewingEvent.interests?.map((interest: any) => (
                  <div key={interest.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#2B2D31', borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1E1F22' }} />
                    <span style={{ color: '#F2F3F5', fontSize: 14 }}>Usuário ID: {interest.userId.substring(0,8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div style={{ padding: '16px 24px', background: '#2B2D31', display: 'flex', justifyContent: 'flex-end', gap: 12, borderRadius: '0 0 8px 8px', position: 'relative' }}>
            {canEdit && (
              <>
                <button onClick={() => setShowEventOptions(!showEventOptions)} style={{ background: '#313338', color: '#F2F3F5', border: 'none', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>•••</button>
                {showEventOptions && (
                  <div style={{ position: 'absolute', bottom: 64, right: 180, background: '#111214', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 8, zIndex: 100, minWidth: 160, boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
                    <div onClick={handleEditClick} style={{ padding: '8px 12px', color: '#F2F3F5', cursor: 'pointer', borderRadius: 4, fontSize: 14 }} onMouseEnter={e => e.currentTarget.style.background = '#4752C4'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>✏️ Editar Evento</div>
                    <div onClick={handleDeleteClick} style={{ padding: '8px 12px', color: '#ED4245', cursor: 'pointer', borderRadius: 4, fontSize: 14 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,66,69,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>🗑️ Cancelar Evento</div>
                  </div>
                )}
              </>
            )}
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#313338', color: '#F2F3F5', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              <span style={{ fontSize: 16 }}>🔗</span> Copiar link
            </button>
            <button 
              onClick={async () => {
                try {
                  const data = await api.post<any>(`/community/events/${viewingEvent.id}/interest`, {});
                  // update locally
                  setViewingEvent((p:any) => {
                    const ints = p.interests || [];
                    const exists = ints.find((i:any) => i.userId === user?.id);
                    return {
                      ...p,
                      interests: exists ? ints.filter((i:any) => i.userId !== user?.id) : [...ints, { userId: user?.id, id: 'temp' }]
                    };
                  });
                  loadEvents();
                } catch(e) {}
              }}
              style={{ background: viewingEvent.interests?.some((i:any) => i.userId === user?.id) ? 'transparent' : UNIGRAM_GREEN, color: viewingEvent.interests?.some((i:any) => i.userId === user?.id) ? UNIGRAM_GREEN : '#000', border: viewingEvent.interests?.some((i:any) => i.userId === user?.id) ? `1px solid ${UNIGRAM_GREEN}` : 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              🔔 {viewingEvent.interests?.some((i:any) => i.userId === user?.id) ? 'Interessado' : 'Me interessa'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const loadEvents = useCallback(async () => {
    if (!serverId) return;
    try {
      const data = await api.get<any[]>(`/community/servers/${serverId}/events`);
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    }
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
        // Try to load last channel from localStorage, otherwise use first channel
        const lastChannelId = localStorage.getItem(`alpha_last_channel_${serverId}`);
        const lastCh = lastChannelId ? d.channels.find(ch => ch.id === lastChannelId) : null;
        if (lastCh) setChannel(lastCh);
        else if (d.channels.length > 0) setChannel(d.channels[0]);
        loadEvents();
      })
      .catch(() => router.push('/main/community'))
      .finally(() => setLoading(false));

    // Load all user's servers for sidebar
    api.get<Server[]>('/community/servers').then(setMyServers).catch(console.error);
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
      // Incrementar contagem de não lidas por canal se não for do usuário atual
      if (msg.authorId !== user?.id) {
        setUnreadByChannel(prev => ({
          ...prev,
          [msg.channelId]: (prev[msg.channelId] ?? 0) + 1
        }));
      }
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
      syncReactions(payload.messageId, payload.reactions);
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
    // Scroll automático para o final quando mensagens chegam
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Resetar contador do canal quando entra
    if (channel?.id) {
      setUnreadByChannel(prev => ({
        ...prev,
        [channel.id]: 0
      }));
    }
  }, [channel?.id]);

  // Animar os pontinhos de typing
  useEffect(() => {
    if (Object.keys(typingIds).length === 0) {
      setTypingDots('•');
      return;
    }
    const interval = setInterval(() => {
      setTypingDots(prev => {
        if (prev === '•••') return '•';
        return prev + '•';
      });
    }, 400);
    return () => clearInterval(interval);
  }, [typingIds]);

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

  // ==================== CHANNEL HEADER FUNCTIONS ====================

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = msgs.filter(m =>
      m.content.toLowerCase().includes(query.toLowerCase()) ||
      m.authorName.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  }

  function toggleChannelMute() {
    setChannelMuted(!channelMuted);
    // TODO: Salvar preference no localStorage ou backend
    localStorage.setItem(`alpha_muted_${channel?.id}`, JSON.stringify(!channelMuted));
  }

  function handleNotificationClick() {
    setShowNotificationMenu(!showNotificationMenu);
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

  // ==================== CHANNEL & CATEGORY EDIT/DELETE ====================

  async function startEditChannel(ch: Channel) {
    setEditingChannelId(ch.id);
    setEditChannelName(ch.name);
    setEditChannelIcon(ch.icon || '');
    setEditChannelPrivate(false); // TODO: load from server
    setShowEditChannel(true);
  }

  async function saveEditChannel() {
    if (!server || !editingChannelId || !editChannelName.trim()) return;
    setSavingChannel(true);
    try {
      await api.patch(`/community/servers/${server.id}/channels/${editingChannelId}`, {
        name: editChannelName.trim(),
        icon: editChannelIcon || null,
      });
      await refreshServer();
      setShowEditChannel(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao editar canal.');
    } finally {
      setSavingChannel(false);
    }
  }

  async function deleteChannel() {
    if (!server || !editingChannelId || !confirm('Apagar este canal? Esta ação não pode ser revertida.')) return;
    setSavingChannel(true);
    try {
      await api.delete(`/community/servers/${server.id}/channels/${editingChannelId}`);
      await refreshServer();
      setShowEditChannel(false);
      if (channel?.id === editingChannelId) setChannel(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao apagar canal.');
    } finally {
      setSavingChannel(false);
    }
  }

  async function startEditCategory(cat: ChannelCategoryRow) {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategoryIcon(cat.icon || '');
    setShowEditCategory(true);
  }

  async function saveEditCategory() {
    if (!server || !editingCategoryId || !editCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      await api.patch(`/community/servers/${server.id}/categories/${editingCategoryId}`, {
        name: editCategoryName.trim(),
        icon: editCategoryIcon || null,
      });
      await refreshServer();
      setShowEditCategory(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao editar categoria.');
    } finally {
      setSavingCategory(false);
    }
  }

  async function deleteCategory() {
    if (!server || !editingCategoryId || !confirm('Apagar esta categoria? Esta ação não pode ser revertida.')) return;
    setSavingCategory(true);
    try {
      await api.delete(`/community/servers/${server.id}/categories/${editingCategoryId}`);
      await refreshServer();
      setShowEditCategory(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao apagar categoria.');
    } finally {
      setSavingCategory(false);
    }
  }

  // ==================== EMOJI PICKER ====================


  function selectEmoji(emoji: string) {
    if (emojiPickerFor === 'channel') setEditChannelIcon(emoji);
    else if (emojiPickerFor === 'category') setEditCategoryIcon(emoji);
    else if (emojiPickerFor === 'message' && pickerMsgId) {
      toggleReact(pickerMsgId, emoji);
      setPickerMsgId(null);
    }
    setShowEmojiPicker(false);
  }

  // ==================== LOCALSTORAGE PERSISTENCE ====================

  useEffect(() => {
    // Load collapsed categories from localStorage
    const saved = localStorage.getItem(`alpha_collapsed_cats_${serverId}`);
    if (saved) try { setCollapsedCats(JSON.parse(saved)); } catch { }
  }, [serverId]);

  useEffect(() => {
    // Persist collapsed categories to localStorage
    localStorage.setItem(`alpha_collapsed_cats_${serverId}`, JSON.stringify(collapsedCats));
  }, [collapsedCats, serverId]);

  useEffect(() => {
    // Persist current channel to localStorage
    if (channel?.id) localStorage.setItem(`alpha_last_channel_${serverId}`, channel.id);
  }, [channel?.id, serverId]);

  // ==================== TOPICS & LABELS localStorage ====================
  useEffect(() => {
    if (!serverId) return;
    const saved = localStorage.getItem(`alpha_topics_${serverId}`);
    if (saved) try { setTopics(JSON.parse(saved)); } catch {}
    const savedLabels = localStorage.getItem(`alpha_labels_${serverId}`);
    if (savedLabels) try { setLabels(JSON.parse(savedLabels)); } catch {}
  }, [serverId]);

  function deleteMsg(m: Msg) {
    if (!socket || !channel) return;
    socket.emit('message.delete', { messageId: m.id, channelId: channel.id });
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

  async function saveProfile() {
    if (!editProfileName.trim() || !user) return;
    setSavingProfile(true);
    try {
      const updates = {
        displayName: editProfileName.trim(),
        bio: editProfileBio.trim(),
      };
      await api.patch(`/users/me`, updates);
      // Atualizar o estado local de usuário
      useAuthStore.getState().updateUserProfile(updates);
      setShowEditProfile(false);
      await refreshServer();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleProfileAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;

    // Criar preview
    const reader = new FileReader();
    reader.onload = () => {
      setProfileAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(f);

    // Upload para servidor
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const { url } = await api.postForm<{ url: string }>(`/users/me/avatar`, form);

      // Atualizar o avatar no auth store
      useAuthStore.getState().updateUserProfile({ avatarUrl: url });
      setProfileAvatarPreview(null);
    } catch (err: unknown) {
      setProfileAvatarPreview(null);
      alert(err instanceof Error ? err.message : 'Erro ao fazer upload de foto.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function openEditProfile() {
    if (!user?.profile) return;
    setEditProfileName(user.profile.displayName ?? user.profile.username ?? '');
    setEditProfileBio(user.profile.bio ?? '');
    setProfileAvatarPreview(user.profile.avatarUrl ?? null);
    setShowEditProfile(true);
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
    wrap: {
      display: 'flex',
      height: 'calc(100vh - 56px)',
      background: ALPHA_BG,
      gap: 0,
    },
    serverSidebar: {
      width: 70,
      background: COLORS.BG_PRIMARY,
      borderRight: `1px solid ${COLORS.BG_TERTIARY}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      overflowY: 'auto',
      gap: 8,
      flexShrink: 0,
      transition: 'all 0.2s ease',
    },
    side: {
      width: 240,
      minWidth: 240,
      background: SIDEBAR_BG,
      borderRight: `1px solid ${COLORS.BG_TERTIARY}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      minHeight: 0,
    },
    sideTop: {
      padding: '12px 12px 10px',
      borderBottom: `1px solid ${COLORS.BG_TERTIARY}`,
      boxShadow: `0 1px 0 rgba(255,255,255,0.02)`,
      transition: 'all 0.2s ease'
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
      transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    srvName: {
      fontFamily: 'system-ui, sans-serif',
      color: COLORS.TEXT_PRIMARY,
      fontSize: 15,
      fontWeight: 700,
      margin: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      transition: 'color 0.12s ease'
    },
    chList: { 
      flex: 1, 
      overflowY: 'auto', 
      padding: '8px 0', 
      transition: 'all 0.2s ease',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    },
    chLabel: { color: COLORS.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, fontWeight: 600 },
    addBtn: {
      background: 'none',
      border: 'none',
      color: UNIGRAM_GREEN,
      fontSize: 16,
      cursor: 'pointer',
      lineHeight: 1,
      padding: 0,
      outline: 'none',
      transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    chat: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: CHAT_BG, transition: 'all 0.2s ease' },
    chHeader: {
      padding: '12px 18px',
      borderBottom: `1px solid ${COLORS.BG_TERTIARY}`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: COLORS.BG_SECONDARY,
      backdropFilter: 'blur(10px)',
      flexShrink: 0,
      transition: 'all 0.2s ease',
    },
    chHeaderSearch: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
      marginLeft: 'auto',
    },
    searchInput: {
      background: COLORS.BG_TERTIARY,
      border: `1px solid rgba(255,255,255,0.1)`,
      borderRadius: 20,
      padding: '6px 14px',
      color: COLORS.TEXT_PRIMARY,
      fontSize: 13,
      outline: 'none',
      width: 200,
      transition: 'all 0.12s ease',
    },
    msgs: { flex: 1, overflowY: 'auto', padding: '16px 20px 12px', transition: 'all 0.2s ease' },
    inputWrap: {
      padding: '12px 20px 20px',
      flexShrink: 0,
      background: `${COLORS.BG_SECONDARY}E6`,
      transition: 'all 0.2s ease'
    },
    inputRow: {
      display: 'flex',
      gap: 8,
      background: '#0c0c0cff',
      border: `1px solid ${COLORS.BG_TERTIARY}`,
      borderRadius: 28,
      padding: '8px 12px 8px 16px',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    members: {
      width: 240,
      background: SIDEBAR_BG,
      borderLeft: `1px solid ${COLORS.BG_TERTIARY}`,
      overflowY: 'auto',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.2s ease',
    },
    overlay: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.2s ease-out' },
    obg: { position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 1)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' },
    modal: {
      position: 'relative',
      zIndex: 10,
      background: '#000000',
      border: `1px solid ${COLORS.BG_TERTIARY}`,
      borderRadius: 16,
      padding: 28,
      width: '100%',
      maxWidth: 440,
      animation: 'slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 25px 50px rgba(0,0,0,0.9), 0 0 1px rgba(165,230,0,0.1)',
    },
    btnPri: {
      background: UNIGRAM_GREEN,
      color: '#000',
      border: 'none',
      borderRadius: 8,
      padding: '10px 18px',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    btnSec: {
      background: 'rgba(165,230,0,0.1)',
      color: UNIGRAM_GREEN,
      border: `1px solid rgba(165,230,0,0.3)`,
      borderRadius: 8,
      padding: '10px 18px',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    btnGhost: {
      background: 'rgba(255,255,255,0.05)',
      color: COLORS.TEXT_MUTED,
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '10px 18px',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
    },
  };

  function renderDiscordChannelRow(ch: Channel) {
    const active = channel?.id === ch.id;
    const canManageChannel = isAdmin || myMember?.communityRole?.canManageChannels;

    // Use emoji if defined, fallback to # for text channels
    const displayIcon = ch.icon || '#';

    return (
      <div
        key={ch.id}
        className="discord-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          margin: '2px 8px',
          borderRadius: 4,
          overflow: 'hidden'
        }}
      >
        <button
          type="button"
          onClick={() => setChannel(ch)}
          style={{
            flex: 1,
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
          <span style={{ fontSize: 14, opacity: 0.7, fontWeight: 300, lineHeight: 1 }}>{displayIcon}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ch.name}</span>
          {unreadByChannel[ch.id] > 0 && (
            <div style={{
              background: '#ED4245',
              color: 'white',
              borderRadius: '12px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}>
              {unreadByChannel[ch.id] > 99 ? '99+' : unreadByChannel[ch.id]}
            </div>
          )}
        </button>
        {canManageChannel && (
          <button
            type="button"
            className="discord-gear"
            onClick={() => startEditChannel(ch)}
            title="Editar canal"
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.TEXT_MUTED,
              cursor: 'pointer',
              padding: '4px 4px',
              fontSize: 12,
              transition: 'all 0.12s ease',
              flexShrink: 0,
            }}
          >
            ⚙️
          </button>
        )}
      </div>
    );
  }

  function renderCollapsibleCategory(catKey: string, headerLabel: string, channelList: Channel[], cat?: ChannelCategoryRow, icon: string = '✦') {
    if (channelList.length === 0) return null;
    const expanded = collapsedCats[catKey] !== true;
    const canManageChannel = isAdmin || myMember?.communityRole?.canManageChannels;

    return (
      <div key={catKey}>
        <div
          className="discord-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            width: 'calc(100% - 16px)',
            margin: '8px 8px 2px',
            padding: '4px 6px',
            borderRadius: 4,
          }}
        >
          <button
            type="button"
            onClick={() => toggleCategoryCollapse(catKey)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: COLORS.TEXT_MUTED,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textAlign: 'left',
              transition: 'color 0.12s ease',
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = COLORS.TEXT_SECONDARY;
              e.currentTarget.parentElement!.style.background = `${COLORS.BG_TERTIARY}50`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = COLORS.TEXT_MUTED;
              e.currentTarget.parentElement!.style.background = 'none';
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
            <span style={{ fontSize: 12, marginRight: 4 }}>{icon}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerLabel}</span>
          </button>
          {canManageChannel && cat && (
            <button
              type="button"
              className="discord-gear"
              onClick={() => startEditCategory(cat)}
              title="Editar categoria"
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.TEXT_MUTED,
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: 12,
                transition: 'all 0.12s ease',
                flexShrink: 0,
              }}
            >
              ⚙️
            </button>
          )}
        </div>
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

  const renderMenuItem = (icon: string, label: string, onClick: () => void, color = '#B5BAC1') => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        color: color,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        borderRadius: 4,
        transition: 'none'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = color === '#ED4245' ? '#DA373C' : '#5865F2';
        e.currentTarget.style.color = '#FFF';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = color;
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 16 }}>{icon}</span>
    </button>
  );

  // ==================== TOPICS HELPERS ====================

  function persistTopics(t: typeof topics) {
    if (!serverId) return;
    localStorage.setItem(`alpha_topics_${serverId}`, JSON.stringify(t));
    setTopics(t);
  }
  function persistLabels(l: typeof labels) {
    if (!serverId) return;
    localStorage.setItem(`alpha_labels_${serverId}`, JSON.stringify(l));
    setLabels(l);
  }

  function handleCreateTopic() {
    if (!newTopicTitle.trim() || creatingTopic) {
      return;
    }
    setCreatingTopic(true);
    
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `topic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const newT = {
      id,
      title: newTopicTitle.trim(),
      labelIds: newTopicLabels,
      authorName: user?.profile?.displayName ?? user?.profile?.username ?? 'Anónimo',
      createdAt: new Date().toISOString(),
      replyCount: 0,
    };

    setTopics(prev => {
      const updated = [newT, ...prev];
      if (serverId) {
        localStorage.setItem(`alpha_topics_${serverId}`, JSON.stringify(updated));
      }
      return updated;
    });

    setNewTopicTitle('');
    setNewTopicBody('');
    setNewTopicLabels([]);
    setShowCreateTopic(false);
    setCreatingTopic(false);
    setShowTopicsSection(true); 
    console.log('handleCreateTopic finished successfully');
  }

  function handleCreateLabel() {
    console.log('handleCreateLabel called');
    if (!newLabelName.trim() || creatingLabel) {
      console.log('Skipping create label: name empty or already creating');
      return;
    }
    setCreatingLabel(true);
    
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `label_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const newL: typeof labels[number] = {
      id,
      name: newLabelName.trim(),
      color: newLabelColor,
    };

    setLabels(prev => {
      const updated = [...prev, newL];
      if (serverId) {
        console.log(`Persisting labels to alpha_labels_${serverId}`);
        localStorage.setItem(`alpha_labels_${serverId}`, JSON.stringify(updated));
      }
      return updated;
    });

    setNewLabelName('');
    setNewLabelColor('#A5E600');
    setShowCreateLabel(false);
    setCreatingLabel(false);
    console.log('handleCreateLabel finished successfully');
  }

  // ==================== ENQUETES (POLLS) ====================
  async function handleCreatePoll() {
    const valid = pollOptions.filter(o => o.trim()).length;
    if (!pollQuestion.trim() || valid < 2 || !channel || !socket) return;
    setCreatingPoll(true);
    try {
      const durationMs: Record<string, number> = {
        '1h': 3600000, '4h': 14400000, '8h': 28800000, '24h': 86400000, '3d': 259200000, '1w': 604800000
      };
      const ms = durationMs[pollDuration] || 86400000;

      const pollData = {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()).map((o, index) => ({
          id: `opt_${index}_${Math.random().toString(36).slice(2, 6)}`,
          text: o.trim(),
          voters: [] as string[] // list of userIds who voted
        })),
        allowMultiple: pollAllowMultiple,
        expiresAt: new Date(Date.now() + ms).toISOString(),
      };

      socket.emit('message.send', {
        channelId: channel.id,
        content: `📊 Enquete: ${pollQuestion.trim()}`,
        messageType: 'poll',
        embedJson: pollData as any,
      });

      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollAllowMultiple(false);
      setPollDuration('24h');
    } catch (err) {
      console.error('Poll failed:', err);
    } finally {
      setCreatingPoll(false);
    }
  }

  const addPollOption = () => {
    if (pollOptions.length < 10) setPollOptions(prev => [...prev, '']);
  };

  const removePollOption = (idx: number) => {
    if (pollOptions.length > 2) setPollOptions(prev => prev.filter((_, i) => i !== idx));
  };

  async function handleVote(msgId: string) {
    if (!socket || !channel) return;
    const msg = msgs.find(m => m.id === msgId);
    if (!msg || msg.messageType !== 'poll') return;
    const selections = selectedPollOptions[msgId] || [];
    if (selections.length === 0) return;

    // Local simulation: Update the message's embedJson
    const pollData = JSON.parse(JSON.stringify(msg.embedJson)); // Deep copy
    pollData.options.forEach((opt: any) => {
      if (selections.includes(opt.id)) {
        if (!opt.voters.includes(user?.id)) opt.voters.push(user?.id);
      } else {
        opt.voters = opt.voters.filter((v: string) => v !== user?.id);
      }
    });

    socket.emit('message.edit', {
      channelId: channel.id,
      messageId: msgId,
      content: msg.content,
      embedJson: pollData,
    });

    // Clear local selection after voting
    setSelectedPollOptions(prev => {
      const u = { ...prev };
      delete u[msgId];
      return u;
    });
  }

  function handleDeleteLabel(id: string) {
    persistLabels(labels.filter(l => l.id !== id));
  }

  function handleDeleteTopic(id: string) {
    persistTopics(topics.filter(t => t.id !== id));
    if (viewingTopic?.id === id) setViewingTopic(null);
  }

  return (
    <div style={C.wrap}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .discord-row .discord-gear { opacity: 0; pointer-events: none; }
        .discord-row:hover .discord-gear { opacity: 0.5; pointer-events: auto; }
        .discord-row .discord-gear:hover { opacity: 1; color: #A5E600 !important; }
        button:focus { outline: none; }
        button:focus-visible { outline: 2px solid #A5E600; outline-offset: 2px; }
      `}</style>

      {/* SERVER SIDEBAR */}
      <div style={C.serverSidebar}>
        <button
          onClick={() => router.push('/main/community')}
          title="Todos os servidores"
          style={{
            width: 50,
            height: 50,
            borderRadius: 18,
            color: '#A5E600',
            background: 'rgba(165,230,0,0.15)',
            border: `2px solid rgba(165,230,0,0.3)`,
            cursor: 'pointer',
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(165,230,0,0.25)';
            e.currentTarget.style.borderColor = `rgba(165,230,0,0.5)`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(165,230,0,0.15)';
            e.currentTarget.style.borderColor = `rgba(165,230,0,0.3)`;
          }}
        >
          ✦
        </button>
        <div style={{ width: '80%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        {myServers.map(s => (
          <button
            key={s.id}
            onClick={() => router.push(`/main/community/${s.id}`)}
            title={s.name}
            style={{
              width: 50,
              height: 50,
              borderRadius: s.id === serverId ? 18 : '50%',
              background: s.id === serverId ? UNIGRAM_GREEN : 'rgba(165,230,0,0.08)',
              border: s.id === serverId ? 'none' : `2px solid rgba(165,230,0,0.2)`,
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: s.id === serverId ? '#0A0E27' : UNIGRAM_GREEN,
              fontWeight: 700,
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={e => {
              if (s.id !== serverId) {
                e.currentTarget.style.background = 'rgba(165,230,0,0.2)';
                e.currentTarget.style.borderColor = `rgba(165,230,0,0.4)`;
              }
            }}
            onMouseLeave={e => {
              if (s.id !== serverId) {
                e.currentTarget.style.background = 'rgba(165,230,0,0.08)';
                e.currentTarget.style.borderColor = `rgba(165,230,0,0.2)`;
              }
            }}
          >
            {s.name[0].toUpperCase()}
          </button>
        ))}
      </div>

      <div style={C.side}>
        <div style={C.sideTop}>
          <button onClick={() => router.push('/main/community')} style={C.backBtn}>
            ← Voltar
          </button>
          
          <div style={{ position: 'relative', width: '100%', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setShowServerMenu(!showServerMenu)}
              title="Opções do servidor"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '12px 16px',
                background: showServerMenu ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
                textAlign: 'left',
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={e => {
                if (!showServerMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={e => {
                if (!showServerMenu) e.currentTarget.style.background = 'transparent';
              }}
            >
              <h1 style={{ flex: 1, color: '#FFF', fontSize: 16, fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: "'Arial', sans-serif" }}>
                {server.name}
              </h1>
              <span style={{ color: '#FFF', fontSize: 12, opacity: 0.8 }} aria-hidden>
                {showServerMenu ? '✕' : '▼'}
              </span>
            </button>

            {showServerMenu && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                  onClick={() => setShowServerMenu(false)} 
                />
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: 'calc(100% - 20px)',
                  margin: '0 10px',
                  background: '#111214',
                  borderRadius: 4,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                  padding: '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  {renderMenuItem("💎", "Impulso de servidor", () => setShowServerMenu(false))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  {renderMenuItem("🔗", "Convidar pessoas", () => { setShowServerMenu(false); setShowInv(true); }, "#5865F2")}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  {canEditServer && renderMenuItem("⚙️", "Config. do servidor", () => { setShowServerMenu(false); openEditSrv(); })}
                  {(isAdmin || myMember?.communityRole?.canManageChannels) && (
                    <>
                      {renderMenuItem("➕", "Criar canal", () => { setShowServerMenu(false); setShowCh(true); })}
                      {renderMenuItem("📁", "Criar categoria", () => { setShowServerMenu(false); setShowCat(true); })}
                      {renderMenuItem("📅", "Criar evento", () => { setShowServerMenu(false); setShowEvents(true); })}
                    </>
                  )}
                  {isMod && renderMenuItem("📋", "Auditoria", () => { setShowServerMenu(false); openAudit(); })}
                </div>
              </>
            )}
          </div>
        </div>
          <div style={{ padding: '0 8px 8px' }}>
            <button
              onClick={() => setShowEvents(true)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = DISCORD_CHANNEL_HOVER;
                e.currentTarget.style.color = '#FFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = DISCORD_TEXT_BRIGHT;
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', borderRadius: 4, border: 'none', background: 'transparent',
                color: DISCORD_TEXT_BRIGHT, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.1s', marginBottom: 2
              }}
            >
              <span style={{ fontSize: 16, opacity: 0.8 }}>📅</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Eventos</span>
            </button>
            <button
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = DISCORD_CHANNEL_HOVER;
                e.currentTarget.style.color = '#FFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = DISCORD_TEXT_BRIGHT;
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', borderRadius: 4, border: 'none', background: 'transparent',
                color: DISCORD_TEXT_BRIGHT, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.1s'
              }}
            >
              <span style={{ fontSize: 16, opacity: 0.8 }}>💎</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Impulsos de servidor</span>
            </button>
          </div>
        <div style={C.chList}>
          {/* ── CANAIS ── */}
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
              <button
                type="button"
                title="Criar canal"
                onClick={() => setShowCh(true)}
                style={{ ...C.addBtn, fontSize: 18, outline: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.color = '#C8FF00'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = UNIGRAM_GREEN; }}
              >
                +
              </button>
            )}
          </div>
          {renderCollapsibleCategory('__uncat__', 'Canais de texto', channelsByCategory.uncategorized, undefined, '✦')}
          {(server.channelCategories ?? []).map(cat =>
            renderCollapsibleCategory(cat.id, cat.name, channelsByCategory.byCat.get(cat.id) ?? [], cat, cat.icon ?? '✦'),
          )}

          {/* ── TÓPICOS ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 10px 6px',
              gap: 6,
              borderTop: '1px solid rgba(255,255,255,0.05)',
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setShowTopicsSection(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, flex: 1,
                background: 'none', border: 'none', cursor: 'pointer',
                color: DISCORD_TEXT_MUTED, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left',
                padding: 0, outline: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = DISCORD_TEXT_MUTED}
            >
              <span style={{ display: 'inline-flex', width: 12, justifyContent: 'center', fontSize: 9, transform: showTopicsSection ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s' }}>›</span>
              <span style={{ fontSize: 10, marginRight: 3 }}>📝</span>
              Tópicos
            </button>
            <button
              type="button"
              title="Criar tópico"
              onClick={() => {
                console.log('[DEBUG] Topic [+] button in sidebar clicked');
                setShowCreateTopic(true);
              }}
              style={{ ...C.addBtn, fontSize: 18, outline: 'none', position: 'relative', zIndex: 20 }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.color = '#C8FF00'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = UNIGRAM_GREEN; }}
            >
              +
            </button>
          </div>
          {showTopicsSection && (
            <div style={{ paddingBottom: 4, margin: '0 8px', borderRadius: 4 }}>
              {topics.length === 0 ? (
                <p style={{ color: '#4A5568', fontSize: 12, padding: '4px 14px', fontStyle: 'italic' }}>Sem tópicos ainda.</p>
              ) : (
                topics.map(t => {
                  const tLabels = labels.filter(l => t.labelIds.includes(l.id));
                  return (
                    <div
                      key={t.id}
                      className="discord-row"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 8px', borderRadius: 4, overflow: 'hidden' }}
                    >
                      <button
                        type="button"
                        onClick={() => setViewingTopic(t)}
                        style={{
                          flex: 1, textAlign: 'left', background: viewingTopic?.id === t.id ? `${UNIGRAM_GREEN}18` : 'transparent',
                          border: 'none', outline: 'none', borderRadius: 4,
                          color: viewingTopic?.id === t.id ? UNIGRAM_GREEN : DISCORD_TEXT_MUTED,
                          padding: '5px 8px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.12s ease',
                        }}
                        onMouseEnter={e => { if (viewingTopic?.id !== t.id) { e.currentTarget.style.background = `${COLORS.BG_TERTIARY}80`; e.currentTarget.style.color = '#fff'; } }}
                        onMouseLeave={e => { if (viewingTopic?.id !== t.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DISCORD_TEXT_MUTED; } }}
                      >
                        <span style={{ fontSize: 11, opacity: 0.6 }}>📝</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</span>
                        {tLabels.length > 0 && (
                          <span
                            style={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              background: tLabels[0].color,
                              boxShadow: `0 0 4px ${tLabels[0].color}88`,
                            }}
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        className="discord-gear"
                        onClick={() => handleDeleteTopic(t.id)}
                        title="Apagar tópico"
                        style={{ background: 'none', border: 'none', outline: 'none', color: '#ED4245', cursor: 'pointer', padding: '4px 4px', fontSize: 11, transition: 'all 0.12s ease', flexShrink: 0 }}
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── ETIQUETAS ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 10px 6px',
              gap: 6,
              borderTop: '1px solid rgba(255,255,255,0.05)',
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setShowManageLabels(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, flex: 1,
                background: 'none', border: 'none', cursor: 'pointer',
                color: DISCORD_TEXT_MUTED, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left',
                padding: 0, outline: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = DISCORD_TEXT_MUTED}
            >
              <span style={{ fontSize: 10, marginRight: 3 }}>🏷️</span>
              Etiquetas
            </button>
            <button
              type="button"
              title="Criar etiqueta"
              onClick={() => {
                console.log('[DEBUG-CLICK] LABEL [+] CLICKED');
                setShowCreateLabel(true);
              }}
              style={{ 
                ...C.addBtn, 
                fontSize: 18, 
                outline: 'none', 
                position: 'relative', 
                zIndex: 50, 
                pointerEvents: 'auto',
                padding: '0 4px',
                minWidth: 24
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.color = '#C8FF00'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = UNIGRAM_GREEN; }}
            >
              +
            </button>
          </div>
          {labels.length > 0 && (
            <div style={{ padding: '0 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {labels.map(l => (
                <span
                  key={l.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: `${l.color}20`, border: `1px solid ${l.color}55`,
                    color: l.color, borderRadius: 12, padding: '2px 8px',
                    fontSize: 11, fontWeight: 600, cursor: 'default',
                  }}
                >
                  {l.name}
                </span>
              ))}
            </div>
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
          <div style={{
            padding: '16px 24px',
            borderBottom: `1px solid rgba(255,255,255,0.06)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#000000',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(165,230,0,0.1)',
          }}>
            {/* LABEL + NOME */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ color: UNIGRAM_GREEN, fontSize: 20, fontWeight: 700, opacity: 0.9 }}>#</span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{
                  color: '#F2F5F8',
                  fontWeight: 700,
                  fontSize: 16,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {channel.name}
                </h2>
                <p style={{
                  color: '#949BA4',
                  fontSize: 12,
                  margin: '2px 0 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 400,
                }}>
                  Canal de texto — Sem mande NSFW aqui
                </p>
              </div>
            </div>

            {/* ÍCONES DE AÇÃO */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}>
              {/* Buscar */}
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                title="Procurar mensagens"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  
                  color: '#949BA4',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = UNIGRAM_GREEN;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#949BA4';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                🔍
              </button>

              {/* Notificações */}
              <button
                type="button"
                onClick={handleNotificationClick}
                title="Notificações do canal"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  
                  color: '#949BA4',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = UNIGRAM_GREEN;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#949BA4';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                🔔
              </button>

              {/* Pins */}
              {isMod && (
                <button
                  type="button"
                  onClick={openPins}
                  title="Mensagens fixadas"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    
                    color: '#949BA4',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.color = UNIGRAM_GREEN;
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#949BA4';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  📌
                </button>
              )}

              {/* Membros */}
              <button
                type="button"
                onClick={() => document.getElementById('members-panel')?.scrollIntoView({ behavior: 'smooth' })}
                title="Visualizar membros"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  
                  color: '#949BA4',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = UNIGRAM_GREEN;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#949BA4';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                👥
              </button>

              {/* Separador */}
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

              {/* Settings */}
              <button
                type="button"
                onClick={() => startEditChannel(channel)}
                title="Configurações do canal"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  
                  color: '#949BA4',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = UNIGRAM_GREEN;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#949BA4';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ⚙️
              </button>

              {/* Menu de opções */}
              <button
                type="button"
                onClick={() => setShowChannelMenu(!showChannelMenu)}
                title="Mais opções"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  
                  color: '#949BA4',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = UNIGRAM_GREEN;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#949BA4';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ⋯
              </button>
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
                width: 'fit-content',
                maxWidth: 'min(78%, 520px)',
                borderRadius: isOwn ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                padding: '6px 10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                border: 'none',
                background: isOwn ? TG_BUBBLE_OUT : TG_BUBBLE_IN,
                position: 'relative',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              };

              const rx = getAggregated(msg.id);
              const showMenu = msgMenuOpen === msg.id;

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
                  <div style={{ position: 'relative' }}>
                    <div style={{ paddingRight: 40 }}>
                      <MessageBody 
                        msg={msg} 
                        mt={mt} 
                        user={user}
                        selectedPollOptions={selectedPollOptions}
                        setSelectedPollOptions={setSelectedPollOptions}
                        handleVote={handleVote}
                      />
                      {msg.editedAt && (
                        <span style={{ fontSize: 9, color: COLORS.TEXT_MUTED, marginTop: 4, display: 'block', opacity: 0.6 }}>
                          (editado {new Date(msg.editedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                      {msg.pinned && (
                        <span style={{ fontSize: 10, color: UNIGRAM_GREEN, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          📌 <em style={{ fontStyle: 'normal', fontSize: 9 }}>fixada</em>
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        right: 0,
                        color: COLORS.TEXT_MUTED,
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                        opacity: 0.7,
                        fontFamily: 'monospace',
                        letterSpacing: '0.02em',
                      }}
                      title={new Date(msg.createdAt).toLocaleString('pt-PT')}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <ReactionsBar 
                    reactions={rx.map(r => ({ emoji: r.emoji, count: r.count, reacted: r.me }))}
                    onReact={(emoji) => toggleReact(msg.id, emoji)}
                    onEmojiPickerOpen={() => {
                      setPickerMsgId(msg.id);
                      setEmojiPickerFor('message');
                      setShowEmojiPicker(true);
                    }}
                  />
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
                  ) : msg.authorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.authorAvatarUrl}
                      alt={msg.authorName}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `2px solid ${displayNameColor}55`,
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!isBot && !msg.authorAvatarUrl && (
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
                  <div
                    style={{
                      maxWidth: 'calc(100% - 48px)',
                      position: 'relative',
                    }}
                    onMouseEnter={() => {
                      // Limpar timeout se existir
                      if (hoverTimeoutRef.current[msg.id]) {
                        clearTimeout(hoverTimeoutRef.current[msg.id]);
                        delete hoverTimeoutRef.current[msg.id];
                      }
                      setMsgHovered(msg.id);
                    }}
                    onMouseLeave={() => {
                      if (msgMenuOpen !== msg.id) {
                        // Manter hover por 2 segundos após sair do mouse
                        hoverTimeoutRef.current[msg.id] = setTimeout(() => {
                          setMsgHovered(null);
                          delete hoverTimeoutRef.current[msg.id];
                        }, 2000);
                      }
                    }}
                  >
                    <div
                      style={{ ...bubbleBase }}
                      role="button"
                      tabIndex={0}
                    >
                      {bubbleInner}
                    </div>
                    {/* Botão de três pontos ao fazer hover - lado direito ou esquerdo */}
                    {(msgHovered === msg.id || msgMenuOpen === msg.id) && (
                      <button
                        type="button"
                        onClick={() => setMsgMenuOpen(msgMenuOpen === msg.id ? null : msg.id)}
                        title="Opções"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: isOwn ? -40 : 'auto',
                          left: !isOwn ? -40 : 'auto',
                          transform: 'translateY(-50%)',
                          background: 'rgba(0,0,0,0.7)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: 18,
                          padding: '6px 8px',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          zIndex: 100,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.9)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }}
                      >
                        ⋯
                      </button>
                    )}
                    {/* Menu dropdown ao clicar nos três pontos */}
                    {showMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 32,
                          right: isOwn ? -20 : 'auto',
                          left: !isOwn ? -20 : 'auto',
                          background: 'linear-gradient(160deg, rgba(15,18,25,0.95) 0%, rgba(26,32,56,0.92) 100%)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          minWidth: '240px',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
                          zIndex: 101,
                          overflow: 'hidden',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Reações rápidas - 2 linhas com mais emojis como na imagem */}
                        <div style={{ padding: '5px 9px', borderBottom: 'none', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                          {['❤️', '👍', '😂', '👏'].map(em => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                toggleReact(msg.id, em);
                                setMsgMenuOpen(null);
                              }}
                              title={em}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                
                                borderRadius: '6px',
                                padding: '8px',
                                fontSize: 18,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.transform = 'scale(1.15)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              {em}
                            </button>
                          ))}
                        </div>

                        {/* Ações - Responder sempre, Forward, Report, etc */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyTo(msg);
                              setMsgMenuOpen(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dbdee1',
                              padding: '12px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <span style={{ fontSize: 10 }}>↩️</span>
                            <span>Reply</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              // TODO: Implementar Forward
                              setMsgMenuOpen(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dbdee1',
                              padding: '12px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <span style={{ fontSize: 10 }}>🔄</span>
                            <span>Forward</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              // TODO: Implementar Report
                              setMsgMenuOpen(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dbdee1',
                              padding: '12px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <span style={{ fontSize: 10 }}>ⓘ</span>
                            <span>Report</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMsgId(selectedMsgId === msg.id ? null : msg.id);
                              setMsgMenuOpen(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dbdee1',
                              padding: '12px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <span style={{ fontSize: 10 }}>✓</span>
                            <span>Select</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setMsgMenuOpen(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dbdee1',
                              padding: '12px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <span style={{ fontSize: 10 }}>📋</span>
                            <span>Copy</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}${window.location.pathname}?msgId=${msg.id}`;
                              navigator.clipboard.writeText(url);
                              setMsgMenuOpen(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dbdee1',
                              padding: '12px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <span style={{ fontSize: 10 }}>🔗</span>
                            <span>Copy Link</span>
                          </button>

                          {(isOwn && !isBot) && (
                            <>
                              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing({ id: msg.id, text: msg.content });
                                  setMsgMenuOpen(null);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dbdee1',
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  fontSize: 14,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'none';
                                }}
                              >
                                <span style={{ fontSize: 16 }}>✏️</span>
                                <span>Edit</span>
                              </button>
                            </>
                          )}

                          {isMod && (
                            <button
                              type="button"
                              onClick={() => {
                                pinMsg(msg);
                                setMsgMenuOpen(null);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dbdee1',
                                padding: '12px 16px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                fontSize: 14,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(79,84,92,0.6)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'none';
                              }}
                            >
                              <span style={{ fontSize: 16 }}>📌</span>
                              <span>Pin</span>
                            </button>
                          )}

                          {canDel && (
                            <>
                              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                              <button
                                type="button"
                                onClick={() => {
                                  deleteMsg(msg);
                                  setMsgMenuOpen(null);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ed4245',
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  fontSize: 14,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(237,66,69,0.2)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'none';
                                }}
                              >
                                <span style={{ fontSize: 16 }}>🗑️</span>
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {typingNames.length > 0 && (
            <p style={{ color: '#6B7785', fontSize: 12, fontStyle: 'italic', padding: '8px 0' }}>{typingNames.join(', ')} a escrever {typingDots}</p>
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
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                title="Ações"
                disabled={uploading || !server}
                onClick={() => setShowInputMenu(!showInputMenu)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  transition: 'all 0.15s',
                  background: showInputMenu ? '#5865F2' : 'transparent',
                  color: showInputMenu ? '#FFF' : COLORS.TEXT_MUTED,
                  opacity: uploading ? 0.4 : 1,
                  margin: '4px 0 4px 4px',
                }}
                onMouseEnter={e => {
                  if (!showInputMenu) {
                    e.currentTarget.style.color = '#DBDEE1';
                  }
                }}
                onMouseLeave={e => {
                  if (!showInputMenu) {
                    e.currentTarget.style.color = COLORS.TEXT_MUTED;
                  }
                }}
              >
                <div style={{ transform: showInputMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }}>
                  +
                </div>
              </button>

              {showInputMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    onClick={() => setShowInputMenu(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 12px)',
                      left: 0,
                      background: '#111214',
                      borderRadius: 8,
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      padding: '8px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      width: 220,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowInputMenu(false);
                        fileRef.current?.click();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: '#DBDEE1',
                        padding: '10px 12px',
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#5865F2'; e.currentTarget.style.color = '#FFF'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#DBDEE1'; }}
                    >
                      <span style={{ fontSize: 18 }}>📄</span> Enviar um arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInputMenu(false);
                        setShowCreateTopic(true);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: '#DBDEE1',
                        padding: '10px 12px',
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#5865F2'; e.currentTarget.style.color = '#FFF'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#DBDEE1'; }}
                    >
                      <span style={{ fontSize: 18 }}>🧵</span> Criar tópico
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInputMenu(false);
                        setShowPollModal(true);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: '#DBDEE1',
                        padding: '10px 12px',
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#5865F2'; e.currentTarget.style.color = '#FFF'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#DBDEE1'; }}
                    >
                      <span style={{ fontSize: 18 }}>📊</span> Criar enquete
                    </button>
                  </div>
                </>
              )}
            </div>
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
              placeholder={channel ? `Mensagem em #${channel.name}...` : 'Selecione um canal'}
              disabled={!connected || !channel}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#F2F5F8',
                fontSize: 14,
                outline: 'none',
                padding: '8px 4px',
              }}
            />
            <button
              type="button"
              title="Emoji"
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.TEXT_MUTED,
                fontSize: 16,
                padding: '6px 8px',
                cursor: 'pointer',
                opacity: 0.6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = UNIGRAM_GREEN;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.color = COLORS.TEXT_MUTED;
              }}
            >
              😊
            </button>
            <button
              type="button"
              title="Voz (em breve)"
              disabled
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.TEXT_MUTED,
                fontSize: 16,
                padding: '6px 8px',
                cursor: 'not-allowed',
                opacity: 0.4,
              }}
            >
              🎤
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!connected || !text.trim() || !channel}
              style={{
                background: !connected || !text.trim() ? 'rgba(165,230,0,0.3)' : UNIGRAM_GREEN,
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                color: '#0B121A',
                fontSize: 18,
                cursor: !connected || !text.trim() ? 'not-allowed' : 'pointer',
                opacity: !connected || !text.trim() ? 0.35 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!(!connected || !text.trim())) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(165,230,0,0.4)`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={text.trim() ? 'Enviar' : 'Digite algo'}
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
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: section.accent ?? DISCORD_TEXT_MUTED }} />
              {section.title}
            </div>
            {section.members.map(m => {
              const accent = section.accent ?? memberAccentColor(m, server);
              const typing = typingIds[m.userId];
              const isMuted = m.mutedUntil && new Date(m.mutedUntil) > new Date();
              const showAvatar = m.profile?.avatarUrl;

              return (
                <div key={m.userId} style={{ padding: '6px 10px 8px 14px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 4, transition: 'all 0.12s ease', background: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.background = `${COLORS.BG_TERTIARY}50`; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>

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
              );
            })}
          </div>
        ))}
      </div>

      {showEvents && renderEventsModal()}

      {viewingEvent && renderEventDetailModal()}

      {menuMember && (
        <div style={C.overlay}>
          <div onClick={() => setMemberMenuUserId(null)} style={C.obg} />
          <div style={C.modal}>
            {(() => {
              if (!menuMember || !server) return null;
              const accent = memberAccentColor(menuMember, server);
              const av = menuMember.profile?.avatarUrl;
              const isOwn = menuMember.userId === user?.id;
              const isOwner = menuMember.userId === server.ownerId;
              return (
                <>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
                    <div style={{ width: 80, height: 80, flexShrink: 0, position: 'relative' }}>
                      {av ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={av}
                            alt=""
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: `3px solid ${accent}55`,
                            }}
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: `${accent}28`,
                            border: `3px solid ${accent}66`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 32,
                            fontWeight: 700,
                            color: accent,
                          }}
                        >
                          {mname(menuMember)[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ margin: 0, color: '#F2F5F8', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{mname(menuMember)}</h2>
                      <p style={{ color: DISCORD_TEXT_MUTED, fontSize: 13, margin: '4px 0 0', wordBreak: 'break-all' }}>
                        @{menuMember.profile?.username ?? menuMember.userId.slice(0, 8)}
                      </p>
                      {menuMember.profile?.bio && (
                        <p style={{ color: COLORS.TEXT_SECONDARY, fontSize: 12, margin: '8px 0 0', lineHeight: 1.4, maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {menuMember.profile.bio}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 11, flexWrap: 'wrap' }}>
                        {isOwner && (
                          <span style={{ background: 'rgba(240,177,50,0.2)', color: '#F0B132', padding: '2px 8px', borderRadius: 6 }}>Dono</span>
                        )}
                        {menuMember.communityRole && (
                          <span style={{ background: `rgba(${parseInt(menuMember.communityRole.color?.slice(1, 3) ?? 'FF', 16)}, ${parseInt(menuMember.communityRole.color?.slice(3, 5) ?? 'FF', 16)}, ${parseInt(menuMember.communityRole.color?.slice(5, 7) ?? 'FF', 16)}, 0.15)`, color: menuMember.communityRole.color ?? COLORS.TEXT_SECONDARY, padding: '2px 8px', borderRadius: 6 }}>
                            {menuMember.communityRole.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {menuMember.mutedUntil && new Date(menuMember.mutedUntil) > new Date() && (
                    <p style={{ fontSize: 12, color: '#ED4245', marginBottom: 14 }}>🔇 Silenciado neste servidor</p>
                  )}
                  {isOwn && (
                    <button type="button" onClick={() => { setMemberMenuUserId(null); openEditProfile(); }} style={{ ...C.btnPri, width: '100%', marginBottom: 14 }}>
                      Editar perfil
                    </button>
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

      {showEditProfile && (
        <div style={C.overlay}>
          <div onClick={() => setShowEditProfile(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Editar perfil</h2>

            {/* Avatar Upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 8 }}>Foto de perfil</label>
              <input
                ref={profileAvatarInput}
                type="file"
                accept="image/*"
                onChange={handleProfileAvatarChange}
                disabled={uploadingAvatar}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={profileAvatarPreview || '/default-avatar.png'}
                    alt="Avatar preview"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(255,255,255,0.1)',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"%3E%3Ccircle cx="40" cy="40" r="40" fill="%231E1F22"/%3E%3Ccircle cx="40" cy="25" r="12" fill="%236B7785"/%3E%3Cpath d="M 25 50 Q 40 40 55 50 Q 55 60 40 60 Q 25 60 25 50" fill="%236B7785"/%3E%3C/svg%3E';
                    }}
                  />
                  {uploadingAvatar && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F2F5F8',
                      fontSize: 20,
                    }}>
                      …
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => profileAvatarInput.current?.click()}
                  disabled={uploadingAvatar}
                  style={{
                    ...C.btnSec,
                    marginTop: 4,
                    opacity: uploadingAvatar ? 0.5 : 1,
                  }}
                >
                  {uploadingAvatar ? 'Enviando…' : 'Mudar foto'}
                </button>
              </div>
            </div>

            <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 6 }}>Nome de utilizador</label>
            <input
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              value={editProfileName}
              onChange={e => setEditProfileName(e.target.value)}
              maxLength={32}
              placeholder="Seu nome"
            />
            <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 6 }}>Bio/Descrição</label>
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 72, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 13, resize: 'vertical', marginBottom: 12 }}
              value={editProfileBio}
              onChange={e => setEditProfileBio(e.target.value)}
              maxLength={256}
              placeholder="Conte-nos sobre você..."
            />
            <p style={{ fontSize: 11, color: '#7A8B9C', marginTop: -8, marginBottom: 16 }}>{editProfileBio.length} / 256 caracteres</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowEditProfile(false)} style={C.btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={saveProfile} disabled={savingProfile || uploadingAvatar || !editProfileName.trim()} style={{ ...C.btnPri, opacity: (!editProfileName.trim() || savingProfile || uploadingAvatar) ? 0.5 : 1 }}>
                {savingProfile ? '…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditChannel && (
        <div style={C.overlay}>
          <div onClick={() => setShowEditChannel(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Editar canal</h2>

            <label style={{ color: '#6B7785', fontSize: 11 }}>Nome</label>
            <input
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              value={editChannelName}
              onChange={e => setEditChannelName(e.target.value)}
              maxLength={50}
            />

            <label style={{ color: '#6B7785', fontSize: 11 }}>Ícone</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(true);
                  setEmojiPickerFor('channel');
                }}
                style={{
                  background: COLORS.BG_TERTIARY,
                  border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#E8EDF2',
                  fontSize: 20,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `rgba(165,230,0,0.4)`;
                  e.currentTarget.style.background = `${COLORS.BG_TERTIARY}80`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `rgba(255,255,255,0.1)`;
                  e.currentTarget.style.background = COLORS.BG_TERTIARY;
                }}
              >
                {editChannelIcon || '💬'}
              </button>
              <input
                type="text"
                placeholder="ou cole um emoji"
                value={editChannelIcon}
                onChange={e => setEditChannelIcon(e.target.value.slice(0, 2))}
                style={{ flex: 1, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowEditChannel(false)} style={C.btnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteChannel}
                style={{
                  ...C.btnGhost,
                  color: '#E85454',
                  borderColor: 'rgba(232,84,84,0.3)',
                  marginRight: 'auto',
                }}
              >
                🗑️ Apagar
              </button>
              <button type="button" onClick={saveEditChannel} disabled={savingChannel || !editChannelName.trim()} style={{ ...C.btnPri, opacity: !editChannelName.trim() ? 0.5 : 1 }}>
                {savingChannel ? '…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditCategory && (
        <div style={C.overlay}>
          <div onClick={() => setShowEditCategory(false)} style={C.obg} />
          <div style={C.modal}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>Editar categoria</h2>

            <label style={{ color: '#6B7785', fontSize: 11 }}>Nome</label>
            <input
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              value={editCategoryName}
              onChange={e => setEditCategoryName(e.target.value)}
              maxLength={50}
            />

            <label style={{ color: '#6B7785', fontSize: 11 }}>Ícone</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(true);
                  setEmojiPickerFor('category');
                }}
                style={{
                  background: COLORS.BG_TERTIARY,
                  border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#E8EDF2',
                  fontSize: 20,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `rgba(165,230,0,0.4)`;
                  e.currentTarget.style.background = `${COLORS.BG_TERTIARY}80`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `rgba(255,255,255,0.1)`;
                  e.currentTarget.style.background = COLORS.BG_TERTIARY;
                }}
              >
                {editCategoryIcon || '✦'}
              </button>
              <input
                type="text"
                placeholder="ou cole um emoji"
                value={editCategoryIcon}
                onChange={e => setEditCategoryIcon(e.target.value.slice(0, 2))}
                style={{ flex: 1, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowEditCategory(false)} style={C.btnGhost}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteCategory}
                style={{
                  ...C.btnGhost,
                  color: '#E85454',
                  borderColor: 'rgba(232,84,84,0.3)',
                  marginRight: 'auto',
                }}
              >
                🗑️ Apagar
              </button>
              <button type="button" onClick={saveEditCategory} disabled={savingCategory || !editCategoryName.trim()} style={{ ...C.btnPri, opacity: !editCategoryName.trim() ? 0.5 : 1 }}>
                {savingCategory ? '…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmojiPicker && (
        <div style={C.overlay}>
          <div onClick={() => setShowEmojiPicker(false)} style={C.obg} />
          <div style={{ ...C.modal, padding: 0, width: 'auto', maxWidth: 'none', background: 'transparent', border: 'none' }}>
            <EmojiPicker 
              onSelect={selectEmoji} 
              onClose={() => setShowEmojiPicker(false)} 
            />
          </div>
        </div>
      )}

      {/* MODAL DE BUSCA */}
      {showSearchModal && (
        <div style={C.overlay}>
          <div onClick={() => setShowSearchModal(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 560 }}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 16px' }}>🔍 Procurar Mensagens</h2>
            <input
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16, background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14 }}
              placeholder="Digite para buscar..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              autoFocus
            />
            <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 16 }}>
              {searchResults.length === 0 ? (
                <p style={{ color: '#6B7785', fontSize: 13, textAlign: 'center', padding: 32 }}>
                  {searchQuery.trim() ? 'Nenhuma mensagem encontrada' : 'Digite para buscar...'}
                </p>
              ) : (
                searchResults.map(msg => (
                  <div key={msg.id} style={{ padding: 12, marginBottom: 8, background: '#0B121A', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: UNIGRAM_GREEN, fontSize: 12, fontWeight: 600 }}>{msg.authorName}</span>
                    <p style={{ color: '#C5D0DC', fontSize: 13, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{msg.content.substring(0, 100)}...</p>
                    <span style={{ fontSize: 10, color: '#6B7785' }}>{new Date(msg.createdAt).toLocaleString('pt-PT')}</span>
                  </div>
                ))
              )}
            </div>
            <button type="button" onClick={() => setShowSearchModal(false)} style={{ ...C.btnGhost, width: '100%' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MENU DE NOTIFICAÇÕES */}
      {showNotificationMenu && (
        <div style={{
          position: 'fixed',
          top: 70,
          right: 120,
          background: COLORS.BG_SECONDARY,
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 12,
          width: 240,
          zIndex: 40,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ padding: 12 }}>
            <p style={{ fontSize: 11, color: DISCORD_TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px', paddingLeft: 8 }}>Notificações</p>

            <button
              type="button"
              onClick={() => {
                setChannelMuted(!channelMuted);
                setShowNotificationMenu(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                background: channelMuted ? 'rgba(165,230,0,0.1)' : 'transparent',
                border: 'none',
                color: channelMuted ? UNIGRAM_GREEN : '#E8EDF2',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 6,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = channelMuted ? 'rgba(165,230,0,0.1)' : 'transparent';
              }}
            >
              {channelMuted ? '✓ Silenciado' : '🔇 Silenciar'}
            </button>

            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: '#E8EDF2',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              🔔 Tudo
            </button>

            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: '#E8EDF2',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              👤 Menciona-me
            </button>
          </div>
        </div>
      )}

      {/* MENU DE OPÇÕES DO CANAL */}
      {showChannelMenu && (
        <div style={{
          position: 'fixed',
          top: 70,
          right: 12,
          background: COLORS.BG_SECONDARY,
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 12,
          width: 220,
          zIndex: 40,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ padding: 12 }}>
            <button
              type="button"
              onClick={() => {
                setShowChannelMenu(false);
                startEditChannel(channel!);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: '#E8EDF2',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 6,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ⚙️ Editar
            </button>

            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: '#E8EDF2',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 6,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ⭐ Favoritar
            </button>

            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: '#ED4245',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(237,66,69,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ✕ Deixar Servidor
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════ MODAL: CRIAR TÓPICO ══════════════════════════ */}
      {showCreateTopic && (
        <div style={C.overlay}>
          <div onClick={() => setShowCreateTopic(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              📝 Novo Tópico
            </h2>
            <p style={{ color: '#6B7785', fontSize: 12, margin: '0 0 18px' }}>Cria um tópico de discussão visível na sidebar.</p>

            <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 6 }}>Título *</label>
            <input
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 14,
                background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14, outline: 'none',
              }}
              placeholder="Escreve o título do tópico..."
              value={newTopicTitle}
              onChange={e => setNewTopicTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newTopicTitle.trim() && handleCreateTopic()}
              maxLength={80}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(165,230,0,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            />

            <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 6 }}>Descrição (opcional)</label>
            <textarea
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: 80, marginBottom: 14,
                background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 13,
                resize: 'vertical', outline: 'none',
              }}
              placeholder="Descrição ou contexto do tópico..."
              value={newTopicBody}
              onChange={e => setNewTopicBody(e.target.value)}
              maxLength={500}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(165,230,0,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            />

            {labels.length > 0 && (
              <>
                <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 8 }}>Etiquetas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {labels.map(l => {
                    const sel = newTopicLabels.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setNewTopicLabels(prev => sel ? prev.filter(x => x !== l.id) : [...prev, l.id])}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: sel ? `${l.color}30` : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${sel ? l.color : 'rgba(255,255,255,0.12)'}`,
                          color: sel ? l.color : '#9CA8B8',
                          borderRadius: 12, padding: '3px 10px',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        {sel && <span style={{ fontSize: 9 }}>✓</span>}
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {labels.length === 0 && (
              <p style={{ color: '#4A5568', fontSize: 12, marginBottom: 14, fontStyle: 'italic' }}>
                Sem etiquetas — cria uma primeiro para associar ao tópico.
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreateTopic(false)} style={{ ...C.btnGhost, outline: 'none' }}>Cancelar</button>
              <button
                type="button"
                onClick={handleCreateTopic}
                disabled={!newTopicTitle.trim() || creatingTopic}
                style={{ ...C.btnPri, outline: 'none', opacity: !newTopicTitle.trim() ? 0.5 : 1 }}
              >
                {creatingTopic ? '…' : 'Criar Tópico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ MODAL: VER TÓPICO ══════════════════════════ */}
      {viewingTopic && (
        <div style={C.overlay}>
          <div onClick={() => setViewingTopic(null)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  📝 {viewingTopic.title}
                </h2>
                <p style={{ color: '#6B7785', fontSize: 12, margin: 0 }}>
                  Por <strong style={{ color: UNIGRAM_GREEN }}>{viewingTopic.authorName}</strong> · {new Date(viewingTopic.createdAt).toLocaleDateString('pt-PT')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingTopic(null)}
                style={{ background: 'none', border: 'none', color: '#6B7785', cursor: 'pointer', fontSize: 20, outline: 'none', padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Labels */}
            {(() => {
              const tLabels = labels.filter(l => viewingTopic.labelIds.includes(l.id));
              return tLabels.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {tLabels.map(l => (
                    <span key={l.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${l.color}20`, border: `1px solid ${l.color}55`, color: l.color, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      🏷️ {l.name}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}

            <div style={{ background: '#0B121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
              <p style={{ color: '#C5D0DC', fontSize: 14, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {viewingTopic.replyCount === 0
                  ? 'Sem conteúdo adicional. Usa este tópico para agrupar discussões no canal de chat.'
                  : `${viewingTopic.replyCount} resposta(s)`
                }
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => handleDeleteTopic(viewingTopic.id)}
                style={{ ...C.btnGhost, outline: 'none', color: '#E85454', borderColor: 'rgba(232,84,84,0.3)' }}
              >
                🗑️ Apagar
              </button>
              <button type="button" onClick={() => setViewingTopic(null)} style={{ ...C.btnGhost, outline: 'none' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ MODAL: CRIAR ETIQUETA ══════════════════════════ */}
      {showCreateLabel && (
        <div style={C.overlay}>
          <div onClick={() => setShowCreateLabel(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 380 }}>
            <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              🏷️ Nova Etiqueta
            </h2>
            <p style={{ color: '#6B7785', fontSize: 12, margin: '0 0 18px' }}>As etiquetas ajudam a organizar e filtrar tópicos.</p>

            <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 6 }}>Nome *</label>
            <input
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 14,
                background: '#0B121A', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 14px', color: '#E8EDF2', fontSize: 14, outline: 'none',
              }}
              placeholder="ex: Bug, Ideia, Anúncio..."
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newLabelName.trim() && handleCreateLabel()}
              maxLength={32}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(165,230,0,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            />

            <label style={{ color: '#6B7785', fontSize: 11, display: 'block', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <input
                type="color"
                value={newLabelColor}
                onChange={e => setNewLabelColor(e.target.value)}
                style={{ width: 48, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', outline: 'none', background: 'none' }}
              />
              {/* Quick colors */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['#A5E600', '#ED4245', '#F0B132', '#5865F2', '#3BA55D', '#EB459E', '#57F287'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewLabelColor(c)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c,
                      border: newLabelColor === c ? '3px solid #fff' : '2px solid transparent',
                      cursor: 'pointer', outline: 'none', transition: 'border 0.1s',
                      boxShadow: newLabelColor === c ? `0 0 8px ${c}80` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 18 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: `${newLabelColor}20`, border: `1px solid ${newLabelColor}55`,
                color: newLabelColor, borderRadius: 12, padding: '3px 10px',
                fontSize: 12, fontWeight: 600,
              }}>
                {newLabelName.trim() || 'Pré-visualização'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreateLabel(false)} style={{ ...C.btnGhost, outline: 'none' }}>Cancelar</button>
              <button
                type="button"
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim() || creatingLabel}
                style={{ ...C.btnPri, outline: 'none', opacity: !newLabelName.trim() ? 0.5 : 1 }}
              >
                {creatingLabel ? '…' : 'Criar Etiqueta'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════ MODAL: CRIAR ENQUETE (ETIQUETA) ══════════════════════════ */}
      {showPollModal && (
        <div style={C.overlay}>
          <div onClick={() => setShowPollModal(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 440, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, color: '#F2F5F8', margin: 0, fontWeight: 700 }}>Cria uma enquete</h2>
              <button 
                type="button" 
                onClick={() => setShowPollModal(false)} 
                style={{ background: 'none', border: 'none', color: '#949BA4', cursor: 'pointer', fontSize: 24 }}
              >✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#DBDEE1', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Pergunta</label>
              <textarea
                autoFocus
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value.slice(0, 300))}
                placeholder="O que você quer perguntar?"
                style={{
                  width: '100%', minHeight: 80, boxSizing: 'border-box',
                  background: '#1E1F22', border: 'none', borderRadius: 4,
                  padding: '12px', color: '#DBDEE1', fontSize: 16, outline: 'none', resize: 'none'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: 12, color: '#949BA4', marginTop: 4 }}>
                {pollQuestion.length} / 300
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#DBDEE1', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Respostas</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>☺</span>
                      <input
                        value={opt}
                        onChange={e => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder="Digite a sua resposta"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: '#1E1F22', border: 'none', borderRadius: 4,
                          padding: '10px 12px 10px 36px', color: '#DBDEE1', fontSize: 14, outline: 'none'
                        }}
                      />
                    </div>
                    {pollOptions.length > 2 && (
                      <button 
                        type="button" 
                        onClick={() => removePollOption(idx)}
                        style={{ background: 'none', border: 'none', color: '#949BA4', cursor: 'pointer', fontSize: 18 }}
                      >🗑️</button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 10 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  style={{
                    marginTop: 12, width: '100%', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                    color: '#DBDEE1', padding: '8px', cursor: 'pointer',
                    fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>+</span> Adicione mais uma resposta
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#DBDEE1', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Duração</label>
                <select
                  value={pollDuration}
                  onChange={e => setPollDuration(e.target.value)}
                  style={{
                    width: '100%', background: '#1E1F22', color: '#DBDEE1', border: 'none',
                    padding: '10px', borderRadius: 4, outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="1h">1 hora</option>
                  <option value="4h">4 horas</option>
                  <option value="8h">8 horas</option>
                  <option value="24h">24 horas</option>
                  <option value="3d">3 dias</option>
                  <option value="1w">1 semana</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <input 
                type="checkbox" 
                id="poll-multi" 
                checked={pollAllowMultiple} 
                onChange={e => setPollAllowMultiple(e.target.checked)} 
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
              <label htmlFor="poll-multi" style={{ color: '#DBDEE1', cursor: 'pointer', fontSize: 14 }}>Permitir várias respostas</label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', background: '#2B2D31', margin: '0 -24px -24px', padding: '16px 24px', borderRadius: '0 0 8px 8px' }}>
              <button
                type="button"
                onClick={handleCreatePoll}
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2 || creatingPoll}
                style={{
                  background: '#A5E600', color: '#000', border: 'none',
                  padding: '10px 28px', borderRadius: 4, cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, opacity: (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) ? 0.5 : 1
                }}
              >
                {creatingPoll ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ MODAL: GERIR ETIQUETAS ══════════════════════════ */}
      {showManageLabels && (
        <div style={C.overlay}>
          <div onClick={() => setShowManageLabels(false)} style={C.obg} />
          <div style={{ ...C.modal, maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, color: '#F2F5F8', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏷️ Etiquetas
              </h2>
              <button
                type="button"
                onClick={() => { setShowManageLabels(false); setShowCreateLabel(true); }}
                style={{ ...C.btnPri, padding: '6px 12px', fontSize: 12, outline: 'none' }}
              >
                + Nova
              </button>
            </div>

            {labels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4A5568' }}>
                <p style={{ fontSize: 32, margin: '0 0 8px' }}>🏷️</p>
                <p style={{ fontSize: 13 }}>Nenhuma etiqueta criada.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {labels.map(l => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: '#0B121A',
                      borderRadius: 10, border: `1px solid ${l.color}33`,
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: l.color, flexShrink: 0, boxShadow: `0 0 6px ${l.color}66` }} />
                    <span style={{ color: '#E8EDF2', fontSize: 14, flex: 1, fontWeight: 500 }}>{l.name}</span>
                    <span style={{ background: `${l.color}20`, border: `1px solid ${l.color}44`, color: l.color, borderRadius: 6, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                      {l.color}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLabel(l.id)}
                      title="Apagar etiqueta"
                      style={{ background: 'none', border: 'none', outline: 'none', color: '#ED444570', cursor: 'pointer', fontSize: 14, padding: 4, transition: 'color 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ED4245'}
                      onMouseLeave={e => e.currentTarget.style.color = '#ED444570'}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setShowManageLabels(false)} style={{ ...C.btnGhost, width: '100%', outline: 'none' }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBody({ 
  msg, 
  mt,
  user,
  selectedPollOptions,
  setSelectedPollOptions,
  handleVote
}: { 
  msg: Msg; 
  mt: string;
  user: any;
  selectedPollOptions: Record<string, string[]>;
  setSelectedPollOptions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  handleVote: (msgId: string) => void;
}) {
  // Safe-parse embedJson if it arrives as a string
  let eObj = msg.embedJson;
  if (typeof eObj === 'string') {
    try { eObj = JSON.parse(eObj); } catch { eObj = null; }
  }

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
        {mt === 'text' && msg.content?.trim() && <p style={{ color: '#D4DDE6', fontSize: 14, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'normal' }}>{msg.content}</p>}
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

  // Render as poll if it has options, regardless of mt (in case backend resets mt to 'text')
  const isPoll = (mt === 'poll') || (eObj && (eObj as any).options);
  if (isPoll && eObj) {
    const p = eObj as any;
    const isExpired = new Date(p.expiresAt) < new Date();
    // Simplified vote calculation (using local user vote simulation for now)
    return (
      <div style={{ 
        background: '#1E1F22', border: '1px solid rgba(255,255,255,0.06)', 
        borderRadius: 8, padding: '16px', maxWidth: 440, width: '100%' 
      }}>
        <h4 style={{ margin: '0 0 4px', color: '#F2F3F5', fontSize: 16, fontWeight: 600 }}>{p.question}</h4>
        <p style={{ margin: '0 0 16px', color: '#949BA4', fontSize: 12 }}>Selecionar uma resposta</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {p.options.map((opt: any) => {
            const isSelected = (selectedPollOptions[msg.id] || []).includes(opt.id) || opt.voters.includes(user?.id);
            const totalVotes = p.options.reduce((acc: number, o: any) => acc + o.voters.length, 0);
            const percentage = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
            
            return (
              <div 
                key={opt.id} 
                onClick={() => {
                  if (isExpired) return;
                  setSelectedPollOptions((prev: Record<string, string[]>) => {
                    const current = prev[msg.id] || (p.allowMultiple ? [] : []);
                    if (p.allowMultiple) {
                      return { ...prev, [msg.id]: current.includes(opt.id) ? current.filter((x: string) => x !== opt.id) : [...current, opt.id] };
                    } else {
                      return { ...prev, [msg.id]: [opt.id] };
                    }
                  });
                }}
                style={{ 
                  background: '#2B2D31', borderRadius: 8, padding: '12px 16px',
                  position: 'relative', overflow: 'hidden', cursor: isExpired ? 'default' : 'pointer', 
                  border: isSelected ? '1px solid #A5E600' : '1px solid transparent',
                  transition: 'all 0.1s'
                }}
              >
                {/* Progress Bar Background */}
                <div style={{ 
                  position: 'absolute', left: 0, top: 0, bottom: 0, 
                  width: `${percentage}%`, 
                  background: isSelected ? 'rgba(165, 230, 0, 0.15)' : 'rgba(255,255,255,0.05)', 
                  zIndex: 0, transition: 'width 0.3s ease'
                }} />
                
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#DBDEE1', fontSize: 14, fontWeight: isSelected ? 600 : 500 }}>{opt.text}</span>
                    {isSelected && <span style={{ color: '#A5E600', fontSize: 12 }}>✓</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#949BA4', fontSize: 12 }}>{percentage}%</span>
                    <div style={{ 
                      width: 18, height: 18, borderRadius: p.allowMultiple ? 4 : '50%', 
                      border: `2px solid ${isSelected ? '#A5E600' : '#949BA4'}`, display: 'flex', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}>
                      {isSelected && <div style={{ width: 10, height: 10, borderRadius: p.allowMultiple ? 2 : '50%', background: '#A5E600' }} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#949BA4', fontSize: 12 }}>
            {p.options.reduce((acc: number, o: any) => acc + o.voters.length, 0)} votos · {isExpired ? 'Encerrada' : '24h restantes'}
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button style={{ background: 'none', border: 'none', color: '#DBDEE1', cursor: 'pointer', fontSize: 12, outline: 'none' }}>Exibir os resultados</button>
            <button 
              disabled={isExpired || !(selectedPollOptions[msg.id]?.length > 0)}
              onClick={() => handleVote(msg.id)}
              style={{ 
                background: '#A5E600', color: '#000', border: 'none', 
                padding: '6px 20px', borderRadius: 4, cursor: (isExpired || !(selectedPollOptions[msg.id]?.length > 0)) ? 'default' : 'pointer', 
                fontSize: 13, fontWeight: 700, opacity: (isExpired || !(selectedPollOptions[msg.id]?.length > 0)) ? 0.5 : 1,
                outline: 'none'
              }}
            >Votar</button>
          </div>
        </div>
      </div>
    );
  }

  if (mt === 'embed' && eObj && typeof eObj === 'object') {
    const border = (eObj.color as string) || '#7C6FAD';
    return (
      <div style={{ borderLeft: `4px solid ${border}`, paddingLeft: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
        {eObj.title && <p style={{ color: '#E8EDF2', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>{eObj.title}</p>}
        {eObj.description && <p style={{ color: '#9CA8B8', fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{eObj.description}</p>}
        {eObj.imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={eObj.imageUrl as string} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8, display: 'block' }} />
          </>
        )}
        {eObj.footer && <p style={{ color: '#5A6B7D', fontSize: 10, margin: '8px 0 0' }}>{eObj.footer}</p>}
      </div>
    );
  }

  return <p style={{ color: '#D4DDE6', fontSize: 14, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'normal' }}>{msg.content}</p>;
}
