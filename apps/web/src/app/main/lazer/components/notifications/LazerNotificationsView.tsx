'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';
import { resolveUrl } from '@/lib/api';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface LazerNotificationsViewProps {
  onClose?: () => void;
  onSelectView?: (view: any) => void;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  userAvatar?: string;
  userName?: string;
  onPostClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
}

type NotifTab = 'all' | 'requests' | 'reactions' | 'comments' | 'system';

// ─── Component ───────────────────────────────────────────────────────────────
export function LazerNotificationsView({
  onClose,
  onSelectView,
  themeColor = '#eab308',
  themeMode = 'dark',
  userAvatar,
  userName = 'Utilizador',
  onPostClick,
  onProfileClick,
}: LazerNotificationsViewProps) {
  const { user: authUser } = useAuthStore() as any;
  const {
    feedPosts,
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    fetchFriends,
    notifications,
    fetchNotifications,
    markNotificationRead,
  } = useLazerStore();

  const [activeTab, setActiveTab] = useState<NotifTab>('all');
  const [filterQuery, setFilterQuery] = useState('');

  // Mount logic
  useEffect(() => {
    fetchFriends();
    fetchNotifications();
  }, [fetchFriends, fetchNotifications]);

  const myId = authUser?.id;

  // Pending Friend Requests received
  const pendingReceived = useMemo(
    () => friendRequests.filter((r) => r.toUserId === myId && r.status === 'pending'),
    [friendRequests, myId]
  );

  // My posts reactions and comments
  const myPosts = useMemo(
    () => feedPosts.filter((p) => p.authorId === myId),
    [feedPosts, myId]
  );

  const reactionNotifs = useMemo(() => {
    return myPosts
      .filter((p) => (p._count?.reactions || 0) > 0)
      .map((p) => ({
        type: 'reaction' as const,
        id: `reaction-${p.id}`,
        postId: p.id,
        content: p.content,
        count: p._count?.reactions || 0,
        createdAt: p.createdAt,
        read: false,
      }));
  }, [myPosts]);

  const commentNotifs = useMemo(() => {
    return myPosts
      .filter((p) => (p._count?.comments || 0) > 0)
      .map((p) => ({
        type: 'comment' as const,
        id: `comment-${p.id}`,
        postId: p.id,
        content: p.content,
        count: p._count?.comments || 0,
        createdAt: p.createdAt,
        read: false,
      }));
  }, [myPosts]);

  // Unified Notification Feed
  const allNotifications = useMemo(() => {
    const list = [
      ...pendingReceived.map((r) => ({
        type: 'friend_request' as const,
        id: r.id,
        request: r,
        createdAt: r.createdAt,
        read: false,
      })),
      ...reactionNotifs,
      ...commentNotifs,
      ...notifications.map((n) => ({
        ...n,
        type: (n.type as any) || 'system',
        read: !!n.isRead,
      })),
    ];
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [pendingReceived, reactionNotifs, commentNotifs, notifications]);

  // Filtered Notifications by Tab & Search
  const filteredNotifications = useMemo(() => {
    let list = allNotifications;
    if (activeTab === 'requests') {
      list = list.filter((n) => n.type === 'friend_request');
    } else if (activeTab === 'reactions') {
      list = list.filter((n) => n.type === 'reaction');
    } else if (activeTab === 'comments') {
      list = list.filter((n) => n.type === 'comment');
    } else if (activeTab === 'system') {
      list = list.filter((n) => n.type === 'system' || n.type === 'music_published');
    }

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      list = list.filter(
        (n: any) =>
          (n.content && n.content.toLowerCase().includes(q)) ||
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.request?.fromUser?.profile?.displayName &&
            n.request.fromUser.profile.displayName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allNotifications, activeTab, filterQuery]);

  // Overall Engagement Stats
  const totalReactions = useMemo(
    () => reactionNotifs.reduce((acc, curr) => acc + curr.count, 0),
    [reactionNotifs]
  );
  const totalComments = useMemo(
    () => commentNotifs.reduce((acc, curr) => acc + curr.count, 0),
    [commentNotifs]
  );

  // Trending User Posts
  const trendingUserPosts = useMemo(() => {
    return [...myPosts]
      .sort(
        (a, b) =>
          (b._count?.reactions || 0) +
          (b._count?.comments || 0) -
          ((a._count?.reactions || 0) + (a._count?.comments || 0))
      )
      .filter((p) => (p._count?.reactions || 0) + (p._count?.comments || 0) > 0)
      .slice(0, 4);
  }, [myPosts]);

  const isLight = themeMode === 'light';
  const shellBg = isLight ? 'glass-panel-light' : 'liquid-glass-shell';

  return (
    <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500 relative select-none">
      
      {/* Specular Ambient Backlight Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#eab308]/15 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#f59e0b]/15 blur-[140px] pointer-events-none -z-10" />

      {/* ══════════════════════════════════════════════════════════════════════
          1. FLOATING NOTIFICATIONS CAPSULE SIDEBAR (Padrão Lazer Pill Lateral)
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

        {/* Top: Avatar with Solar Amber Neon Ring */}
        <button
          onClick={() => {
            setActiveTab('all');
          }}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#eab308] p-0.5 hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(234,179,8,0.5)] cursor-pointer group relative bg-white/5"
          title="Início das Notificações"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full bg-[#eab308]/20 text-[#facc15] font-black text-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
          )}
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Action Navigation Icons */}
        <div className="flex flex-col items-center gap-3.5">
          {/* Todas */}
          <button
            onClick={() => setActiveTab('all')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'all'
                ? 'text-[#eab308] bg-white/15 shadow-[0_0_14px_rgba(234,179,8,0.4)] scale-110 border border-[#eab308]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Todos os Sinais"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {pendingReceived.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ef4444] text-white text-[9px] font-black flex items-center justify-center shadow-md">
                {pendingReceived.length}
              </span>
            )}
          </button>

          {/* Pedidos de Amizade */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'requests'
                ? 'text-[#eab308] bg-white/15 shadow-[0_0_14px_rgba(234,179,8,0.4)] scale-110 border border-[#eab308]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Pedidos de Amizade"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </button>

          {/* Reações / Votos */}
          <button
            onClick={() => setActiveTab('reactions')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'reactions'
                ? 'text-rose-400 bg-white/15 shadow-[0_0_14px_rgba(244,63,94,0.4)] scale-110 border border-rose-400/50'
                : 'text-white/50 hover:text-rose-400 hover:bg-white/5'
            }`}
            title="Reações Recebidas"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Comentários */}
          <button
            onClick={() => setActiveTab('comments')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'comments'
                ? 'text-cyan-400 bg-white/15 shadow-[0_0_14px_rgba(6,182,212,0.4)] scale-110 border border-cyan-400/50'
                : 'text-white/50 hover:text-cyan-400 hover:bg-white/5'
            }`}
            title="Comentários nas Publicações"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Atalho Alpha Friends */}
          <button
            onClick={() => onSelectView?.('friends')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#10b981] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Amigos da Rede"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>

          {/* Atalho Alpha Messages */}
          <button
            onClick={() => onSelectView?.('messages')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#3b82f6] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Mensagens Privadas"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

        {/* Bottom indicator jewel em Amber neon */}
        <div className="w-2 h-2 rounded-full bg-[#eab308] shadow-[0_0_10px_#eab308] animate-pulse" />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN VISIONOS SHELL WINDOW (Chrono Signal Stream & Radar)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border md:border-white/15 ${shellBg} flex flex-col md:flex-row overflow-hidden relative shadow-2xl transition-all duration-300`}
        style={{
          backdropFilter: 'blur(36px) saturate(140%)',
          WebkitBackdropFilter: 'blur(36px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* ── LEFT PANE: NOTIFICATIONS FEED STREAM ── */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-white/[0.08] overflow-hidden">
          
          {/* Header & Tabs */}
          <div className="p-4 sm:p-6 pb-3 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shrink-0 z-20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f59e0b] to-[#eab308] flex items-center justify-center text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Central de Notificações
                  <span className="w-5 h-5 rounded-full bg-[#ef4444] text-white text-[10px] font-black flex items-center justify-center shadow-md">
                    {filteredNotifications.length}
                  </span>
                </h1>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 transition-all cursor-pointer"
                  title="Fechar Notificações"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'requests', label: `Pedidos (${pendingReceived.length})` },
                { id: 'reactions', label: 'Reações' },
                { id: 'comments', label: 'Comentários' },
                { id: 'system', label: 'Sistema & Mídia' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as NotifTab)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white text-black shadow-md scale-[1.02]'
                        : 'bg-white/[0.05] hover:bg-white/[0.10] text-white/70 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications Scroll Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-3 opacity-60">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest">
                  Nenhum sinal recente
                </h4>
                <p className="text-xs text-white/50 max-w-xs">
                  A galáxia está silenciosa. Publica novos conteúdos ou conecta-te com amigos para gerar ondas!
                </p>
              </div>
            ) : (
              filteredNotifications.map((n: any) => {
                // 1. Friend Request Notification Card
                if (n.type === 'friend_request') {
                  const req = n.request;
                  const profile = req.fromUser?.profile;
                  return (
                    <div
                      key={n.id}
                      className="p-4 sm:p-5 rounded-[2rem] bg-white/[0.03] hover:bg-white/[0.06] border border-[#eab308]/30 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#eab308]/20 border border-[#eab308]/40 text-[#facc15] flex items-center justify-center shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                        </div>

                        <div
                          onClick={() => onProfileClick?.(req.fromUserId)}
                          className="cursor-pointer group min-w-0"
                        >
                          <h4 className="text-sm font-black text-white group-hover:text-[#facc15] transition-colors truncate">
                            {profile?.displayName || profile?.username || 'Utilizador'}
                          </h4>
                          <p className="text-xs text-white/60 truncate mt-0.5">
                            enviou-te um convite de amizade na rede Alpha
                          </p>
                          <span className="text-[10px] font-bold text-white/35 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => acceptFriendRequest(req.id, req.fromUserId)}
                          className="px-4 py-2 rounded-full bg-[#eab308] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[#facc15] hover:scale-105 active:scale-95 shadow-md transition-all cursor-pointer"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => rejectFriendRequest(req.id)}
                          className="px-4 py-2 rounded-full bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-400 font-extrabold text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  );
                }

                // 2. Reaction Notification Card
                if (n.type === 'reaction') {
                  return (
                    <div
                      key={n.id}
                      onClick={() => onPostClick?.(n.postId)}
                      className="p-4 sm:p-5 rounded-[2rem] bg-white/[0.03] hover:bg-white/[0.06] border border-rose-500/25 backdrop-blur-xl shadow-lg flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-white leading-tight">
                            Recebeste{' '}
                            <span className="text-rose-400 font-black">
                              {n.count} Reação{n.count !== 1 ? 'ões' : ''}
                            </span>{' '}
                            na tua publicação
                          </p>
                          <p className="text-xs text-white/50 truncate mt-1 italic">
                            "{n.content?.slice(0, 75)}"
                          </p>
                          <span className="text-[10px] font-bold text-white/35 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-white/40 uppercase tracking-widest shrink-0">
                        Ver Post →
                      </span>
                    </div>
                  );
                }

                // 3. Comment Notification Card
                if (n.type === 'comment') {
                  return (
                    <div
                      key={n.id}
                      onClick={() => onPostClick?.(n.postId)}
                      className="p-4 sm:p-5 rounded-[2rem] bg-white/[0.03] hover:bg-white/[0.06] border border-cyan-500/25 backdrop-blur-xl shadow-lg flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-white leading-tight">
                            Tens{' '}
                            <span className="text-cyan-400 font-black">
                              {n.count} Novo{n.count !== 1 ? 's' : ''} Comentário{n.count !== 1 ? 's' : ''}
                            </span>{' '}
                            no teu post
                          </p>
                          <p className="text-xs text-white/50 truncate mt-1 italic">
                            "{n.content?.slice(0, 75)}"
                          </p>
                          <span className="text-[10px] font-bold text-white/35 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-white/40 uppercase tracking-widest shrink-0">
                        Responder →
                      </span>
                    </div>
                  );
                }

                // 4. System / Media Notification Card
                return (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className="p-4 sm:p-5 rounded-[2rem] bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between gap-4 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
                        ✦
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white truncate">{n.title || 'Aviso Alpha'}</h4>
                        <p className="text-xs text-white/60 truncate mt-0.5">{n.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: ENGAGEMENT RADAR & PULSE ── */}
        <div className="hidden lg:flex w-80 xl:w-96 flex-col min-h-0 p-6 gap-6 bg-white/[0.01] overflow-y-auto custom-scrollbar shrink-0">
          
          {/* Profile Engagement Header Card */}
          <div className="p-5 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col items-center text-center shadow-lg">
            <div className="w-20 h-20 rounded-[24px] overflow-hidden border-2 border-[#eab308] p-0.5 mb-3 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              {userAvatar ? (
                <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-[20px]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-black text-white bg-white/10">
                  {userName[0]}
                </div>
              )}
            </div>

            <h3 className="text-base font-black text-white tracking-tight">{userName}</h3>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mt-0.5">
              Radar de Impacto na Rede
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mt-5 pt-4 border-t border-white/[0.08]">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                <span className="text-xl font-black text-rose-400">{totalReactions}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 mt-0.5">
                  Reações
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                <span className="text-xl font-black text-cyan-400">{totalComments}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 mt-0.5">
                  Respostas
                </span>
              </div>
            </div>
          </div>

          {/* Trending User Posts Showcase */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Publicações com Maior Tração
              </span>
            </div>

            {trendingUserPosts.length === 0 ? (
              <p className="text-xs text-white/30 italic text-center py-6">
                Ainda sem publicações com reações recentes.
              </p>
            ) : (
              trendingUserPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onPostClick?.(post.id)}
                  className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-all cursor-pointer group"
                >
                  <p className="text-xs font-semibold text-white/80 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2.5 text-[10px] font-black text-white/40">
                    <span className="text-rose-400 flex items-center gap-1">
                      ❤️ {post._count?.reactions || 0}
                    </span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      💬 {post._count?.comments || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

