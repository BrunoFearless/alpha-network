'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface WikiModalProps {
  initialTitle: string;
  onClose: () => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function WikiModal({ initialTitle, onClose, themeColor: c, themeMode }: WikiModalProps) {
  const [currentTitle, setCurrentTitle] = useState(initialTitle);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLight = themeMode === 'light';

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/lazer/discover/wiki/${encodeURIComponent(currentTitle)}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          scrollRef.current?.scrollTo(0, 0);
        } else {
          setError(json.error || 'Não foi possível encontrar este artigo.');
        }
      } catch (err) {
        setError('Erro de conexão com a enciclopédia.');
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [currentTitle]);

  // Handle Wiki link clicks
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor && anchor.getAttribute('href')?.startsWith('/wiki/')) {
      e.preventDefault();
      const newTitle = anchor.getAttribute('href')?.replace('/wiki/', '') || '';
      if (newTitle) setCurrentTitle(decodeURIComponent(newTitle));
    }
  };

  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const bg = isLight ? 'bg-white' : 'bg-[#0a0a0a]';
  const borderCol = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className={`relative w-full max-w-5xl h-[85vh] flex flex-col rounded-[40px] shadow-2xl border-[1.5px] ${bg} animate-in zoom-in-95 duration-300 overflow-hidden`}
        style={{ borderColor: `${c}40` }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0" style={{ borderColor: borderCol }}>
           <div className="flex items-center gap-4">
              <span className="text-3xl">📖</span>
              <div>
                 <h2 className={`text-xl font-black ${textPrimary}`}>{data?.title || currentTitle.replace(/_/g, ' ')}</h2>
                 <p className={`text-[10px] font-black uppercase tracking-widest opacity-50`}>Alpha Wiki Hub</p>
              </div>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 hover:scale-110 transition-all flex items-center justify-center border-none text-xl cursor-pointer">✕</button>
        </div>

        {/* Content Scroll Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar" onClick={handleContentClick}>
           {loading ? (
             <div className="flex flex-col items-center justify-center h-5/6">
                <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4" style={{ borderColor: c }} />
                <p className={`text-sm font-bold opacity-60 ${textPrimary}`}>Sincronizando enciclopédia...</p>
             </div>
           ) : error ? (
             <div className="flex flex-col items-center justify-center h-5/6 text-center">
                <span className="text-5xl mb-4">🔍</span>
                <h3 className={`text-xl font-black mb-2 ${textPrimary}`}>Ops! Artigo não encontrado</h3>
                <p className={`text-sm opacity-60 font-medium max-w-xs ${textPrimary}`}>{error}</p>
                <button onClick={onClose} className="mt-8 px-8 py-3 rounded-full text-white font-black uppercase tracking-widest border-none cursor-pointer" style={{ background: c }}>Voltar</button>
             </div>
           ) : (
             <div className="max-w-3xl mx-auto">
                
                <div className="flex flex-col md:flex-row gap-8 items-end mb-12 relative z-10">
                   {data?.imageUrl && (
                      <div className="w-full md:w-56 aspect-[10/14] rounded-[32px] overflow-hidden shrink-0 shadow-2xl border-4 border-white/10 bg-black/5">
                         <img src={data.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                   )}
                   <div className="flex-1 pb-2">
                      <h4 className={`text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-none ${textPrimary}`}>{data?.title}</h4>
                      {data?.description && (
                         <p className={`text-base md:text-lg italic font-bold opacity-60 ${textPrimary}`}>
                            {data.description}
                         </p>
                      )}
                   </div>
                </div>

                <div className="wiki-content space-y-8">
                   {data?.sections?.map((section: any) => (
                      <div key={section.id} className="section-block">
                         {section.title && (
                            <h3 className={`font-black mb-4 tracking-tight ${section.level > 1 ? 'text-xl mt-10' : 'text-3xl mt-12'} ${textPrimary}`}>
                               {section.title}
                            </h3>
                         )}
                         <div 
                           className={`wiki-text text-sm md:text-base leading-relaxed font-medium opacity-90 ${textPrimary}`}
                           dangerouslySetInnerHTML={{ __html: section.text }} 
                         />
                      </div>
                   ))}
                </div>

                {/* Footer Link */}
                <div className="mt-20 pt-10 border-t flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity" style={{ borderColor: borderCol }}>
                   <p className="text-xs font-bold">Fonte: pt.wikipedia.org</p>
                   <a href={data?.url} target="_blank" rel="noopener noreferrer" className={`text-xs font-black uppercase tracking-widest no-underline hover:underline ${textPrimary}`}>Ver no Site Original ↗</a>
                </div>
             </div>
           )}
        </div>

        {/* Custom Styling for Wiki HTML */}
        <style jsx global>{`
          .wiki-text a {
            color: ${c};
            text-decoration: none;
            font-weight: 700;
          }
          .wiki-text a:hover {
            text-decoration: underline;
          }
          .wiki-text p {
            margin-bottom: 1.5rem;
          }
          .wiki-text ul, .wiki-text ol {
            margin-bottom: 1.5rem;
            padding-left: 1.5rem;
          }
          .wiki-text li {
            margin-bottom: 0.5rem;
          }
          .wiki-text .thumb {
            margin: 2rem 0;
            border-radius: 20px;
            overflow: hidden;
            background: rgba(0,0,0,0.05);
            padding: 10px;
          }
          .wiki-text .thumbimage {
            border-radius: 12px;
            max-width: 100%;
            height: auto;
          }
          .wiki-text .thumbcaption {
            font-size: 11px;
            font-weight: 600;
            margin-top: 8px;
            opacity: 0.6;
          }
          .wiki-text table {
            display: none; /* Hide complex tables for cleaner read */
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: ${c}20;
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: ${c}40;
          }
        `}</style>
      </div>
    </div>
  );
}
