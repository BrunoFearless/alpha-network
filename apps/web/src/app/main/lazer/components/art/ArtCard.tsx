'use client';
import { useState } from 'react';
import { Art, useArtStore } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';
import { resolveUrl } from '@/lib/api';

interface Props {
  art: Art;
  onOpen: (art: Art) => void;
  onSave: (art: Art) => void;
}

export function ArtCard({ art, onOpen, onSave }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { likeArt, toggleSaveArt } = useArtStore();
  const { accessToken } = useAuthStore();
  

  // Parse imageUrls — supports both parsed array and raw JSON string
  const allImages: string[] = (() => {
    if (art.imageUrls && Array.isArray(art.imageUrls) && art.imageUrls.length > 0) {
      return art.imageUrls;
    }
    return [art.imageUrl];
  })();

  const isCarousel = allImages.length > 1;
  const currentImage = resolveUrl(allImages[carouselIndex]);

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndex(i => (i + 1) % allImages.length);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarouselIndex(i => (i - 1 + allImages.length) % allImages.length);
  };

  return (
    <div 
      className="break-inside-avoid mb-4 group relative premium-animate-fade"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div 
        className="relative rounded-2xl overflow-hidden bg-white/5 cursor-zoom-in transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] border border-white/10 hover:border-white/20 premium-card-glint shadow-lg"
        onClick={() => onOpen(art)}
      >
        <img 
          src={currentImage} 
          alt={art.title}
          className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Carousel indicator (top-left) */}
        {isCarousel && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/25 z-10 text-white shadow-md">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            <span className="text-[9px] font-black text-white">{allImages.length}</span>
          </div>
        )}

        {/* Overlay Controls (Pinterest Style) */}
        <div 
          className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 transition-opacity duration-300 flex flex-col justify-between p-3.5 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Top row: Track Info & Floating Save Pill Button */}
          <div className="flex justify-between items-center w-full gap-2 z-10">
            {art.musicTrack ? (
              <div className="flex items-center justify-center w-9 h-9 bg-white/20 backdrop-blur-md rounded-full border border-white/25 text-white shadow-md hover:scale-105 active:scale-95 transition-all" title={`Música: ${art.musicTrack.title}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse" style={{ animationDuration: '2s' }}>
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            ) : <div />}

            <div className="flex items-center gap-1.5 ml-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); onSave(art); }}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md border border-white/25 shadow-lg cursor-pointer"
                title="Organizar em Pasta / Coleção"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); if (accessToken) toggleSaveArt(art.id, accessToken); }}
                className={`px-4 py-2 rounded-full font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer ${
                  art.saved 
                    ? 'bg-white/25 text-white border border-white/30 backdrop-blur-md' 
                    : 'bg-[#e60023] hover:bg-[#c9001f] text-white shadow-[0_4px_16px_rgba(230,0,35,0.45)]'
                }`}
              >
                {art.saved ? 'Salvo ✓' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Carousel arrows (middle sides) */}
          {isCarousel && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center backdrop-blur-md border border-white/25 transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center backdrop-blur-md border border-white/25 transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </>
          )}

          {/* Bottom row: Like + Share + Dots */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
               <button 
                onClick={(e) => { e.stopPropagation(); if (accessToken) likeArt(art.id, accessToken); }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/20 ${art.liked ? 'bg-white text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill={art.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
               </button>
            </div>
            
            {/* Dots indicator */}
            {isCarousel && (
              <div className="flex gap-1 absolute bottom-3 left-1/2 -translate-x-1/2">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setCarouselIndex(i); }}
                    className={`rounded-full transition-all ${i === carouselIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(resolveUrl(art.imageUrl), '_blank'); }}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center transition-all hover:scale-110"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section (Pinterest Caption) */}
      <div className="mt-2 px-1 flex flex-col gap-0.5">
        <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">{art.title}</h3>
        <div className="flex items-center justify-between gap-2 mt-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10">
               {art.author?.profile?.avatarUrl ? (
                 <img src={resolveUrl(art.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{(art.author?.profile?.username || 'A')[0].toUpperCase()}</div>
               )}
            </div>
            <span className="text-[11px] font-semibold text-white/70 hover:text-white truncate">{art.author?.profile?.displayName || art.author?.profile?.username}</span>
          </div>
          {art.likesCount > 0 && (
            <span className="text-[10px] font-medium text-white/40 shrink-0 flex items-center gap-0.5">
              ♥ {art.likesCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
