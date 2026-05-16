'use client';
import { useState } from 'react';
import { Art, useArtStore } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  art: Art;
  onOpen: (art: Art) => void;
  onSave: (art: Art) => void;
}

export function ArtCard({ art, onOpen, onSave }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const { likeArt, toggleSaveArt } = useArtStore();
  const { accessToken } = useAuthStore();
  
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  return (
    <div 
      className="break-inside-avoid mb-4 group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div 
        className="relative rounded-2xl overflow-hidden bg-white/5 cursor-zoom-in transition-transform duration-500 hover:brightness-95 shadow-lg"
        onClick={() => onOpen(art)}
      >
        <img 
          src={resolveUrl(art.imageUrl)} 
          alt={art.title}
          className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />

        {/* Overlay Controls */}
        <div 
          className={`absolute inset-0 bg-black/20 transition-opacity duration-300 flex flex-col justify-between p-3 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex justify-end gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); if (accessToken) toggleSaveArt(art.id, accessToken); }}
              className={`px-4 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl ${art.saved ? 'bg-black text-white border border-white/20' : 'bg-red-600 hover:bg-red-700 text-white'}`}
            >
              {art.saved ? 'Guardado' : 'Guardar'}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSave(art); }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md shadow-xl border border-white/10"
              title="Organizar em Coleção"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
               <button 
                onClick={(e) => { e.stopPropagation(); if (accessToken) likeArt(art.id, accessToken); }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/20 ${art.liked ? 'bg-white text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill={art.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
               </button>
            </div>
            
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-black flex items-center justify-center transition-all hover:scale-110">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-2 px-1">
        <h3 className="text-xs font-black text-white truncate drop-shadow-sm">{art.title}</h3>
        <div className="flex items-center gap-2 mt-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 shrink-0">
             {art.author?.profile?.avatarUrl ? (
               <img src={resolveUrl(art.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{(art.author?.profile?.username || 'A')[0].toUpperCase()}</div>
             )}
          </div>
          <span className="text-[10px] font-bold text-white truncate">{art.author?.profile?.displayName || art.author?.profile?.username}</span>
        </div>
      </div>
    </div>
  );
}
