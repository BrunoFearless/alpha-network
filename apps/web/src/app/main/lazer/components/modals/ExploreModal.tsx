'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';
import { DiscoverDetailModal } from './DiscoverDetailModal';
import { WikiModal } from './WikiModal';
import { AlphaReaderModal } from './AlphaReaderModal';

interface ExploreProps {
  onClose: () => void;
  onSelectView?: (view: any) => void;
  onPostClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
  onCommunityClick?: (communityId: string) => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
  userAvatar?: string;
  userName?: string;
}

// ── Curated Media & Data matching the Lo-Fi Reference ──────────────────────
const HERO_EVENTS = [
  {
    id: 'hero-1',
    badge: 'Trending Event',
    tags: ['Creative', 'Improve'],
    title: 'Ngab-ers: Mengaji Bersama',
    description: 'Mengaji bersama di lapangan smkn 4 bandung dengan pengisi ustad yogi m suardi dan juga sahrul mubarok menjadi pembicara di acara ini',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    guideTopic: 'Creative_Arts',
  },
  {
    id: 'hero-2',
    badge: 'Live Session',
    tags: ['Lo-Fi', 'Audio'],
    title: 'Cyberpunk Night: Alpha Beats',
    description: 'Sessão imersiva de síntese sonora e produção visual lo-fi com transmissão ao vivo para todos os cidadãos da rede.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    guideTopic: 'Cyberpunk',
  },
  {
    id: 'hero-3',
    badge: 'Workshop',
    tags: ['Animation', 'Design'],
    title: 'Sakuga Showcase: Studio Lights',
    description: 'Análise aprofundada de quadros-chave, iluminação dinâmica e técnicas contemporâneas de animação digital.',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80',
    guideTopic: 'Anime',
  },
];

const ASESMENT_ITEMS = [
  {
    id: 'ases-1',
    title: 'Proxmox : Cara membuat server dan router',
    category: 'Server',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    views: '12.4k',
  },
  {
    id: 'ases-2',
    title: 'Basis Data : Perintah dalam SQL',
    category: 'Database',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    views: '8.1k',
  },
  {
    id: 'ases-3',
    title: 'Algoritma : Logika & Pemrograman Modern',
    category: 'Code',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    views: '15.9k',
  },
];

const DOWNLOAD_ITEMS = [
  {
    id: 'dl-1',
    title: 'Statistika',
    subtitle: 'Matematika',
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'dl-2',
    title: 'Basis Data',
    subtitle: 'Server',
    image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'dl-3',
    title: 'Proxmox',
    subtitle: 'Cyber Security',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'dl-4',
    title: 'Algoritma',
    subtitle: 'Logic',
    image: 'https://images.unsplash.com/photo-1516116211227-bbc1c42f0e0c?auto=format&fit=crop&w=300&q=80',
  },
];

const SISWA_ITEMS = [
  {
    id: 'siswa-1',
    code: '221321',
    name: 'Sahrul',
    subtitle: 'Kelas Rekayasa Perangkat Lunak angkatan 2023',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    accent: '#f43f5e',
  },
  {
    id: 'siswa-2',
    code: '220123',
    name: 'Yogi',
    subtitle: 'Kelas Desain Komunikasi Visual angkatan 2022',
    image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80',
    accent: '#38bdf8',
  },
  {
    id: 'siswa-3',
    code: '223014',
    name: 'Fatih',
    subtitle: 'Kelas Teknik Komputer dan Jaringan angkatan 2023',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    accent: '#a855f7',
  },
  {
    id: 'siswa-4',
    code: '225691',
    name: 'Nopal',
    subtitle: 'Kelas Rekayasa Perangkat Lunak angkatan 2024',
    image: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=800&q=80',
    accent: '#10b981',
  },
];

const INITIAL_TASKS = [
  { id: 't1', group: 'Tasks today', text: 'Send asesment to student', done: true },
  { id: 't2', group: 'Tasks tomorrow', text: 'Get the copy for the facebook image', done: false },
  { id: 't3', group: 'Tasks tomorrow', text: 'Send Invision demo to squad', done: false },
  { id: 't4', group: 'Tasks Friday', text: 'Update styleguide and add colors', done: false },
  { id: 't5', group: 'Tasks Saturday', text: 'Update styleguide and add colors', done: false },
  { id: 't6', group: 'Tasks Saturday', text: 'Get the copy for the facebook image', done: false },
  { id: 't7', group: 'Tasks Saturday', text: 'Send invision demo to squad', done: false },
];

const SCHEDULE_DAYS = [
  { dayNum: 14, monthYear: 'December 2025', weekday: 'Monday', count: 13, isSpecial: false },
  { dayNum: 15, monthYear: 'December 2025', weekday: 'Tuesday', count: 22, isSpecial: false },
  { dayNum: 16, monthYear: 'December 2025', weekday: 'Wednesday', count: 14, isSpecial: false },
  { dayNum: 17, monthYear: 'December 2025', weekday: 'Thursday', count: 11, isSpecial: false },
  { dayNum: 18, monthYear: 'December 2016', weekday: 'Wednesday', count: 14, isSpecial: true },
  { dayNum: 19, monthYear: 'December 2016', weekday: 'Thursday', count: 11, isSpecial: true },
];

const NAV_TABS = ['Home', 'Asesment', 'Buku Pelajaran', 'Saran', 'Download'];

export function ExploreModal({
  onClose,
  onSelectView,
  onPostClick,
  onProfileClick,
  onCommunityClick,
  themeColor: c,
  themeMode,
  userAvatar,
  userName,
}: ExploreProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts } = useLazerStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Active section for ScrollSpy highlighting in the floating sidebar
  const [activeSection, setActiveSection] = useState<'hero' | 'asesment' | 'siswa' | 'jadwal' | 'download'>('hero');

  // Search & Navigation
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Home');
  const [sortOrder, setSortOrder] = useState('Kognitif');

  // Hero carousel
  const [heroIndex, setHeroIndex] = useState(0);
  const [savedHeroes, setSavedHeroes] = useState<Set<string>>(new Set());

  // Siswa / Creators
  const [activeMenuCard, setActiveMenuCard] = useState<string | null>(null);

  // Calendar
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [selectedDay, setSelectedDay] = useState<number>(15);

  // Tasks
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  // Schedule right cards
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState(4); // Day 18 selected by default

  // Modals layer
  const [activeDetail, setActiveDetail] = useState<{ type: any; id: string; metadata?: any } | null>(null);
  const [activeWiki, setActiveWiki] = useState<string | null>(null);
  const [activeWebUrl, setActiveWebUrl] = useState<string | null>(null);
  const [readerArticle, setReaderArticle] = useState<any>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDetail) setActiveDetail(null);
        else if (activeWiki) setActiveWiki(null);
        else if (activeWebUrl) setActiveWebUrl(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDetail, activeWiki, activeWebUrl, onClose]);

  // ScrollSpy listener to dynamically illuminate the active section in the floating sidebar
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const sections = [
        { id: 'explore-hero-section', name: 'hero' as const },
        { id: 'explore-asesment-section', name: 'asesment' as const },
        { id: 'explore-download-section', name: 'download' as const },
        { id: 'explore-siswa-section', name: 'siswa' as const },
        { id: 'explore-jadwal-section', name: 'jadwal' as const },
      ];

      const containerRect = container.getBoundingClientRect();

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerRect.top <= 260) {
            setActiveSection(sec.name);
            break;
          }
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll helper
  const scrollToSection = (id: string, tabName?: string) => {
    if (tabName) setActiveTab(tabName);
    if (id === 'explore-hero-section') {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection('hero');
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Hero Carousel Navigation
  const nextHero = useCallback(() => {
    setHeroIndex((prev) => (prev + 1) % HERO_EVENTS.length);
  }, []);

  const prevHero = useCallback(() => {
    setHeroIndex((prev) => (prev - 1 + HERO_EVENTS.length) % HERO_EVENTS.length);
  }, []);

  const toggleSaveHero = (id: string) => {
    setSavedHeroes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Task Completion
  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      group: 'Tasks today',
      text: newTaskText.trim(),
      done: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskText('');
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const monthName = currentMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Filtered Asesment items by search
  const filteredAsesment = useMemo(() => {
    if (!search.trim()) return ASESMENT_ITEMS;
    const q = search.toLowerCase();
    return ASESMENT_ITEMS.filter(
      (a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [search]);

  // Filtered Siswa items by search
  const filteredSiswa = useMemo(() => {
    if (!search.trim()) return SISWA_ITEMS;
    const q = search.toLowerCase();
    return SISWA_ITEMS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.includes(q) ||
        s.subtitle.toLowerCase().includes(q)
    );
  }, [search]);

  // Current Hero
  const currentHero = HERO_EVENTS[heroIndex];

  const isLight = themeMode === 'light';
  const shellBg = isLight ? 'glass-panel-light' : 'liquid-glass-shell';

  return (
    <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500 relative">
      
      {/* ══════════════════════════════════════════════════════════════════════
          1. FLOATING EXPLORE SIDEBAR (Pílula Vertical Exclusiva do Explore)
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

        {/* Top: Explore Radar Aperture / Avatar */}
        <button
          onClick={() => scrollToSection('explore-hero-section', 'Home')}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#38bdf8] p-0.5 hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(56,189,248,0.4)] cursor-pointer group relative bg-black/40"
          title="Início do Explore"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full bg-[#38bdf8]/20 text-[#38bdf8] font-black text-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
          )}
          {/* VisionOS Floating Tooltip */}
          <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <span>{userName || 'Explorar'} (Topo)</span>
          </span>
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Explore Navigation Action Icons */}
        <div className="flex flex-col items-center gap-3.5">
          {/* Icon 1: Bento Grid / Radar (Destaques & Eventos - igual ao VisionOS) */}
          <button
            onClick={() => scrollToSection('explore-hero-section', 'Home')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeSection === 'hero' && activeTab === 'Home'
                ? 'text-[#38bdf8] bg-white/15 shadow-[0_0_14px_rgba(56,189,248,0.4)] scale-110 border border-[#38bdf8]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Destaques & Eventos</span>
            </span>
          </button>

          {/* Icon 2: Book / Asesment Kognitif */}
          <button
            onClick={() => scrollToSection('explore-asesment-section', 'Asesment')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeSection === 'asesment' || activeTab === 'Asesment'
                ? 'text-[#38bdf8] bg-white/15 shadow-[0_0_14px_rgba(56,189,248,0.4)] scale-110 border border-[#38bdf8]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <polyline points="10 2 10 10 13 7 16 10 16 2" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Asesment Kognitif</span>
            </span>
          </button>

          {/* Icon 3: Calendar / Schedule (Jadwal & Agenda) */}
          <button
            onClick={() => scrollToSection('explore-jadwal-section')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeSection === 'jadwal'
                ? 'text-[#38bdf8] bg-white/15 shadow-[0_0_14px_rgba(56,189,248,0.4)] scale-110 border border-[#38bdf8]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Jadwal (Agenda & Calendário)</span>
            </span>
          </button>

          {/* Icon 4: Users / Siswa Kelas (Comunidade de Alunos & Criadores) */}
          <button
            onClick={() => scrollToSection('explore-siswa-section')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeSection === 'siswa'
                ? 'text-[#38bdf8] bg-white/15 shadow-[0_0_14px_rgba(56,189,248,0.4)] scale-110 border border-[#38bdf8]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Siswa Kelas (Criadores)</span>
            </span>
          </button>

          {/* Icon 5: Download / Material de Apoio */}
          <button
            onClick={() => scrollToSection('explore-download-section', 'Download')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeSection === 'download' || activeTab === 'Download'
                ? 'text-[#38bdf8] bg-white/15 shadow-[0_0_14px_rgba(56,189,248,0.4)] scale-110 border border-[#38bdf8]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Download Buku Pelajaran</span>
            </span>
          </button>

          {/* Icon 6: Quick Jump to Alpha Music */}
          <button
            onClick={() => onSelectView?.('music')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#1ed760] hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-[#1ed760] text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760]" />
              <span>Ouvir Alpha Music</span>
            </span>
          </button>

          {/* Icon 7: Home / Feed (Retornar ao Lazer) */}
          <button
            onClick={() => onSelectView?.('feed') || onClose()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Voltar ao Feed do Lazer</span>
            </span>
          </button>

          {/* Icon 8: Search Spotlight */}
          <button
            onClick={() => {
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => searchInputRef.current?.focus(), 250);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#38bdf8] hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="absolute left-full ml-3 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
              <span>Buscar no Explore</span>
            </span>
          </button>
        </div>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Bottom indicator dot em ciano neon */}
        <div className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8] animate-pulse" />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN VISIONOS LIQUID GLASS WINDOW (Painel Principal do Explore)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border ${shellBg} flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300`}
      >
        {/* Crista de luz especular no topo do arco Liquid Glass */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* Subtle Ambient Lighting Blobs in Background */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#38bdf8]/10 blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-[#f43f5e]/10 blur-[130px] pointer-events-none -z-10" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#38bdf8]/10 blur-[120px] pointer-events-none -z-10" />

        {/* ── TOP NAVIGATION BAR ── */}
        <header className="px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 border-b border-white/[0.08] shrink-0 z-20">
          {/* Left: Search Input Pill */}
          <div className="relative flex items-center w-56 sm:w-64 md:w-72">
            <svg
              className="absolute left-4 w-4 h-4 text-white/40 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Here..."
              className="w-full h-11 pl-11 pr-4 rounded-full bg-white/[0.07] hover:bg-white/[0.10] focus:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold placeholder-white/40 outline-none transition-all shadow-inner focus:border-[#38bdf8]/60"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] hover:bg-white/40 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Center: Navigation Pills */}
          <nav className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#e2e8f0]/95 text-neutral-900 shadow-[0_4px_16px_rgba(255,255,255,0.25)] scale-[1.02]'
                      : 'bg-white/[0.05] hover:bg-white/[0.12] text-white/60 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>

          {/* Right: Notifications, Profile Pill & Close Button */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Notification Bell */}
            <button
              onClick={() => {}}
              className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all relative cursor-pointer"
              title="Notificações"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#f43f5e] shadow-[0_0_8px_#f43f5e]" />
            </button>

            {/* Profile Pill */}
            <div
              onClick={() => onProfileClick?.(authUser?.id || '')}
              className="h-10 pl-1.5 pr-3.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center gap-2.5 cursor-pointer transition-all group"
            >
              <Avatar
                src={authUser?.profile?.avatarUrl}
                name={authUser?.profile?.username || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-white/20"
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[80px]">
                  {authUser?.profile?.displayName || authUser?.profile?.username || 'mialfatih'}
                </span>
                <span className="text-[9px] font-semibold text-white/40 leading-none">
                  Admin
                </span>
              </div>
              <svg className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            {/* Modal Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 transition-all cursor-pointer ml-1"
              title="Fechar Explorar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── MAIN SCROLLABLE CONTENT BODY ── */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

            {/* ════ LEFT COLUMN: ASESMENT & DOWNLOADS ════ */}
            <aside className="w-full lg:w-[270px] xl:w-[290px] flex flex-col gap-5 shrink-0">
              
              {/* ── Card 1: Asesment (Destaques) ── */}
              <div
                id="explore-asesment-section"
                className="rounded-[28px] p-4 sm:p-5 flex flex-col gap-3.5 border border-white/[0.12] shadow-xl relative scroll-mt-6"
                style={{
                  background: isLight ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(16px) saturate(130%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white tracking-tight">Asesment</h3>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'Kognitif' ? 'Popular' : 'Kognitif')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-white/40 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
                  >
                    <span>Sort by</span>
                    <span className="text-white/80 font-bold">{sortOrder}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {/* Stack of Cards */}
                <div className="flex flex-col gap-3">
                  {filteredAsesment.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveWiki(item.title.split(':')[0].trim())}
                      className="h-24 sm:h-26 rounded-[20px] overflow-hidden relative group cursor-pointer border border-white/[0.08] shadow-md hover:scale-[1.02] transition-transform"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {/* Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex items-end justify-between">
                        <span className="text-[11px] font-bold text-white leading-tight line-clamp-2 max-w-[80%] drop-shadow-md">
                          {item.title}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all shadow-md shrink-0 ml-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Card 2: Download Buku Pelajaran ── */}
              <div
                id="explore-download-section"
                className="rounded-[28px] p-4 sm:p-5 flex flex-col gap-3 border border-white/[0.12] shadow-xl relative scroll-mt-6"
                style={{
                  background: isLight ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(16px) saturate(130%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(130%)',
                }}
              >
                <h3 className="text-sm font-bold text-white tracking-tight">Download Buku Pelajaran</h3>

                <div className="flex flex-col gap-2">
                  {DOWNLOAD_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveWiki(item.title)}
                      className="p-2 rounded-[18px] hover:bg-white/[0.06] flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] overflow-hidden border border-white/10 shrink-0">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#38bdf8] transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-semibold text-white/40 truncate">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveWiki(item.title);
                        }}
                        className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white hover:text-black text-white/60 flex items-center justify-center transition-all shrink-0 border-none cursor-pointer"
                        title="Abrir conteúdo"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </aside>

            {/* ════ RIGHT MAIN COLUMN: HERO, SISWA & JADWAL ════ */}
            <main className="flex-1 w-full flex flex-col gap-8 min-w-0">

              {/* ── 1. HERO BANNER ("Trending Event") ── */}
              <section
                id="explore-hero-section"
                className="w-full rounded-[32px] overflow-hidden relative p-6 sm:p-8 md:p-10 border border-white/10 flex flex-col justify-between min-h-[340px] sm:min-h-[380px] shadow-2xl group scroll-mt-6"
              >
                {/* Background Image with Ambient Transition */}
                <img
                  key={currentHero.id}
                  src={currentHero.image}
                  alt={currentHero.title}
                  className="w-full h-full object-cover absolute inset-0 -z-10 transition-transform duration-[2000ms] group-hover:scale-105 animate-in fade-in duration-500"
                />

                {/* Dark Vignette & Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20 -z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 -z-10" />

                {/* Top Badge */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition-all shadow-lg">
                    <span>🔥</span>
                    <span>{currentHero.badge}</span>
                  </div>
                </div>

                {/* Center Content */}
                <div className="relative z-10 flex flex-col items-start gap-2 max-w-2xl my-6">
                  {/* Category Tags */}
                  <div className="flex items-center gap-2 mb-1">
                    {currentHero.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/10 text-white/80 text-[11px] font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Big Title */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                    {currentHero.title}
                  </h1>

                  {/* Subtitle / Description */}
                  <p className="text-white/70 text-xs sm:text-sm leading-relaxed max-w-xl font-medium drop-shadow">
                    {currentHero.description}
                  </p>
                </div>

                {/* Bottom Row: Actions & Carousel Controls */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                  {/* Left Action Buttons */}
                  <div className="flex items-center gap-3">
                    {/* Primary Button */}
                    <button
                      onClick={() => setActiveDetail({ type: 'event', id: currentHero.id, metadata: currentHero })}
                      className="px-6 py-2.5 rounded-full bg-white text-neutral-900 font-extrabold text-xs flex items-center gap-2 hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer border-none"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Look</span>
                    </button>

                    {/* Secondary Button */}
                    <button
                      onClick={() => setActiveWiki(currentHero.guideTopic)}
                      className="px-5 py-2.5 rounded-full bg-black/40 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <span>Guidebook</span>
                    </button>

                    {/* Bookmark Button */}
                    <button
                      onClick={() => toggleSaveHero(currentHero.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                        savedHeroes.has(currentHero.id)
                          ? 'bg-[#f43f5e] border-[#f43f5e] text-white shadow-[0_0_15px_#f43f5e]'
                          : 'bg-black/40 hover:bg-white/20 backdrop-blur-md border-white/20 text-white'
                      }`}
                      title="Salvar Evento"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={savedHeroes.has(currentHero.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2">
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                      </svg>
                    </button>
                  </div>

                  {/* Right Carousel Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevHero}
                      className="w-10 h-10 rounded-full bg-black/40 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
                      title="Anterior"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={nextHero}
                      className="w-10 h-10 rounded-full bg-black/40 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
                      title="Próximo"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </section>

              {/* ── 2. SECTION: SISWA KELAS (4 Vertical Cards) ── */}
              <section id="explore-siswa-section" className="flex flex-col gap-3.5 scroll-mt-6">
                {/* Header */}
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-bold text-white tracking-tight">Siswa Kelas</h2>
                  <button
                    onClick={() => {}}
                    className="text-xs font-semibold text-white/40 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                  >
                    See all
                  </button>
                </div>

                {/* 4 Vertical Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {filteredSiswa.map((siswa) => (
                    <div
                      key={siswa.id}
                      onClick={() => setActiveDetail({ type: 'creator', id: siswa.id, metadata: siswa })}
                      className="h-64 sm:h-72 rounded-[28px] overflow-hidden relative p-4 flex flex-col justify-between border border-white/[0.09] shadow-xl group hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                      {/* Background Image */}
                      <img
                        src={siswa.image}
                        alt={siswa.name}
                        className="w-full h-full object-cover absolute inset-0 -z-10 group-hover:scale-115 transition-transform duration-1000"
                      />

                      {/* Vignette Gradients */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/30 -z-10" />

                      {/* Top Row: Mini Avatar/Badge & Options */}
                      <div className="flex items-center justify-between relative z-10">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-md shadow-md text-white font-bold text-[10px]"
                          style={{ backgroundColor: `${siswa.accent}40` }}
                        >
                          {siswa.name[0]}
                        </div>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuCard(activeMenuCard === siswa.id ? null : siswa.id);
                            }}
                            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md flex items-center justify-center text-white/80 transition-all border-none cursor-pointer"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                              <circle cx="5" cy="12" r="2" />
                            </svg>
                          </button>

                          {/* Quick Menu Popover */}
                          {activeMenuCard === siswa.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-8 w-32 rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-200"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuCard(null);
                                  setActiveDetail({ type: 'creator', id: siswa.id, metadata: siswa });
                                }}
                                className="w-full px-3 py-1.5 rounded-xl text-left text-[11px] font-bold text-white hover:bg-white/10 border-none bg-transparent cursor-pointer"
                              >
                                Ver Perfil
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuCard(null);
                                  setActiveWiki(siswa.name);
                                }}
                                className="w-full px-3 py-1.5 rounded-xl text-left text-[11px] font-bold text-white hover:bg-white/10 border-none bg-transparent cursor-pointer"
                              >
                                Info da Classe
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Info & Play Button */}
                      <div className="relative z-10 flex items-end justify-between gap-2">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="text-[9px] font-mono text-white/50 tracking-wider">
                            {siswa.code}
                          </span>
                          <span className="text-base font-bold text-white tracking-tight truncate leading-tight group-hover:text-[#38bdf8] transition-colors">
                            {siswa.name}
                          </span>
                          <span className="text-[9px] font-medium text-white/60 leading-tight line-clamp-2 mt-0.5">
                            {siswa.subtitle}
                          </span>
                        </div>

                        {/* White Circular Play Button */}
                        <div className="w-9 h-9 rounded-full bg-white text-neutral-900 flex items-center justify-center shadow-2xl group-hover:scale-115 transition-transform shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── 3. SECTION: JADWAL (Calendar, Tasks & Weekly Schedule) ── */}
              <section id="explore-jadwal-section" className="flex flex-col gap-3.5 mb-6 scroll-mt-6">
                {/* Header */}
                <h2 className="text-lg font-bold text-white tracking-tight px-1">Jadwal</h2>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">

                  {/* ── Part A: Calendar + Tasks (Left 8 Cols) ── */}
                  <div
                    className="xl:col-span-8 rounded-[30px] p-5 sm:p-6 flex flex-col md:flex-row gap-6 lg:gap-8 border border-white/[0.12] shadow-xl relative"
                    style={{
                      background: isLight ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(16px) saturate(130%)',
                      WebkitBackdropFilter: 'blur(16px) saturate(130%)',
                    }}
                  >
                    {/* Subpart 1: Calendar */}
                    <div className="w-full md:w-[260px] flex flex-col gap-3 shrink-0">
                      {/* Month & Year Navigation */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{monthName}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={prevMonth}
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border-none cursor-pointer"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="m15 18-6-6 6-6" />
                            </svg>
                          </button>
                          <button
                            onClick={nextMonth}
                            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border-none cursor-pointer"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Day Names Header */}
                      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-white/40 my-1">
                        <span>S</span>
                        <span>M</span>
                        <span>T</span>
                        <span>W</span>
                        <span>T</span>
                        <span>F</span>
                        <span>S</span>
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center text-xs font-semibold">
                        {/* Previous month filler days */}
                        <span className="text-white/20 py-1">27</span>
                        <span className="text-white/20 py-1">28</span>
                        <span className="text-white/20 py-1">29</span>
                        <span className="text-white/20 py-1">30</span>
                        
                        {/* Month days */}
                        {[...Array(31)].map((_, i) => {
                          const day = i + 1;
                          const isSpecialActive = day === 6 || day === 15;
                          const isSpecialPill = day === 11;
                          const isSelected = selectedDay === day;

                          return (
                            <button
                              key={day}
                              onClick={() => setSelectedDay(day)}
                              className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer border-none ${
                                isSelected || isSpecialActive
                                  ? 'bg-[#38bdf8] text-neutral-900 shadow-[0_0_12px_rgba(56,189,248,0.6)] font-black scale-105'
                                  : isSpecialPill
                                  ? 'bg-[#38bdf8]/35 text-[#38bdf8]'
                                  : 'text-white/70 hover:bg-white/10 hover:text-white bg-transparent'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subpart 2: Tasks List */}
                    <div className="flex-1 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/[0.08] pt-4 md:pt-0 md:pl-6 min-w-0">
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-56 custom-scrollbar pr-1">
                        {/* Grouped Tasks */}
                        {['Tasks today', 'Tasks tomorrow', 'Tasks Friday', 'Tasks Saturday'].map((groupName) => {
                          const groupTasks = tasks.filter((t) => t.group === groupName);
                          if (groupTasks.length === 0) return null;

                          return (
                            <div key={groupName} className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                                {groupName}
                              </span>
                              <div className="flex flex-col gap-1">
                                {groupTasks.map((t) => (
                                  <label
                                    key={t.id}
                                    onClick={() => toggleTask(t.id)}
                                    className="flex items-center gap-2 cursor-pointer group select-none"
                                  >
                                    <div
                                      className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors shrink-0 ${
                                        t.done
                                          ? 'bg-[#38bdf8] text-black'
                                          : 'border border-white/30 group-hover:border-white/60 bg-transparent'
                                      }`}
                                    >
                                      {t.done && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      )}
                                    </div>
                                    <span
                                      className={`text-[11px] leading-tight transition-colors ${
                                        t.done ? 'text-white/40 line-through' : 'text-white/80 group-hover:text-white'
                                      }`}
                                    >
                                      {t.text}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Edit Tasks Section / Button */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] mt-2">
                        {isEditingTasks ? (
                          <form onSubmit={handleAddTask} className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={newTaskText}
                              onChange={(e) => setNewTaskText(e.target.value)}
                              placeholder="Nova tarefa..."
                              className="flex-1 h-8 px-3 rounded-lg bg-white/10 text-white text-xs outline-none border border-white/20 focus:border-[#38bdf8]"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-[#38bdf8] text-neutral-900 text-[10px] font-bold uppercase border-none cursor-pointer"
                            >
                              Adicionar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingTasks(false)}
                              className="px-2 py-1.5 rounded-lg bg-white/10 text-white/60 text-[10px] border-none cursor-pointer"
                            >
                              ✕
                            </button>
                          </form>
                        ) : (
                          <>
                            <span className="text-[10px] text-white/40 font-semibold">
                              {tasks.filter((t) => t.done).length}/{tasks.length} concluídas
                            </span>
                            <button
                              onClick={() => setIsEditingTasks(true)}
                              className="px-5 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-neutral-900 font-extrabold text-[11px] uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)] border-none cursor-pointer"
                            >
                              EDIT
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Part B: Weekly Day Cards Stack (Right 4 Cols) ── */}
                  <div className="xl:col-span-4 flex flex-col gap-2.5">
                    {SCHEDULE_DAYS.map((dayItem, idx) => {
                      const isSelected = selectedScheduleIndex === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedScheduleIndex(idx)}
                          className={`rounded-[20px] px-5 py-3 flex items-center justify-between transition-all cursor-pointer shadow-md ${
                            isSelected
                              ? 'bg-[#38bdf8]/30 border border-[#38bdf8]/50 shadow-[0_0_20px_rgba(56,189,248,0.25)] scale-[1.01]'
                              : dayItem.isSpecial
                              ? 'bg-[#38bdf8]/15 border border-[#38bdf8]/25 hover:bg-[#38bdf8]/25'
                              : isLight
                              ? 'bg-white/40 hover:bg-white/60 border border-black/10'
                              : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.10]'
                          }`}
                          style={{
                            backdropFilter: 'blur(16px) saturate(130%)',
                            WebkitBackdropFilter: 'blur(16px) saturate(130%)',
                          }}
                        >
                          {/* Number & Weekday */}
                          <div className="flex items-center gap-3.5">
                            <span className="text-2xl font-black text-white tracking-tight w-8">
                              {dayItem.dayNum}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-semibold text-white/40 leading-none">
                                {dayItem.monthYear}
                              </span>
                              <span className="text-xs font-bold text-white/90 leading-tight mt-0.5">
                                {dayItem.weekday}
                              </span>
                            </div>
                          </div>

                          {/* Badge Count */}
                          <div
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black shadow-md ${
                              isSelected || dayItem.isSpecial
                                ? 'bg-white text-[#0284c7]'
                                : 'bg-[#f43f5e] text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                            }`}
                          >
                            {dayItem.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </section>

            </main>

          </div>
        </div>

      </div>

      {/* ── Secondary Interactive Modals Layer ── */}
      {activeDetail && (
        <DiscoverDetailModal
          type={activeDetail.type}
          id={activeDetail.id}
          onClose={() => setActiveDetail(null)}
          themeColor={c}
          themeMode={themeMode}
          q={activeDetail.metadata?.prompt || activeDetail.metadata?.title}
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
    </div>
  );
}
