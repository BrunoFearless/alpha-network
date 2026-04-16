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

interface ExploreProps {
  onClose: () => void;
  onPostClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

export function ExploreModal({ onClose, onPostClick, onProfileClick, themeColor: c, themeMode }: ExploreProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts, sendFriendRequest, cancelFriendRequest, isFriend, hasSentRequest } = useLazerStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [creators, setCreators] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? `${c}40` : `${c}18`;

  // Build creator list from feed posts
  useEffect(() => {
    const map = new Map<string, any>();
    feedPosts.forEach(p => {
      if (p.authorId !== authUser?.id && !map.has(p.authorId)) {
        map.set(p.authorId, {
          id: p.authorId,
          name: p.author?.profile?.displayName || p.author?.profile?.username || 'User',
          handle: `@${p.author?.profile?.username || 'user'}`,
          avatar: p.author?.profile?.avatarUrl || '',
          profile: p.author?.profile,
          postCount: 0,
        });
      }
      const a = map.get(p.authorId);
      if (a) a.postCount++;
    });
    setCreators(Array.from(map.values()).slice(0, 8));
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
          setSearchResults((data.data || data || []).filter((u: any) => u.userId !== authUser?.id));
        }
      } catch { /* silently fail */ }
      finally { setIsSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredPosts = feedPosts.filter(p => {
    if (activeCategory !== 'All' && p.tag !== activeCategory) return false;
    return true;
  });

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
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Explorar</span>
        <div className="w-20"/>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-6 flex flex-col gap-8">

          {/* Search bar */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-[1.5px]"
            style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: isLight ? '#999' : '#666', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar utilizadores, séries ou tropes..."
              className={`flex-1 bg-transparent border-none outline-none text-sm ${textPrimary}`}
              style={{ caretColor: c }}/>
            {isSearching && <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: c, borderTopColor: 'transparent' }}/>}
          </div>

          {/* Search results */}
          {search.trim() && (
            <section>
              <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-3 ${textSecondary}`}>Utilizadores</h2>
              {searchResults.length === 0 && !isSearching
                ? <p className={`text-sm italic ${textSecondary} opacity-50`}>Nenhum resultado encontrado.</p>
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchResults.map((u: any) => {
                      const uid = u.userId || u.id;
                      const fStatus = isFriend(uid) ? 'friend' : hasSentRequest(uid) ? 'sent' : 'none';
                      return (
                        <div key={uid} className="flex items-center gap-3 p-3 rounded-2xl border-[1.5px] cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}
                          onClick={() => onProfileClick?.(uid)}>
                          <Avatar src={u.avatarUrl} name={u.displayName || u.username} className="w-10 h-10 rounded-full shrink-0"/>
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-sm truncate ${textPrimary}`}>{u.displayName || u.username}</div>
                            <div className={`text-xs ${textSecondary}`}>@{u.username}</div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); fStatus === 'sent' ? cancelFriendRequest(uid) : fStatus === 'none' ? sendFriendRequest(uid) : null; }}
                            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] transition-all hover:scale-105"
                            style={{
                              background: fStatus === 'friend' ? `${c}20` : fStatus === 'sent' ? 'rgba(249,115,22,0.12)' : 'transparent',
                              borderColor: fStatus === 'friend' ? c : fStatus === 'sent' ? '#f97316' : borderCol,
                              color: fStatus === 'friend' ? c : fStatus === 'sent' ? '#f97316' : (isLight ? '#666' : '#aaa'),
                            }}>
                            {fStatus === 'friend' ? '✓ Amigos' : fStatus === 'sent' ? 'Enviado' : '+ Seguir'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
            </section>
          )}

          {/* Categories */}
          {!search.trim() && (
            <>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className="px-4 py-2 rounded-full text-[12px] font-bold border-[1.5px] transition-all cursor-pointer hover:scale-105"
                    style={{
                      background: activeCategory === cat ? c : 'transparent',
                      borderColor: activeCategory === cat ? c : borderCol,
                      color: activeCategory === cat ? (isLight ? '#fff' : '#000') : (isLight ? '#666' : '#aaa'),
                    }}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Creators */}
              {creators.length > 0 && (
                <section>
                  <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-4 ${textSecondary}`}>Criadores em Destaque</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {creators.map(cr => {
                      const fStatus = isFriend(cr.id) ? 'friend' : hasSentRequest(cr.id) ? 'sent' : 'none';
                      return (
                        <div key={cr.id} className="flex flex-col items-center gap-2 p-4 rounded-2xl border-[1.5px] text-center cursor-pointer hover:scale-[1.02] transition-transform"
                          style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}
                          onClick={() => onProfileClick?.(cr.id)}>
                          <Avatar src={cr.avatar} name={cr.name} className="w-12 h-12 rounded-full"/>
                          <div>
                            <div className={`font-bold text-sm truncate max-w-[100px] ${textPrimary}`}>{cr.name}</div>
                            <div className={`text-[10px] ${textSecondary}`}>{cr.postCount} posts</div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); fStatus === 'none' ? sendFriendRequest(cr.id) : fStatus === 'sent' ? cancelFriendRequest(cr.id) : null; }}
                            className="px-3 py-1 rounded-full text-[10px] font-bold border-[1.5px] transition-all hover:scale-105"
                            style={{
                              background: fStatus !== 'none' ? `${c}20` : 'transparent',
                              borderColor: fStatus !== 'none' ? c : borderCol,
                              color: fStatus !== 'none' ? c : (isLight ? '#666' : '#aaa'),
                            }}>
                            {fStatus === 'friend' ? '✓' : fStatus === 'sent' ? '...' : '+ Seguir'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Posts feed */}
              <section>
                <h2 className={`text-[11px] font-black uppercase tracking-[1.5px] mb-4 ${textSecondary}`}>Publicações</h2>
                {filteredPosts.length === 0
                  ? <p className={`text-sm italic ${textSecondary} opacity-50`}>Nenhuma publicação encontrada.</p>
                  : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredPosts.map(p => (
                        <div key={p.id} className="rounded-2xl border-[1.5px] p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                          style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}
                          onClick={() => onPostClick?.(p.id)}>
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl mb-3 block"/>}
                          <div className="flex items-center gap-2 mb-2" onClick={e => { e.stopPropagation(); onProfileClick?.(p.authorId); }}>
                            <Avatar src={p.author?.profile?.avatarUrl} name={p.author?.profile?.displayName || 'User'} className="w-6 h-6 rounded-full shrink-0"/>
                            <span className={`text-xs font-bold truncate ${textPrimary}`}>{p.author?.profile?.displayName || p.author?.profile?.username}</span>
                          </div>
                          <p className={`text-sm line-clamp-3 ${textSecondary}`}><EmojiRenderer content={p.content} emojiSize={14}/></p>
                          {p.tag && <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${c}20`, color: c }}>#{p.tag}</span>}
                        </div>
                      ))}
                    </div>
                  )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}