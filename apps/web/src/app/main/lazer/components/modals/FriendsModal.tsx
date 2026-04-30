'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FriendTab = 'Sugestões' | 'Amigos' | 'Pedidos';
const TABS: FriendTab[] = ['Sugestões', 'Amigos', 'Pedidos'];

// Icons
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconActivity = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;

interface FriendsModalProps {
  onClose: () => void;
  onProfileClick?: (userId: string) => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

export function FriendsModal({ onClose, onProfileClick, themeColor: c, themeMode }: FriendsModalProps) {
  const { user: authUser } = useAuthStore();
  const {
    feedPosts, friends, friendProfiles, friendRequests,
    isFriend, hasSentRequest, sendFriendRequest, cancelFriendRequest,
    acceptFriendRequest, rejectFriendRequest, removeFriend, fetchFriends,
    suggestions: globalSuggestions, fetchSuggestions,
  } = useLazerStore();

  const [activeTab, setActiveTab] = useState<FriendTab>('Amigos');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? `${c}40` : `${c}18`;

  useEffect(() => {
    fetchFriends();
    fetchSuggestions();
  }, []);

  // Format global suggestions for the UI
  const suggestions = useMemo(() => {
    return globalSuggestions.map((p: any) => ({
      id: p.userId || p.id,
      name: p.displayName || p.username || 'User',
      handle: `@${p.username || 'user'}`,
      avatar: p.avatarUrl || '',
      profile: p,
      bio: p.bio || '',
    }));
  }, [globalSuggestions]);

  // Instant Local Search (Search in suggestions, friends, and requests)
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    
    setTimeout(() => {
      const q = search.toLowerCase();
      
      const allUsers = [
        ...suggestions,
        ...friendProfiles,
        ...friendRequests.filter(r => r.fromUser).map(r => ({
          id: r.fromUserId,
          name: r.fromUser?.profile?.displayName || r.fromUser?.profile?.username || 'User',
          handle: `@${r.fromUser?.profile?.username || 'user'}`,
          avatar: r.fromUser?.profile?.avatarUrl || '',
          profile: r.fromUser?.profile,
          bio: r.fromUser?.profile?.bio || '',
        }))
      ];
      
      // Deduplicate by ID
      const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());

      const res = uniqueUsers.filter((u: any) => {
         const name = (u.name || '').toLowerCase();
         const handle = (u.profile?.username || '').toLowerCase();
         const bio = (u.bio || '').toLowerCase();
         const tags = (u.profile?.tags || '').toLowerCase();
         return name.includes(q) || handle.includes(q) || bio.includes(q) || tags.includes(q);
      });
      
      setSearchResults(res);
      setIsSearching(false);
    }, 150);
  }, [search, suggestions, friendProfiles, friendRequests]);

  const myId = authUser?.id;
  const pendingReceived = useMemo(() => friendRequests.filter(r => r.toUserId === myId && r.status === 'pending'), [friendRequests, myId]);
  const currentlySent = friendRequests.filter(r => r.fromUserId === myId && r.status === 'pending');
  const friendList = friendProfiles; // Agora usamos os perfis reais descarregados!
  const nonFriends = suggestions.filter(u => !isFriend(u.id) && !hasSentRequest(u.id) && !pendingReceived.some(r => r.fromUserId === u.id));

  // Determine Main Feed List
  const renderList = search.trim() ? searchResults : (activeTab === 'Amigos' ? friendList : activeTab === 'Sugestões' ? nonFriends : pendingReceived);

  // Modern Premium Friend Card (Similar to Explore Creators)
  const FriendCard = ({ uid, profileParam, avatarUrl, bio }: { uid: string; profileParam?: any; avatarUrl?: string; bio?: string }) => {
    const p = profileParam || {};
    const nameStr = p.displayName || p.username || 'User';
    const fStatus = isFriend(uid) ? 'friend' : hasSentRequest(uid) ? 'sent' : 'none';
    const isPendingRecv = pendingReceived.find(r => r.fromUserId === uid);

    const isVideo = p.bannerUrl && (p.bannerUrl.includes('.mp4') || p.bannerUrl.includes('.webm'));

    return (
      <div className="relative rounded-[32px] overflow-hidden border-[1.5px] cursor-pointer group shadow-lg min-h-[300px] flex flex-col"
        style={{ borderColor: borderCol, background: cardBg }}
        onClick={() => onProfileClick?.(uid)}>

        {/* Deep Full Background Image or Video */}
        <div className="absolute inset-0 transition-transform duration-1000 ease-out group-hover:scale-110">
          {p.bannerUrl ? (
            isVideo ? (
              <video src={p.bannerUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ opacity: 0.6, filter: 'blur(8px) brightness(0.7)' }} />
            ) : (
              <img src={p.bannerUrl} alt="" className="w-full h-full object-cover" style={{ opacity: 0.6, filter: 'blur(8px) brightness(0.7)' }} />
            )
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${c}60, ${c}10)`, opacity: 0.3 }} />
          )}
        </div>
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.9) 100%)` }} />

        {/* Content Rendered Over Image */}
        <div className="relative p-6 flex flex-col items-center text-center h-full pt-8 flex-1">
          <Avatar src={avatarUrl || p.avatarUrl} name={nameStr} className="w-[88px] h-[88px] rounded-[28px] shadow-2xl mb-4 border-[2.5px] group-hover:scale-105 transition-transform" style={{ borderColor: c }} />
          <DisplayName profile={p} fallbackName={nameStr} className={`font-black text-[18px] truncate max-w-full text-white`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }} />
          <p className={`text-[12px] font-bold mt-1 text-white/70 drop-shadow-md tracking-wide`}>@{p.username || 'user'}</p>

          {bio && <p className={`text-[12px] font-semibold leading-relaxed line-clamp-2 mt-4 text-white/95 drop-shadow-md px-1`}>{bio}</p>}

          <div className="mt-4 flex flex-wrap justify-center gap-1.5 w-full">
            {p.tags && p.tags.split(',').slice(0, 3).map((tag: string, i: number) => (
              <span key={`tag-${i}`} className="text-[9.5px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md bg-black/50 text-white border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>{tag.trim()}</span>
            ))}
            {p.status && (
              <span className="text-[9.5px] uppercase font-black tracking-widest px-2.5 py-1 rounded-md bg-white/20 text-white backdrop-blur-md flex items-center gap-1"><i>•</i> {p.status}</span>
            )}
          </div>

          <div className="mt-auto pt-6 w-full shrink-0 flex flex-col gap-2">
            {isPendingRecv ? (
              <div className="flex gap-2 w-full">
                <button onClick={e => { e.stopPropagation(); acceptFriendRequest(isPendingRecv.id, isPendingRecv.fromUserId); }}
                  className="flex-1 py-3 rounded-full font-black text-white hover:scale-105 transition-transform shadow-md border-none text-[11px] uppercase tracking-widest"
                  style={{ background: c }}>Aceitar</button>
                <button onClick={e => { e.stopPropagation(); rejectFriendRequest(isPendingRecv.id); }}
                  className="flex-1 py-3 rounded-full font-black text-white hover:bg-red-500 hover:border-red-500 transition-colors border-[1.5px] text-[11px] uppercase tracking-widest bg-black/20 backdrop-blur-md"
                  style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Recusar</button>
              </div>
            ) : (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (fStatus === 'friend') removeFriend(uid);
                  else if (fStatus === 'sent') cancelFriendRequest(uid);
                  else sendFriendRequest(uid);
                }}
                className="w-full py-3 rounded-full text-[11px] font-black uppercase tracking-widest border-[1.5px] transition-all hover:scale-[1.02] active:scale-95 shadow-md backdrop-blur-md"
                style={{
                  background: fStatus === 'friend' ? 'rgba(255,255,255,0.1)' : fStatus === 'sent' ? 'rgba(249,115,22,0.8)' : c,
                  borderColor: fStatus === 'friend' ? 'rgba(255,255,255,0.2)' : fStatus === 'sent' ? '#f97316' : c,
                  color: '#fff',
                }}>
                {fStatus === 'friend' ? '✓ Remover' : fStatus === 'sent' ? 'Pendente' : '+ Conectar'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col font-['Nunito',sans-serif]" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={themeMode} /></div>

      {/* Explorer/Network Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 shrink-0 border-b backdrop-blur-2xl"
        style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}>
        <button onClick={onClose}
          className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity ${textPrimary}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Voltar
        </button>
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Rede Interativa</span>
        <div className="w-20" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_340px] gap-8 items-start relative z-10">

          {/* ─────────────────── LEFT SIDEBAR ─────────────────── */}
          <aside className="hidden lg:flex flex-col gap-6 sticky top-6">

            {/* My Profile Quick Look (from ExploreModal match) */}
            {authUser?.profile && (
              <div className={`rounded-[32px] overflow-hidden border-[1.5px] backdrop-blur-xl shadow-lg ${cardBg}`} style={{ borderColor: borderCol }}>
                <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${c}80, ${c}20)` }}>
                  {authUser.profile.bannerUrl && (
                    authUser.profile.bannerUrl.includes('.mp4') || authUser.profile.bannerUrl.includes('.webm') ? (
                      <video src={authUser.profile.bannerUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <img src={authUser.profile.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="flex flex-col items-center px-5 pb-6">
                  <div className="-mt-14 mb-3 w-[88px] h-[88px] rounded-[24px] border-[3px] overflow-hidden shadow-2xl relative z-10 bg-black" style={{ borderColor: isLight ? '#fff' : '#000' }}>
                    <Avatar src={authUser.profile.avatarUrl} name={authUser.profile.username || 'user'} className="w-full h-full object-cover" />
                  </div>
                  <DisplayName profile={authUser.profile} fallbackName={authUser.profile.displayName || authUser.profile?.username || 'User'} className="font-black text-[18px] text-center" />
                  <p className={`text-[13px] mt-0.5 font-bold tracking-wide ${textSecondary}`}>@{authUser.profile?.username || 'user'}</p>
                </div>
              </div>
            )}

            {/* My Stats Panel */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm ${cardBg}`} style={{ borderColor: borderCol }}>
              <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-5 ${textSecondary}`}>Estado da Rede</h3>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center rounded-[16px] shadow-sm text-white" style={{ background: c }}>
                    <IconUsers />
                  </div>
                  <div>
                    <p className={`text-[20px] font-black leading-tight ${textPrimary}`}>{friends.length}</p>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>Conexões</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center rounded-[16px] shadow-sm border border-black/10 dark:border-white/10" style={{ background: `${c}20`, color: c }}>
                    <IconActivity />
                  </div>
                  <div>
                    <p className={`text-[20px] font-black leading-tight ${textPrimary}`}>{currentlySent.length}</p>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>Convites Enviados</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ─────────────────── MAIN FEED ─────────────────── */}
          <main className="flex flex-col w-full h-full min-h-[500px]">

            {/* Search Bar Premium */}
            <div className="relative z-20 group mb-6">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none transition-colors group-focus-within:text-white" style={{ color: isLight ? '#999' : '#666' }}>
                <IconSearch />
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Procura na tua rede ou na Lazer Global..."
                className={`w-full py-5 pl-14 pr-6 rounded-[24px] border-[2px] font-extrabold text-[15px] outline-none transition-all shadow-lg focus:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:-translate-y-1 ${textPrimary} ${cardBg}`}
                style={{ borderColor: search.trim() ? c : borderCol, backdropFilter: 'blur(30px)', backgroundColor: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }} />
            </div>

            {/* Pill Tab Navigator */}
            {!search.trim() && (
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 sticky top-6 z-30">
                {TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="relative px-7 py-3 rounded-full text-[14px] font-black tracking-wide border-none cursor-pointer transition-all shrink-0 shadow-sm"
                    style={{
                      background: activeTab === tab ? c : cardBg,
                      boxShadow: activeTab === tab ? `0 8px 24px ${c}50` : '0 2px 10px rgba(0,0,0,0.05)',
                      color: activeTab === tab ? '#fff' : (isLight ? '#333' : '#eee'),
                      border: `1.5px solid ${activeTab === tab ? 'transparent' : borderCol}`
                    }}>
                    {tab}
                    {tab === 'Pedidos' && pendingReceived.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black inline-flex items-center justify-center border-2 shadow-lg animate-pulse"
                        style={{ background: '#ef4444', color: '#fff', borderColor: isLight ? '#fff' : '#000' }}>
                        {pendingReceived.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between mb-4 mt-2 px-2">
              <h2 className={`text-[19px] font-black tracking-tight ${textPrimary}`}>
                {search.trim() ? 'Resultados Globais' : activeTab === 'Amigos' ? 'A tua rede pessoal' : activeTab === 'Sugestões' ? 'Lazer Network' : 'Pendentes de aprovação'}
              </h2>
            </div>

            {/* Feed Cards List */}
            {renderList.length === 0 && !isSearching ? (
              <div className={`p-16 text-center rounded-[32px] border-[1.5px] mt-4 flex flex-col items-center justify-center gap-4 ${cardBg}`} style={{ borderColor: borderCol }}>
                <IconSearch />
                <p className={`text-[15px] font-bold ${textSecondary} opacity-60`}>A galáxia está um bocado vazia por aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-20">
                {search.trim()
                  ? renderList.map((u: any) => <FriendCard key={u.id} uid={u.id} profileParam={u.profile} avatarUrl={u.avatar} bio={u.bio} />)
                  : activeTab === 'Pedidos'
                    ? renderList.map((req: any) => <FriendCard key={req.fromUserId} uid={req.fromUserId} profileParam={req.fromUser?.profile} bio={req.fromUser?.profile?.bio} />)
                    : renderList.map((u: any) => <FriendCard key={u.id} uid={u.id} profileParam={u.profile} avatarUrl={u.avatar} bio={u.bio} />)
                }
              </div>
            )}

          </main>

          {/* ─────────────────── RIGHT SIDEBAR ─────────────────── */}
          <aside className="hidden xl:flex flex-col gap-6 sticky top-6">

            {/* Action Required: Pendentes */}
            {pendingReceived.length > 0 && (
              <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-xl relative overflow-hidden`} style={{ background: cardBg, borderColor: `${c}60` }}>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: c }} />
                <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-5 text-white flex items-center justify-between`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  <span>Ação Necessária</span>
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full shadow-lg">{pendingReceived.length}</span>
                </h3>

                <div className="flex flex-col gap-3 relative z-10">
                  {pendingReceived.slice(0, 3).map(req => {
                    const p = req.fromUser?.profile;
                    return (
                      <div key={req.id} className="flex items-center gap-3 w-full bg-black/20 dark:bg-white/10 p-3 rounded-[20px] transition-transform hover:scale-[1.02]">
                        <Avatar src={p?.avatarUrl} name={p?.displayName || p?.username || '?'} className="w-10 h-10 rounded-[14px] shadow-md border-[1.5px]" style={{ borderColor: c }} />
                        <div className="flex-1 min-w-0 pr-1">
                          <DisplayName profile={p} fallbackName={p?.displayName || p?.username || 'User'} className={`text-[13px] font-extrabold truncate text-white`} />
                          <p className={`text-[10px] font-bold mt-0.5 text-white/60`}>quer conectar-se.</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => acceptFriendRequest(req.id, req.fromUserId)} className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold hover:scale-110 transition-transform shadow-md border-none" style={{ background: c }}><IconCheck /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sugestões Rápidas (Right Sidebar Pin) */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm ${cardBg}`} style={{ borderColor: borderCol }}>
              <div className="flex items-center gap-2 mb-5">
                <IconActivity />
                <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] ${textPrimary}`}>Rede Ativa</h3>
              </div>
              <div className="flex flex-col gap-4">
                {nonFriends.length === 0 ? (
                  <p className={`text-[12px] italic text-center py-4 ${textSecondary}`}>Sem atividade registada na rede.</p>
                ) : (
                  nonFriends.slice(0, 5).map(u => {
                    const fStatus = hasSentRequest(u.id) ? 'sent' : 'none';
                    return (
                      <div key={u.id} className="flex items-center gap-3 w-full cursor-pointer group" onClick={() => onProfileClick?.(u.id)}>
                        <Avatar src={u.avatar} name={u.name} className="w-11 h-11 rounded-[16px] shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <DisplayName profile={u.profile} fallbackName={u.name} className={`text-[14px] font-extrabold truncate ${textPrimary}`} />
                          <p className={`text-[11px] font-bold mt-0.5 opacity-60 ${textSecondary}`}>@{u.profile?.username || 'user'}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); fStatus === 'sent' ? cancelFriendRequest(u.id) : sendFriendRequest(u.id); }}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-[10px] font-bold border-2 transition-all hover:scale-110 shadow-sm"
                          style={{
                            background: fStatus === 'sent' ? 'rgba(249,115,22,0.12)' : c,
                            borderColor: fStatus === 'sent' ? '#f97316' : c,
                            color: fStatus === 'sent' ? '#f97316' : '#fff',
                          }}>
                          {fStatus === 'sent' ? '…' : '+'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}