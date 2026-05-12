'use client';
import { createPortal } from 'react-dom';
import { Art, useArtStore } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';
import { useState, useEffect } from 'react';
import { ArtCard } from './ArtCard';

interface Props {
  art: Art;
  onClose: () => void;
  onSave: (art: Art) => void;
  onEdit?: (art: Art) => void;
}

export function ArtDetailModal({ art: initialArt, onClose, onSave, onEdit }: Props) {
  const { fetchArt, currentArt, arts } = useArtStore();
  const art = currentArt && currentArt.id === initialArt.id ? currentArt : initialArt;
  const { user: authUser } = useAuthStore();
  const [comment, setComment] = useState('');
  
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  useEffect(() => {
    fetchArt(art.id, authUser?.id);
    // Scroll to top when opening a new art
    const container = document.getElementById('art-detail-scroll');
    if (container) container.scrollTop = 0;
  }, [art.id, authUser?.id]);

  if (typeof document === 'undefined') return null;

  // Simulate "similar" by filtering same category
  const similarArts = arts.filter(a => a.id !== art.id && a.category === art.category);

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      
      <div 
        className="relative w-full max-w-5xl h-full max-h-[92vh] bg-white/[0.08] backdrop-blur-3xl rounded-[3rem] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_32px_128px_rgba(0,0,0,0.6)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Fixo com botão de fechar */}
        <div className="absolute top-6 right-6 z-[1100]">
           <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-all hover:rotate-90">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
           </button>
        </div>

        {/* Área de Scroll */}
        <div id="art-detail-scroll" className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          
          <div className="min-h-fit p-6 md:p-10">
            <div className="bg-white/5 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
              
              {/* Lado Esquerdo: Imagem */}
              <div className="flex-1 bg-black/20 flex items-center justify-center p-4 min-h-[400px]">
                <img 
                  src={resolveUrl(art.imageUrl)} 
                  className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                  alt={art.title}
                />
              </div>

              {/* Lado Direito: Info */}
              <div className="w-full md:w-[400px] flex flex-col p-8 border-l border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex gap-3">
                    <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
                    {authUser?.id === art.authorId && (
                      <button 
                        onClick={() => onEdit?.(art)}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/10"
                        title="Editar Arte"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                  </div>
                  <button onClick={() => onSave(art)} className="px-8 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl">Guardar</button>
                </div>

                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-white/10">
                      {art.author?.profile?.avatarUrl && <img src={resolveUrl(art.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{art.author?.profile?.displayName || art.author?.profile?.username}</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Criador Digital</p>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white text-black text-xs font-black uppercase tracking-widest transition-all">Seguir</button>
                </div>

                <div className="mb-6">
                  <h1 className="text-3xl font-black text-white tracking-tight mb-4 leading-tight">{art.title}</h1>
                  {art.description && <p className="text-sm text-white/60 leading-relaxed font-medium mb-6">{art.description}</p>}
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {art.category && (
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest">{art.category}</span>
                    )}
                    {Array.isArray(art.tags) && art.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest">#{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Secção de Comentários (Resumida) */}
                <div className="mt-auto border-t border-white/5 pt-6">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">Comentários</h3>
                  <div className="relative">
                    <input type="text" placeholder="Adicionar comentário..." value={comment} onChange={(e) => setComment(e.target.value)} className="w-full h-12 pl-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all" />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg></button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECÇÃO 2: MAIS COMO ISTO (Infinite Scroll Style) */}
          <div className="p-10 pt-0">
             <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-white/5"></div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Mais como isto</h2>
                <div className="h-px flex-1 bg-white/5"></div>
             </div>

             {similarArts.length > 0 ? (
               <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                  {similarArts.map(sim => (
                    <ArtCard 
                      key={sim.id} 
                      art={sim} 
                      onOpen={(a) => {
                        // Switch art in current modal instead of opening new
                        fetchArt(a.id, authUser?.id);
                        document.getElementById('art-detail-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
                      }} 
                      onSave={onSave} 
                    />
                  ))}
               </div>
             ) : (
               <div className="py-20 text-center opacity-20 italic text-xs uppercase tracking-widest">A carregar mais inspirações...</div>
             )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
