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
import { AlphaReaderModal } from './AlphaReaderModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CATEGORIES = [
  'All',
  'Animes',
  'Mangás',
  'Jogos',
  'Cinema',
  'Imagem',
  'Watch Mode'
];

const NAV_TABS = ['All', 'Imagem', 'Watch Mode'];

const getNeonColor = (category: string) => {
  if (category.includes('Animes')) return '#00f2ff'; // Cyan
  if (category.includes('Mangás')) return '#bc13fe'; // Purple
  if (category.includes('Jogos')) return '#39ff14'; // Lime
  if (category.includes('Cinema')) return '#ff003c'; // Cyber Red
  return '#ffffff';
};

// Icons
const IconFlame = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
const IconMessageSquare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;

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
        <EmojiRenderer content={title} emojiSize={26} />
      </div>
      {body && <div className={`text-[13px] leading-relaxed line-clamp-3 block font-medium opacity-80`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)', color: '#fff' }}><EmojiRenderer content={body} emojiSize={18} /></div>}
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
  { title: 'Chainsaw Man', ep: 'EP 12', genre: 'Ação', emoji: '🪚' },
  { title: 'Oshi no Ko', ep: 'EP 11', genre: 'Drama', emoji: '🌟' },
  { title: 'Vinland Saga', ep: 'EP 24', genre: 'Seinen', emoji: '🪓' },
  { title: 'Jujutsu Kaisen', ep: 'EP 23', genre: 'Shonen', emoji: '🤞' },
  { title: 'Bleach: TYBW', ep: 'EP 26', genre: 'Ação', emoji: '⚔️' },
  { title: 'Mushoku Tensei', ep: 'EP 12', genre: 'Isekai', emoji: '🪄' },
  { title: 'Spy x Family', ep: 'EP 25', genre: 'Comédia', emoji: '🕵️' },
  { title: 'Cyberpunk ER', ep: 'EP 10', genre: 'Sci-Fi', emoji: '🦾' },
];

const MOCK_TRAILERS = [
  { title: 'Bleach: TYBW Part 3', imageUrl: 'https://images.alphacoders.com/133/1331005.png', type: 'anime' },
  { title: 'Overlord: The Sacred Kingdom', imageUrl: 'https://images7.alphacoders.com/135/1351543.png', type: 'anime' },
  { title: 'Spider-Man: Beyond the Spider-Verse', imageUrl: 'https://images2.alphacoders.com/131/1311545.jpg', type: 'movie' },
  { title: 'Monster Hunter Wilds', imageUrl: 'https://images.alphacoders.com/134/1344697.jpeg', type: 'game' },
].sort(() => Math.random() - 0.5);

const MOCK_DISCOVER = [
  { id: 'Anime', title: 'Anime', imageUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', type: 'wiki', rating: 'Wiki', releaseYear: 'Info' },
  { id: 'Manga', title: 'Manga', imageUrl: 'https://i.ytimg.com/vi/L_jWHffIx5E/maxresdefault.jpg', type: 'wiki', rating: 'Wiki', releaseYear: 'Info' },
  { id: 'Cyberpunk', title: 'Cyberpunk', imageUrl: 'https://i.ytimg.com/vi/8X2kIfS6fb8/maxresdefault.jpg', type: 'wiki', rating: 'Wiki', releaseYear: 'Info' },
  { id: 'One_Piece', title: 'One Piece', imageUrl: 'https://i.ytimg.com/vi/MCb13bmV32k/maxresdefault.jpg', type: 'wiki', rating: '9.9', releaseYear: '1999' },
  { id: 'Solo_Leveling', title: 'Solo Leveling', imageUrl: 'https://i.ytimg.com/vi/uYfNOC_E3p0/maxresdefault.jpg', type: 'wiki', rating: '9.8', releaseYear: '2024' },
].sort(() => Math.random() - 0.5);

const YT_QUERIES = [
  'anime trailer 2024', 'anime official trailer', 'new anime 2024 trailer', 
  'shonen jump trailer 2024', 'seasonal anime trailer', 'top upcoming anime 2024',
  'anime teaser official', 'crunchyroll trailer 2024', 'netflix anime trailer 2024'
];
const RANDOM_YT_QUERY = YT_QUERIES[Math.floor(Math.random() * YT_QUERIES.length)];

function getImageUrl(url: string, width = 800) {
  if (!url) return '';
  if (url.includes('localhost') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  // Use weserv.nl as a high-performance proxy with dynamic width
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&fit=cover&output=webp&q=90`;
}

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

  const isWatchMode = activeCategory === 'Watch Mode';
  const isGalleryMode = activeCategory === 'Imagem';
  const isDiscoverCategory = ['Animes', 'Mangás', 'Jogos', 'Cinema'].includes(activeCategory);

  // Auto-Suggest State
  const [tagSuggestions, setTagSuggestions] = useState<any[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);

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

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'glass-panel-light' : 'glass-panel-dark';
  const borderCol = 'transparent';
  const isVideo = (url?: string | null) => url?.match(/\.(mp4|webm|mov)(\?|$)/i);

  // Gallery state
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
  hubGallery.forEach((img, i) => { galleryColumns[i % numCols].push(img); });

  useEffect(() => { fetchMyCommunities(); }, []);

  useEffect(() => {
    const handleOpenWiki = (e: any) => { if (e.detail) { setActiveWiki(e.detail); setIsSearching(false); } };
    window.addEventListener('alpha-open-wiki', handleOpenWiki);
    return () => window.removeEventListener('alpha-open-wiki', handleOpenWiki);
  }, []);

  const fetchHubGal = async (page = 1, append = false) => {
    if (hubGalLoading) return;
    setHubGalLoading(true);
    try {
      const token = (useAuthStore.getState() as any).accessToken;
      const query = (galSearch.trim() || search.trim() || 'anime aesthetic 4k art');
      const res = await fetch(`${API}/api/v1/lazer/discover/gallery?q=${encodeURIComponent(query)}&page=${page}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      let newImages = Array.isArray(json) ? json : [];
      
      // Fallback if Alpha API is empty
      if (newImages.length === 0) {
        newImages = [1,2,3,4,5,6,7,8,9,10].map(i => ({
          url: `https://source.unsplash.com/featured/?anime,art,${i}`,
          source: 'Alpha Discovery',
          title: `Art Piece #${i}`
        }));
      }

      if (append) {
        setHubGallery(prev => {
          const currentUrls = new Set(prev.map(img => img.url));
          const unique = newImages.filter(img => !currentUrls.has(img.url));
          return [...prev, ...unique];
        });
      } else { setHubGallery(newImages); }
      setHasMoreGal(newImages.length > 4);
    } catch { 
      setHasMoreGal(false); 
    } finally { setHubGalLoading(false); }
  };

  useEffect(() => {
    if (!isGalleryMode) return;
    const timeoutId = setTimeout(() => { setHubGalPage(1); setHasMoreGal(true); fetchHubGal(1, false); }, 600);
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

  useEffect(() => {
    const fetchDiscover = async () => {
      setDiscoverLoading(true);
      try {
        const catMap: any = { 'Animes': 'anime', 'Mangás': 'manga', 'Jogos': 'games', 'Cinema': 'cinema', 'Imagem': 'images', 'All': 'anime' };
        const category = catMap[activeCategory] || 'anime';
        
        const ytQueryMap: any = { 
          'Animes': `anime trailer ${['2024', 'official', 'trending', 'new'][Math.floor(Math.random() * 4)]}`, 
          'Mangás': `manga trailer ${['2024', 'official', 'shonen', 'seinen'][Math.floor(Math.random() * 4)]}`, 
          'Jogos': `gameplay trailer ${['2024', 'official', '4k', 'new'][Math.floor(Math.random() * 4)]}`, 
          'Cinema': `movie trailer ${['2024', 'official', 'teaser', 'imax'][Math.floor(Math.random() * 4)]}`, 
          'Imagem': `anime art aesthetic 4k`,
          'All': `anime trailer ${['2024', 'teaser', 'official'][Math.floor(Math.random() * 3)]}`
        };
        if (ytQueryMap[activeCategory]) setYtQuery(ytQueryMap[activeCategory]);

        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/lazer/discover/trending?category=${category}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await res.json();
        
        if (json.success && json.data?.length > 0) {
          setDiscoverData(json.data);
        } else {
          // Fallback to contextual Wikipedia topics with HIGH VARIETY
          const contextPool: any = {
            'Animes': [
              'Naruto', 'One_Piece', 'Jujutsu_Kaisen', 'Demon_Slayer', 'Dragon_Ball', 
              'Attack_on_Titan', 'My_Hero_Academia', 'Bleach_(manga)', 'Fullmetal_Alchemist', 
              'Hunter_×_Hunter', 'Sword_Art_Online', 'Tokyo_Ghoul', 'Fate/stay_night', 
              'Re:Zero', 'Black_Clover', 'Chainsaw_Man', 'Spy_×_Family', 'Mob_Psycho_100', 
              'One-Punch_Man', 'Vinland_Saga', 'JoJo%27s_Bizarre_Adventure', 'Code_Geass'
            ],
            'Mangás': [
              'Manga', 'Berserk_(manga)', 'Death_Note', 'Uzumaki', 'Vagabond_(manga)', 
              'Kingdom_(manga)', 'Goodnight_Punpun', 'Monster_(manga)', 'Slam_Dunk_(manga)', 
              'Akira_(manga)', '20th_Century_Boys', 'Gantz', 'Oyasumi_Punpun', 'Blue_Lock',
              'Tokyo_Revengers', 'Haikyu!!', 'Solo_Leveling', 'The_Promised_Neverland'
            ],
            'Jogos': [
              'Elden_Ring', 'The_Legend_of_Zelda', 'Final_Fantasy', 'Resident_Evil', 
              'Cyberpunk_2077', 'God_of_War', 'Grand_Theft_Auto', 'Dark_Souls', 
              'Minecraft', 'League_of_Legends', 'Genshin_Impact', 'Valorant', 
              'Red_Dead_Redemption', 'The_Last_of_Us', 'Metal_Gear_Solid', 'Halo_(franchise)'
            ],
            'Cinema': [
              'The_Matrix', 'Inception', 'Interstellar', 'Blade_Runner_2049', 'Spirited_Away', 
              'Your_Name', 'Princess_Mononoke', 'Perfect_Blue', 'Pulp_Fiction', 
              'The_Dark_Knight', 'Parasite_(2019_film)', 'Dune_(2021_film)', 'Oppenheimer_(film)'
            ],
            'Imagem': ['Anime_art', 'Digital_art', 'Concept_art', 'Illustration', 'Landscape_painting'],
            'All': ['Anime', 'Manga', 'Cyberpunk', 'Gamer', 'Studio_Ghibli', 'Cosplay', 'Vocaloid', 'Otaku']
          };
          const wikiTopics = (contextPool[activeCategory] || contextPool['All']).sort(() => Math.random() - 0.5).slice(0, 10);
          
          const wikiData = await Promise.all(wikiTopics.sort(() => Math.random() - 0.5).map(async (t: string) => {
            try {
              const wRes = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`);
              const wJson = await wRes.json();
              return {
                id: t,
                title: wJson.title || t.replace(/_/g, ' '),
                imageUrl: wJson.originalimage?.source || wJson.thumbnail?.source || `https://en.wikipedia.org/static/images/project-logos/enwiki.png`,
                type: 'wiki',
                rating: 'Wiki',
                releaseYear: 'Live'
              };
            } catch {
              return { id: t, title: t.replace(/_/g, ' '), imageUrl: '', type: 'wiki', rating: 'Wiki', releaseYear: 'Live' };
            }
          }));
          setDiscoverData(wikiData);
        }
      } catch (err) { 
        setDiscoverData(MOCK_DISCOVER); 
      } finally { setDiscoverLoading(false); }
    };
    fetchDiscover();
  }, [activeCategory]);

  useEffect(() => {
    const fetchYt = async () => {
      setYtLoading(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        const query = ytQuery || RANDOM_YT_QUERY;
        const res = await fetch(`${API}/api/v1/lazer/youtube/search?q=${encodeURIComponent(query)}&maxResults=25`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await res.json();
        if (json.success) setYtResults(json.data || []);
      } catch { } finally { setYtLoading(false); }
    };
    fetchYt();
  }, [ytQuery]);

  useEffect(() => {
    const map = new Map<string, any>();
    feedPosts.forEach(p => {
      if (!map.has(p.authorId)) {
        map.set(p.authorId, { userId: p.authorId, name: p.author?.profile?.displayName || p.author?.profile?.username || 'User', handle: `@${p.author?.profile?.username || 'user'}`, avatar: p.author?.profile?.avatarUrl || '', profile: p.author?.profile, score: 0 });
      }
      const u = map.get(p.authorId);
      u.score += 10 + ((p._count?.reactions || 0) * 2);
    });
    const sortedUsers = Array.from(map.values()).sort((a, b) => b.score - a.score);
    setRankedUsers(sortedUsers);
    setCreators(sortedUsers.slice(0, 3));
  }, [feedPosts, authUser]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setUniversalResults([]); setWikiResult(null); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        const userRes = await fetch(`${API}/api/v1/users/search?q=${encodeURIComponent(search)}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (userRes.ok) {
          const data = await userRes.json();
          const rawData = data.data || data || [];
          setSearchResults(Array.isArray(rawData) ? rawData.filter((u: any) => (u.userId || u.id) !== authUser?.id) : []);
        }
        const discoverRes = await fetch(`${API}/api/v1/lazer/discover/search?q=${encodeURIComponent(search)}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const dJson = await discoverRes.json();
        if (dJson.success) {
          setUniversalResults(Array.isArray(dJson.data) ? dJson.data : []);
          setWikiResult(dJson.wiki || null);
        } else { setUniversalResults([]); setWikiResult(null); }
      } catch (err) { setUniversalResults([]); setSearchResults([]); setWikiResult(null); } finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, authUser]);

  const myRankIndex = rankedUsers.findIndex(u => u.userId === authUser?.id);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : '-';
  const displayTopRanks = rankedUsers.slice(0, 5);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 pb-20 md:pl-[110px] md:pr-8 md:py-8 font-['Nunito',sans-serif]">
      <div className="absolute inset-0 -z-10 bg-black/40 backdrop-blur-[10px]" onClick={onClose} />

      {/* Main Glass Panel */}
      <div className={`w-full h-full max-w-[1700px] max-h-[920px] rounded-none md:rounded-[48px] flex overflow-hidden ${isLight ? 'glass-panel-light' : 'glass-panel-dark'} border-0 md:border-white/5 relative shadow-2xl animate-in zoom-in-95 duration-500`}>
        <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={themeMode} /></div>

        {/* ── COLUMN 2: MAIN CONTENT (Glassified) ── */}
        <main className="flex-1 flex flex-col min-w-0 relative glass-panel-dark border-y-0 border-x-0 overflow-hidden">
          <header className="p-10 pb-6 flex flex-col gap-8">
            <div className="flex items-center gap-8">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/20 group-focus-within:text-white transition-colors"><IconSearch /></div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search movies, animes, creators..."
                  className="w-full glass-panel-dark border-none py-4 pl-16 pr-8 text-[15px] font-bold text-white outline-none focus:bg-white/10 transition-all" />
              </div>
              <nav className="flex items-center gap-6 px-10 py-1 rounded-full glass-panel-dark border-none overflow-x-auto no-scrollbar scroll-smooth">
                {['All', 'Galeria', 'Watch Mode'].map(cat => {
                  const isActive = activeCategory === cat;
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`py-4 px-1 bg-transparent border-none cursor-pointer text-[13px] whitespace-nowrap transition-all relative font-black ${isActive ? 'text-white' : 'text-white/40 hover:text-white'}`}>
                      {cat.replace(/[^a-zA-Z]/g, '') || 'All'}
                      {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" />}
                    </button>
                  );
                })}
              </nav>
              <div className="flex items-center gap-5 shrink-0">
                <button className="w-12 h-12 rounded-full glass-panel-dark border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all relative group">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-black group-hover:scale-125 transition-transform" />
                </button>
                <div className="flex items-center gap-4 p-2 pr-6 rounded-full glass-panel-dark border-none hover:bg-white/10 transition-all cursor-pointer group" onClick={() => onProfileClick?.(authUser?.id || '')}>
                  <Avatar src={authUser?.profile?.avatarUrl} name={authUser?.profile?.username || 'User'} className="w-10 h-10 rounded-full border border-white/10" />
                  <div className="hidden lg:block">
                    <p className="text-[12px] font-black text-white leading-none">{(authUser?.profile?.displayName || authUser?.profile?.username || 'User').split(' ')[0]}</p>
                    <p className="text-[9px] font-black text-white/30 mt-1.5 uppercase tracking-widest">Alpha Citizen</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-12 h-12 rounded-full glass-panel-dark border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/20 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 pt-0 custom-scrollbar">
            {search.trim() ? (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <h2 className="text-[12px] font-black text-white/30 mb-8 uppercase tracking-[4px]">Discovery Results</h2>
                {wikiResult && (
                  <div className="mb-10 glass-panel-dark rounded-[40px] p-10 border-none relative overflow-hidden group cursor-pointer" onClick={() => setActiveWiki(wikiResult.canonicalTitle || wikiResult.title)}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="text-8xl">📖</span></div>
                    <div className="relative z-10 flex gap-8">
                      {wikiResult.imageUrl && <img src={wikiResult.imageUrl} alt="" className="w-32 h-44 rounded-3xl object-cover border border-white/10" />}
                      <div>
                        <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">{wikiResult.title}</h3>
                        <p className="text-white/60 text-[14px] leading-relaxed line-clamp-4 max-w-2xl">{wikiResult.extract}</p>
                        <button className="mt-8 px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Read Full Article</button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {universalResults.map((u: any, i: number) => (
                    <div key={i} className="glass-panel-dark rounded-[40px] overflow-hidden flex items-center p-5 gap-6 hover:scale-[1.03] transition-all cursor-pointer group" onClick={() => setActiveDetail({ type: u.type, id: u.id })}>
                      <div className="w-20 h-20 rounded-3xl overflow-hidden shrink-0 border border-white/10">
                        <img src={u.imageUrl || u.favicon} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black text-white truncate">{u.title}</p>
                        <p className="text-[11px] font-bold text-white/40 mt-1 line-clamp-2 leading-relaxed">{u.description || u.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isGalleryMode ? (
              <div className="flex gap-6 relative">
                {galleryColumns.map((col, colIdx) => (
                  <div key={colIdx} className="flex-1 flex flex-col gap-6">
                    {col.map((img, i) => (
                      <div key={i} className="group relative rounded-[40px] overflow-hidden glass-panel-dark border-none cursor-pointer hover:-translate-y-2 transition-all duration-500" onClick={() => setActiveDetail({ type: 'image', id: img.url, metadata: img })}>
                        <img src={`${API}/api/v1/lazer/proxy/image?url=${encodeURIComponent(img.url)}`} alt="" className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                          <p className="text-[12px] font-black text-white uppercase tracking-[2px]">{img.source}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={galleryEndRef} className="absolute bottom-0 h-20 w-full" />
              </div>
            ) : (
              <div className="flex flex-col gap-12">
                {discoverLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-700">
                    <div className="relative w-40 h-40 mb-12">
                      <div className="absolute inset-0 rounded-full border-[6px] border-white/5" />
                      <div className="absolute inset-0 rounded-full border-[6px] border-t-transparent animate-spin" style={{ borderColor: getNeonColor(activeCategory) }} />
                      <div className="absolute inset-4 rounded-full bg-white/5 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl">
                         <span className="text-5xl animate-pulse">{activeCategory === 'All' ? '🏮' : activeCategory[0]}</span>
                      </div>
                    </div>
                    <div className="text-center space-y-4">
                       <h2 className="text-white text-3xl font-black tracking-tighter uppercase italic">Harmonizing {activeCategory.replace(/[🏮📖🎮🍿🎥]/g, '').trim()}</h2>
                       <div className="flex items-center justify-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2.5 h-2.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2.5 h-2.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
                       </div>
                       <p className="text-white/20 text-[11px] font-black uppercase tracking-[5px] mt-8">Connecting to Alpha Core...</p>
                    </div>
                    
                    {/* Ghost Skeleton Grid */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-5 gap-8 opacity-[0.03] grayscale pointer-events-none">
                       {[1,2,3,4,5].map(i => (
                         <div key={i} className="w-44 aspect-[3/4] rounded-[44px] bg-white" />
                       ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {activeCategory === 'All' ? (
                  <>
                    {/* ── HERO: VIDEO SPOTLIGHT ── */}
                    {(() => {
                      const videoPool = ytResults.length > 0 ? ytResults : MOCK_TRAILERS;
                      const heroIndex = Math.floor(Math.random() * videoPool.length);
                      const heroItem = videoPool[heroIndex];
                      if (!heroItem) return null;
                      return (
                        <section className="relative h-[520px] rounded-[56px] overflow-hidden group cursor-pointer shadow-2xl glass-panel-dark border-none mb-16" onClick={() => setActiveDetail({ type: 'tv', id: heroItem.id })}>
                          <img src={getImageUrl(heroItem.imageUrl || heroItem.thumbnail, 1920)} alt="" className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105 opacity-80" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-12 flex flex-col justify-end">
                            <div className="flex items-center gap-3 mb-6">
                              <span className="px-5 py-2 rounded-full bg-red-600 text-[11px] font-black text-white uppercase tracking-[2px] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Featured Trailer
                              </span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-[0.9] max-w-3xl">{heroItem.title}</h1>
                            <p className="text-white/60 text-[16px] font-medium max-w-2xl mb-10 line-clamp-2 leading-relaxed">Experience the latest and most trending trailers globally on Alpha Network.</p>
                            <div className="flex items-center gap-5">
                              <button className="px-10 py-4.5 rounded-3xl bg-white text-black font-black text-[14px] uppercase flex items-center gap-3 hover:scale-105 transition-all cursor-pointer border-none shadow-xl">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                Watch Now
                              </button>
                            </div>
                          </div>
                        </section>
                      );
                    })()}

                    {/* ── FEATURED CATEGORIES ── */}
                    <section className="mb-16">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {CATEGORIES.slice(1, 5).map((cat) => (
                          <div key={cat} className="group relative h-48 rounded-[32px] overflow-hidden glass-panel border-white/5 cursor-pointer hover:scale-[1.03] transition-all shadow-xl" onClick={() => setActiveCategory(cat)}>
                            <img src={getImageUrl(`https://source.unsplash.com/featured/?${cat.toLowerCase()},anime`)} alt="" className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex flex-col justify-end">
                              <span className="text-[12px] font-black text-white/40 uppercase tracking-[3px] mb-2">Explore</span>
                              <h3 className="text-2xl font-black text-white tracking-tighter" style={{ textShadow: `0 0 20px ${getNeonColor(cat)}60` }}>{cat}</h3>
                            </div>
                            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* ── NEW TRAILERS ── */}
                    <section className="mb-16">
                      <div className="flex items-center justify-between mb-8 px-4">
                        <h2 className="text-[20px] font-black text-white tracking-tight flex items-center gap-3">
                          <span className="w-1.5 h-6 rounded-full bg-red-600" />
                          New Trailers
                        </h2>
                        <span className="text-[12px] font-black text-white/20 uppercase tracking-[2px]">Updated Today</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
                        {(ytResults.length > 0 ? ytResults.slice(0, 4) : MOCK_TRAILERS).map((item: any, i: number) => (
                          <div key={i} className="group flex flex-col gap-4 cursor-pointer" onClick={() => setActiveDetail({ type: item.type || 'tv', id: item.id })}>
                            <div className="aspect-video rounded-[32px] overflow-hidden glass-panel-dark border border-white/5 relative shadow-xl">
                              <img src={getImageUrl(item.imageUrl || item.thumbnail)} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-1000" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40">
                                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                            </div>
                            <div className="px-1">
                              <p className="text-[14px] font-black text-white line-clamp-1 group-hover:text-red-500 transition-colors">{item.title}</p>
                              <p className="text-[10px] font-bold text-white/30 uppercase mt-1 tracking-widest">Official Trailer</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* ── MIXED DISCOVERY ── */}
                    <section>
                      <div className="flex items-center justify-between mb-8 px-2">
                        <h2 className="text-[24px] font-black text-white tracking-tight">You might like</h2>
                        <button className="text-[12px] font-black uppercase text-white/30 hover:text-white transition-colors border-none bg-transparent cursor-pointer tracking-widest">See all</button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-10">
                        {discoverData.map((item: any, i: number) => (
                          <div key={i} className="group flex flex-col gap-4 cursor-pointer" onClick={() => item.type === 'wiki' ? setActiveWiki(item.id) : setActiveDetail({ type: item.type || 'anime', id: item.id })}>
                            <div className="aspect-[3/4] rounded-[44px] overflow-hidden glass-card border-white/5 relative shadow-xl">
                              <img src={getImageUrl(item.imageUrl || item.thumbnail)} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-115" />
                            </div>
                            <div className="px-3 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-black text-white truncate">{item.title}</p>
                                <p className="text-[11px] font-bold text-white/30 mt-1">{item.releaseYear || '2024'} • ⭐ {item.rating || '9.0'}</p>
                              </div>
                              <button className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 border-none shadow-lg group-hover:scale-110 transition-transform">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  <section>
                    <div className="flex items-center justify-between mb-12 px-2">
                       <div className="flex flex-col gap-1">
                          <h2 className="text-5xl font-black text-white tracking-tighter">{activeCategory}</h2>
                          <p className="text-white/40 text-[14px] font-black uppercase tracking-[3px]">Explore curated content for this category</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-10">
                      {discoverData.map((item: any, i: number) => (
                        <div key={i} className="group flex flex-col gap-4 cursor-pointer" onClick={() => item.type === 'wiki' ? setActiveWiki(item.id) : setActiveDetail({ type: item.type || 'anime', id: item.id })}>
                          <div className="aspect-[3/4] rounded-[44px] overflow-hidden glass-card border-white/5 relative shadow-xl">
                            <img src={getImageUrl(item.imageUrl || item.thumbnail)} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-115" />
                          </div>
                          <div className="px-3 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-black text-white truncate">{item.title}</p>
                              <p className="text-[11px] font-bold text-white/40 mt-1 uppercase tracking-wider">{item.releaseYear || '2024'} • ⭐ {item.rating || '9.0'}</p>
                            </div>
                            <button className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 border-none shadow-lg group-hover:scale-110 transition-transform">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>

                {/* ── COLUMN 3: RIGHT SIDEBAR (Stats/Watching) ── */}
        <aside className="w-[360px] h-full hidden lg:flex flex-col glass-panel-dark border-none relative shrink-0 z-20 overflow-hidden pointer-events-auto">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scroll-smooth overscroll-contain">
            <section className="mb-12">
              <h3 className="text-[12px] font-black uppercase tracking-[3px] text-white/50 mb-8">Continue Watching</h3>
              <div className="flex flex-col gap-6">
                {WATCHING_NOW.sort(() => Math.random() - 0.5).slice(0, 8).map((w, i) => (
                  <div key={i} className="flex items-center gap-5 p-5 rounded-[32px] glass-panel-dark border-none hover:bg-white/5 transition-all cursor-pointer group">
                    <div className="w-16 h-16 rounded-[22px] bg-white/5 flex items-center justify-center text-3xl shrink-0 border border-white/10">{w.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-black text-white truncate">{w.title}</p>
                      <p className="text-[11px] font-bold text-white/40 mt-1.5 uppercase tracking-wider">{w.ep} • {w.genre}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <div className="rounded-[32px] glass-panel-dark border-none p-8">
                <div className="flex items-center gap-3 mb-6"><IconFlame /><h3 className="text-[11px] font-black uppercase tracking-[2px] text-white">Trending Tropes</h3></div>
                <div className="flex flex-col gap-5">
                  {TRENDING_TROPES.sort(() => Math.random() - 0.5).slice(0, 5).map((t, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer">
                      <span className="text-[13px] font-black group-hover:translate-x-1 transition-transform" style={{ color: t.color }}>{t.tag}</span>
                      <span className="text-[10px] font-bold text-white/20">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-auto pb-6">
              <h2 className="text-[12px] font-black text-white/50 tracking-[3px] uppercase mb-8">Top Citizens</h2>
              <div className="flex flex-col gap-4">
                {rankedUsers.slice(0, 3).map((u, i) => (
                  <div key={i} className="glass-panel-dark rounded-[32px] p-5 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer group" onClick={() => onProfileClick?.(u.userId)}>
                    <Avatar src={u.avatar} name={u.name} className="w-12 h-12 rounded-2xl border-2 group-hover:scale-105 transition-transform" style={{ borderColor: c }} />
                    <div className="flex-1 min-w-0">
                      <DisplayName profile={u.profile} fallbackName={u.name} className="font-black text-[14px] text-white" />
                      <p className="text-[10px] font-bold text-white/30 uppercase mt-0.5">Rank #{i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {/* Secondary Modals Layer */}
      {activeDetail && (
        <DiscoverDetailModal type={activeDetail.type} id={activeDetail.id} onClose={() => setActiveDetail(null)} themeColor={c} themeMode={themeMode} q={activeDetail.metadata?.prompt} />
      )}
      {activeWiki && (
        <WikiModal initialTitle={activeWiki} onClose={() => setActiveWiki(null)} themeColor={c} themeMode={themeMode} />
      )}
      {activeWebUrl && readerArticle && (
        <AlphaReaderModal article={readerArticle} originalUrl={activeWebUrl} themeColor={c} themeMode={themeMode} onClose={() => { setActiveWebUrl(null); setReaderArticle(null); }} />
      )}
      {redirectUrl && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-2xl">
          <div className={`max-w-md w-full rounded-[40px] border-[2px] p-10 flex flex-col items-center text-center relative overflow-hidden ${isLight ? 'bg-white' : 'bg-[#0a0a0a]'}`} style={{ borderColor: `${c}40` }}>
            <div className="w-20 h-20 rounded-[30px] bg-white/5 flex items-center justify-center border border-white/10 mb-8"><span className="text-4xl">🌐</span></div>
            <h2 className={`text-2xl font-black tracking-tighter uppercase mb-4 ${textPrimary}`}>Sair da Rede?</h2>
            <p className={`text-[13px] font-bold leading-relaxed mb-10 opacity-70 ${textPrimary}`}>Este site exige navegação externa ou bloqueou a leitura nativa do Alpha.</p>
            <div className="flex flex-col w-full gap-3">
              <button onClick={() => { window.open(redirectUrl, '_blank'); setRedirectUrl(null); }} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white border-none cursor-pointer" style={{ background: c }}>Sim, Visitar Site</button>
              <button onClick={() => setRedirectUrl(null)} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest bg-transparent border-[2px] cursor-pointer ${textPrimary}`} style={{ borderColor: borderCol }}>Não, Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
