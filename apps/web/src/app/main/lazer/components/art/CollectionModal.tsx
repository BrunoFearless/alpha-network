'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Art, ArtCollection, useArtStore } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';

interface Props {
  art?: Art; // If present, we can save art to collections
  collection?: ArtCollection | any; // If present, we are editing this collection
  onClose: () => void;
}

export function CollectionModal({ art, collection, onClose }: Props) {
  const { collections, fetchUserCollections, createCollection, updateCollection, addArtToCollection } = useArtStore();
  const { user: authUser, accessToken } = useAuthStore();
  const { friendProfiles, fetchFriends } = useLazerStore();
  
  const [showCreate, setShowCreate] = useState(!!collection); // Auto show form if editing
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    cover: null as File | null,
    isPublic: true,
    collaborators: [] as any[]
  });
  
  const [friendSearch, setFriendSearch] = useState('');
  const [showFriendSuggestions, setShowFriendSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authUser?.id) {
      fetchUserCollections(authUser.id);
      fetchFriends();
    }
    if (collection) {
      setForm({
        title: collection.title,
        description: collection.description || '',
        cover: null,
        isPublic: collection.isPublic ?? true,
        collaborators: collection.collaborators?.map((c: any) => c.user?.profile ? { ...c.user.profile, id: c.userId } : null).filter(Boolean) || []
      });
    }
  }, [authUser?.id, collection]);

  const handleSaveArt = async (colId: string) => {
    if (!accessToken || !art?.id) return;
    setSavingId(colId);
    const success = await addArtToCollection(art.id, colId, accessToken);
    if (success) onClose();
    setSavingId(null);
  };

  const handleAction = async () => {
    if (!form.title || !accessToken) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('isPublic', String(form.isPublic));
      if (form.cover) fd.append('cover', form.cover);
      
      const collabIds = form.collaborators.map(c => c.id);
      if (collabIds.length > 0) fd.append('collaborators', JSON.stringify(collabIds));

      let success = false;
      if (collection) {
        success = await updateCollection(collection.id, fd, accessToken);
      } else {
        success = await createCollection(fd, accessToken);
      }

      if (success) {
        if (authUser?.id) await fetchUserCollections(authUser.id);
        
        // If we were saving an art and just created a new collection for it
        if (!collection && art?.id) {
          const latest = useArtStore.getState().collections[0];
          if (latest) await handleSaveArt(latest.id);
        }
        
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addCollaborator = (friend: any) => {
    if (form.collaborators.find(c => c.id === friend.id)) return;
    setForm(s => ({ ...s, collaborators: [...s.collaborators, friend] }));
    setFriendSearch('');
    setShowFriendSuggestions(false);
  };

  const removeCollaborator = (id: string) => {
    setForm(s => ({ ...s, collaborators: s.collaborators.filter(c => c.id !== id) }));
  };

  if (typeof document === 'undefined') return null;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  const filteredFriends = friendProfiles.filter(f => 
    (f.name?.toLowerCase().includes(friendSearch.toLowerCase()) || 
     f.handle?.toLowerCase().includes(friendSearch.toLowerCase())) &&
    !form.collaborators.find(c => c.id === f.id)
  );

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
      
      <div 
        className={`relative w-full ${showCreate ? 'max-w-3xl h-fit' : 'max-w-md h-[600px]'} bg-gradient-to-br from-white/[0.18] via-white/[0.06] to-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 shadow-[0_40px_80px_rgba(0,0,0,0.5),inset_0_2px_12px_rgba(255,255,255,0.25)] border-t-[1.5px] border-l-[1.5px] border-white/40 border-b border-r border-white/10 transition-all`}
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 flex items-center justify-between z-10 flex-shrink-0">
           <div>
              <h2 className="text-lg font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {collection ? 'Editar Coleção' : showCreate ? 'Nova Coleção' : 'Guardar em...'}
              </h2>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mt-0.5">Alpha Art Curator</p>
           </div>
           <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/20 shadow-lg">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6 6 18M6 6l12 12"/></svg>
           </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar">
           {showCreate ? (
             <div className="flex flex-col md:flex-row h-full animate-in slide-in-from-right-4 duration-500">
                {/* Lateral Esquerda */}
                <div className="w-full md:w-[260px] p-6 pt-0 flex flex-col gap-4 border-r border-white/10">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Banner</label>
                       <div 
                         onClick={() => fileInputRef.current?.click()}
                         className="relative h-[160px] rounded-[1.5rem] bg-white/5 border-[1.5px] border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"
                       >
                         <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => setForm(s => ({ ...s, cover: e.target.files?.[0] || null }))} />
                         {(form.cover || collection?.coverUrl) ? (
                           <>
                             <img src={form.cover ? URL.createObjectURL(form.cover) : resolveUrl(collection.coverUrl)} className="w-full h-full object-cover" alt="" />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <span className="px-4 py-2 rounded-full bg-white text-black text-[8px] font-black uppercase tracking-widest shadow-xl">Alterar</span>
                             </div>
                           </>
                         ) : (
                           <div className="text-center p-4">
                               <div className="text-xl mb-2 opacity-40 group-hover:scale-110 transition-transform">📸</div>
                               <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Capa</p>
                           </div>
                         )}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Amigos ({form.collaborators.length})</label>
                       <div className="flex flex-wrap gap-1.5">
                          {form.collaborators.map(c => (
                            <div key={c.id} className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-white/10 border border-white/20 shadow-md animate-in zoom-in-90">
                               <div className="w-4 h-4 rounded-full overflow-hidden border border-white/20">
                                  <img src={resolveUrl(c.avatar || c.avatarUrl)} className="w-full h-full object-cover" alt="" />
                               </div>
                               <span className="text-[8px] font-bold text-white/80 truncate max-w-[60px]">{c.name || c.displayName || c.username}</span>
                               <button onClick={() => removeCollaborator(c.id)} className="text-white/40 hover:text-red-500">
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6 6 18M6 6l12 12"/></svg>
                               </button>
                            </div>
                          ))}
                       </div>
                    </div>
                </div>

                {/* Lateral Direita */}
                <div className="flex-1 p-6 pt-0 space-y-5">
                    <div className="space-y-3">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Nome</label>
                          <input type="text" placeholder="Título *" value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} className="w-full h-11 px-5 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none transition-all placeholder-white/20 focus:bg-white/20 shadow-inner" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Descrição</label>
                          <textarea placeholder="..." value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} className="w-full h-16 p-4 rounded-xl bg-white/10 border border-white/20 text-[11px] text-white focus:outline-none resize-none placeholder-white/20 focus:bg-white/20 shadow-inner" />
                       </div>
                       <div className="space-y-1.5 relative">
                          <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Convidar</label>
                          <input type="text" placeholder="Pesquisar..." value={friendSearch} onFocus={() => setShowFriendSuggestions(true)} onChange={e => setFriendSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 text-xs text-white focus:outline-none placeholder-white/20 focus:bg-white/20 shadow-inner" />
                          {showFriendSuggestions && friendSearch.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-white/20 backdrop-blur-3xl rounded-xl border border-white/30 shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-[100] max-h-32 overflow-y-auto no-scrollbar">
                               {filteredFriends.map(friend => (
                                 <button key={friend.id} onClick={() => addCollaborator(friend)} className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/20 transition-all text-left">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20"><img src={resolveUrl(friend.avatar)} className="w-full h-full object-cover" alt="" /></div>
                                    <p className="text-[10px] font-bold text-white truncate">{friend.name}</p>
                                 </button>
                               ))}
                            </div>
                          )}
                       </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => collection ? onClose() : setShowCreate(false)} className="flex-1 h-11 rounded-xl bg-white/10 text-white/60 text-[9px] font-black uppercase hover:bg-white/20 transition-all border border-white/20">Cancelar</button>
                      <button onClick={handleAction} disabled={loading || !form.title} className="flex-1 h-11 rounded-xl bg-white text-black text-[9px] font-black uppercase shadow-[0_12px_24px_rgba(255,255,255,0.2)] hover:scale-105 transition-all">
                        {loading ? '...' : collection ? 'Guardar' : 'Criar'}
                      </button>
                    </div>
                </div>
             </div>
           ) : (
             <div className="px-6 pb-6 space-y-2 animate-in fade-in duration-500">
                {collections.map(col => (
                  <button 
                    key={col.id}
                    onClick={() => handleSaveArt(col.id)}
                    disabled={!!savingId}
                    className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/20 border-t border-l border-white/30 border-b border-r border-white/10 transition-all text-left w-full bg-white/10 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]"
                  >
                     <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/20 overflow-hidden flex-shrink-0 shadow-lg">
                        {col.coverUrl ? (
                          <img src={resolveUrl(col.coverUrl)} className="w-full h-full object-cover" alt="" />
                        ) : col.items?.[0]?.art?.imageUrl ? (
                          <img src={resolveUrl(col.items[0].art.imageUrl)} className="w-full h-full object-cover opacity-80" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl opacity-30">📂</div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{col.title}</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{col._count?.items || 0} Itens</p>
                     </div>
                     <div className={`px-4 py-2 rounded-full font-black text-[8px] uppercase tracking-widest transition-all ${savingId === col.id ? 'bg-white/10 text-white/40' : 'bg-red-600 text-white opacity-0 group-hover:opacity-100 shadow-[0_4px_12px_rgba(220,38,38,0.4)]'}`}>
                        {savingId === col.id ? '...' : 'Guardar'}
                     </div>
                  </button>
                ))}
             </div>
           )}
        </div>

        {!showCreate && (
           <footer className="p-6 flex-shrink-0">
              <button 
                onClick={() => setShowCreate(true)}
                className="w-full py-5 rounded-3xl bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all border-t border-l border-white/40 border-b border-r border-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.15)]"
              >
                + Criar Nova Coleção
              </button>
           </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
