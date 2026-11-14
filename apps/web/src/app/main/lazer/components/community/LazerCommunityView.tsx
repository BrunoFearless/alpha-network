'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { lazerApi, uploadLazerCommunityFile, resolveUrl } from '@/lib/api';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { useAuthStore } from '@/store/auth.store';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface LazerCommunityViewProps {
  onClose?: () => void;
  onSelectView?: (view: any) => void;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  userAvatar?: string;
  userName?: string;
  initialCommunityId?: string | null;
  onProfileClick?: (userId: string) => void;
}

type ChannelTab = 'discussions' | 'media' | 'recommendations' | 'rules' | 'members';

interface CommunityRule {
  id: string;
  text: string;
}

interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string | null;
  authorProfile?: any;
  content: string;
  imageUrl?: string | null;
  titleFont?: string | null;
  titleColor?: string | null;
  reactions: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  createdAt: string;
  tropes?: any[];
}

interface LazerCommunity {
  id: string;
  name: string;
  description: string;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  iconEmoji?: string;
  themeColor: string;
  accentColor: string;
  isPublic: boolean;
  membersCount: number;
  onlineCount: number;
  rules: CommunityRule[];
  role: 'admin' | 'member' | 'none';
  createdAt: string;
  inviteCode: string;
  tags: string[];
  posts?: CommunityPost[];
}

const ACCENT_PRESETS = [
  '#6366f1', '#a855f7', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#e879f9'
];

const PREMIUM_FONTS = [
  { id: 'default', label: 'Padrão', family: "'Nunito', sans-serif" },
  { id: 'serif', label: 'Editorial', family: "'Playfair Display', serif" },
  { id: 'mono', label: 'Código', family: "'Fira Code', monospace" },
  { id: 'display', label: 'Impacto', family: "'Outfit', sans-serif" },
  { id: 'elegant', label: 'Elegante', family: "'Libre Baskerville', serif" },
];

const PREMIUM_COLORS = [
  { id: 'indigo', value: '#818cf8', label: 'Índigo' },
  { id: 'purple', value: '#c084fc', label: 'Púrpura' },
  { id: 'pink', value: '#f472b6', label: 'Neon' },
  { id: 'cyan', value: '#38bdf8', label: 'Ciano' },
  { id: 'emerald', value: '#34d399', label: 'Esmeralda' },
  { id: 'amber', value: '#fbbf24', label: 'Dourado' },
];

function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
}

function timeAgo(dateString: string): string {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function LazerCommunityView({
  onClose,
  onSelectView,
  themeColor = '#6366f1',
  themeMode = 'dark',
  userAvatar,
  userName = 'Membro',
  initialCommunityId,
  onProfileClick,
}: LazerCommunityViewProps) {
  const { user: authUser } = useAuthStore() as any;

  // States
  const [communities, setCommunities] = useState<LazerCommunity[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<LazerCommunity | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelTab>('discussions');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Creator / Post states
  const [postText, setPostText] = useState('');
  const [postImgFile, setPostImgFile] = useState<File | null>(null);
  const [postImgPreview, setPostImgPreview] = useState('');
  const [postTitleFont, setPostTitleFont] = useState('default');
  const [postTitleColor, setPostTitleColor] = useState('');
  const [showTypographyPicker, setShowTypographyPicker] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [newRuleText, setNewRuleText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Trope Wizard
  const [showTropeWizard, setShowTropeWizard] = useState(false);
  const [unknownTropes, setUnknownTropes] = useState<string[]>([]);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [tropeDraft, setTropeDraft] = useState({ description: '', category: 'Geral', iconEmoji: '✨' });
  const [skipTropes, setSkipTropes] = useState<string[]>([]);

  // Refs
  const postFileRef = useRef<HTMLInputElement>(null);

  // Fetch real communities from API
  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, expRes]: [any, any] = await Promise.all([
        lazerApi.getMyCommunities(),
        lazerApi.exploreCommunities(),
      ]);

      const my = Array.isArray(myRes.data) ? myRes.data : Array.isArray(myRes) ? myRes : [];
      const exp = Array.isArray(expRes.data) ? expRes.data : Array.isArray(expRes) ? expRes : [];
      const all = [...my];
      exp.forEach((c: any) => {
        if (!all.find((x: any) => x.id === c.id)) all.push(c);
      });

      setCommunities(all);

      if (initialCommunityId) {
        const found = all.find((x: any) => x.id === initialCommunityId);
        if (found) setSelectedCommunity(found);
      } else if (!selectedCommunity && all.length > 0) {
        // Select the first community user is in or the first overall
        const firstMy = all.find((c: any) => c.role !== 'none') || all[0];
        setSelectedCommunity(firstMy);
      }
    } catch (e) {
      console.error('Erro ao carregar comunidades:', e);
    } finally {
      setLoading(false);
    }
  }, [initialCommunityId, selectedCommunity]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // Fetch posts for active community
  const fetchPosts = useCallback(async (comId: string) => {
    try {
      const res: any = await lazerApi.getFeed(undefined, comId);
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      const mapped = data.map((p: any) => ({
        ...p,
        reactions: p._count?.reactions ?? 0,
        comments: p._count?.comments ?? 0,
        shares: 0,
        authorName: p.author?.profile?.displayName || p.author?.profile?.username || 'Utilizador',
        authorHandle: p.author?.profile?.username || 'user',
        authorAvatar: p.author?.profile?.avatarUrl,
        authorProfile: p.author?.profile,
      }));
      setPosts(mapped);
    } catch (e) {
      console.error('Erro ao carregar posts da comunidade:', e);
    }
  }, []);

  useEffect(() => {
    if (selectedCommunity) {
      fetchPosts(selectedCommunity.id);
    } else {
      setPosts([]);
    }
  }, [selectedCommunity, fetchPosts]);

  // Real Post creation
  const executePost = async (finalTropes: string[]) => {
    if (!selectedCommunity) return;
    try {
      setIsPosting(true);
      let imageUrl = null;
      if (postImgFile) {
        imageUrl = await uploadLazerCommunityFile(postImgFile, selectedCommunity.id);
      }

      await lazerApi.createPost({
        content: postText,
        imageUrl,
        communityId: selectedCommunity.id,
        tropeNames: finalTropes.length > 0 ? finalTropes : undefined,
        titleFont: postTitleFont !== 'default' ? postTitleFont : null,
        titleColor: postTitleColor || null,
      });

      setPostText('');
      setPostImgPreview('');
      setPostImgFile(null);
      setPostTitleFont('default');
      setPostTitleColor('');
      setSkipTropes([]);
      fetchPosts(selectedCommunity.id);
    } catch (e) {
      console.error('Erro ao publicar:', e);
      alert('Erro ao publicar no fórum da comunidade');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePost = async () => {
    if (!postText.trim() || !selectedCommunity) return;
    setIsPosting(true);
    try {
      const extractedTropes = (postText.match(/#[a-zA-Z0-9_]+/g) || [])
        .map((t) => t.replace('#', '').trim())
        .filter(Boolean);

      if (extractedTropes.length === 0) {
        await executePost([]);
        return;
      }

      const res: any = await lazerApi.getAllTropes();
      const allTropes = Array.isArray(res) ? res : res.data || [];
      const knownNames = allTropes.map((t: any) => t.name.toLowerCase());
      const unknown = extractedTropes.filter(
        (t) => !knownNames.includes(t.toLowerCase()) && !skipTropes.includes(t)
      );

      if (unknown.length > 0) {
        setUnknownTropes(unknown);
        setWizardIndex(0);
        setTropeDraft({ description: '', category: 'Geral', iconEmoji: '✨' });
        setShowTropeWizard(true);
        setIsPosting(false);
        return;
      }

      await executePost(extractedTropes.filter((t) => !skipTropes.includes(t)));
    } catch (e) {
      console.error(e);
      setIsPosting(false);
    }
  };

  const handleTropeWizardNext = async () => {
    const currentName = unknownTropes[wizardIndex];
    try {
      await lazerApi.createTrope({ name: currentName, ...tropeDraft });
      if (wizardIndex + 1 < unknownTropes.length) {
        setWizardIndex(wizardIndex + 1);
        setTropeDraft({ description: '', category: 'Geral', iconEmoji: '✨' });
      } else {
        setShowTropeWizard(false);
        const extractedTropes = (postText.match(/#[a-zA-Z0-9_]+/g) || [])
          .map((t) => t.replace('#', '').trim())
          .filter(Boolean);
        await executePost(extractedTropes.filter((t) => !skipTropes.includes(t)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Like topic
  const handleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, reactions: p.reactions + (p.isLiked ? -1 : 1) }
          : p
      )
    );
  };

  // Join / Leave community
  const handleToggleMember = async (com: LazerCommunity) => {
    try {
      if (com.role === 'none') {
        await lazerApi.joinCommunity(com.inviteCode);
      } else {
        await lazerApi.leaveCommunity(com.id);
      }
      fetchCommunities();
    } catch (e) {
      console.error('Erro ao alterar adesão:', e);
    }
  };

  // Join by code
  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim()) return;
    try {
      await lazerApi.joinCommunity(joinCodeInput.trim());
      setShowJoinModal(false);
      setJoinCodeInput('');
      setJoinError('');
      fetchCommunities();
    } catch (e) {
      setJoinError('Código de convite inválido ou expirado.');
    }
  };

  // Rules management
  const handleAddRule = async () => {
    if (!newRuleText.trim() || !selectedCommunity) return;
    try {
      await lazerApi.addRule(selectedCommunity.id, newRuleText.trim());
      setNewRuleText('');
      const res: any = await lazerApi.getCommunity(selectedCommunity.id);
      const updated = res.data || res;
      setSelectedCommunity(updated);
      setCommunities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedCommunity) return;
    try {
      await lazerApi.deleteRule(ruleId);
      const res: any = await lazerApi.getCommunity(selectedCommunity.id);
      const updated = res.data || res;
      setSelectedCommunity(updated);
      setCommunities((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered posts based on active channel
  const filteredPosts = useMemo(() => {
    if (activeChannel === 'discussions') return posts;
    if (activeChannel === 'media') return posts.filter((p) => p.imageUrl);
    if (activeChannel === 'recommendations') return posts.filter((p) => p.reactions >= 3);
    return posts;
  }, [posts, activeChannel]);

  // Communities categorization
  const myCommunities = useMemo(() => communities.filter((c) => c.role !== 'none'), [communities]);
  const exploreCommunities = useMemo(() => {
    let list = communities;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== 'Todos') {
      list = list.filter((c) => c.tags?.some((t) => t.toLowerCase() === categoryFilter.toLowerCase()));
    }
    return list;
  }, [communities, searchFilter, categoryFilter]);

  const isLight = themeMode === 'light';
  const shellBg = isLight ? 'glass-panel-light' : 'liquid-glass-shell';
  const activeAccent = selectedCommunity?.accentColor || '#6366f1';

  return (
    <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500 relative select-none">
      
      {/* Specular Ambient Backlight Blobs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[140px] pointer-events-none -z-10 transition-colors duration-700"
        style={{ background: `${activeAccent}25` }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[140px] pointer-events-none -z-10 transition-colors duration-700"
        style={{ background: `${activeAccent}20` }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          1. FLOATING COMMUNITY CAPSULE SIDEBAR (Padrão Lazer Pill Lateral)
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col items-center justify-between w-14 lg:w-16 h-fit py-6 px-2.5 rounded-full border border-white/20 liquid-glass-shell shadow-2xl relative z-40 shrink-0 select-none transition-all duration-300"
        style={{
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/80 to-transparent blur-[0.2px]" />

        {/* Top: Avatar or Hub Emblem */}
        <button
          onClick={() => {
            setSelectedCommunity(null);
          }}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#6366f1] p-0.5 hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(99,102,241,0.5)] cursor-pointer group relative bg-white/5"
          title="Explorar Comunidades"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full bg-[#6366f1]/20 text-[#818cf8] font-black text-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          )}
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Action Navigation Icons */}
        <div className="flex flex-col items-center gap-3.5">
          {/* Explorar Hub */}
          <button
            onClick={() => setSelectedCommunity(null)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              !selectedCommunity
                ? 'text-[#6366f1] bg-white/15 shadow-[0_0_14px_rgba(99,102,241,0.4)] scale-110 border border-[#6366f1]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Explorar Guildas"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </button>

          {/* Criar Comunidade */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-tr from-[#4f46e5] to-[#6366f1] hover:scale-110 active:scale-95 shadow-[0_0_18px_rgba(99,102,241,0.5)] transition-all cursor-pointer group relative"
            title="Criar Nova Comunidade"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Entrar com Código */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#6366f1] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Entrar com Código de Convite"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>

          {/* Atalho Alpha Messages */}
          <button
            onClick={() => onSelectView?.('messages')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#3b82f6] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Messages"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Atalho Alpha Music */}
          <button
            onClick={() => onSelectView?.('music')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#1ed760] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Music"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>

          {/* Atalho Alpha Watch */}
          <button
            onClick={() => onSelectView?.('watch')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#ef4444] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Watch Cinema"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
            </svg>
          </button>

          {/* Atalho Alpha Art */}
          <button
            onClick={() => onSelectView?.('art')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#a855f7] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Art Gallery"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </button>

          {/* Sair para o Feed */}
          <button
            onClick={() => onSelectView?.('feed') || onClose?.()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Voltar ao Feed do Lazer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        </div>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Bottom indicator jewel em Indigo neon */}
        <div
          className="w-2 h-2 rounded-full animate-pulse transition-colors duration-500"
          style={{ background: activeAccent, boxShadow: `0 0 10px ${activeAccent}` }}
        />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN VISIONOS SHELL WINDOW (Community Guild Sanctuary)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border md:border-white/15 ${shellBg} flex overflow-hidden relative shadow-2xl transition-all duration-300`}
        style={{
          backdropFilter: 'blur(36px) saturate(140%)',
          WebkitBackdropFilter: 'blur(36px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* ── SUB-PANEL A: COMMUNITY SPACES & CHANNELS RAIL ── */}
        <div className="w-16 sm:w-20 md:w-64 border-r border-white/[0.08] flex flex-col shrink-0 bg-white/[0.02] backdrop-blur-xl z-20">
          
          {/* Header Guild Switcher */}
          <div className="p-3.5 sm:p-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 transition-transform hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${activeAccent}, #4f46e5)` }}
              >
                {selectedCommunity ? selectedCommunity.iconEmoji || '🌐' : '✦'}
              </div>
              <div className="hidden md:flex flex-col min-w-0">
                <span className="text-xs font-black text-white truncate leading-tight">
                  {selectedCommunity ? selectedCommunity.name : 'Comunidades'}
                </span>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {selectedCommunity ? `${selectedCommunity.membersCount} Membros` : 'Hub Principal'}
                </span>
              </div>
            </div>

            {selectedCommunity?.role === 'admin' && (
              <button
                onClick={() => setShowEditModal(true)}
                className="hidden md:flex w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
                title="Definições da Comunidade"
              >
                ⚙
              </button>
            )}
          </div>

          {/* Guild Bubbles & Channel Nav */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-4 custom-scrollbar">
            {/* Server Rail Icons */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="hidden md:block text-[9px] font-extrabold uppercase tracking-widest text-white/30 px-2">
                Minhas Guildas
              </span>

              {/* Explore Community Star Icon */}
              <button
                onClick={() => setSelectedCommunity(null)}
                className={`w-11 h-11 md:w-full md:h-10 rounded-2xl flex items-center md:justify-start justify-center gap-3 px-0 md:px-3 transition-all cursor-pointer ${
                  !selectedCommunity
                    ? 'bg-white/15 text-white border border-white/20 shadow-md scale-105 md:scale-100'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
                title="Descobrir Comunidades"
              >
                <div className="w-5 h-5 flex items-center justify-center text-amber-400">★</div>
                <span className="hidden md:inline text-xs font-bold truncate">Explorar Guildas</span>
              </button>

              {/* My Communities List */}
              {myCommunities.map((com) => {
                const isCurrent = selectedCommunity?.id === com.id;
                return (
                  <button
                    key={com.id}
                    onClick={() => {
                      setSelectedCommunity(com);
                      setActiveChannel('discussions');
                    }}
                    className={`w-11 h-11 md:w-full md:h-10 rounded-2xl flex items-center md:justify-start justify-center gap-3 px-0 md:px-3 transition-all cursor-pointer relative group ${
                      isCurrent
                        ? 'bg-white/15 text-white border border-white/25 shadow-md scale-105 md:scale-100'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                    title={com.name}
                  >
                    {/* Active Pill Indicator */}
                    <div
                      className={`absolute -left-1.5 top-2 bottom-2 w-1 rounded-full transition-all ${
                        isCurrent ? 'bg-white opacity-100' : 'opacity-0 group-hover:opacity-40'
                      }`}
                    />

                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shrink-0 border border-white/15 overflow-hidden"
                      style={{ background: com.iconUrl ? 'transparent' : com.accentColor }}
                    >
                      {com.iconUrl ? (
                        <img src={resolveUrl(com.iconUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        com.iconEmoji || '🌐'
                      )}
                    </div>
                    <span className="hidden md:inline text-xs font-black truncate">{com.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Channels & Rooms for the Selected Community */}
            {selectedCommunity && (
              <div className="pt-2 border-t border-white/[0.08] flex flex-col items-center md:items-start gap-1">
                <span className="hidden md:block text-[9px] font-extrabold uppercase tracking-widest text-white/30 px-2 mb-1">
                  Canais & Palcos
                </span>

                {[
                  { id: 'discussions', label: 'Discussões', icon: '💬' },
                  { id: 'media', label: 'Cofre de Mídia', icon: '🎨' },
                  { id: 'recommendations', label: 'Destaques', icon: '💡' },
                  { id: 'rules', label: 'Regras da Guilda', icon: '📜' },
                  { id: 'members', label: 'Membros', icon: '👥' },
                ].map((ch) => {
                  const isActive = activeChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id as ChannelTab)}
                      className={`w-11 h-11 md:w-full md:h-9 rounded-xl flex items-center md:justify-start justify-center gap-2.5 px-0 md:px-3 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                          : 'text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-sm shrink-0">{ch.icon}</span>
                      <span className="hidden md:inline truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Status Bar at the bottom */}
          <div className="p-3 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/20 shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs">
                    {userName[0]}
                  </div>
                )}
              </div>
              <div className="hidden md:flex flex-col min-w-0">
                <span className="text-xs font-extrabold text-white truncate">{userName}</span>
                <span className="text-[9px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Online
                </span>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="hidden md:flex w-7 h-7 rounded-full bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 items-center justify-center transition-all cursor-pointer"
                title="Fechar Comunidade"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── SUB-PANEL B: THE COMMUNITY STAGE / FORUM FEED ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          
          {selectedCommunity ? (
            /* ACTIVE COMMUNITY VIEW */
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              
              {/* HERO BANNER COVER */}
              <div
                className="relative h-44 sm:h-52 md:h-60 w-full shrink-0 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${activeAccent}60, rgba(0,0,0,0.4))`,
                }}
              >
                {/* Banner Media */}
                {selectedCommunity.bannerUrl && (
                  isVideoUrl(selectedCommunity.bannerUrl) ? (
                    <video
                      src={resolveUrl(selectedCommunity.bannerUrl)}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={resolveUrl(selectedCommunity.bannerUrl)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )
                )}

                {/* Dark Gradient Overlay for Glass Visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Top Quick Actions */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                  {/* Copy Invite Code Pill */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedCommunity.inviteCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <span>{copiedCode ? '✓ Copiado!' : `Convite: #${selectedCommunity.inviteCode}`}</span>
                  </button>

                  {/* Toggle Membership */}
                  <button
                    onClick={() => handleToggleMember(selectedCommunity)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-xl cursor-pointer ${
                      selectedCommunity.role !== 'none'
                        ? 'bg-white/20 hover:bg-red-500/30 text-white border border-white/30'
                        : 'bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {selectedCommunity.role === 'admin'
                      ? '👑 Administrador'
                      : selectedCommunity.role === 'member'
                      ? '✓ Membro'
                      : '+ Aderir à Guilda'}
                  </button>
                </div>

                {/* Community Details on Banner */}
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4 z-20">
                  <div className="flex items-end gap-3.5">
                    {/* Community Icon Avatar */}
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] border-4 border-black/80 shadow-2xl flex items-center justify-center text-3xl shrink-0 overflow-hidden"
                      style={{
                        background: selectedCommunity.iconUrl ? 'transparent' : activeAccent,
                      }}
                    >
                      {selectedCommunity.iconUrl ? (
                        <img src={resolveUrl(selectedCommunity.iconUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedCommunity.iconEmoji || '🌐'
                      )}
                    </div>

                    <div className="mb-1">
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 drop-shadow-md">
                        {selectedCommunity.name}
                        {!selectedCommunity.isPublic && <span className="text-sm">🔒</span>}
                      </h1>
                      <p className="text-xs text-white/70 font-medium line-clamp-1 max-w-lg mt-0.5 drop-shadow-sm">
                        {selectedCommunity.description}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="hidden lg:flex items-center gap-1.5 pb-1">
                    {selectedCommunity.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white/80 border border-white/20 backdrop-blur-md"
                        style={{ background: `${activeAccent}30` }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* STAGE MAIN BODY CONTAINER */}
              <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full">

                {/* ── CHANNEL VIEW: DISCUSSIONS & POSTS ── */}
                {activeChannel === 'discussions' || activeChannel === 'media' || activeChannel === 'recommendations' ? (
                  <>
                    {/* POST COMPOSER ISLAND */}
                    {selectedCommunity.role !== 'none' ? (
                      <div className="p-4 sm:p-5 rounded-[2rem] bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-3 transition-all focus-within:border-white/25">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-white/20 shrink-0 mt-0.5">
                            {userAvatar ? (
                              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs">
                                {userName[0]}
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <textarea
                              value={postText}
                              onChange={(e) => setPostText(e.target.value)}
                              placeholder={`Partilha algo com a guilda ${selectedCommunity.name}... (#hashtags tornam-se tropes!)`}
                              rows={2}
                              className="w-full bg-transparent text-white placeholder-white/40 text-sm font-semibold outline-none resize-none"
                              style={{
                                fontFamily:
                                  PREMIUM_FONTS.find((f) => f.id === postTitleFont)?.family ||
                                  "'Nunito', sans-serif",
                                color: postTitleColor || undefined,
                              }}
                            />
                          </div>
                        </div>

                        {/* Image Preview if uploaded */}
                        {postImgPreview && (
                          <div className="relative rounded-2xl overflow-hidden border border-white/20 max-h-56 max-w-sm mt-1">
                            <img src={postImgPreview} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => {
                                setPostImgPreview('');
                                setPostImgFile(null);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Composer Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            {/* File Upload Button */}
                            <input
                              ref={postFileRef}
                              type="file"
                              accept="image/*,video/mp4,video/webm"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setPostImgFile(f);
                                  const r = new FileReader();
                                  r.onload = () => setPostImgPreview(r.result as string);
                                  r.readAsDataURL(f);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => postFileRef.current?.click()}
                              className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              📷 <span>Mídia</span>
                            </button>

                            {/* Typography & Neon Color Picker Toggle */}
                            <button
                              type="button"
                              onClick={() => setShowTypographyPicker(!showTypographyPicker)}
                              className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                showTypographyPicker
                                  ? 'bg-white text-black border-white'
                                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
                              }`}
                            >
                              🎨 <span>Estilo do Título</span>
                            </button>
                          </div>

                          <button
                            onClick={handlePost}
                            disabled={!postText.trim() || isPosting}
                            className="px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider text-white transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            style={{ background: activeAccent }}
                          >
                            {isPosting ? 'A Publicar...' : 'Publicar no Fórum'}
                          </button>
                        </div>

                        {/* Typography & Neon Picker Popover */}
                        {showTypographyPicker && (
                          <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/10 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                                Tipografia do Título
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {PREMIUM_FONTS.map((font) => (
                                  <button
                                    key={font.id}
                                    type="button"
                                    onClick={() => setPostTitleFont(font.id)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                      postTitleFont === font.id
                                        ? 'bg-white text-black'
                                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                                    }`}
                                  >
                                    {font.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                                Cor Neon do Título
                              </span>
                              <div className="flex items-center gap-2">
                                {PREMIUM_COLORS.map((col) => (
                                  <button
                                    key={col.id}
                                    type="button"
                                    onClick={() => setPostTitleColor(col.value)}
                                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-125"
                                    style={{
                                      background: col.value,
                                      borderColor: postTitleColor === col.value ? '#ffffff' : 'transparent',
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 text-center flex flex-col items-center gap-2">
                        <p className="text-sm font-bold text-white/70">
                          Apenas membros desta guilda podem iniciar discussões.
                        </p>
                        <button
                          onClick={() => handleToggleMember(selectedCommunity)}
                          className="px-6 py-2 rounded-full font-black text-xs uppercase tracking-wider text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                          style={{ background: activeAccent }}
                        >
                          Aderir à Guilda Agora
                        </button>
                      </div>
                    )}

                    {/* TOPICS & POSTS FEED */}
                    <div className="flex flex-col gap-4">
                      {filteredPosts.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center gap-2 opacity-50">
                          <span className="text-3xl">💬</span>
                          <h4 className="text-sm font-black text-white uppercase tracking-widest">
                            Nenhuma discussão neste canal
                          </h4>
                          <p className="text-xs text-white/60">Sê o primeiro a inaugurar este espaço!</p>
                        </div>
                      ) : (
                        filteredPosts.map((post) => {
                          const fontData =
                            PREMIUM_FONTS.find((f) => f.id === post.titleFont) || PREMIUM_FONTS[0];
                          const lines = post.content.split('\n');
                          const title = lines[0];
                          const body = lines.slice(1).join('\n');

                          return (
                            <div
                              key={post.id}
                              className="p-5 sm:p-6 rounded-[2rem] bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-white/20 hover:scale-[1.005]"
                            >
                              {/* Post Author Bar */}
                              <div className="flex items-center justify-between mb-3.5">
                                <div
                                  onClick={() => onProfileClick?.(post.authorId)}
                                  className="flex items-center gap-3 cursor-pointer group"
                                >
                                  <Avatar
                                    src={post.authorAvatar || undefined}
                                    name={post.authorName}
                                    className="w-10 h-10 rounded-full border border-white/15"
                                  />
                                  <div>
                                    <h4 className="text-xs font-black text-white group-hover:text-white/80 transition-colors">
                                      {post.authorName}
                                    </h4>
                                    <p className="text-[10px] text-white/40">
                                      @{post.authorHandle} · {timeAgo(post.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Title with Styled Font */}
                              <div
                                className="text-lg sm:text-xl font-black uppercase tracking-tight mb-2 leading-tight"
                                style={{
                                  fontFamily: fontData.family,
                                  color: post.titleColor || '#ffffff',
                                }}
                              >
                                <EmojiRenderer content={title} emojiSize={22} />
                              </div>

                              {/* Body */}
                              {body && (
                                <p className="text-xs sm:text-sm text-white/80 leading-relaxed whitespace-pre-wrap mb-3.5">
                                  <EmojiRenderer content={body} emojiSize={18} />
                                </p>
                              )}

                              {/* Tropes badges */}
                              {post.tropes && post.tropes.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3.5">
                                  {post.tropes.map((t: any) => (
                                    <span
                                      key={t.id}
                                      className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white/90 border border-white/15"
                                      style={{ background: `${activeAccent}25` }}
                                    >
                                      {t.iconEmoji} #{t.name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Media Attachment */}
                              {post.imageUrl && (
                                <div className="rounded-2xl overflow-hidden border border-white/15 max-h-96 w-full mb-3.5 bg-black/40">
                                  {isVideoUrl(post.imageUrl) ? (
                                    <video
                                      src={resolveUrl(post.imageUrl)}
                                      controls
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <img
                                      src={resolveUrl(post.imageUrl)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                              )}

                              {/* Reactions & Actions */}
                              <div className="flex items-center gap-5 pt-3 border-t border-white/[0.06] text-xs font-bold text-white/60">
                                <button
                                  onClick={() => handleLike(post.id)}
                                  className={`flex items-center gap-1.5 transition-all hover:scale-110 cursor-pointer ${
                                    post.isLiked ? 'text-rose-400 font-black' : 'hover:text-white'
                                  }`}
                                >
                                  <span>{post.isLiked ? '❤️' : '🤍'}</span>
                                  <span>{post.reactions}</span>
                                </button>

                                <span className="flex items-center gap-1.5">
                                  <span>💬</span>
                                  <span>{post.comments}</span>
                                </span>

                                <span className="flex items-center gap-1.5 text-white/40">
                                  <span>↗</span>
                                  <span>Partilhar</span>
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : activeChannel === 'rules' ? (
                  /* ── CHANNEL VIEW: COMMUNITY RULES ── */
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h3 className="text-base font-black text-white">Regras & Diretrizes</h3>
                        <p className="text-xs text-white/50">Código de conduta estabelecido pelos fundadores da guilda</p>
                      </div>

                      {selectedCommunity.role === 'admin' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newRuleText}
                            onChange={(e) => setNewRuleText(e.target.value)}
                            placeholder="Adicionar nova regra..."
                            className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 text-white text-xs outline-none focus:border-white/40"
                          />
                          <button
                            onClick={handleAddRule}
                            className="px-4 py-1.5 rounded-full bg-white text-black font-black text-xs uppercase"
                          >
                            + Adicionar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {selectedCommunity.rules?.length === 0 ? (
                        <p className="text-xs text-white/40 italic py-8 text-center">Nenhuma regra definida ainda.</p>
                      ) : (
                        selectedCommunity.rules?.map((rule, idx) => (
                          <div
                            key={rule.id}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-white/10 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <p className="text-xs font-semibold text-white/90">{rule.text}</p>
                            </div>

                            {selectedCommunity.role === 'admin' && (
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="text-white/40 hover:text-red-400 text-xs transition-colors"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── CHANNEL VIEW: MEMBERS LIST ── */
                  <div className="flex flex-col gap-4">
                    <h3 className="text-base font-black text-white">Membros da Guilda ({selectedCommunity.membersCount})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-black">
                          👑
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">Fundadores da Guilda</h4>
                          <span className="text-[10px] text-white/40 font-semibold">Administração</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EXPLORE & DISCOVER COMMUNITIES (HUB MODE) */
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full">
              
              {/* Explore Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    Descobrir Comunidades
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30 font-black">
                      {exploreCommunities.length} Guildas
                    </span>
                  </h1>
                  <p className="text-xs text-white/50 mt-1">
                    Encontra grupos afins, espaços de cinema, fã-clubes de música, tecnologia e arte.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-extrabold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer"
                  >
                    + Criar Comunidade
                  </button>

                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer"
                  >
                    Código #
                  </button>
                </div>
              </div>

              {/* Search & Categories Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Pesquisar por nome, descrição ou #tags..."
                    className="w-full h-11 pl-4 pr-10 rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold placeholder-white/40 outline-none transition-all shadow-inner focus:border-[#6366f1]"
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto py-1">
                  {['Todos', 'Gaming', 'Cinema', 'Música', 'Arte', 'Tecnologia'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-white text-black shadow-md scale-105'
                          : 'bg-white/[0.05] text-white/60 hover:text-white hover:bg-white/[0.10]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Communities Showcase Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {exploreCommunities.map((com) => {
                  const isMember = com.role !== 'none';
                  return (
                    <div
                      key={com.id}
                      onClick={() => {
                        setSelectedCommunity(com);
                        setActiveChannel('discussions');
                      }}
                      className="rounded-[2.2rem] overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/25 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col group"
                    >
                      {/* Cover Header */}
                      <div
                        className="h-28 relative overflow-hidden shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${com.accentColor}70, rgba(0,0,0,0.5))`,
                        }}
                      >
                        {com.bannerUrl && (
                          <img
                            src={resolveUrl(com.bannerUrl)}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Avatar */}
                        <div
                          className="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl border-4 border-black/80 shadow-xl flex items-center justify-center text-2xl z-10 overflow-hidden"
                          style={{
                            background: com.iconUrl ? 'transparent' : com.accentColor,
                          }}
                        >
                          {com.iconUrl ? (
                            <img src={resolveUrl(com.iconUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            com.iconEmoji || '🌐'
                          )}
                        </div>

                        {/* Membership Badge */}
                        {isMember && (
                          <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider border border-white/25">
                            {com.role === 'admin' ? '👑 Admin' : '✓ Membro'}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="pt-8 p-5 flex flex-col flex-1 justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                            {com.name}
                          </h3>
                          <p className="text-xs text-white/60 line-clamp-2 mt-1 leading-relaxed">
                            {com.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-[11px] font-bold text-white/50">
                          <span>👥 {com.membersCount} membros</span>
                          <span className="text-emerald-400">● {com.onlineCount || 1} online</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. MODALS: CREATE COMMUNITY, EDIT COMMUNITY, JOIN BY CODE, TROPE WIZARD
      ══════════════════════════════════════════════════════════════════════ */}

      {/* CREATE COMMUNITY MODAL */}
      {showCreateModal && (
        <CreateCommunityWizardModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newCom) => {
            setShowCreateModal(false);
            setCommunities((prev) => [newCom, ...prev]);
            setSelectedCommunity(newCom);
          }}
        />
      )}

      {/* JOIN BY CODE MODAL */}
      {showJoinModal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-sm rounded-[2.5rem] border border-white/20 liquid-glass-shell shadow-2xl p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            style={{
              backdropFilter: 'blur(36px) saturate(140%)',
              WebkitBackdropFilter: 'blur(36px) saturate(140%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Entrar numa Guilda</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Insere o código de convite
                </p>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="ex: ALPHA-8291"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-bold uppercase tracking-wider outline-none focus:border-[#6366f1]"
            />

            {joinError && <p className="text-xs text-rose-400 font-bold">{joinError}</p>}

            <button
              onClick={handleJoinByCode}
              disabled={!joinCodeInput.trim()}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-extrabold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer disabled:opacity-40"
            >
              Entrar na Comunidade
            </button>
          </div>
        </div>
      )}

      {/* TROPE WIZARD MODAL */}
      {showTropeWizard && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xl animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-md rounded-[2.5rem] border border-white/20 liquid-glass-shell shadow-2xl p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            style={{
              backdropFilter: 'blur(36px) saturate(140%)',
              WebkitBackdropFilter: 'blur(36px) saturate(140%)',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Novo Trope Detectado!
                </span>
                <h3 className="text-lg font-black text-white">#{unknownTropes[wizardIndex]}</h3>
              </div>
            </div>

            <p className="text-xs text-white/70">
              O marcador <strong className="text-white">#{unknownTropes[wizardIndex]}</strong> ainda não existe no
              cânone da rede Alpha. Queres registá-lo agora para partilhares com a comunidade?
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={tropeDraft.description}
                onChange={(e) => setTropeDraft((s) => ({ ...s, description: e.target.value }))}
                placeholder="Breve descrição ou essência deste trope..."
                className="w-full h-10 px-3.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setSkipTropes((prev) => [...prev, unknownTropes[wizardIndex]]);
                  setShowTropeWizard(false);
                }}
                className="flex-1 py-2.5 rounded-full bg-white/10 text-white font-bold text-xs uppercase"
              >
                Ignorar
              </button>
              <button
                onClick={handleTropeWizardNext}
                className="flex-1 py-2.5 rounded-full bg-[#6366f1] text-white font-black text-xs uppercase shadow-xl"
              >
                Registar Trope
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CREATE COMMUNITY WIZARD ──────────────────────────────────────────────────
function CreateCommunityWizardModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (com: LazerCommunity) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [accent, setAccent] = useState('#6366f1');
  const [iconEmoji, setIconEmoji] = useState('🌐');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState('gaming, cinema, tecnologia');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [creating, setCreating] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res: any = await lazerApi.createCommunity({
        name: name.trim(),
        description: desc.trim(),
        accentColor: accent,
        themeColor: accent,
        isPublic,
        iconEmoji,
        tags: tagsArray,
      });

      let com = res.data || res;

      // Upload banner if chosen
      if (bannerFile) {
        const bannerUrl = await uploadLazerCommunityFile(bannerFile, com.id);
        const upRes: any = await lazerApi.updateCommunity(com.id, { bannerUrl });
        com = upRes.data || upRes;
      }

      onCreated(com);
    } catch (e) {
      console.error(e);
      alert('Erro ao criar comunidade no servidor');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300" />
      <div
        className="relative w-full max-w-lg rounded-[2.5rem] border border-white/20 liquid-glass-shell shadow-2xl p-6 sm:p-8 flex flex-col gap-4 animate-in zoom-in-95 duration-200 overflow-hidden"
        style={{
          backdropFilter: 'blur(36px) saturate(140%)',
          WebkitBackdropFilter: 'blur(36px) saturate(140%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Criar Nova Comunidade</h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Funda um novo espaço na rede Alpha
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar p-1">
          {/* Banner Dropzone */}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*,video/mp4"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setBannerFile(f);
                const r = new FileReader();
                r.onload = () => setBannerPreview(r.result as string);
                r.readAsDataURL(f);
              }
            }}
          />
          <div
            onClick={() => bannerInputRef.current?.click()}
            className="h-28 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 flex items-center justify-center cursor-pointer relative overflow-hidden transition-all bg-white/[0.02]"
            style={{
              background: bannerPreview ? `url(${bannerPreview}) center/cover` : undefined,
            }}
          >
            {!bannerPreview && (
              <span className="text-xs font-bold text-white/50 flex items-center gap-1.5">
                📷 Carregar Capa ou Vídeo da Guilda
              </span>
            )}
          </div>

          {/* Name & Emoji */}
          <div className="flex gap-2">
            <input
              type="text"
              value={iconEmoji}
              onChange={(e) => setIconEmoji(e.target.value.slice(0, 2))}
              className="w-14 h-11 text-center text-xl rounded-xl bg-white/5 border border-white/15 text-white outline-none"
              title="Emoji Ícone"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da Comunidade (ex: Cyberpunk Syndicate)"
              className="flex-1 h-11 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold outline-none focus:border-[#6366f1]"
            />
          </div>

          {/* Description */}
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Qual é a essência e o propósito desta guilda?"
            rows={2}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-semibold placeholder-white/40 outline-none resize-none focus:border-[#6366f1]"
          />

          {/* Tags */}
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags separadas por vírgula (ex: gaming, cinema, anime)"
            className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-xs outline-none"
          />

          {/* Color Presets */}
          <div>
            <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-2">
              Cor de Destaque da Guilda
            </span>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setAccent(col)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: col,
                    borderColor: accent === col ? '#ffffff' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white font-extrabold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer disabled:opacity-40"
        >
          {creating ? 'A Fundar Guilda...' : 'Fundar Comunidade'}
        </button>
      </div>
    </div>
  );
}

