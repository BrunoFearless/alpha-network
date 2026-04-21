import React, { useState, useEffect, useRef } from 'react';

interface MangaReaderModalProps {
  mangaId: string;
  chapterId: string;
  chapterNumber: string;
  mangaTitle: string;
  onClose: () => void;
  onChapterChange?: (newChapterId: string, newNumber: string) => void;
  chapters: any[]; // List of chapters for navigation
  themeColor: string;
  themeMode: 'light' | 'dark';
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function MangaReaderModal({ mangaId, chapterId, chapterNumber, mangaTitle, onClose, onChapterChange, chapters, themeColor: c, themeMode }: MangaReaderModalProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const bgMain = isLight ? 'bg-[#f5f5f5]' : 'bg-[#050505]';

  // Track scroll progress
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const totalHeight = el.scrollHeight - el.clientHeight;
      const progress = (el.scrollTop / totalHeight) * 100;
      setScrollProgress(progress);
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [pages, loading]);

  useEffect(() => {
    const fetchPages = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('alpha_token'); 
        const res = await fetch(`${API}/api/v1/lazer/discover/manga/chapter/${chapterId}/pages`, {
           headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) {
          setPages(data.pages || []);
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
        } else {
          setError(data.error || 'Falha ao carregar páginas');
        }
      } catch (err) {
        setError('Erro de conexão com o servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [chapterId]);

  const currentIndex = chapters.findIndex(ch => ch.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <div className={`fixed inset-0 z-[300] flex flex-col ${bgMain} font-['Nunito',sans-serif] animate-in fade-in duration-500`}>
      
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 h-1 z-[310] transition-all duration-300" 
           style={{ width: `${scrollProgress}%`, backgroundColor: c, boxShadow: `0 0 10px ${c}` }} />

      {/* Header Panel - Glassmorphism */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-3xl shrink-0 z-20 relative shadow-2xl">
         <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-white/70">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <div className="flex flex-col">
               <h2 className="text-[10px] font-black uppercase tracking-[3px]" style={{ color: c }}>Alpha Manga Reader</h2>
               <h1 className={`text-[14px] md:text-[16px] font-black ${textPrimary} truncate max-w-[150px] md:max-w-md`}>
                  {mangaTitle} <span className="opacity-40 ml-2">Cap. {chapterNumber}</span>
               </h1>
            </div>
         </div>

         <div className="flex items-center gap-2">
            <button 
               onClick={() => setZoomMode(prev => prev === 'fit' ? 'full' : 'fit')}
               className="hidden md:flex p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/60"
            >
               {zoomMode === 'fit' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
               ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
               )}
            </button>

            <div className="flex items-center gap-2">
               {prevChapter && (
                  <button 
                     onClick={() => onChapterChange?.(prevChapter.id, prevChapter.chapter)}
                     className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black transition-all text-white/60"
                  >
                     {/* <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg> */}
                     <span className="hidden md:inline">ANTERIOR</span>
                     <span className="md:hidden">◀</span>
                  </button>
               )}
               {nextChapter && (
                  <button 
                     onClick={() => onChapterChange?.(nextChapter.id, nextChapter.chapter)}
                     className="px-6 py-2.5 rounded-xl font-black text-[11px] transition-all text-white shadow-lg"
                     style={{ background: c }}
                  >
                     <span className="hidden md:inline">PRÓXIMO</span>
                     <span className="md:hidden">▶</span>
                  </button>
               )}
            </div>
         </div>
      </div>

      {/* Reader Body - Vertical Scroll */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide scroll-smooth">
         {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-50">
               <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-4" style={{ borderColor: c }} />
               <p className="text-[12px] font-black uppercase tracking-[4px] text-white/50 animate-pulse">Carregando Páginas...</p>
            </div>
         )}

         {error && (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
               <span className="text-6xl mb-6">⚠️</span>
               <h3 className={`text-xl font-black ${textPrimary} mb-2 uppercase`}>Erro no Nexus do Mangá</h3>
               <p className="text-sm opacity-50 mb-8 max-w-xs">{error}</p>
               <button onClick={onClose} className="px-8 py-3 rounded-full font-black text-white" style={{ background: c }}>FECHAR LEITOR</button>
            </div>
         )}

         <div className={`${zoomMode === 'fit' ? 'max-w-[900px]' : 'max-w-none w-full'} mx-auto flex flex-col items-center transition-all duration-500 bg-black/40 shadow-[0_0_100px_rgba(0,0,0,0.5)]`}>
            {pages.map((p, i) => (
               <img 
                  key={i} 
                  src={p} 
                  alt={`Pág ${i+1}`} 
                  className="w-full h-auto block select-none"
                  loading="lazy"
               />
            ))}
            
            {/* End of Chapter Actions */}
            {!loading && !error && pages.length > 0 && (
               <div className="w-full py-24 px-6 flex flex-col items-center text-center gap-6 border-t border-white/5 bg-gradient-to-b from-transparent to-black/60">
                  <span className="text-4xl">🏮</span>
                  <div className="flex flex-col">
                     <h3 className="text-xl font-black text-white uppercase tracking-tighter">Capítulo Finalizado</h3>
                     <p className="text-sm text-white/40 font-bold mb-8">Desejas continuar a jornada ou voltar ao Hub?</p>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={onClose} className="px-10 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest border-2 border-white/10 text-white/60 hover:bg-white/5 transition-all">
                        Voltar ao Perfil
                     </button>
                     {nextChapter && (
                        <button 
                           onClick={() => onChapterChange?.(nextChapter.id, nextChapter.chapter)}
                           className="px-12 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
                           style={{ background: c }}
                        >
                           Próximo Capítulo
                        </button>
                     )}
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
