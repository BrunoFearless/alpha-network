'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Art, useArtStore } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  art?: Art; // If present, we are in Edit Mode
  onClose: () => void;
}

const CATEGORIES = ['Design', 'Arquitetura', 'Ilustração', 'Fotografia', 'Digital Art', 'Natureza', 'Minimalismo', 'Culinária'];

export function UploadArtModal({ art, onClose }: Props) {
  const { accessToken } = useAuthStore();
  const { fetchArts, updateArt } = useArtStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Digital Art',
    tags: '',
    image: null as File | null
  });
  
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
        image: null
      });
    }
  }, [art]);

  const handleSubmit = async () => {
    if (!form.title || !accessToken) return;
    if (!art && !form.image) return; // Need image for new uploads

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(t => t !== '');
      fd.append('tags', JSON.stringify(tagsArray));

      if (form.image) {
        fd.append('image', form.image);
      }

      let success = false;
      if (art) {
        success = await updateArt(art.id, fd, accessToken);
      } else {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiBase}/api/v1/art/arts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: fd
        });
        const json = await res.json();
        success = json.success;
      }

      if (success) {
        fetchArts();
        onClose();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (typeof document === 'undefined') return null;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      
      <div 
        className="relative w-full max-w-4xl bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent backdrop-blur-3xl rounded-[3rem] border-t-[1.5px] border-l-[1.5px] border-white/40 border-b border-r border-white/10 overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500 shadow-[0_40px_100px_rgba(0,0,0,0.7),inset_0_2px_15px_rgba(255,255,255,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Left: Image Picker */}
        <div className="w-full md:w-1/2 p-10 bg-white/5 flex flex-col items-center justify-center border-r border-white/5 relative group">
           <input 
             ref={fileInputRef} 
             type="file" 
             accept="image/*" 
             className="hidden" 
             onChange={e => setForm(s => ({ ...s, image: e.target.files?.[0] || null }))} 
           />
           
           {(form.image || art?.imageUrl) ? (
             <div className="relative w-full h-full flex items-center justify-center">
                <img src={form.image ? URL.createObjectURL(form.image) : resolveUrl(art!.imageUrl)} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" alt="" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-4 px-6 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
                >
                  Alterar Imagem
                </button>
             </div>
           ) : (
             <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full min-h-[300px] rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-all group/picker"
             >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl group-hover/picker:scale-110 transition-transform">🖼️</div>
                <div className="text-center">
                   <p className="text-sm font-black text-white">Clica para carregar</p>
                   <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">PNG, JPG, WEBP · Recomendado 1000x1500px</p>
                </div>
             </div>
           )}
        </div>

        {/* Right: Info Fields */}
        <div className="flex-1 p-10 flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <div>
                 <h2 className="text-2xl font-black text-white tracking-tight">{art ? 'Editar Arte' : 'Publicar Arte'}</h2>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Alpha Art Studio</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
           </div>

           <div className="space-y-4">
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
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2">Categoria</label>
                    <select 
                      value={form.category}
                      onChange={e => setForm(s => ({ ...s, category: e.target.value }))}
                      className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
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
           </div>

           <button 
             onClick={handleSubmit}
             disabled={loading || !form.title || (!art && !form.image)}
             className="w-full py-5 rounded-3xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] mt-auto hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_10px_40px_rgba(220,38,38,0.3)]"
           >
             {loading ? 'A processar...' : art ? '✦ Guardar Alterações' : '✦ Publicar Agora'}
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
