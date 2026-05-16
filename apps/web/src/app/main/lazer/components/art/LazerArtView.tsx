'use client';
import { useEffect, useState } from 'react';
import { useArtStore, Art } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';
import { ArtCard } from './ArtCard';
import { ArtDetailModal } from './ArtDetailModal';
import { UploadArtModal } from './UploadArtModal';
import { CollectionModal } from './CollectionModal';

const CATEGORIES = ['Para Ti', 'Design', 'Arquitetura', 'Ilustração', 'Fotografia', 'Digital Art', 'Natureza', 'Minimalismo', 'Culinária'];

export function LazerArtView() {
  const { arts, savedArts, collections, isLoading, searchQuery, activeCategory, fetchArts, fetchSavedArts, fetchUserCollections, setActiveCategory, setSearchQuery } = useArtStore();
  const { user: authUser, accessToken } = useAuthStore();
  
  const [viewMode, setViewMode] = useState<'feed' | 'profile'>('feed');
  const [profileTab, setProfileTab] = useState<'collections' | 'saved'>('collections');
  const [selectedArt, setSelectedArt] = useState<Art | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState<Art | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [editingArt, setEditingArt] = useState<Art | null>(null);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sincroniza a pesquisa local se for limpa por outro lado (ex: mudar de categoria)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (viewMode === 'feed') {
      fetchArts({ 
        category: activeCategory || undefined, 
        search: searchQuery || undefined,
        requesterId: authUser?.id 
      });
    } else {
      if (authUser?.id) {
        fetchUserCollections(authUser.id);
        if (accessToken) fetchSavedArts(accessToken);
      }
    }
  }, [viewMode, activeCategory, searchQuery, authUser?.id, accessToken]);

  useEffect(() => {
    if (selectedCollection && collections.length > 0) {
      const updated = collections.find(c => c.id === selectedCollection.id);
      if (updated) setSelectedCollection(updated);
    }
  }, [collections]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar bg-transparent">
      
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-[100] bg-white/[0.02] backdrop-blur-xl px-8 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => { setViewMode('feed'); setSelectedCollection(null); }}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${viewMode === 'feed' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
             title="Feed Principal"
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
           </button>

           <div className="relative flex-1 group">
             <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/40 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
             <input 
               type="text" 
               placeholder="Pesquisar inspirações... (Prima Enter)"
               value={localSearch}
               onChange={(e) => setLocalSearch(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   setSearchQuery(localSearch);
                 }
               }}
               className="w-full h-12 pl-12 pr-6 rounded-full bg-white/5 border border-white/5 focus:bg-white/10 focus:border-white/20 text-white placeholder-white/20 text-sm transition-all focus:outline-none"
             />
           </div>

           <button 
             onClick={() => setShowUploadModal(true)}
             className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
             title="Criar"
           >
             <span className="text-2xl leading-none font-light">+</span>
           </button>

           <button 
             onClick={() => setViewMode('profile')}
             className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${viewMode === 'profile' ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-transparent shadow-none'}`}
             title="Minhas Coleções"
           >
              {authUser?.profile?.avatarUrl ? (
                <img src={resolveUrl(authUser.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">{(authUser?.profile?.username || 'A')[0].toUpperCase()}</div>
              )}
           </button>
        </div>

        {viewMode === 'feed' && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'profile' && (
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   {selectedCollection && (
                     <button 
                       onClick={() => setSelectedCollection(null)}
                       className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all mr-2"
                     >
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                     </button>
                   )}
                   <div className="flex flex-col">
                     <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">
                       {selectedCollection ? selectedCollection.title : 'As Minhas Inspirações'}
                     </h2>
                     {selectedCollection && (
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Criada por {selectedCollection.author?.profile?.displayName || 'mim'}</p>
                     )}
                   </div>
                   {selectedCollection && selectedCollection.authorId === authUser?.id && (
                     <button 
                       onClick={() => setEditingCollection(selectedCollection)}
                       className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all ml-2"
                       title="Configurações da Coleção"
                     >
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                     </button>
                   )}
                </div>
                <div className="flex gap-4 text-[10px] font-black text-white/40 uppercase tracking-widest">
                   <span className="text-white">
                     {selectedCollection ? `${selectedCollection.items?.length || 0} Itens` : profileTab === 'collections' ? `${collections.length} Pastas` : `${savedArts.length} Guardados`}
                   </span>
                   <span>•</span>
                   <span>Organizado por Recentes</span>
                </div>
             </div>

             {!selectedCollection && (
               <div className="flex items-center gap-2 mt-2">
                 <button 
                   onClick={() => setProfileTab('collections')}
                   className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${profileTab === 'collections' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                 >
                   Coleções
                 </button>
                 <button 
                   onClick={() => setProfileTab('saved')}
                   className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${profileTab === 'saved' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                 >
                   Guardados
                 </button>
               </div>
             )}
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 px-8 pt-4 pb-20">
        
        {viewMode === 'feed' ? (
          <>
            {isLoading && arts.length === 0 ? (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                 {Array.from({ length: 15 }).map((_, i) => (
                   <div key={i} className="break-inside-avoid mb-4 rounded-2xl bg-white/5 animate-pulse" style={{ height: `${200 + Math.random() * 200}px` }} />
                 ))}
              </div>
            ) : arts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-20">
                 <span className="text-6xl">🎨</span>
                 <p className="font-black uppercase tracking-[0.2em] text-xs">Sem resultados encontrados</p>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                {arts.map(art => (
                  <ArtCard 
                    key={art.id} 
                    art={art} 
                    onOpen={setSelectedArt}
                    onSave={setShowSaveModal}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {selectedCollection ? (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {selectedCollection.items?.map((item: any) => (
                  <ArtCard 
                    key={item.art.id} 
                    art={item.art} 
                    onOpen={setSelectedArt}
                    onSave={setShowSaveModal}
                  />
                ))}
                {(!selectedCollection.items || selectedCollection.items.length === 0) && (
                  <div className="col-span-full py-40 text-center opacity-20 italic text-xs uppercase tracking-widest">Esta coleção ainda está vazia.</div>
                )}
              </div>
            ) : profileTab === 'collections' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                {collections.map(col => (
                  <div 
                    key={col.id} 
                    className="group cursor-pointer"
                    onClick={() => setSelectedCollection(col)}
                  >
                      <div className="aspect-[4/3] rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden relative mb-3 group-hover:border-white/20 transition-all shadow-xl group-hover:shadow-2xl">
                        {col.coverUrl ? (
                          <img src={resolveUrl(col.coverUrl)} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="grid grid-cols-2 grid-rows-2 h-full gap-1 p-1 bg-white/5">
                              {[0, 1, 2, 3].map(i => (
                                <div key={i} className="bg-white/5 overflow-hidden">
                                  {col.items?.[i]?.art?.imageUrl && (
                                    <img src={resolveUrl(col.items[i].art.imageUrl)} className="w-full h-full object-cover" alt="" />
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <span className="px-6 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-xl">Abrir Coleção</span>
                        </div>
                      </div>
                      <h3 className="text-sm font-black text-white px-2 group-hover:text-white/80 transition-colors">{col.title}</h3>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">{col._count?.items || 0} Itens</p>
                  </div>
                ))}

                <div 
                  className="aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/5 cursor-pointer transition-all hover:border-white/20 group hover:shadow-xl"
                  onClick={() => setShowSaveModal({} as Art)}
                >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest group-hover:text-white/40 transition-colors">Nova Coleção</span>
                </div>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {savedArts.map(art => (
                  <ArtCard 
                    key={art.id} 
                    art={art} 
                    onOpen={setSelectedArt}
                    onSave={setShowSaveModal}
                  />
                ))}
                {savedArts.length === 0 && (
                  <div className="col-span-full py-40 text-center opacity-20 italic text-xs uppercase tracking-widest">Ainda não guardaste nenhuma inspiração.</div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── MODALS ── */}
      {selectedArt && (
        <ArtDetailModal 
          art={selectedArt} 
          onClose={() => setSelectedArt(null)} 
          onSave={setShowSaveModal} 
          onEdit={(art) => {
            setEditingArt(art);
            setSelectedArt(null);
          }}
        />
      )}

      {(showUploadModal || editingArt) && (
        <UploadArtModal 
          art={editingArt || undefined} 
          onClose={() => {
            setShowUploadModal(false);
            setEditingArt(null);
          }} 
        />
      )}

      {(showSaveModal || editingCollection) && (
        <CollectionModal 
          art={showSaveModal || undefined} 
          collection={editingCollection || undefined}
          onClose={() => {
            setShowSaveModal(null);
            setEditingCollection(null);
          }} 
        />
      )}

    </div>
  );
}
