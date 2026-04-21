'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';
import { YoutubeEmbed } from '@/components/ui/YoutubeEmbed';
import { DiscoverDetailModal } from './DiscoverDetailModal';
import { WikiModal } from './WikiModal';
import { BrowserModal } from './BrowserModal';
import { AlphaReaderModal } from './AlphaReaderModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CATEGORIES = [
  'All',
  '🏮 Animes',
  '📖 Mangás',
  '🎮 Jogos',
  '🍿 Cinema',
  '🏮 Galeria ',
  '🎥 Watch Mode'
];

const catMap: Record<string, string> = {
  '🏮 Animes': 'anime',
  '📖 Mangás': 'manga',
  '🎮 Jogos': 'games',
  '🍿 Cinema': 'cinema'
};

const getNeonColor = (category: string) => {
  if (category.includes('Animes')) return '#00f2ff'; // Cyan
  if (category.includes('Mangás')) return '#bc13fe'; // Purple
  if (category.includes('Jogos')) return '#39ff14'; // Lime
  if (category.includes('Cinema')) return '#ff003c'; // Cyber Red
  return '#ffffff';
};

// Icons
const IconFlame = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
const IconMessageSquare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
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

  // Watch Mode state
  const [ytResults, setYtResults] = useState<any[]>([]);
  const [ytQuery, setYtQuery] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [galSearch, setGalSearch] = useState('');
  const [galSearchFocus, setGalSearchFocus] = useState(false);

  // Discover state
  const [discoverData, setDiscoverData] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [universalResults, setUniversalResults] = useState<any[]>([]);
  const [wikiResult, setWikiResult] = useState<any>(null);
  const [activeDetail, setActiveDetail] = useState<{ type: any; id: string; metadata?: any } | null>(null);
  const [activeWiki, setActiveWiki] = useState<string | null>(null);
  const [activeWebUrl, setActiveWebUrl] = useState<string | null>(null);
  const [readerArticle, setReaderArticle] = useState<any>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const isWatchMode = activeCategory === '🎥 Watch Mode';
  const isGalleryMode = activeCategory === 'Galeria 🏮';
  const isDiscoverCategory = ['🏮 Animes', '📖 Mangás', '🎮 Jogos', '🍿 Cinema'].includes(activeCategory);

  // Auto-Suggest State
  const [tagSuggestions, setTagSuggestions] = useState<any[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);

  // Debounce hook for auto-suggest
  const activeSearchQuery = isGalleryMode ? galSearch : search;

  useEffect(() => {
    if (!activeSearchQuery.trim() || activeSearchQuery.trim().length < 2) {
       setTagSuggestions([]);
       setShowTagSuggestions(false);
       return;
    }
    
    const timeoutId = setTimeout(async () => {
      setTagLoading(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/lazer/discover/tags?q=${encodeURIComponent(activeSearchQuery.trim())}`, {
           headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
           setTagSuggestions(data);
           setShowTagSuggestions(true);
        } else {
           setTagSuggestions([]);
           setShowTagSuggestions(false);
        }
      } catch {
        setTagSuggestions([]);
        setShowTagSuggestions(false);
      } finally {
        setTagLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [activeSearchQuery]);

  useEffect(() => {
    const saved = localStorage.getItem('alpha_search_history');
    if (saved) setSearchHistory(JSON.parse(saved));
  }, []);

  const addToHistory = (q: string) => {
    if (!q.trim()) return;
    const newHist = [q, ...searchHistory.filter(i => i !== q)].slice(0, 8);
    setSearchHistory(newHist);
    localStorage.setItem('alpha_search_history', JSON.stringify(newHist));
  };

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? `${c}40` : `${c}18`;
  const isVideo = (url?: string | null) => url?.match(/\.(mp4|webm|mov)(\?|$)/i);
  
  // Gallery state in Hub
  const [hubGallery, setHubGallery] = useState<any[]>([]);
  const [hubGalLoading, setHubGalLoading] = useState(false);
  const [hubGalPage, setHubGalPage] = useState(1);
  const [hasMoreGal, setHasMoreGal] = useState(true);
  const galleryEndRef = useRef<HTMLDivElement>(null);

  // Masonry Stability Logic
  const [numCols, setNumCols] = useState(4);
  useEffect(() => {
     const updateCols = () => {
        if (typeof window === 'undefined') return;
        if (window.innerWidth < 640) setNumCols(2);
        else if (window.innerWidth < 1024) setNumCols(3);
        else setNumCols(4);
     };
     updateCols();
     window.addEventListener('resize', updateCols);
     return () => window.removeEventListener('resize', updateCols);
  }, []);

  const galleryColumns = Array.from({ length: numCols }, () => [] as any[]);
  hubGallery.forEach((img, i) => {
     galleryColumns[i % numCols].push(img);
  });

  useEffect(() => {
    fetchMyCommunities();
  }, []);

  // Handle external wiki article opens from detail modal
  useEffect(() => {
    const handleOpenWiki = (e: any) => {
      if (e.detail) {
        setActiveWiki(e.detail);
        setIsSearching(false);
      }
    };
    window.addEventListener('alpha-open-wiki', handleOpenWiki);
    return () => window.removeEventListener('alpha-open-wiki', handleOpenWiki);
  }, []);

  const fetchHubGal = async (page = 1, append = false) => {
    if (hubGalLoading) return;
    setHubGalLoading(true);
    try {
      const token = (useAuthStore.getState() as any).accessToken;
      const query = (galSearch.trim() || search.trim());
      const res = await fetch(`${API}/api/v1/lazer/discover/gallery?q=${encodeURIComponent(query)}&page=${page}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      const newImages = Array.isArray(json) ? json : [];
      
      if (append) {
        setHubGallery(prev => {
          const currentUrls = new Set(prev.map(img => img.url));
          const unique = newImages.filter(img => !currentUrls.has(img.url));
          return [...prev, ...unique];
        });
      } else {
        setHubGallery(newImages);
      }
      
      setHasMoreGal(newImages.length > 4);
    } catch { 
      setHasMoreGal(false); 
    } finally { 
      setHubGalLoading(false); 
    }
  };

  useEffect(() => {
    if (!isGalleryMode) return;
    
    const timeoutId = setTimeout(() => {
       setHubGalPage(1);
       setHasMoreGal(true);
       fetchHubGal(1, false);
    }, 600);
    
    return () => clearTimeout(timeoutId);
  }, [isGalleryMode, search, galSearch]);

  useEffect(() => {
    if (!isGalleryMode || !hasMoreGal || hubGalLoading) return;
    
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const next = hubGalPage + 1;
        setHubGalPage(next);
        fetchHubGal(next, true);
      }
    }, { threshold: 0.1 });

    if (galleryEndRef.current) obs.observe(galleryEndRef.current);
    return () => obs.disconnect();
  }, [isGalleryMode, hasMoreGal, hubGalPage, hubGalLoading]);

  // Fetch Discover results
  useEffect(() => {
    if (!isDiscoverCategory) return;
    const fetchDiscover = async () => {
      setDiscoverLoading(true);
      try {
        const catMap: any = {
          '🏮 Animes': 'anime',
          '📖 Mangás': 'manga',
          '🎮 Jogos': 'games',
          '🍿 Cinema': 'cinema'
        };
        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/lazer/discover/trending?category=${catMap[activeCategory]}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await res.json();
        if (json.success) {
          setDiscoverData(json.data || []);
        } else {
          setDiscoverData([]);
        }
      } catch (err) { 
        setDiscoverData([]);
      }
      finally { setDiscoverLoading(false); }
    };
    fetchDiscover();
  }, [activeCategory, isDiscoverCategory]);

  // Fetch YouTube results
  useEffect(() => {
    if (!isWatchMode) return;
    const fetchYt = async () => {
      setYtLoading(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/lazer/youtube/search?q=${encodeURIComponent(ytQuery || 'anime trailer')}&maxResults=12`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await res.json();
        if (json.success) setYtResults(json.data || []);
      } catch { /* silently fail */ }
      finally { setYtLoading(false); }
    };
    fetchYt();
  }, [isWatchMode, ytQuery]);

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
    setRankedUsers(sortedUsers);
    setCreators(sortedUsers.slice(0, 3));
  }, [feedPosts, authUser]);

  // Universal Search API
  useEffect(() => {
    if (!search.trim()) { 
      setSearchResults([]); 
      setUniversalResults([]);
      setWikiResult(null);
      return; 
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        
        // 1. Search Users
        const userRes = await fetch(`${API}/api/v1/users/search?q=${encodeURIComponent(search)}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (userRes.ok) {
          const data = await userRes.json();
          const rawData = data.data || data || [];
          const userList = Array.isArray(rawData) ? rawData : [];
          setSearchResults(userList.filter((u: any) => (u.userId || u.id) !== authUser?.id));
        }

        // 2. Universal Discover Search
        const discoverRes = await fetch(`${API}/api/v1/lazer/discover/search?q=${encodeURIComponent(search)}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const dJson = await discoverRes.json();
        if (dJson.success) {
          const universalData = dJson.data || [];
          setUniversalResults(Array.isArray(universalData) ? universalData : []);
          setWikiResult(dJson.wiki || null);
        } else {
          setUniversalResults([]);
          setWikiResult(null);
        }
      } catch (err) { 
        setUniversalResults([]);
        setSearchResults([]);
        setWikiResult(null);
      }
      finally { setIsSearching(false); }
    }, 400);
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
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Hub de Descoberta Alpha</span>
        <div className="w-20"/>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1300px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_320px] gap-8 items-start relative z-10">

          {/* ─────────────────── LEFT SIDEBAR ─────────────────── */}
          <aside className="hidden lg:flex flex-col gap-6 sticky top-6">
            {authUser?.profile && (
              <div className={`rounded-[32px] overflow-hidden border-[1.5px] backdrop-blur-xl shadow-lg ${cardBg}`} style={{ borderColor: borderCol }}>
                <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${c}80, ${c}20)` }}>
                  {authUser.profile.bannerUrl && (
                    isVideo(authUser.profile.bannerUrl) ? (
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
            
            <div className="relative z-50 group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none transition-colors group-focus-within:text-white" style={{ color: isLight ? '#999' : '#666' }}>
                <IconSearch/>
              </div>
              <input value={search} 
                onChange={e => { setSearch(e.target.value); setShowTagSuggestions(true); }}
                onFocus={() => { if (search.trim().length >= 2 && tagSuggestions.length > 0) setShowTagSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                placeholder="Google, Animes, Jogos, Educação..."
                className={`w-full py-5 pl-14 pr-6 ${showTagSuggestions && isGalleryMode ? 'rounded-t-[24px] rounded-b-none' : 'rounded-[24px]'} border-[2px] font-extrabold text-[15px] outline-none transition-all shadow-lg focus:shadow-[0_8px_30px_rgba(0,0,0,0.2)] ${!showTagSuggestions && 'focus:-translate-y-1'} ${textPrimary} ${cardBg}`}
                style={{ borderColor: search.trim() ? c : borderCol, backdropFilter: 'blur(30px)', backgroundColor: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)' }}/>

              {/* Alpha Neural Dropdown (Main Bar) */}
              {showTagSuggestions && !isGalleryMode && (tagSuggestions.length > 0 || tagLoading) && (
                 <div className="absolute top-full left-0 right-0 bg-black/50 backdrop-blur-[50px] border-[2px] border-t-0 rounded-b-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-[100] transition-all animate-in fade-in slide-in-from-top-2"
                      style={{ borderColor: c }}>
                    {tagLoading ? (
                       <div className="p-8 text-center text-[10px] font-black uppercase text-white/50 tracking-[4px] animate-pulse">A Sincronizar Lexicon...</div>
                    ) : (
                       tagSuggestions.map((tag, idx) => {
                         const catColor = tag.category === 'character' ? '#39ff14' : tag.category === 'series' ? '#bc13fe' : tag.category === 'artist' ? '#fbbc05' : '#00f2ff';
                         return (
                         <button key={idx} 
                           onMouseDown={(e) => { e.preventDefault(); setSearch(tag.name); setShowTagSuggestions(false); }}
                           className="flex items-center justify-between p-4 px-6 relative overflow-hidden group border-b border-white/5 transition-all duration-300 cursor-pointer text-left focus:outline-none hover:pl-8">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${catColor}, transparent)` }} />
                            <div className="flex items-center gap-4 relative z-10">
                               <div className="w-2 h-2 rounded-full shadow-[0_0_12px_currentColor] group-hover:scale-150 transition-transform duration-300" style={{ backgroundColor: catColor, color: catColor }} />
                               <span className="font-extrabold text-white text-[15px] drop-shadow-md">{tag.name}</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-[2px] font-black text-white/70 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 group-hover:border-white/30 transition-colors relative z-10 shadow-sm">
                               {tag.category} • {(tag.count / 1000).toFixed(1)}K P.
                            </span>
                         </button>
                       )})
                    )}
                 </div>
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="px-6 py-3 rounded-full text-[13px] font-black tracking-wide border-none cursor-pointer transition-all shrink-0 hover:scale-[1.03]"
                  style={{
                    background: activeCategory === cat ? (cat.includes('Watch') ? '#ef4444' : c) : cardBg,
                    boxShadow: activeCategory === cat ? `0 8px 24px ${cat.includes('Watch') ? '#ef444480' : c + '50'}` : '0 2px 10px rgba(0,0,0,0.05)',
                    color: activeCategory === cat ? '#fff' : (isLight ? '#333' : '#eee'),
                    border: `1.5px solid ${activeCategory === cat ? 'transparent' : borderCol}`
                  }}>
                  {cat}
                </button>
              ))}
            </div>


            {/* ── SEARCH RESULTS ── */}
            {search.trim() && (
              <div className="flex flex-col gap-8">
                 {isSearching && (
                    <div className="flex flex-col items-center py-20 animate-pulse">
                       <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4" style={{ borderColor: c }} />
                       <p className={`text-sm font-bold ${textSecondary}`}>A explorar os confins da rede...</p>
                    </div>
                 )}

                 {!isSearching && universalResults.length === 0 && searchResults.length === 0 && (
                    <div className={`p-16 text-center rounded-[40px] border-[1.5px] ${cardBg}`} style={{ borderColor: borderCol }}>
                       <span className="text-4xl block mb-4">🕵️‍♂️</span>
                       <p className={`text-[15px] font-black ${textPrimary}`}>Não encontramos nada para "{search}"</p>
                       <p className={`text-[12px] font-bold mt-2 ${textSecondary}`}>Tenta pesquisar por animes, jogos ou tecnologias específicas.</p>
                    </div>
                 )}

                 {!isSearching && wikiResult && (
                    <section className="animate-in fade-in slide-in-from-top-6 duration-700">
                       <h3 className={`text-[12px] font-black uppercase tracking-widest mb-4 opacity-60 ${textPrimary}`}>Wiki Hub / Resumo</h3>
                       <div className={`p-6 md:p-8 rounded-[40px] border-[2px] shadow-2xl relative overflow-hidden ${cardBg} transition-all duration-500`}
                         style={{ 
                            borderColor: `${c}80`,
                            boxShadow: `0 0 30px ${c}30, inset 0 0 20px ${c}10` 
                         }}>
                          
                          {/* Cyber Decorative Lines */}
                          <div className="absolute top-0 right-10 w-20 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 blur-sm"></div>
                          <div className="absolute bottom-0 left-10 w-20 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 blur-sm"></div>

                          {/* Decorative Background Icon */}
                          <div className="absolute -right-4 -top-4 text-[120px] opacity-[0.05] pointer-events-none select-none blur-[1px]">📖</div>
                          
                          <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                             {wikiResult.imageUrl && (
                                <div className="w-full md:w-32 h-44 rounded-[24px] overflow-hidden shrink-0 shadow-2xl border-4 border-white/10 group">
                                   <img src={wikiResult.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                             )}
                             <div className="flex-1">
                                <h4 className={`text-xl md:text-3xl font-black mb-3 ${textPrimary} tracking-tighter`}>{wikiResult.title}</h4>
                                <p className={`text-[13px] md:text-[14px] leading-relaxed font-bold opacity-70 ${textPrimary} line-clamp-5`}>
                                   {wikiResult.extract}
                                </p>
                                <div className="mt-8 flex flex-wrap gap-4">
                                   <button 
                                     onClick={() => {
                                        addToHistory(search);
                                        setActiveWiki(wikiResult.canonicalTitle || wikiResult.title);
                                     }}
                                     className="px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest text-white border-none transition-all hover:scale-110 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.4)] cursor-pointer group relative overflow-hidden"
                                     style={{ background: c }}>
                                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                      <span className="relative">Ler Artigo Nativo 📖</span>
                                   </button>
                                   <span className={`px-5 py-3 rounded-full text-[10px] font-black border-[1.5px] uppercase tracking-tighter ${textSecondary} backdrop-blur-md`} style={{ borderColor: borderCol }}>
                                      Fonte: Wikipedia (PT)
                                   </span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </section>
                 )}

                 {!isSearching && universalResults.length > 0 && (
                      <section>
                         <h3 className={`text-[12px] font-black uppercase tracking-widest mb-6 opacity-60 ${textPrimary} flex items-center gap-2`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"/>
                            Web Discover / Global
                         </h3>
                         <div className="flex flex-col gap-4">
                            {universalResults.map((u: any, index: number) => (
                              <div key={`${u.type}-${u.id}`} 
                                className="relative rounded-[32px] overflow-hidden border-[1.5px] cursor-pointer shadow-xl transition-all hover:scale-[1.01] flex items-center p-3 gap-5 animate-in fade-in slide-in-from-right-8 duration-700"
                                style={{ 
                                   background: cardBg, 
                                   borderColor: `${getNeonColor('Animes')}40`,
                                   animationDelay: `${index * 80}ms`
                                }}
                                onClick={async () => {
                                   addToHistory(search);
                                   if (u.type === 'web_link') {
                                      setReaderLoading(true);
                                      try {
                                        const res = await fetch(`${API}/api/v1/lazer/proxy/readability?target=${encodeURIComponent(u.url)}`);
                                        const data = await res.json();
                                        if (data.success && data.article) {
                                          setReaderArticle(data.article);
                                          setActiveWebUrl(u.url);
                                        } else {
                                          // Em vez de window.open direto, mostramos o aviso de redirecionamento
                                          setRedirectUrl(u.url);
                                        }
                                      } catch (err) {
                                        setRedirectUrl(u.url);
                                      } finally {
                                        setReaderLoading(false);
                                      }
                                      return;
                                   }
                                   u.type === 'video' ? setActiveVideo({ id: u.id, title: u.title, channel: u.source }) : setActiveDetail({ type: u.type, id: u.id });
                                }}>
                                 
                                 <div className="w-16 h-16 md:w-24 md:h-24 rounded-[22px] overflow-hidden shrink-0 border border-white/10 shadow-lg relative bg-white/5 flex items-center justify-center">
                                    {u.imageUrl ? (
                                       <img src={u.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : u.favicon ? (
                                       <img src={u.favicon} alt="" className="w-10 h-10 object-contain drop-shadow-md rounded-[8px]" />
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                                          <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(45deg, ${c}, transparent)` }} />
                                          <span className="text-2xl md:text-3xl filter grayscale opacity-40">🌐</span>
                                          <div className="absolute inset-0 flex items-center justify-center p-2">
                                             <span className="text-[8px] font-black uppercase text-white/20 text-center line-clamp-2">{u.title}</span>
                                          </div>
                                       </div>
                                    )}
                                 </div>

                                 <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/50 border border-white/5">{u.source}</span>
                                       {u.type === 'video' && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">● LIVE / VIDEO</span>}
                                       {u.type === 'web_link' && <span className="text-[9px] font-black uppercase tracking-widest text-[#00f2ff]">● URL</span>}
                                    </div>
                                    <p className={`text-[14px] md:text-[16px] font-black ${textPrimary} truncate tracking-tight mb-1`}>{u.title}</p>
                                    <p className={`text-[11px] md:text-[12px] font-bold ${textSecondary} line-clamp-2 leading-relaxed opacity-70`}>
                                       {u.description || 'Explora este conteúdo na rede descentralizada Alpha...'}
                                    </p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </section>
                 )}

                 {searchResults.length > 0 && (
                    <section>
                      <h3 className={`text-[12px] font-black uppercase tracking-widest mb-4 opacity-60 ${textPrimary}`}>Cidadãos da Rede</h3>
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
                    </section>
                 )}
              </div>
            )}

            {/* ── GALLERY CATEGORY (Pinterest Hub) ── */}
            {!search.trim() && isGalleryMode && (
              <section className="animate-in fade-in slide-in-from-top-6 duration-1000">
                 <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12 px-4 group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[28px] bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-3xl transition-all group-hover:scale-110 group-hover:rotate-3">
                         <span className="text-4xl text-shadow-glow">🏮</span>
                      </div>
                      <div>
                         <h3 className={`text-[20px] font-black uppercase tracking-[5px] ${textPrimary} mb-1 drop-shadow-2xl`}>Mural Estético Alpha</h3>
                         <p className="text-[11px] font-bold opacity-30 uppercase tracking-[4px]">Curadoria Inteligente & Visão Sintética</p>
                      </div>
                    </div>

                    <div className="flex-1 relative max-w-md ml-auto">
                       <div className={`relative group/input transition-all duration-500 ${galSearchFocus ? 'scale-[1.02]' : ''}`}>
                          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/30 group-focus-within/input:text-white transition-colors">
                             <IconSearch/>
                          </div>
                          <input 
                            value={galSearch}
                            onChange={(e) => { setGalSearch(e.target.value); setShowTagSuggestions(true); }}
                            onFocus={() => { setGalSearchFocus(true); if (galSearch.trim().length >= 2) setShowTagSuggestions(true); }}
                            onBlur={() => setTimeout(() => { setGalSearchFocus(false); setShowTagSuggestions(false); }, 200)}
                            placeholder="Pesquisar personagens, lugares, estética..."
                            className={`w-full py-4 pl-14 pr-6 ${showTagSuggestions ? 'rounded-t-3xl rounded-b-none' : 'rounded-3xl'} border-[2px] font-extrabold text-[13px] outline-none transition-all shadow-2xl ${textPrimary}`}
                            style={{ 
                               borderColor: galSearchFocus ? c : 'rgba(255,255,255,0.05)',
                               background: 'rgba(255,255,255,0.03)',
                               backdropFilter: 'blur(30px)'
                            }}
                          />
                       </div>

                       {/* Alpha Neural Dropdown (Gallery Inner Bar) */}
                       {showTagSuggestions && (tagSuggestions.length > 0 || tagLoading) && (
                          <div className="absolute top-full left-0 right-0 bg-black/50 backdrop-blur-[50px] border border-white/10 border-t-0 rounded-b-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col z-[100] transition-all animate-in fade-in slide-in-from-top-2"
                               style={{ borderColor: c }}>
                             {tagLoading ? (
                                <div className="p-8 text-center text-[10px] font-black uppercase text-white/50 tracking-[4px] animate-pulse">A Sincronizar Lexicon...</div>
                             ) : (
                                tagSuggestions.map((tag, idx) => {
                                  const catColor = tag.category === 'character' ? '#39ff14' : tag.category === 'series' ? '#bc13fe' : tag.category === 'artist' ? '#fbbc05' : '#00f2ff';
                                  return (
                                  <button key={idx} 
                                    onMouseDown={(e) => { e.preventDefault(); setGalSearch(tag.name); setShowTagSuggestions(false); }}
                                    className="flex items-center justify-between p-4 px-6 relative overflow-hidden group border-b border-white/5 transition-all duration-300 cursor-pointer text-left focus:outline-none hover:pl-8">
                                     <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, ${catColor}, transparent)` }} />
                                     <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-2 h-2 rounded-full shadow-[0_0_12px_currentColor] group-hover:scale-150 transition-transform duration-300" style={{ backgroundColor: catColor, color: catColor }} />
                                        <span className="font-extrabold text-white text-[14px] drop-shadow-md">{tag.name}</span>
                                     </div>
                                     <span className="text-[9px] uppercase tracking-[2px] font-black text-white/70 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 group-hover:border-white/30 transition-colors relative z-10 shadow-sm">
                                        {tag.category} • {(tag.count / 1000).toFixed(1)}K P.
                                     </span>
                                  </button>
                                )})
                             )}
                          </div>
                       )}
                    </div>
                 </div>

                 {hubGalLoading && hubGallery.length === 0 ? (
                    <div className="py-32 flex flex-col items-center justify-center animate-pulse">
                       <div className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin mb-6" style={{ borderColor: c }} />
                       <p className="text-[12px] font-black uppercase tracking-[4px] opacity-30">Sintonizando frequências estéticas...</p>
                    </div>
                 ) : (
                    <div className="flex gap-6 pb-20 relative px-2">
                       {galleryColumns.map((col, colIdx) => (
                          <div key={colIdx} className="flex-1 flex flex-col gap-6">
                             {col.map((img, i) => (
                                <div key={`${img.url}-${i}`} 
                                  className="group relative rounded-[40px] overflow-hidden bg-[#0d0d0d] border border-white/5 shadow-[0_12px_45px_rgba(0,0,0,0.5)] hover:shadow-[0_50px_100px_rgba(0,0,0,0.9)] transition-all duration-700 hover:-translate-y-3 cursor-pointer animate-in fade-in slide-in-from-top-12 fill-mode-both"
                                  style={{ animationDuration: '800ms', animationDelay: `${Math.min((i % 15) * 120, 1500)}ms` }}
                                  onClick={() => setActiveDetail({ type: 'image', id: img.url, metadata: img })}>
                                   
                                   {/* Glassmorphism Source Badge */}
                                   <div className="absolute top-6 left-6 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 transform -translate-x-6 group-hover:translate-x-0">
                                      <div className="px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[3px] text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-[32px] transition-all flex items-center gap-3"
                                           style={{ border: `1px solid ${img.color}50`, backgroundColor: `${img.color}15` }}>
                                         <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse" style={{ backgroundColor: img.color, color: img.color }} />
                                         {img.source}
                                      </div>
                                   </div>

                                   {/* Immersive Image with Parallax Zoom */}
                                   <div className="overflow-hidden bg-[#0d0d0d] aspect-auto relative">
                                       <div className="absolute inset-0 bg-white/5 animate-pulse" />
                                       <img 
                                          src={img.url} 
                                          alt="" 
                                          className="w-full h-auto object-cover transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-115 group-hover:rotate-2 group-hover:brightness-110 relative z-10" 
                                          loading="lazy"
                                          decoding="async"
                                          style={{ opacity: 0, transition: 'opacity 0.6s ease-in' }}
                                          onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                                          onError={(e) => { const p = e.currentTarget.closest('.group') as HTMLElement | null; if (p) p.style.display = 'none'; }}
                                       />
                                    </div>
                                   
                                   {/* Dreamy Gradient Overlay & Content */}
                                   <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-end p-10">
                                      <div className="flex flex-col gap-3 transform translate-y-10 group-hover:translate-y-0 transition-all duration-700 ease-out">
                                         <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ backgroundColor: img.color || c, color: img.color || c }} />
                                            <p className="text-[11px] font-black text-white/40 uppercase tracking-[4px]" style={{ color: img.color ? `${img.color}90` : undefined }}>Alpha Twin Core</p>
                                         </div>
                                         <h4 className="text-[15px] font-black text-white leading-[1.3] uppercase tracking-tight line-clamp-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                                            {img.prompt || 'Alpha Aesthetic Vision'}
                                         </h4>
                                      </div>
                                   </div>
                                </div>
                             ))}
                          </div>
                       ))}
                       
                       {/* Final Observer for Discoveries */}
                       <div ref={galleryEndRef} className="absolute bottom-0 left-0 right-0 h-[600px] pointer-events-none" />
                    </div>
                 )}
              </section>
            )}

            {/* ── DISCOVER CATEGORIES ── */}
            {!search.trim() && isDiscoverCategory && (
              <section>
                 <div className="flex items-center gap-3 mb-6 px-2">
                    <span className="text-2xl">{activeCategory.split(' ')[0]}</span>
                    <h2 className={`text-[18px] font-black tracking-tight ${textPrimary}`}>{activeCategory.split(' ')[1]} Global</h2>
                 </div>

                 {discoverLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                       {[...Array(8)].map((_, i) => (
                         <div key={i} className="aspect-[10/14] rounded-[24px] bg-white/5" />
                       ))}
                    </div>
                 ) : discoverData.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                       {discoverData.map((item, index) => {
                          const neonColor = getNeonColor(activeCategory);
                          return (
                            <div key={`${item.type}-${item.id}`} 
                              className="relative aspect-[10/14] rounded-[28px] overflow-hidden cursor-pointer group shadow-2xl border-[2px] transition-all hover:scale-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-700"
                              style={{ 
                                borderColor: `${neonColor}40`,
                                boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
                                animationDelay: `${index * 60}ms`
                              }}
                              onClick={() => {
                                 addToHistory(search);
                                 if (item.isWiki) {
                                    setActiveWiki(item.title);
                                 } else {
                                    setActiveDetail({ type: item.type, id: item.id });
                                 }
                              }}>
                               <img src={item.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                               
                               {/* Neon Glow Overlay on Hover */}
                               <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                 style={{ boxShadow: `inset 0 0 50px ${neonColor}40` }} />

                               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-5 flex flex-col justify-end">
                                  <div className="flex items-center gap-2 mb-2">
                                     <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: neonColor, boxShadow: `0 0 8px ${neonColor}` }} />
                                     <p className="text-[10px] font-black tracking-widest text-white/60 uppercase">{item.isWiki ? '📙 Wikipedia' : item.type}</p>
                                  </div>
                                  <p className="text-[14px] font-black text-white line-clamp-2 leading-tight tracking-tight">{item.title}</p>
                                  
                                  {item.rating && (
                                     <div className="mt-2 flex items-center gap-1">
                                        <span className="text-[10px] font-black text-gold">⭐ {item.rating}</span>
                                     </div>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                    </div>
                 ) : (
                    <div className={`p-10 text-center rounded-[32px] border-[1.5px] ${cardBg}`} style={{ borderColor: borderCol }}>
                       <p className={`text-sm font-bold ${textSecondary}`}>O conteúdo está a sincronizar com o Google... tenta daqui a pouco!</p>
                    </div>
                 )}
              </section>
            )}

            {/* ── WATCH MODE ── */}
            {!search.trim() && isWatchMode && (
              <section>
                 <div className="flex items-center justify-between mb-5 px-2">
                    <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"/>
                       <h2 className={`text-[18px] font-black tracking-tight ${textPrimary}`}>Watch Mode</h2>
                    </div>
                 </div>

                 <div className="mb-6">
                    <input value={ytQuery} onChange={e => setYtQuery(e.target.value)}
                      placeholder="Pesquisar trailers, gameplays..."
                      className={`w-full py-3 px-6 rounded-full border bg-black/10 text-[13px] font-bold ${textPrimary} outline-none`}
                      style={{ borderColor: '#ef444440' }}/>
                 </div>

                 {ytLoading ? (
                    <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-t-red-500 animate-spin"/></div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {ytResults.map(v => (
                         <div key={v.id} className="flex flex-col gap-2 cursor-pointer group" onClick={() => setActiveVideo(v)}>
                            <div className="rounded-[20px] overflow-hidden border-[1.5px]" style={{ borderColor: '#ef444428' }}>
                               <YoutubeEmbed videoId={v.id} title={v.title} channel={v.channel} thumbnail={v.thumbnail} accentColor="#ef4444"/>
                            </div>
                            <p className="text-[12px] font-bold line-clamp-2 px-1 text-white group-hover:opacity-80">{v.title}</p>
                         </div>
                       ))}
                    </div>
                 )}

                 {activeVideo && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                       <div className="w-full max-w-5xl">
                          <button onClick={() => setActiveVideo(null)} className="mb-4 text-white font-black text-sm uppercase tracking-widest cursor-pointer bg-transparent border-none">✕ Fechar Player</button>
                          <YoutubeEmbed videoId={activeVideo.id} title={activeVideo.title} channel={activeVideo.channel} accentColor="#ef4444" compact={false}/>
                          <h2 className="text-white mt-6 text-xl font-black">{activeVideo.title}</h2>
                       </div>
                    </div>
                 )}
              </section>
            )}

            {/* ── FEED MODE (All) ── */}
            {!search.trim() && activeCategory === 'All' && (
              <>
                <section className="mb-10">
                  <h2 className={`text-[18px] font-black tracking-tight mb-5 ${textPrimary}`}>Criadores em Destaque</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    {creators.map(cr => {
                      const fStatus = isFriend(cr.userId) ? 'friend' : hasSentRequest(cr.userId) ? 'sent' : 'none';
                      return (
                        <div key={cr.userId} className="relative rounded-[32px] overflow-hidden border-[1.5px] cursor-pointer group shadow-lg min-h-[260px]"
                          style={{ borderColor: borderCol }} onClick={() => onProfileClick?.(cr.userId)}>
                          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" 
                               style={{ backgroundImage: `url(${cr.profile?.bannerUrl || cr.avatar})`, opacity: 0.5, filter: 'blur(8px) brightness(0.7)' }}/>
                          <div className="absolute inset-0 bg-gradient-to-bottom from-transparent to-black/90"/>
                          <div className="relative p-6 flex flex-col items-center text-center h-full pt-8">
                             <Avatar src={cr.avatar} name={cr.name} className="w-[80px] h-[80px] rounded-[28px] shadow-2xl mb-4 border-2" style={{ borderColor: c }}/>
                             <DisplayName profile={cr.profile} fallbackName={cr.name} className="font-black text-[16px] text-white"/>
                             <p className="text-[11px] font-bold text-white/60 mb-6">{cr.score} Pontos</p>
                             <button className="mt-auto px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white border-none w-full"
                               style={{ background: fStatus !== 'none' ? 'rgba(255,255,255,0.2)' : c, backdropFilter: 'blur(10px)' }}>
                               {fStatus === 'friend' ? '✓ Aliado' : fStatus === 'sent' ? 'Pendente' : '+ Seguir'}
                             </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <h2 className={`text-[18px] font-black tracking-tight mb-5 ${textPrimary}`}>Publicações Trendings</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {filteredPosts.map(p => (
                      <div key={p.id} className="relative rounded-[36px] overflow-hidden cursor-pointer group shadow-xl aspect-[3/4] border-[1.5px]"
                        style={{ borderColor: borderCol }} onClick={() => onPostClick?.(p.id)}>
                        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                           {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> 
                           : <div className="w-full h-full bg-gradient-to-br" style={{ backgroundImage: `linear-gradient(135deg, ${c}60, ${c}20)` }}/>}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90"/>
                        <div className="absolute inset-0 p-6 flex flex-col justify-end">
                           <div className="max-h-[140px] overflow-hidden mb-1">
                              {formatContent(p.content, p.titleFont, p.titleColor, false)}
                           </div>
                           <div className="flex items-center gap-5 mt-3 text-white/90 pt-3 border-t border-white/10">
                              <div className="flex items-center gap-2 text-[12px] font-black"><IconFlame/> {p._count?.reactions || 0}</div>
                              <div className="flex items-center gap-2 text-[12px] font-black"><IconMessageSquare/> {p._count?.comments || 0}</div>
                              {p.tag && <div className="ml-auto text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg bg-white/20">{p.tag}</div>}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
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

      {/* Discovery Detail Modal Layer */}
      {activeDetail && (
        <DiscoverDetailModal 
          type={activeDetail.type} 
          id={activeDetail.id} 
          onClose={() => setActiveDetail(null)} 
          themeColor={c} 
          themeMode={themeMode} 
          q={activeDetail.metadata?.prompt}
        />
      )}
      {activeWiki && (
        <WikiModal 
          initialTitle={activeWiki} 
          onClose={() => setActiveWiki(null)} 
          themeColor={c} 
          themeMode={themeMode} 
        />
      )}
      {activeWebUrl && readerArticle && (
        <AlphaReaderModal
          article={readerArticle}
          originalUrl={activeWebUrl}
          themeColor={c}
          themeMode={themeMode}
          onClose={() => {
            setActiveWebUrl(null);
            setReaderArticle(null);
          }}
        />
      )}

      {readerLoading && (
        <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="w-20 h-20 rounded-full border-4 border-t-transparent animate-spin mb-8 shadow-[0_0_30px_rgba(0,242,255,0.3)]" style={{ borderColor: c }} />
           <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[6px] text-white/40 mb-2">Alpha Neural Network</span>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Decodificando Internet...</h2>
              <p className="text-[11px] font-bold text-white/50 animate-pulse tracking-wide uppercase">Extraindo Estrutura Nativa do Artigo</p>
           </div>
        </div>
      )}

      {/* External Redirect Confirmation Modal */}
      {redirectUrl && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-2xl animate-in zoom-in-95 duration-300">
           <div className={`max-w-md w-full rounded-[40px] border-[2px] p-10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${isLight ? 'bg-white' : 'bg-[#0a0a0a]'}`}
                style={{ borderColor: `${c}40` }}>
              
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top, ${c}, transparent 70%)` }} />
              
              <div className="w-20 h-20 rounded-[30px] bg-white/5 flex items-center justify-center border border-white/10 mb-8 shadow-xl relative z-10">
                 <span className="text-4xl">🌐</span>
                 <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-500 animate-ping opacity-20" />
                 <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-black text-white border-2 border-white/20">!</div>
              </div>

              <h2 className={`text-2xl font-black tracking-tighter uppercase mb-4 relative z-10 ${textPrimary}`}>
                 Sair da Plataforma?
              </h2>
              
              <p className={`text-[13px] font-bold leading-relaxed mb-10 opacity-70 relative z-10 ${textPrimary}`}>
                 O site selecionado exige uma navegação externa ou bloqueou a leitura nativa do Alpha. Deseja abrir no seu navegador padrão?
              </p>

              <div className="flex flex-col w-full gap-3 relative z-10">
                 <button 
                   onClick={() => {
                      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
                      setRedirectUrl(null);
                   }}
                   className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white border-none transition-all hover:scale-105 active:scale-95 shadow-lg group relative overflow-hidden"
                   style={{ background: c }}>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative">Sim, Visitar Site</span>
                 </button>
                 
                 <button 
                   onClick={() => setRedirectUrl(null)}
                   className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest bg-transparent border-[2px] transition-all hover:bg-white/5 ${textPrimary}`}
                   style={{ borderColor: borderCol }}>
                    Não, Voltar ao Alpha
                 </button>
              </div>

              <div className="mt-8 opacity-20 text-[8px] font-black uppercase tracking-[4px]">
                 Redirecionamento Seguro Shielded by Alpha
              </div>
           </div>
        </div>
      )}
    </div>
  );
}