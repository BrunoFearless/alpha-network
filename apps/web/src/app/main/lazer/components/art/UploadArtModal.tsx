'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Art, useArtStore } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';
import { useMusicStore } from '@/store/music.store';
import { resolveUrl } from '@/lib/api';

interface Props {
  art?: Art; // If present, we are in Edit Mode
  onClose: () => void;
}

const CATEGORIES = ['Design', 'Arquitetura', 'Ilustração', 'Fotografia', 'Digital Art', 'Natureza', 'Minimalismo', 'Culinária'];

export function UploadArtModal({ art, onClose }: Props) {
  const [isExiting, setIsExiting] = useState(false);
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 550);
  };

  const { accessToken } = useAuthStore();
  const { fetchArts, updateArt } = useArtStore();
  const { tracks, fetchTracks } = useMusicStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Digital Art',
    tags: '',
    musicTrackId: '',
  });
  const [images, setImages] = useState<File[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showMusicDropdown, setShowMusicDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (musicRef.current && !musicRef.current.contains(event.target as Node)) {
        setShowMusicDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (art) {
      let tagsStr = '';
      if (Array.isArray(art.tags)) {
        tagsStr = art.tags.join(', ');
      } else if (typeof art.tags === 'string') {
        try {
          const parsed = JSON.parse(art.tags);
          if (Array.isArray(parsed)) tagsStr = parsed.join(', ');
          else tagsStr = art.tags;
        } catch {
          tagsStr = art.tags;
        }
      }

      setForm({
        title: art.title,
        description: art.description || '',
        category: art.category,
        tags: tagsStr,
        musicTrackId: art.musicTrackId || '',
      });
    }
  }, [art]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setImages(prev => {
      const combined = [...prev, ...newFiles].slice(0, 10);
      return combined;
    });
    setPreviewIndex(0);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewIndex(0);
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.title || !accessToken) return;
    if (!art && images.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      if (form.musicTrackId) {
         fd.append('musicTrackId', form.musicTrackId);
      }
      
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(t => t !== '');
      fd.append('tags', JSON.stringify(tagsArray));

      let success = false;
      if (art) {
        // Edit mode — only send first image if changed
        if (images.length > 0) fd.append('image', images[0]);
        success = await updateArt(art.id, fd, accessToken);
        if (!success) setError("Ocorreu um erro ao atualizar a arte.");
      } else {
        // New post — send all images under 'images' key
        images.forEach(img => fd.append('images', img));

        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiBase}/api/v1/art/arts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: fd
        });
        const json = await res.json();
        if (res.ok && json.success) {
          success = true;
        } else {
          // Extract message whether it is a string or an array of strings (NestJS format)
          let errMsg = json.message;
          if (Array.isArray(errMsg)) errMsg = errMsg[0];
          
          setError(errMsg || "Publicação rejeitada: o conteúdo contém nudez, conteúdo sexual, discurso de ódio ou extremismo. Este tipo de conteúdo não é permitido na Alpha Art.");
        }
      }

      if (success) {
        fetchArts();
        handleClose();
      }
    } catch (e: any) { 
      console.error(e); 
      setError(e.message || "Publicação rejeitada: o conteúdo contém nudez, conteúdo sexual, discurso de ódio ou extremismo. Este tipo de conteúdo não é permitido na Alpha Art.");
    }
    finally { setLoading(false); }
  };

  if (typeof document === 'undefined') return null;


  const currentPreview = images.length > 0
    ? URL.createObjectURL(images[previewIndex])
    : art?.imageUrl ? resolveUrl(art.imageUrl) : null;

  return createPortal(
    <div className={`fixed inset-0 z-[1100] flex items-center justify-center p-8 ${isExiting ? 'premium-animate-backdrop-exit' : 'premium-animate-backdrop-enter'}`} onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40" />
      
      <div 
        className={`relative w-full max-w-4xl bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent backdrop-blur-3xl rounded-[3rem] border-t-[1.5px] border-l-[1.5px] border-white/40 border-b border-r border-white/10 overflow-hidden flex flex-col md:flex-row ${isExiting ? 'premium-animate-scale-exit' : 'premium-animate-scale-enter'} shadow-[0_40px_100px_rgba(0,0,0,0.7),inset_0_2px_15px_rgba(255,255,255,0.2)]`}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes premium-backdrop-fade-in {
            from { opacity: 0; backdrop-filter: blur(0px); }
            to { opacity: 1; backdrop-filter: blur(12px); }
          }
          @keyframes premium-backdrop-fade-out {
            from { opacity: 1; backdrop-filter: blur(12px); }
            to { opacity: 0; backdrop-filter: blur(0px); }
          }

          @keyframes premium-modal-scale-in {
            from {
              opacity: 0;
              transform: translateY(28px) scale(0.965);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes premium-modal-scale-out {
            from {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            to {
              opacity: 0;
              transform: translateY(20px) scale(0.97);
            }
          }

          .premium-animate-backdrop-enter {
            animation: premium-backdrop-fade-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .premium-animate-backdrop-exit {
            animation: premium-backdrop-fade-out 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .premium-animate-scale-enter {
            animation: premium-modal-scale-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .premium-animate-scale-exit {
            animation: premium-modal-scale-out 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
        {/* Left: Image Picker */}
        <div className="w-full md:w-1/2 p-10 bg-white/5 flex flex-col gap-4 border-r border-white/5 relative">
           <input 
             ref={fileInputRef} 
             type="file" 
             accept="image/*" 
             multiple
             className="hidden" 
             onChange={e => handleFiles(e.target.files)}
           />
           
           {/* Main Preview */}
           <div
             className="relative flex-1 min-h-[260px] rounded-2xl overflow-hidden bg-black/20 flex items-center justify-center group cursor-pointer"
             onClick={() => !currentPreview && fileInputRef.current?.click()}
           >
             {currentPreview ? (
               <>
                 <img src={currentPreview} className="max-w-full max-h-[300px] object-contain rounded-2xl" alt="" />
                 {/* Overlay navigation for multi-image */}
                 {images.length > 1 && (
                   <>
                     <button
                       onClick={e => { e.stopPropagation(); setPreviewIndex(i => (i - 1 + images.length) % images.length); }}
                       className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all"
                     >
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                     </button>
                     <button
                       onClick={e => { e.stopPropagation(); setPreviewIndex(i => (i + 1) % images.length); }}
                       className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all"
                     >
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                     </button>
                     <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                       {images.map((_, i) => (
                         <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === previewIndex ? 'bg-white' : 'bg-white/40'}`} />
                       ))}
                     </div>
                   </>
                 )}
                 <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                   <button
                     onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                     className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black/80 transition-all"
                   >
                     + Adicionar
                   </button>
                 </div>
               </>
             ) : (
               <div className="w-full h-full min-h-[260px] rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl">🖼️</div>
                 <div className="text-center">
                   <p className="text-sm font-black text-white">Clica para carregar</p>
                   <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Podes selecionar múltiplas imagens</p>
                 </div>
               </div>
             )}
           </div>

           {/* Thumbnails Row */}
           {images.length > 1 && (
             <div className="flex gap-2 overflow-x-auto no-scrollbar">
               {images.map((img, i) => (
                 <div key={i} className="relative shrink-0 group/thumb">
                   <img
                     src={URL.createObjectURL(img)}
                     className={`w-16 h-16 object-cover rounded-xl cursor-pointer transition-all border-2 ${i === previewIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                     onClick={() => setPreviewIndex(i)}
                     alt=""
                   />
                   <button
                     onClick={() => removeImage(i)}
                     className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all"
                   >
                     <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                   </button>
                 </div>
               ))}
               <button
                 onClick={() => fileInputRef.current?.click()}
                 className="w-16 h-16 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all shrink-0 text-2xl"
               >
                 +
               </button>
             </div>
           )}
        </div>

        {/* Right: Info Fields */}
        <div className="flex-1 p-10 flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <div>
                 <h2 className="text-2xl font-black text-white tracking-tight">{art ? 'Editar Arte' : 'Publicar Arte'}</h2>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                   {images.length > 1 ? `${images.length} imagens selecionadas` : 'Alpha Art Studio'}
                 </p>
              </div>
              <button onClick={handleClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
           </div>

           <div className="space-y-4">
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><path d="M12 8v4M12 16h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-400 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
              <input 
                type="text" 
                placeholder="Título da inspiração *"
                value={form.title}
                onChange={e => setForm(s => ({ ...s, title: e.target.value }))}
                className="w-full h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
              />
              <textarea 
                placeholder="Descrição (opcional)"
                value={form.description}
                onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
                className="w-full h-32 p-6 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all resize-none"
              />
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-2 relative" ref={categoryRef}>
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white flex items-center justify-between hover:bg-white/10 transition-all text-left"
                    >
                      <span>{form.category}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    
                    {showCategoryDropdown && (
                      <div className="absolute top-[105%] left-0 right-0 p-1 bg-neutral-950/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[150] max-h-48 overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setForm(s => ({ ...s, category: cat }));
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full px-4 py-2.5 rounded-xl text-left text-xs transition-all ${form.category === cat ? 'bg-white text-black font-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2">Tags</label>
                    <input 
                      type="text" 
                      placeholder="design, minimalismo..."
                      value={form.tags}
                      onChange={e => setForm(s => ({ ...s, tags: e.target.value }))}
                      className="w-full h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all"
                    />
                 </div>
              </div>

              <div className="flex flex-col gap-2 relative" ref={musicRef}>
                 <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2">Trilha Sonora do Mood (Opcional)</label>
                 <button
                    type="button"
                    onClick={() => setShowMusicDropdown(!showMusicDropdown)}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white flex items-center justify-between hover:bg-white/10 transition-all text-left"
                  >
                    <span className="truncate">
                      {form.musicTrackId ? (
                        <span className="flex items-center gap-1.5 truncate">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                          {tracks.find(t => t.id === form.musicTrackId)?.title} — {tracks.find(t => t.id === form.musicTrackId)?.artist}
                        </span>
                      ) : (
                        'Nenhuma música (Silencioso)'
                      )}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${showMusicDropdown ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                  </button>

                  {showMusicDropdown && (
                    <div className="absolute top-[105%] left-0 right-0 p-1 bg-neutral-950/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[150] max-h-48 overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
                      <button
                        type="button"
                        onClick={() => {
                          setForm(s => ({ ...s, musicTrackId: '' }));
                          setShowMusicDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl text-left text-xs transition-all ${form.musicTrackId === '' ? 'bg-white text-black font-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                      >
                        Nenhuma música (Silencioso)
                      </button>
                      {tracks.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setForm(s => ({ ...s, musicTrackId: t.id }));
                            setShowMusicDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 rounded-xl text-left text-xs transition-all flex flex-col gap-0.5 ${form.musicTrackId === t.id ? 'bg-white text-black font-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                        >
                          <span className="font-bold truncate flex items-center gap-1.5">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                            {t.title}
                          </span>
                          <span className={`text-[9px] ${form.musicTrackId === t.id ? 'text-black/50' : 'text-white/40'}`}>{t.artist}</span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
           </div>

           <button 
             onClick={handleSubmit}
             disabled={loading || !form.title || (!art && images.length === 0)}
             className="w-full py-5 rounded-3xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] mt-auto hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_10px_40px_rgba(220,38,38,0.3)]"
           >
             {loading ? 'A processar...' : art ? '✦ Guardar Alterações' : `✦ Publicar ${images.length > 1 ? `(${images.length} imagens)` : 'Agora'}`}
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
