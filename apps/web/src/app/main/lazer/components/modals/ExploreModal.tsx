'use client';

import React, { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CATEGORIES = ['All', 'Romance', 'Slice of Life', 'Drama', 'Fantasy', 'Comedy', 'School Life'];

// Icons
const IconFlame = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
const IconTv = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>;
const IconMessageSquare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconHash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IconStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;

const PREMIUM_FONTS = [
  { id: 'default', label: 'Default', family: "'Nunito', sans-serif" },
  { id: 'serif', label: 'Serif', family: "'Playfair Display', serif" },
  { id: 'mono', label: 'Mono', family: "'Fira Code', monospace" },
  { id: 'display', label: 'Display', family: "'Outfit', sans-serif" },
  { id: 'elegant', label: 'Elegant', family: "'Libre Baskerville', serif" },
];

function formatContent(content: string, postTitleFont?: string | null, postTitleColor?: string | null, isLight?: boolean) {
  if (!content) return null;
  const lines = content.split('\n');
  const title = lines[0];
  const body = lines.slice(1).join('\n');
  const fontData = PREMIUM_FONTS.find(f => f.id === postTitleFont) || PREMIUM_FONTS[0];
  const titleCol = postTitleColor || (isLight ? '#000000' : '#ffffff');
  return (
    <div className="flex flex-col h-full">
      <div className="font-black text-[22px] xl:text-[26px] leading-[1.05] tracking-tight uppercase mb-2 line-clamp-2" style={{ fontFamily: fontData.family, color: titleCol, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <EmojiRenderer content={title} emojiSize={26}/>
      </div>
      {body && <div className={`text-[13px] leading-relaxed line-clamp-3 block font-medium opacity-80`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)', color: '#fff' }}><EmojiRenderer content={body} emojiSize={18}/></div>}
    </div>
  );
}

// Sidebar Widgets Config
const TRENDING_TROPES = [
  { rank: 1, tag: '#EnemiesToLovers', count: '15.2k', color: '#f472b6' },
  { rank: 2, tag: '#SchoolFestival', count: '8.4k', color: '#fb923c' },
  { rank: 3, tag: '#ChildhoodFriend', count: '5.1k', color: 'rgb(249 115 22)' },
  { rank: 4, tag: '#RainyConfession', count: '3.2k', color: '#60a5fa' },
  { rank: 5, tag: '#SliceOfLife', count: '2.9k', color: '#4ade80' },
];

const WATCHING_NOW = [
  { title: 'Solo Leveling', ep: 'EP 8', genre: 'Ação', emoji: '⚔️' },
  { title: 'Frieren', ep: 'EP 22', genre: 'Aventura', emoji: '🌿' },
  { title: 'Dandadan', ep: 'EP 4', genre: 'Comédia', emoji: '👻' },
  { title: 'Blue Lock', ep: 'EP 16', genre: 'Desporto', emoji: '⚽' },
];

// (COMMUNITIES mockup removed in favor of real store data)

interface ExploreProps {
  onClose: () => void;
  onPostClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
  onCommunityClick?: (communityId: string) => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

export function ExploreModal({ onClose, onPostClick, onProfileClick, onCommunityClick, themeColor: c, themeMode }: ExploreProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts, sendFriendRequest, cancelFriendRequest, isFriend, hasSentRequest, myCommunities, fetchMyCommunities } = useLazerStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [creators, setCreators] = useState<any[]>([]);
  const [rankedUsers, setRankedUsers] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? `${c}40` : `${c}18`;
  const isVideo = (url?: string | null) => url?.match(/\.(mp4|webm|mov)(\?|$)/i);

  useEffect(() => {
    fetchMyCommunities();
  }, []);

  // Compute stats for creators & rankings
  useEffect(() => {
    const map = new Map<string, any>();
    feedPosts.forEach(p => {
      if (!map.has(p.authorId)) {
        map.set(p.authorId, {
          userId: p.authorId,
          name: p.author?.profile?.displayName || p.author?.profile?.username || 'User',
          handle: `@${p.author?.profile?.username || 'user'}`,
          avatar: p.author?.profile?.avatarUrl || '',
          profile: p.author?.profile,
          postCount: 0,
          reactions: 0,
          score: 0
        });
      }
      const u = map.get(p.authorId);
      u.postCount++;
      u.reactions += (p._count?.reactions || 0);
      u.score += 10 + ((p._count?.reactions || 0) * 2);
    });

    const sortedUsers = Array.from(map.values()).sort((a,b) => b.score - a.score);
    
    // Set Ranked Users (Leaderboard)
    setRankedUsers(sortedUsers);

    // Set Featured Creators (Include auth user in features)
    setCreators(sortedUsers.slice(0, 3));
  }, [feedPosts, authUser]);

  // Search API
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
          setSearchResults((data.data || data || []).filter((u: any) => u.userId !== authUser?.id));
        }
      } catch { /* silently fail */ }
      finally { setIsSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, authUser]);

  const filteredPosts = feedPosts.filter(p => {
    if (activeCategory !== 'All' && p.tag !== activeCategory) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const contentMatch = p.content?.toLowerCase().includes(q);
      const tagMatch = p.tag?.toLowerCase().includes(q);
      if (!contentMatch && !tagMatch) return false;
    }
    return true;
  });
  
  // Find my rank position
  const myRankIndex = rankedUsers.findIndex(u => u.userId === authUser?.id);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : '-';
  const displayTopRanks = rankedUsers.slice(0, 5);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col font-['Nunito',sans-serif]" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={themeMode}/></div>

      {/* Explore Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 shrink-0 border-b backdrop-blur-2xl"
        style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}>
        <button onClick={onClose}
          className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity ${textPrimary}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Voltar
        </button>
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Explorar Anime & Redes</span>
        <div className="w-20"/>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1300px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_320px] gap-8 items-start relative z-10">

          {/* ─────────────────── LEFT SIDEBAR ─────────────────── */}
          <aside className="hidden lg:flex flex-col gap-6 sticky top-6">
            
            {/* My Profile Quick Look */}
            {authUser?.profile && (
              <div className={`rounded-[32px] overflow-hidden border-[1.5px] backdrop-blur-xl shadow-lg ${cardBg}`} style={{ borderColor: borderCol }}>
                <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${c}80, ${c}20)` }}>
                  {authUser.profile.bannerUrl && (
                    authUser.profile.bannerUrl.includes('.mp4') || authUser.profile.bannerUrl.includes('.webm') ? (
                       <video src={authUser.profile.bannerUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                       <img src={authUser.profile.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )
                  )}
                  <div className="absolute inset-0 bg-black/10" />
                </div>
                <div className="flex flex-col items-center px-5 pb-6">
                  <div className="-mt-12 mb-3 w-[84px] h-[84px] rounded-full border-[3px] overflow-hidden shadow-2xl relative z-10 bg-black" style={{ borderColor: isLight ? '#fff' : '#000' }}>
                    <Avatar src={authUser.profile.avatarUrl} name={authUser.profile.username} className="w-full h-full object-cover"/>
                  </div>
                  <DisplayName profile={authUser.profile} fallbackName={authUser.profile.displayName || authUser.profile?.username || 'User'} className="font-black text-[16px] text-center" />
                  <p className={`text-xs mt-0.5 font-bold tracking-wide ${textSecondary}`}>@{authUser.profile?.username || 'user'}</p>
                </div>
              </div>
            )}

            {/* My Communities */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm ${cardBg}`} style={{ borderColor: borderCol }}>
               <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-5 ${textSecondary}`}>Minhas Comunidades</h3>
                <div className="flex flex-col gap-2.5">
                  {myCommunities.length === 0 ? (
                    <p className={`text-[11px] italic opacity-50 py-2 ${textSecondary}`}>Ainda não te juntaste a nenhuma community.</p>
                  ) : myCommunities.slice(0, 5).map((com) => (
                    <button key={com.id} onClick={() => onCommunityClick?.(com.id)}
                      className="flex items-center gap-3 w-full bg-transparent border-none cursor-pointer text-left rounded-2xl p-2 transition-all hover:bg-black/5 dark:hover:bg-white/5">
                      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl shrink-0 shadow-sm overflow-hidden" 
                        style={{ background: com.iconUrl ? 'transparent' : `${com.accentColor || '#666'}20`, border: `1px solid ${com.accentColor || '#666'}40` }}>
                        {isVideo(com.iconUrl) ? <video src={com.iconUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover"/>
                          : com.iconUrl ? <img src={com.iconUrl} alt="" className="w-full h-full object-cover"/>
                          : (com as any).iconEmoji || '🌐'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-extrabold truncate ${textPrimary}`}>{com.name}</p>
                        <p className={`text-[11px] font-bold mt-0.5 ${textSecondary}`}>{(com.membersCount ?? 0).toLocaleString()} membros</p>
                      </div>
                    </button>
                  ))}
                </div>
            </div>

            {/* Watching Now */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm ${cardBg}`} style={{ borderColor: borderCol }}>
               <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-5 ${textSecondary}`}>A Ver Agora</h3>
               <div className="flex flex-col gap-2">
                 {WATCHING_NOW.map((w, i) => (
                   <div key={i} className="flex items-center gap-3 w-full rounded-2xl px-3 py-2.5 transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                     <span className="text-2xl shrink-0 drop-shadow-sm">{w.emoji}</span>
                     <div className="flex-1 min-w-0">
                       <p className={`text-[13px] font-extrabold truncate ${textPrimary}`}>{w.title}</p>
                       <p className={`text-[11px] font-bold mt-0.5 ${textSecondary}`}>{w.ep} · {w.genre}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

          </aside>

          {/* ─────────────────── MAIN FEED ─────────────────── */}
          <main className="flex flex-col gap-8 w-full">
            
            {/* Search Bar */}
            <div className="relative z-20 group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none transition-colors group-focus-within:text-white" style={{ color: isLight ? '#999' : '#666' }}>
                <IconSearch/>
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Procurar séries, criadores ou tropos..."
                className={`w-full py-5 pl-14 pr-6 rounded-[24px] border-[2px] font-extrabold text-[15px] outline-none transition-all shadow-lg focus:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:-translate-y-1 ${textPrimary} ${cardBg}`}
                style={{ borderColor: search.trim() ? c : borderCol, backdropFilter: 'blur(30px)', backgroundColor: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)' }}/>
            </div>

            {/* Tags / Categories */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="px-6 py-3 rounded-full text-[13px] font-black tracking-wide border-none cursor-pointer transition-all shrink-0 hover:scale-[1.03]"
                  style={{
                    background: activeCategory === cat ? c : cardBg,
                    boxShadow: activeCategory === cat ? `0 8px 24px ${c}50` : '0 2px 10px rgba(0,0,0,0.05)',
                    color: activeCategory === cat ? '#fff' : (isLight ? '#333' : '#eee'),
                    border: `1.5px solid ${activeCategory === cat ? 'transparent' : borderCol}`
                  }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Criadores em Destaque (Featured Romance Series style) */}
            {!search.trim() && creators.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-5 px-2">
                  <h2 className={`text-[18px] font-black tracking-tight ${textPrimary}`}>Criadores em Destaque</h2>
                  <span className={`text-[12px] font-black cursor-pointer uppercase tracking-widest hover:underline`} style={{ color: c }}>Ver Todos</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {creators.map((cr) => {
                    const fStatus = isFriend(cr.userId) ? 'friend' : hasSentRequest(cr.userId) ? 'sent' : 'none';
                    return (
                      <div key={cr.userId} className="relative rounded-[32px] overflow-hidden border-[1.5px] cursor-pointer group shadow-lg min-h-[260px]"
                        style={{ borderColor: borderCol }}
                        onClick={() => onProfileClick?.(cr.userId)}>
                        
                        {/* Background cover effect */}
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-110" 
                             style={{ backgroundImage: `url(${cr.profile?.bannerUrl || cr.avatar})`, opacity: 0.5, filter: 'blur(8px) brightness(0.7)' }}/>
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)` }}/>
                        
                        <div className="relative p-6 flex flex-col items-center text-center h-full pt-8">
                          <Avatar src={cr.avatar} name={cr.name} className="w-[80px] h-[80px] rounded-[28px] shadow-2xl mb-4 border-2" style={{ borderColor: c }}/>
                          <DisplayName profile={cr.profile} fallbackName={cr.name} className={`font-black text-[16px] truncate max-w-full text-white`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}/>
                          <p className="text-[12px] font-bold text-white/80 mb-6 drop-shadow-md">{cr.score} Pontos · {cr.postCount} Posts</p>
                          <button onClick={e => { e.stopPropagation(); fStatus === 'none' ? sendFriendRequest(cr.userId) : fStatus === 'sent' ? cancelFriendRequest(cr.userId) : null; }}
                            className="mt-auto px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 border-none w-full"
                            style={{
                              background: fStatus !== 'none' ? 'rgba(255,255,255,0.2)' : c,
                              color: '#fff',
                              boxShadow: fStatus === 'none' ? `0 8px 24px ${c}60` : 'none',
                              backdropFilter: 'blur(10px)'
                            }}>
                            {fStatus === 'friend' ? '✓ Aliado' : fStatus === 'sent' ? 'Pendente' : '+ Seguir'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Trending Captures / Publicações */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-5 px-2">
                <h2 className={`text-[18px] font-black tracking-tight ${textPrimary}`}>
                  {search.trim() ? 'Resultados de Publicações' : 'Publicações Trendings'}
                </h2>
                <span className={`text-[12px] font-black cursor-pointer uppercase tracking-widest hover:underline`} style={{ color: c }}>Ver Todas</span>
              </div>
                {filteredPosts.length === 0 ? (
                  <div className={`p-12 text-center rounded-[32px] border-[1.5px] ${cardBg}`} style={{ borderColor: borderCol }}>
                     <p className={`text-sm italic font-bold ${textSecondary} opacity-50`}>Nenhuma captura encontrada para esta categoria.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {filteredPosts.map(p => (
                      <div key={p.id} className="relative rounded-[36px] overflow-hidden cursor-pointer group shadow-xl aspect-[3/4] border-[1.5px]"
                        style={{ borderColor: borderCol }}
                        onClick={() => onPostClick?.(p.id)}>
                        
                        {/* Always use image as deep background, or fallback to gradient */}
                        <div className="absolute inset-0 transition-transform duration-700 ease-out flex items-center justify-center group-hover:scale-110">
                           {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-full h-full object-cover"/>
                           ) : (
                              <>
                                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c}60, ${c}20)` }}/>
                                <span className="text-7xl font-black opacity-30 mix-blend-overlay z-0" style={{ color: isLight ? '#000' : '#fff' }}>✦</span>
                              </>
                           )}
                        </div>
                        {/* Elegant Vignette overlay */}
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.9) 100%)' }}/>
                        
                        <div className="absolute inset-0 p-6 flex flex-col justify-end pointer-events-none">
                          <div className="pointer-events-auto flex items-center gap-2 mb-4 bg-black/30 w-fit px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border hover:bg-black/50 transition-colors" 
                               style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                               onClick={e => { e.stopPropagation(); onProfileClick?.(p.authorId); }}>
                            <Avatar src={p.author?.profile?.avatarUrl} name={p.author?.profile?.displayName || 'User'} className="w-6 h-6 rounded-full shrink-0"/>
                            <DisplayName profile={p.author?.profile} fallbackName={p.author?.profile?.displayName || p.author?.profile?.username || 'User'} className="text-[12px] font-bold truncate text-white" />
                          </div>
                          
                          {/* Rich Formatted Title right over the image */}
                          <div className="max-h-[140px] overflow-hidden mb-1">
                             {formatContent(p.content, p.titleFont, p.titleColor, false)}
                          </div>
                          
                          <div className="flex items-center gap-5 mt-3 text-white/90 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                            <div className="flex items-center gap-2 text-[12px] font-black"><IconFlame/> {p._count?.reactions || 0}</div>
                            <div className="flex items-center gap-2 text-[12px] font-black"><IconMessageSquare/> {p._count?.comments || 0}</div>
                            {p.tag && <div className="ml-auto text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md">{p.tag}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            {/* Search Results Display */}
            {search.trim() && searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {searchResults.map((u: any) => {
                    const uid = u.userId || u.id;
                    const fStatus = isFriend(uid) ? 'friend' : hasSentRequest(uid) ? 'sent' : 'none';
                    return (
                      <div key={uid} className="flex items-center gap-4 p-4 rounded-[28px] border-[1.5px] cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                        style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}
                        onClick={() => onProfileClick?.(uid)}>
                        <Avatar src={u.avatarUrl} name={u.displayName || u.username} className="w-14 h-14 rounded-[20px] shrink-0 border-2" style={{ borderColor: c }}/>
                        <div className="flex-1 min-w-0">
                          <DisplayName profile={u} fallbackName={u.displayName || u.username} className={`font-black text-[15px] truncate ${textPrimary}`} />
                          <div className={`text-[11px] font-bold mt-0.5 ${textSecondary}`}>@{u.username}</div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); fStatus === 'sent' ? cancelFriendRequest(uid) : fStatus === 'none' ? sendFriendRequest(uid) : null; }}
                          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-[16px] font-bold border-[2px] transition-all hover:scale-110 shadow-md"
                          style={{
                            background: fStatus === 'friend' ? `${c}20` : fStatus === 'sent' ? 'rgba(249,115,22,0.12)' : c,
                            borderColor: fStatus === 'friend' ? c : fStatus === 'sent' ? '#f97316' : c,
                            color: fStatus === 'friend' ? c : fStatus === 'sent' ? '#f97316' : '#fff',
                          }}>
                          {fStatus === 'friend' ? '✓' : fStatus === 'sent' ? '…' : '+'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

          </main>

          {/* ─────────────────── RIGHT SIDEBAR ─────────────────── */}
          <aside className="hidden xl:flex flex-col gap-6 sticky top-6">
            
            {/* User Ranking System */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm ${cardBg}`} style={{ borderColor: borderCol }}>
               <div className="flex items-center justify-between mb-5">
                 <div className="flex items-center gap-2">
                   <IconStar/>
                   <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] ${textPrimary}`}>Net Rank</h3>
                 </div>
               </div>
               
               <div className="flex flex-col gap-4">
                 {displayTopRanks.length === 0 && (
                   <p className={`text-[12px] italic text-center py-4 ${textSecondary}`}>Sem atividade registada na rede.</p>
                 )}
                 {displayTopRanks.map((u, i) => (
                   <div key={u.userId} className="flex items-center gap-3 w-full cursor-pointer group" onClick={() => onProfileClick?.(u.userId)}>
                     {/* Rank Badge */}
                     <span className="w-6 font-black text-[16px] text-center shrink-0 transition-transform group-hover:scale-125" 
                           style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : (isLight ? '#aaa' : '#666'), textShadow: i < 3 ? '0 2px 10px rgba(0,0,0,0.2)' : 'none' }}>
                       {i + 1}
                     </span>
                     <Avatar src={u.avatar} name={u.name} className="w-10 h-10 rounded-full shadow-md group-hover:scale-105 transition-transform border-[1.5px]" style={{ borderColor: i < 3 ? '#fbbf24' : 'transparent' }}/>
                     <div className="flex-1 min-w-0">
                       <DisplayName profile={u.profile} fallbackName={u.name} className={`text-[13px] font-extrabold truncate ${textPrimary}`} />
                       <p className={`text-[10px] font-black mt-0.5 ${textSecondary}`}>Score: <span style={{ color: c }}>{u.score}</span></p>
                     </div>
                   </div>
                 ))}
               </div>
               
               {/* My Rank pinned at bottom */}
               {authUser && (
                 <div className="mt-5 pt-4 border-t-[1.5px] flex items-center gap-3 bg-black/5 dark:bg-white/5 -mx-6 px-6 -mb-6 pb-6 rounded-b-[32px]" style={{ borderColor: `${c}30` }}>
                    <span className="w-6 font-black text-[14px] text-center shrink-0 opacity-80" style={{ color: c }}>{myRank}</span>
                    <Avatar src={authUser?.profile?.avatarUrl} name={authUser?.profile?.username || 'User'} className="w-10 h-10 rounded-[14px] shadow-sm border-2" style={{ borderColor: c }}/>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-extrabold truncate ${textPrimary}`}>Tu</p>
                      <p className={`text-[10px] font-black mt-0.5 opacity-60 ${textSecondary}`}>O teu lugar atual</p>
                    </div>
                 </div>
               )}
            </div>

            {/* Trending Tropes */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm ${cardBg}`} style={{ borderColor: borderCol }}>
              <div className="flex items-center gap-2 mb-5">
                <IconFlame/>
                <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] ${textPrimary}`}>Trending Tropes</h3>
              </div>
              <div className="flex flex-col gap-3">
                {TRENDING_TROPES.map(t => (
                  <button key={t.rank} className="flex items-center gap-3 w-full bg-transparent border-none cursor-pointer text-left rounded-xl transition-transform hover:translate-x-1.5 focus:outline-none">
                    <span className="font-black text-[15px] w-5 text-center opacity-30 text-black dark:text-white group-hover:opacity-100">{t.rank}</span>
                    <div className="flex-1">
                      <span className="block font-black text-[14px] tracking-tight mb-0.5" style={{ color: t.color }}>{t.tag}</span>
                      <span className={`block text-[11px] font-bold ${textSecondary}`}>{t.count} menções</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}