'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { resolveUrl } from '@/lib/api';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface LazerFriendsViewProps {
  onClose?: () => void;
  onSelectView?: (view: any) => void;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  userAvatar?: string;
  userName?: string;
  onProfileClick?: (userId: string) => void;
  onChatClick?: (userId: string) => void;
}

type FriendTab = 'friends' | 'suggestions' | 'requests';

export function LazerFriendsView({
  onClose,
  onSelectView,
  themeColor = '#10b981',
  themeMode = 'dark',
  userAvatar,
  userName = 'Utilizador',
  onProfileClick,
  onChatClick,
}: LazerFriendsViewProps) {
  const { user: authUser } = useAuthStore() as any;
  const {
    friends,
    friendProfiles,
    friendRequests,
    isFriend,
    hasSentRequest,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    fetchFriends,
    suggestions: globalSuggestions,
    fetchSuggestions,
  } = useLazerStore();

  const { startConversation } = useChatStore();

  const [activeTab, setActiveTab] = useState<FriendTab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
    fetchSuggestions();
  }, [fetchFriends, fetchSuggestions]);

  const myId = authUser?.id;

  // Pending Friend Requests (received & sent)
  const pendingReceived = useMemo(
    () => friendRequests.filter((r) => r.toUserId === myId && r.status === 'pending'),
    [friendRequests, myId]
  );
  const pendingSent = useMemo(
    () => friendRequests.filter((r) => r.fromUserId === myId && r.status === 'pending'),
    [friendRequests, myId]
  );

  // Formatted Suggestions
  const suggestions = useMemo(() => {
    return globalSuggestions.map((p: any) => ({
      id: p.userId || p.id,
      name: p.displayName || p.username || 'Utilizador',
      handle: `@${p.username || 'user'}`,
      avatar: p.avatarUrl || '',
      profile: p,
      bio: p.bio || '',
      bannerUrl: p.bannerUrl,
      status: p.status || 'offline',
    }));
  }, [globalSuggestions]);

  // Online Friends
  const onlineFriends = useMemo(() => {
    return friendProfiles.filter((f: any) => {
      const p = f.profile || f;
      return p?.status === 'online';
    });
  }, [friendProfiles]);

  // Filtered Friends by Search
  const filteredFriends = useMemo(() => {
    let list = friendProfiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f: any) => {
        const p = f.profile || f;
        const name = (p.displayName || p.username || '').toLowerCase();
        const handle = (p.username || '').toLowerCase();
        const bio = (p.bio || '').toLowerCase();
        return name.includes(q) || handle.includes(q) || bio.includes(q);
      });
    }
    return list;
  }, [friendProfiles, searchQuery]);

  // Filtered Suggestions by Search
  const filteredSuggestions = useMemo(() => {
    let list = suggestions.filter(
      (u) =>
        !isFriend(u.id) &&
        !hasSentRequest(u.id) &&
        !pendingReceived.some((r) => r.fromUserId === u.id)
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.handle.toLowerCase().includes(q) ||
          u.bio.toLowerCase().includes(q)
      );
    }
    return list;
  }, [suggestions, isFriend, hasSentRequest, pendingReceived, searchQuery]);

  // Quick Open Chat
  const handleOpenChat = async (userId: string) => {
    if (onChatClick) {
      onChatClick(userId);
    } else {
      const convId = await startConversation(userId);
      if (convId) {
        onSelectView?.('messages');
      }
    }
  };

  const isLight = themeMode === 'light';
  const shellBg = isLight ? 'glass-panel-light' : 'liquid-glass-shell';

  return (
    <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500 relative select-none">
      
      {/* Specular Ambient Backlight Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#10b981]/15 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#059669]/15 blur-[140px] pointer-events-none -z-10" />

      {/* ══════════════════════════════════════════════════════════════════════
          1. FLOATING FRIENDS CAPSULE SIDEBAR (Padrão Lazer Pill Lateral)
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

        {/* Top: Avatar with Emerald Neon Ring */}
        <button
          onClick={() => {
            setActiveTab('friends');
          }}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#10b981] p-0.5 hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(16,185,129,0.5)] cursor-pointer group relative bg-white/5"
          title="Círculo de Amigos"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full bg-[#10b981]/20 text-[#34d399] font-black text-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
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
          {/* Amigos */}
          <button
            onClick={() => setActiveTab('friends')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'friends'
                ? 'text-[#10b981] bg-white/15 shadow-[0_0_14px_rgba(16,185,129,0.4)] scale-110 border border-[#10b981]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Meus Amigos"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>

          {/* Sugestões / Descoberta */}
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'suggestions'
                ? 'text-[#10b981] bg-white/15 shadow-[0_0_14px_rgba(16,185,129,0.4)] scale-110 border border-[#10b981]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Descobrir Conexões"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </button>

          {/* Pedidos */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'requests'
                ? 'text-[#10b981] bg-white/15 shadow-[0_0_14px_rgba(16,185,129,0.4)] scale-110 border border-[#10b981]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Pedidos Pendentes"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            {pendingReceived.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ef4444] text-white text-[9px] font-black flex items-center justify-center shadow-md">
                {pendingReceived.length}
              </span>
            )}
          </button>

          {/* Atalho Messages */}
          <button
            onClick={() => onSelectView?.('messages')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#3b82f6] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Messages"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Atalho Notifications */}
          <button
            onClick={() => onSelectView?.('notifications')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#eab308] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Notificações"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

        {/* Bottom indicator jewel em Emerald neon */}
        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981] animate-pulse" />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN VISIONOS SHELL WINDOW (Social Constellation & Directory)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border md:border-white/15 ${shellBg} flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300`}
        style={{
          backdropFilter: 'blur(36px) saturate(140%)',
          WebkitBackdropFilter: 'blur(36px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* ── TOP HEADER & ORBIT SEARCH ── */}
        <header className="px-5 sm:px-8 py-4 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shrink-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#059669] to-[#10b981] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Círculo de Amigos
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/30 font-black">
                    {friendProfiles.length} Amigos
                  </span>
                </h1>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="sm:hidden w-8 h-8 rounded-full bg-white/[0.07] hover:bg-red-500/20 text-white/60 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Bar & Close Button */}
          <div className="flex items-center gap-3 flex-1 max-w-md mx-auto sm:mx-0">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por nome, @handle ou biografia..."
                className="w-full h-10 pl-4 pr-10 rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold placeholder-white/40 outline-none transition-all shadow-inner focus:border-[#10b981]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="hidden sm:flex w-8 h-8 rounded-full bg-white/[0.07] hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 items-center justify-center text-white/60 hover:text-red-400 transition-all cursor-pointer shrink-0"
                title="Fechar Amigos"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* ── TABS NAVIGATION BAR ── */}
        <div className="px-5 sm:px-8 py-3 border-b border-white/[0.06] bg-white/[0.01] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'friends', label: `Amigos Ativos (${friendProfiles.length})` },
            { id: 'suggestions', label: 'Descobrir Conexões' },
            { id: 'requests', label: `Pedidos Pendentes (${pendingReceived.length + pendingSent.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FriendTab)}
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

        {/* ── MAIN CONTENT BODY ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar">
          
          {/* ── TAB 1: AMIGOS ATIVOS ── */}
          {activeTab === 'friends' && (
            <div className="flex flex-col gap-6">
              
              {/* Online Friends Orbit Strip */}
              {onlineFriends.length > 0 && (
                <div className="p-4 sm:p-5 rounded-[2.2rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                    Amigos Online Agora ({onlineFriends.length})
                  </span>

                  <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
                    {onlineFriends.map((friend: any) => {
                      const p = friend.profile || friend;
                      const fId = friend.id || friend.userId;
                      return (
                        <div
                          key={fId}
                          onClick={() => handleOpenChat(fId)}
                          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                        >
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-400/80 p-0.5 group-hover:scale-105 transition-transform bg-white/10">
                              <Avatar
                                src={p.avatarUrl}
                                name={p.displayName || p.username}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
                          </div>
                          <span className="text-[11px] font-bold text-white group-hover:text-emerald-400 transition-colors max-w-[70px] truncate text-center">
                            {p.displayName || p.username}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Friends Grid */}
              {filteredFriends.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center justify-center gap-3 opacity-60">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-2xl">
                    👥
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">
                    Nenhum amigo encontrado
                  </h4>
                  <p className="text-xs text-white/50 max-w-xs">
                    Explora a aba "Descobrir Conexões" para adicionar pessoas com interesses semelhantes aos teus!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredFriends.map((friend: any) => {
                    const p = friend.profile || friend;
                    const fId = friend.id || friend.userId;
                    const isOnline = p.status === 'online';

                    return (
                      <div
                        key={fId}
                        className="rounded-[2.2rem] overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/25 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col group relative"
                      >
                        {/* Banner & Floating Avatar Container */}
                        <div className="relative shrink-0">
                          {/* Banner Cover */}
                          <div
                            className="h-24 relative overflow-hidden rounded-t-[2.2rem]"
                            style={{
                              background: `linear-gradient(135deg, ${p.themeColor || '#10b981'}70, rgba(255,255,255,0.06))`,
                            }}
                          >
                            {p.bannerUrl && (
                              <img
                                src={resolveUrl(p.bannerUrl)}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                            {/* Online Badge */}
                            <span
                              className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-md border ${
                                isOnline
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-white/10 text-white/50 border-white/15'
                              }`}
                            >
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          {/* Avatar - posicionado livremente sobre o banner sem ser recortado por overflow-hidden */}
                          <div
                            onClick={() => onProfileClick?.(fId)}
                            className="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl border-2 border-white/40 ring-4 ring-black/25 shadow-[0_8px_20px_rgba(0,0,0,0.4)] overflow-hidden cursor-pointer bg-white/10 backdrop-blur-md z-20 group-hover:scale-105 transition-transform"
                          >
                            <Avatar
                              src={p.avatarUrl}
                              name={p.displayName || p.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="pt-8 p-5 flex flex-col flex-1 justify-between gap-3">
                          <div>
                            <div
                              onClick={() => onProfileClick?.(fId)}
                              className="cursor-pointer group/name"
                            >
                              <h3 className="text-base font-black text-white group-hover/name:text-emerald-400 transition-colors truncate">
                                {p.displayName || p.username}
                              </h3>
                              <p className="text-xs text-white/40">@{p.username}</p>
                            </div>

                            {p.bio && (
                              <p className="text-xs text-white/60 line-clamp-2 mt-2 leading-relaxed">
                                {p.bio}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                            <button
                              onClick={() => handleOpenChat(fId)}
                              className="flex-1 py-2 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>Mensagem</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => onProfileClick?.(fId)}
                              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                              title="Ver Perfil Completo"
                            >
                              ↗
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: DESCOBRIR CONEXÕES ── */}
          {activeTab === 'suggestions' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">Sugestões de Amizade</h3>
                  <p className="text-xs text-white/50">
                    Pessoas ativas na rede Alpha que partilham do teu gosto cultural e artístico.
                  </p>
                </div>
              </div>

              {filteredSuggestions.length === 0 ? (
                <div className="py-20 text-center opacity-60 flex flex-col items-center gap-2">
                  <p className="text-sm font-bold text-white">Sem novas sugestões de momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredSuggestions.map((u) => {
                    const isSent = hasSentRequest(u.id);
                    return (
                      <div
                        key={u.id}
                        className="rounded-[2.2rem] overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 backdrop-blur-xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            onClick={() => onProfileClick?.(u.id)}
                            className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 border border-white/20 cursor-pointer shrink-0"
                          >
                            <Avatar src={u.avatar} name={u.name} className="w-full h-full object-cover" />
                          </div>

                          <div className="min-w-0">
                            <h4
                              onClick={() => onProfileClick?.(u.id)}
                              className="text-sm font-black text-white truncate cursor-pointer hover:underline"
                            >
                              {u.name}
                            </h4>
                            <p className="text-xs text-white/40 truncate">{u.handle}</p>
                          </div>
                        </div>

                        {u.bio && (
                          <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                            {u.bio}
                          </p>
                        )}

                        <button
                          onClick={async () => {
                            if (isSent) {
                              await cancelFriendRequest(u.id);
                            } else {
                              await sendFriendRequest(u.id);
                            }
                          }}
                          className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                            isSent
                              ? 'bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/15'
                              : 'bg-[#10b981] hover:bg-[#059669] text-white hover:scale-105 active:scale-95'
                          }`}
                        >
                          {isSent ? 'Pedido Enviado ✓' : '+ Adicionar Amigo'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: PEDIDOS PENDENTES ── */}
          {activeTab === 'requests' && (
            <div className="flex flex-col gap-6">
              
              {/* Pedidos Recebidos */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  Pedidos Recebidos
                  <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#34d399] text-xs font-bold">
                    {pendingReceived.length}
                  </span>
                </h3>

                {pendingReceived.length === 0 ? (
                  <p className="text-xs text-white/40 italic py-4">Nenhum pedido de amizade recebido.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pendingReceived.map((req) => {
                      const p = req.fromUser?.profile;
                      return (
                        <div
                          key={req.id}
                          className="p-4 rounded-[2rem] bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 backdrop-blur-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={p?.avatarUrl}
                              name={p?.displayName || p?.username || 'Utilizador'}
                              className="w-12 h-12 rounded-2xl border border-white/20 shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-white truncate">
                                {p?.displayName || p?.username}
                              </h4>
                              <p className="text-xs text-white/40">@{p?.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => acceptFriendRequest(req.id, req.fromUserId)}
                              className="px-3.5 py-1.5 rounded-full bg-[#10b981] text-white font-extrabold text-xs uppercase shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              Aceitar
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(req.id)}
                              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 font-extrabold text-xs uppercase cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pedidos Enviados */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  Pedidos Enviados por Ti
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs font-bold">
                    {pendingSent.length}
                  </span>
                </h3>

                {pendingSent.length === 0 ? (
                  <p className="text-xs text-white/40 italic py-4">Nenhum pedido pendente enviado.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pendingSent.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-[2rem] bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 backdrop-blur-xl"
                      >
                        <span className="text-xs font-bold text-white/70 truncate">
                          Convite enviado · Aguarda aprovação
                        </span>

                        <button
                          onClick={() => cancelFriendRequest(req.toUserId)}
                          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 font-bold text-xs cursor-pointer"
                        >
                          Cancelar Convite
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
