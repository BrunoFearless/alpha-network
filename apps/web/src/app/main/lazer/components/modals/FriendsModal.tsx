'use client';

import React, { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FriendsModalProps {
  onClose: () => void;
  onProfileClick?: (userId: string) => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

type FriendTab = 'Sugestões' | 'Amigos' | 'Pedidos';

const TRENDING_TROPES = [
  { rank: 1, tag: '#EnemiesToLovers', sparkles: '15.2k' },
  { rank: 2, tag: '#SchoolFestival', sparkles: '8.4k' },
  { rank: 3, tag: '#ChildhoodFriend', sparkles: '5.1k' },
  { rank: 4, tag: '#RainyConfession', sparkles: '3.2k' },
];

export function FriendsModal({ onClose, onProfileClick, themeColor: c, themeMode }: FriendsModalProps) {
  const { user: authUser } = useAuthStore();
  const {
    feedPosts, friends, friendRequests,
    isFriend, hasSentRequest, sendFriendRequest, cancelFriendRequest,
    acceptFriendRequest, rejectFriendRequest, removeFriend, fetchFriends,
  } = useLazerStore();

  const [activeTab, setActiveTab] = useState<FriendTab>('Sugestões');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? `${c}40` : `${c}18`;

  useEffect(() => {
    fetchFriends();
    // Suggestions from feed posts
    const map = new Map<string, any>();
    feedPosts.forEach(p => {
      if (p.authorId !== authUser?.id && !map.has(p.authorId)) {
        map.set(p.authorId, {
          id: p.authorId,
          name: p.author?.profile?.displayName || p.author?.profile?.username || 'User',
          handle: `@${p.author?.profile?.username || 'user'}`,
          avatar: p.author?.profile?.avatarUrl || '',
          profile: p.author?.profile,
          bio: p.author?.profile?.bio || '',
        });
      }
    });
    setSuggestions(Array.from(map.values()));
  }, [feedPosts]);

  // Search users
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/users/search?q=${encodeURIComponent(search)}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults((data.data || data || []).filter((u: any) => (u.userId || u.id) !== authUser?.id));
        }
      } catch { /* silently */ }
      finally { setIsSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const myId = authUser?.id;
  const pendingReceived = friendRequests.filter(r => r.toUserId === myId && r.status === 'pending');
  const friendList = suggestions.filter(u => isFriend(u.id));

  const FriendCard = ({ id, name, handle, avatar, bio }: { id: string; name: string; handle: string; avatar: string; bio?: string }) => {
    const fStatus = isFriend(id) ? 'friend' : hasSentRequest(id) ? 'sent' : 'none';
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border-[1.5px] hover:scale-[1.01] transition-transform"
        style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}>
        <div className="cursor-pointer shrink-0" onClick={() => onProfileClick?.(id)}>
          <Avatar src={avatar} name={name} className="w-11 h-11 rounded-full"/>
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onProfileClick?.(id)}>
          <div className={`font-bold text-sm truncate ${textPrimary}`}>{name}</div>
          <div className={`text-[11px] ${textSecondary}`}>{handle}</div>
          {bio && <div className={`text-[11px] truncate mt-0.5 ${textSecondary} opacity-70`}>{bio}</div>}
        </div>
        <button
          onClick={() => {
            if (fStatus === 'friend') removeFriend(id);
            else if (fStatus === 'sent') cancelFriendRequest(id);
            else sendFriendRequest(id);
          }}
          className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] transition-all hover:scale-105 cursor-pointer"
          style={{
            background: fStatus === 'friend' ? '#ef444415' : fStatus === 'sent' ? `${c}20` : 'transparent',
            borderColor: fStatus === 'friend' ? '#ef4444' : fStatus === 'sent' ? c : borderCol,
            color: fStatus === 'friend' ? '#ef4444' : fStatus === 'sent' ? c : (isLight ? '#666' : '#aaa'),
          }}>
          {fStatus === 'friend' ? 'Remover' : fStatus === 'sent' ? 'Enviado' : '+ Seguir'}
        </button>
      </div>
    );
  };

  const TABS: FriendTab[] = ['Sugestões', 'Amigos', 'Pedidos'];

  return (
    <div className="fixed inset-0 z-[150] flex flex-col" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={themeMode}/></div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 shrink-0 border-b"
        style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)' }}>
        <button onClick={onClose}
          className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity ${textPrimary}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Voltar
        </button>
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Rede</span>
        <div className="w-20"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 sm:px-8 py-3 shrink-0 border-b overflow-x-auto"
        style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border-none cursor-pointer transition-all"
            style={{
              background: activeTab === tab ? c : 'transparent',
              color: activeTab === tab ? (isLight ? '#fff' : '#000') : (isLight ? '#888' : '#666'),
            }}>
            {tab}
            {tab === 'Pedidos' && pendingReceived.length > 0 && (
              <span className="ml-1.5 w-4 h-4 rounded-full text-[9px] font-black inline-flex items-center justify-center" style={{ background: '#ef4444', color: '#fff' }}>
                {pendingReceived.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-6 flex flex-col gap-6">

          {/* Search */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-[1.5px]"
            style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: isLight ? '#999' : '#666', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar utilizadores..."
              className={`flex-1 bg-transparent border-none outline-none text-sm ${textPrimary}`}
              style={{ caretColor: c }}/>
            {isSearching && <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: c, borderTopColor: 'transparent' }}/>}
          </div>

          {/* Search results */}
          {search.trim() ? (
            <section>
              <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-3 ${textSecondary}`}>Resultados</h2>
              {searchResults.length === 0 && !isSearching
                ? <p className={`text-sm italic ${textSecondary} opacity-50`}>Nenhum resultado.</p>
                : searchResults.map(u => (
                  <FriendCard key={u.userId || u.id} id={u.userId || u.id} name={u.displayName || u.username} handle={`@${u.username}`} avatar={u.avatarUrl} bio={u.bio}/>
                ))}
            </section>
          ) : activeTab === 'Sugestões' ? (
            <div className="flex flex-col gap-6">
              <section>
                <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-3 ${textSecondary}`}>Pessoas que talvez conheças</h2>
                {suggestions.length === 0
                  ? <p className={`text-sm italic ${textSecondary} opacity-50`}>Aparece assim que outros utilizadores publicarem.</p>
                  : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{suggestions.map(u => <FriendCard key={u.id} {...u} name={u.name}/>)}</div>}
              </section>

              {/* Trending Tropes */}
              <section>
                <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-3 ${textSecondary}`}>🔥 Trending Tropes</h2>
                <div className="flex flex-col gap-2">
                  {TRENDING_TROPES.map(t => (
                    <div key={t.rank} className="flex items-center gap-4 px-4 py-3 rounded-xl border-[1.5px]"
                      style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}>
                      <span className="font-black text-lg w-6 text-center" style={{ color: t.rank === 1 ? '#fbbf24' : (isLight ? '#ccc' : '#555') }}>{t.rank}</span>
                      <span className={`flex-1 font-bold text-sm ${textPrimary}`}>{t.tag}</span>
                      <span className={`text-[11px] font-bold ${textSecondary}`}>{t.sparkles} ✨</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : activeTab === 'Amigos' ? (
            <section>
              <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-3 ${textSecondary}`}>Os teus amigos ({friendList.length})</h2>
              {friendList.length === 0
                ? <p className={`text-sm italic ${textSecondary} opacity-50`}>Ainda não tens amigos. Vai às Sugestões!</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{friendList.map(u => <FriendCard key={u.id} {...u} name={u.name}/>)}</div>}
            </section>
          ) : activeTab === 'Pedidos' ? (
            <section>
              <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-3 ${textSecondary}`}>Pedidos recebidos ({pendingReceived.length})</h2>
              {pendingReceived.length === 0
                ? <p className={`text-sm italic ${textSecondary} opacity-50`}>Nenhum pedido pendente.</p>
                : (
                  <div className="flex flex-col gap-3">
                    {pendingReceived.map(req => {
                      const fp = req.fromUser?.profile;
                      return (
                        <div key={req.id} className="flex items-center gap-3 p-4 rounded-2xl border-[1.5px]"
                          style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}>
                          <div className="cursor-pointer shrink-0" onClick={() => onProfileClick?.(req.fromUserId)}>
                            <Avatar src={fp?.avatarUrl} name={fp?.displayName || fp?.username || '?'} className="w-11 h-11 rounded-full"/>
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onProfileClick?.(req.fromUserId)}>
                            <div className={`font-bold text-sm ${textPrimary}`}>{fp?.displayName || fp?.username || 'Utilizador'}</div>
                            <div className={`text-[11px] ${textSecondary}`}>@{fp?.username}</div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => acceptFriendRequest(req.id, req.fromUserId)}
                              className="px-3 py-1.5 rounded-full text-[11px] font-bold border-none cursor-pointer text-black hover:scale-105 transition-transform"
                              style={{ background: c }}>Aceitar</button>
                            <button onClick={() => rejectFriendRequest(req.id)}
                              className="px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] cursor-pointer bg-transparent hover:scale-105 transition-transform"
                              style={{ borderColor: '#ef4444', color: '#ef4444' }}>Recusar</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}