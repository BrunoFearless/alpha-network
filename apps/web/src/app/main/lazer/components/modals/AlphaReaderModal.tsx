import React, { useState, useEffect, useRef } from 'react';

interface AlphaReaderModalProps {
  article: {
    title: string;
    byline?: string;
    dir?: string;
    content: string;
    textContent?: string;
    length?: number;
    siteName?: string;
    excerpt?: string;
  };
  originalUrl: string;
  onClose: () => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function AlphaReaderModal({ article: initialArticle, originalUrl: initialUrl, onClose, themeColor: c, themeMode }: AlphaReaderModalProps) {
  const [article, setArticle] = useState(initialArticle);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const bgMain = isLight ? 'bg-white' : 'bg-[#0a0a0a]';

  const isManga = (article as any).isManga;

  // Track scroll progress
  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;

    const handleScroll = () => {
      const totalHeight = el.scrollHeight - el.clientHeight;
      const progress = (el.scrollTop / totalHeight) * 100;
      setScrollProgress(progress);
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [article, loading]);

  const fetchNewContent = async (url: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/lazer/proxy/readability?target=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.success) {
        setArticle(data.article);
        setCurrentUrl(url);
        // Scroll to top
        if (contentAreaRef.current) contentAreaRef.current.scrollTop = 0;
      }
    } catch (err) {
      console.error('Alpha Hijacker failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIntercept = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    
    if (anchor && anchor.href && anchor.href.startsWith('http')) {
      e.preventDefault();
      fetchNewContent(anchor.href);
    }
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col ${bgMain} font-['Nunito',sans-serif] animate-in fade-in duration-500`}>
      
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 h-1 z-[210] transition-all duration-300" 
           style={{ width: `${scrollProgress}%`, backgroundColor: c, boxShadow: `0 0 10px ${c}` }} />

      {/* Dynamic Background */}
      {!isManga && <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at top, ${c}, transparent 70%)` }} />}

      {/* Header Panel */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/10 backdrop-blur-3xl shrink-0 z-20 relative shadow-md">
         <div className="flex items-center gap-4 mr-6">
            <div className="flex items-center gap-2 hidden md:flex">
               <div onClick={onClose} className="w-3.5 h-3.5 rounded-full bg-[#ff3b30] hover:bg-[#ff6b60] cursor-pointer transition-colors shadow-[0_0_10px_rgba(255,59,48,0.4)]"/>
               <div className="w-3.5 h-3.5 rounded-full bg-[#ffcc00] cursor-default opacity-80"/>
               <div className="w-3.5 h-3.5 rounded-full bg-[#28cd41] cursor-default opacity-80"/>
            </div>

            <button onClick={onClose}
              className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all ${textPrimary} shadow-sm`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Sair
            </button>
         </div>

         <div className="flex-1 max-w-2xl text-center md:text-left flex items-center justify-center md:justify-start gap-3">
            <span className="text-[12px] font-black uppercase tracking-[3px] opacity-50" style={{ color: c }}>
              {isManga ? 'Alpha Manga Native' : 'Alpha Native Reader'}
            </span>
            {loading && <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shadow-[0_0_8px_#06b6d4] animate-ping"/>}
            {!loading && <span className={`w-1.5 h-1.5 rounded-full ${isManga ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'}`}/>}
         </div>

         <div className="flex items-center gap-2">
            {isManga && (
               <button 
                  onClick={() => setZoomMode(prev => prev === 'fit' ? 'full' : 'fit')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/60"
                  title="Toggle Zoom"
               >
                  {zoomMode === 'fit' ? (
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  ) : (
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
                  )}
               </button>
            )}
            <button 
               onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')}
               className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold tracking-widest text-[10px] uppercase shadow-sm"
               style={{ color: c }}
            >
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               <span className="hidden md:inline">Externo</span>
            </button>
         </div>
      </div>

      {/* Article Content */}
      <div ref={contentAreaRef} className="flex-1 overflow-y-auto relative z-10 scrollbar-hide scroll-smooth">
         {loading && (
            <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-black/5 backdrop-blur-md animate-in fade-in duration-300">
               <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mb-4" style={{ borderColor: `${c}40`, borderTopColor: c }} />
               <span className="text-[10px] font-black uppercase tracking-[5px] text-white/30 animate-pulse">Reconfigurando Alpha Native...</span>
            </div>
         )}

         <div className={`${isManga ? (zoomMode === 'fit' ? 'max-w-4xl' : 'max-w-none w-full') : 'max-w-3xl'} mx-auto transition-all duration-500 ${isManga ? 'px-0' : 'px-6 py-12 md:py-16'}`}>
            
            {!isManga && (
               <header className="mb-12 border-b border-white/10 pb-8 text-center md:text-left animate-in fade-in slide-in-from-top-6 duration-700">
                  {article.siteName && (
                     <div className="text-[11px] font-black uppercase tracking-[4px] mb-4 text-[#00f2ff]">
                        {article.siteName}
                     </div>
                  )}
                  <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter ${textPrimary} leading-[1.1] mb-6 drop-shadow-sm`}
                     style={{ fontFamily: "'Playfair Display', serif" }}>
                     {article.title}
                  </h1>
                  
                  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 text-[13px] font-bold ${textSecondary}`}>
                     {article.byline ? (
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                           <span className="opacity-50">Por</span>
                           <span className="uppercase tracking-widest">{article.byline}</span>
                        </div>
                     ) : <div/>}
                     
                     <div className="flex items-center justify-center md:justify-end gap-2 text-[11px] uppercase tracking-widest opacity-60">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span>~{Math.max(1, Math.ceil((article.length || 0) / 1000))} min leitura</span>
                     </div>
                  </div>
               </header>
            )}

            {/* Readability Injected Content with Click Hijacking */}
            <div 
               onClick={handleIntercept}
               className={`${isManga ? '' : 'prose prose-lg max-w-none'} ${isLight ? 'prose-stone' : 'prose-invert'} 
                           prose-headings:font-black prose-headings:tracking-tight 
                           prose-p:leading-relaxed prose-p:font-medium
                           prose-a:text-[#00f2ff] prose-a:no-underline hover:prose-a:underline cursor-default
                           prose-img:rounded-3xl prose-img:shadow-2xl prose-img:border prose-img:border-white/5
                           prose-hr:border-white/10
                           animate-in fade-in slide-in-from-bottom-8 duration-1000`}
               style={{ 
                  fontFamily: isManga ? 'sans-serif' : "'Libre Baskerville', serif", 
                  color: isLight ? '#1a1a1a' : '#d4d4d4' 
               }}
               dir={article.dir}
               dangerouslySetInnerHTML={{ 
                  __html: isManga 
                     ? article.content.replace(/src="\/api/g, `src="${API}/api`) 
                     : article.content 
               }}
            />

            {/* Footer Signature */}
            <div className={`mt-20 pb-10 border-t border-white/5 flex flex-col items-center justify-center text-center opacity-30 ${isManga ? 'px-6' : ''}`}>
               <span className="text-[10px] font-black uppercase tracking-[5px]" style={{ color: c }}>
                  Alpha {isManga ? 'Visual' : 'Structural'} Native Reader
               </span>
               {isManga && <p className="text-[9px] font-bold mt-2 uppercase tracking-widest">Extraído via Alpha Manga Scan Engine</p>}
               <p className="text-[8px] mt-2 opacity-50 uppercase tracking-widest">Alpha Link Hijacker Active</p>
            </div>
         </div>
      </div>
    </div>
  );
}
