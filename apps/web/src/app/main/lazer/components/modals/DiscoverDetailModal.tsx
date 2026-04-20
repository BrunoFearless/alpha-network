'use client';

import React, { useState, useEffect, useRef } from 'react';
import { YoutubeEmbed } from '@/components/ui/YoutubeEmbed';
import { useAuthStore } from '@/store/auth.store';

interface DetailModalProps {
  type: string;
  id: string;
  q?: string;
  onClose: () => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function DiscoverDetailModal({ type: initialType, id: initialId, q: initialQ, onClose, themeColor: c, themeMode }: DetailModalProps) {
  // Use local state to allow recursive navigation within the modal
  const [currentId, setCurrentId] = useState(initialId);
  const [currentType, setCurrentType] = useState(initialType);
  const [currentQ, setCurrentQ] = useState(initialQ);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isLight = themeMode === 'light';

  // Infinite Scroll for Related Content
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const relatedEndRef = useRef<HTMLDivElement>(null);

  // Initial fetch for main content
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/lazer/discover/detail?type=${currentType}&id=${encodeURIComponent(currentId)}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}&page=1`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await res.json();
        if (json.success) {
           setData(json.data);
           setRelatedItems(json.data.related || []);
           setRelatedPage(1);
           setHasMoreRelated((json.data.related?.length || 0) > 4);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchDetail();
  }, [currentId, currentType, currentQ]);

  // Fetch More Related (Infinite Scroll)
  const fetchMoreRelated = async () => {
     if (loadingRelated || !hasMoreRelated) return;
     setLoadingRelated(true);
     const nextPage = relatedPage + 1;
     try {
        const token = (useAuthStore.getState() as any).accessToken;
        const res = await fetch(`${API}/api/v1/lazer/discover/detail?type=${currentType}&id=${encodeURIComponent(currentId)}${currentQ ? `&q=${encodeURIComponent(currentQ)}` : ''}&page=${nextPage}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await res.json();
        if (json.success) {
           const newItems = json.data.related || [];
           if (newItems.length === 0) {
              setHasMoreRelated(false);
           } else {
              setRelatedItems(prev => {
                 const urls = new Set(prev.map(i => i.url));
                 const unique = newItems.filter((i: any) => !urls.has(i.url));
                 return [...prev, ...unique];
              });
              setRelatedPage(nextPage);
              setHasMoreRelated(newItems.length > 4);
           }
        } else {
           setHasMoreRelated(false);
        }
     } catch { setHasMoreRelated(false); }
     finally { setLoadingRelated(false); }
  };

  // Intersection Observer for the related section
  useEffect(() => {
     if (!hasMoreRelated || loadingRelated || loading) return;
     const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchMoreRelated();
     }, { threshold: 0.1 });
     if (relatedEndRef.current) obs.observe(relatedEndRef.current);
     return () => obs.disconnect();
  }, [hasMoreRelated, loadingRelated, loading, relatedPage, currentId]);

  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const bg = isLight ? 'bg-white' : 'bg-[#0a0a0a]';

  if (loading) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: c }} />
      </div>
    );
  }

  const videoId = (currentType === 'video' || currentType === 'cinema') ? currentId : data?.trailer?.split('embed/')[1]?.split('?')[0];
  const isImage = currentType === 'image';

  // Stability Logic for Related Masonry
  const numCols = 3;
  const galleryColumns = Array.from({ length: numCols }, () => [] as any[]);
  relatedItems.forEach((img, i) => {
     galleryColumns[i % numCols].push(img);
  });

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} />
      
      <div className={`relative w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[56px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-[1.5px] ${bg} animate-in zoom-in-95 duration-500 custom-scrollbar overflow-x-hidden`}
        style={{ borderColor: `${c}30` }}>
        
        {/* Immersive Hybrid Background Layer */}
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
           <div 
             className="absolute inset-[-20%] blur-[120px] transform scale-125"
             style={{ 
               background: isImage ? `url(${data?.imageUrl || currentId}) center/cover no-repeat` : `radial-gradient(circle, ${c}30 0%, transparent 70%)` 
             }}
           />
           <div className={`absolute inset-0 ${isLight ? 'bg-white/40' : 'bg-black/40'}`} />
        </div>

        {/* Close Button */}
        <button onClick={onClose} 
          className="absolute top-10 right-10 z-[100] w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 cursor-pointer backdrop-blur-2xl transition-all hover:scale-110 active:scale-95 shadow-2xl">
          <span className="text-xl">✕</span>
        </button>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col p-10 md:p-16">
          
          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-16 mb-24">
            
            {/* Media/Image Column */}
            <div className="w-full lg:w-[540px] shrink-0">
               <div className="rounded-[48px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-white/10 group relative bg-black/40" style={{ borderColor: `${c}20` }}>
                  {videoId ? (
                    <div className="aspect-video">
                        <YoutubeEmbed videoId={videoId} accentColor={c} compact={false} />
                    </div>
                  ) : (
                    <img src={data?.imageUrl || currentId} alt="" className="w-full h-auto max-h-[75vh] object-contain" />
                  )}
                  {isImage && (
                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                       <a href={data?.imageUrl || currentId} target="_blank" download className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-3xl flex items-center justify-center text-white shadow-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-110">
                          <span className="text-xl">⬇️</span>
                       </a>
                    </div>
                  )}
               </div>
            </div>

            {/* Information Column */}
            <div className="flex-1 space-y-10 pt-4">
               <div className="flex flex-wrap gap-3">
                  <div className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[3px] shadow-xl border border-white/20 backdrop-blur-2xl bg-white/5" style={{ color: c }}>
                     {isImage ? '🏮 IA Vision Master' : currentType === 'tv' ? '📺 Premium Series' : currentType === 'movie' ? '🎬 Feature Film' : currentType}
                  </div>
                  {data?.source && (
                    <div className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[3px] bg-white/5 border border-white/10 text-white/40 backdrop-blur-xl">
                       {data.source}
                    </div>
                  )}
                  {(data?.released || data?.year) && (
                     <div className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[3px] bg-white/5 border border-white/10 backdrop-blur-xl">
                        {data.released || data.year}
                     </div>
                  )}
               </div>

               <h2 className={`text-5xl md:text-7xl font-black tracking-tighter leading-[0.85] ${textPrimary} drop-shadow-[0_10px_30px_rgba(0,0,0,0.3)]`}>
                  {isImage ? (currentQ || 'Alpha Aesthetic Vision') : (data?.title || 'Detalhes do Conteúdo')}
               </h2>
               
               {data?.tagline && (
                  <p className="text-2xl italic font-medium opacity-50 max-w-xl leading-snug" style={{ color: c }}>{data.tagline}</p>
               )}

               <div className={`text-xl leading-[1.6] font-medium opacity-70 max-w-2xl ${textPrimary}`}>
                  {data?.description ? (
                    data.description.split('\n').map((para: string, idx: number) => (
                      <p key={idx} className="mb-6">{para}</p>
                    ))
                  ) : (
                    <p>Processed and analyzed by Alpha Synthetic Intelligence.</p>
                  )}
               </div>

               {/* Metadata Grid (Alpha Refined Pills) */}
               <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {data?.genres?.slice(0, 3).map((g: string) => (
                     <div key={g} className="p-6 rounded-[32px] bg-white/5 border border-white/10 flex flex-col justify-center text-center backdrop-blur-md">
                        <span className="text-[10px] font-black uppercase tracking-[3px] opacity-30 mb-2">Category</span>
                        <span className={`text-[13px] font-black ${textPrimary} uppercase tracking-tighter`}>{g}</span>
                     </div>
                  ))}
                  {data?.runtime && (
                     <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 flex flex-col justify-center text-center backdrop-blur-md">
                        <span className="text-[10px] font-black uppercase tracking-[3px] opacity-30 mb-2">Duration</span>
                        <span className={`text-[13px] font-black ${textPrimary} uppercase tracking-tighter`}>{data.runtime} min</span>
                     </div>
                  )}
               </div>

               {/* Action Area (Alpha Glow Buttons) */}
               <div className="flex flex-wrap gap-6 pt-10">
                  {data?.website && (
                     <a href={data.website} target="_blank" rel="noopener noreferrer" 
                        className="px-12 py-6 rounded-[32px] font-black text-white no-underline shadow-[0_25px_50px_rgba(0,0,0,0.4)] hover:shadow-[0_25px_50px_rgba(var(--accent-rgb),0.4)] hover:scale-105 active:scale-95 transition-all text-[13px] uppercase tracking-[4px] relative overflow-hidden group"
                        style={{ backgroundColor: c }}>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <span className="relative">Official Site ↗</span>
                     </a>
                  )}
                  {(currentType === 'web' || currentType === 'wiki') && (
                     <button 
                        onClick={() => {
                           window.dispatchEvent(new CustomEvent('alpha-open-wiki', { detail: currentId }));
                           onClose();
                        }}
                        className="px-12 py-6 rounded-[32px] font-black text-white border-none shadow-[0_25px_50px_rgba(0,0,0,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden group"
                        style={{ background: c }}>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <span className="relative text-[13px] uppercase tracking-[4px]">Native Article 📖</span>
                     </button>
                  )}
               </div>
            </div>
          </div>

          {/* RELATED CONTENT SECTION (The Alpha Tunnel) */}
          {relatedItems.length > 0 && (
            <div className="mt-20 pt-20 border-t border-white/10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
               <div className="flex items-center justify-between mb-16 px-6">
                  <div className="flex items-center gap-6">
                     <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-xl">
                        <span className="text-3xl animate-bounce">🌟</span>
                     </div>
                     <div>
                        <h4 className={`text-[18px] font-black uppercase tracking-[5px] ${textPrimary}`}>Continuidade Estética</h4>
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[4px]">Alpha Neural Discovery Pipeline</p>
                     </div>
                  </div>
                  <div className="h-px flex-1 bg-white/5 mx-12 hidden md:block" />
               </div>

               {/* Inner Stable Masonry for Related Items */}
               <div className="flex gap-6 pb-24 relative min-h-[600px]">
                  {galleryColumns.map((col, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-6">
                       {col.map((img: any, i: number) => (
                          <div key={`${img.url}-${i}`} 
                            className="rounded-[40px] overflow-hidden border border-white/10 relative group bg-white/5 cursor-pointer transition-all hover:scale-[1.04] hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                            onClick={() => {
                               setCurrentId(img.url);
                               setCurrentType('image');
                               setCurrentQ(img.prompt);
                               document.querySelector('.custom-scrollbar')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}>
                             
                             {/* Optimized Skeleton + Async Image */}
                             <div className="absolute inset-0 bg-white/5 animate-pulse" />
                             <img 
                                src={img.url} 
                                alt="" 
                                className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110 relative z-10" 
                                loading="lazy"
                                decoding="async"
                                style={{ opacity: 0, transition: 'opacity 0.6s ease-in' }}
                                onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                                onError={(e) => { const p = e.currentTarget.closest('.group') as HTMLElement | null; if (p) p.style.display = 'none'; }}
                             />
                             
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[2px] line-clamp-3 leading-relaxed drop-shadow-lg">
                                   {img.prompt}
                                </p>
                             </div>
                          </div>
                       ))}
                    </div>
                  ))}
                  
                  {/* Internal Observer for Suggestions */}
                  <div ref={relatedEndRef} className="absolute bottom-0 left-0 right-0 h-[600px] pointer-events-none" />
                  
                  {loadingRelated && (
                     <div className="absolute bottom-8 left-0 right-0 flex justify-center py-8">
                        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${c}40`, borderTopColor: c }} />
                     </div>
                  )}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
