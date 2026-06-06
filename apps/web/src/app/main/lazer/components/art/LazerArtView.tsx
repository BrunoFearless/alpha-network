'use client';
import { useEffect, useState, useRef } from 'react';
import { useArtStore, Art } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';
import { ArtCard } from './ArtCard';
import { ArtDetailModal } from './ArtDetailModal';
import { UploadArtModal } from './UploadArtModal';
import { CollectionModal } from './CollectionModal';
import { useLazerStore } from '@/store/lazer.store';
import { resolveUrl } from '@/lib/api';

const CATEGORIES = ['Para Ti', 'Design', 'Arquitetura', 'Ilustração', 'Fotografia', 'Digital Art', 'Natureza', 'Minimalismo', 'Culinária'];

// ── MODULO MESA INFINITA (CANVAS VIEW) ─────────────────────
function InfiniteCanvas({
  collection,
  authUser,
  token,
  updateCollectionLayout,
  onOpenArt,
  onSaveArt
}: {
  collection: any;
  authUser: any;
  token: string;
  updateCollectionLayout: any;
  onOpenArt: any;
  onSaveArt: any;
}) {
  // Pan and zoom states
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Layout saving states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  
  // Local items loaded from collection.items
  const [items, setItems] = useState<any[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemsRef = useRef<any[]>([]);

  // Load collection items with layout positions or sequence default offsets
  useEffect(() => {
    if (collection?.items) {
      let maxZ = 1;
      const initialItems = collection.items.map((item: any, idx: number) => {
        const hasPos = item.positionX !== null && item.positionY !== null && item.positionX !== undefined && item.positionY !== undefined;
        const defaultW = 220;
        const defaultH = 280;
        const currentZ = item.zIndex || 1;
        if (currentZ > maxZ) maxZ = currentZ;
        
        return {
          ...item,
          positionX: hasPos ? item.positionX : 50 + (idx % 4) * 260,
          positionY: hasPos ? item.positionY : 50 + Math.floor(idx / 4) * 320,
          width: item.width || defaultW,
          height: item.height || defaultH,
          zIndex: currentZ
        };
      });
      setItems(initialItems);
      itemsRef.current = initialItems;
    }
  }, [collection?.items]);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeResizeId, setActiveResizeId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ w: 0, h: 0, x: 0, y: 0 });

  const handleBgMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleBgMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleBgMouseUp = () => {
    setIsDraggingCanvas(false);
  };



  const handleCardMouseDown = (e: React.MouseEvent, itemId: string, posX: number, posY: number) => {
    e.stopPropagation();
    if (collection.authorId !== authUser?.id) return;
    setActiveDragId(itemId);
    setDragOffset({
      x: e.clientX / zoom - posX,
      y: e.clientY / zoom - posY
    });
    
    setItems(prev => {
      const maxZ = Math.max(...prev.map(i => i.zIndex || 1), 1);
      const next = prev.map(i => i.artId === itemId ? { ...i, zIndex: maxZ + 1 } : i);
      itemsRef.current = next;
      return next;
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, itemId: string, currentW: number, currentH: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (collection.authorId !== authUser?.id) return;
    setActiveResizeId(itemId);
    setResizeStart({
      w: currentW,
      h: currentH,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (activeDragId) {
      setItems(prev => {
        const next = prev.map(i => {
          if (i.artId !== activeDragId) return i;
          const newX = e.clientX / zoom - dragOffset.x;
          const newY = e.clientY / zoom - dragOffset.y;
          return {
            ...i,
            positionX: Math.round(newX),
            positionY: Math.round(newY)
          };
        });
        itemsRef.current = next;
        return next;
      });
      setSaveStatus('saving');
    } else if (activeResizeId) {
      setItems(prev => {
        const next = prev.map(i => {
          if (i.artId !== activeResizeId) return i;
          const deltaX = (e.clientX - resizeStart.x) / zoom;
          const deltaY = (e.clientY - resizeStart.y) / zoom;
          const newW = Math.max(160, resizeStart.w + deltaX);
          const newH = Math.max(160, resizeStart.h + deltaY);
          return {
            ...i,
            width: Math.round(newW),
            height: Math.round(newH)
          };
        });
        itemsRef.current = next;
        return next;
      });
      setSaveStatus('saving');
    }
  };

  const handleCardMouseUp = () => {
    if (activeDragId || activeResizeId) {
      setActiveDragId(null);
      setActiveResizeId(null);
      triggerDebouncedSave();
    }
  };

  const triggerDebouncedSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      const layoutData = itemsRef.current.map(i => ({
        artId: i.artId,
        positionX: i.positionX,
        positionY: i.positionY,
        width: i.width,
        height: i.height,
        zIndex: i.zIndex
      }));
      
      const ok = await updateCollectionLayout(collection.id, layoutData, token);
      if (ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('idle');
      }
    }, 1000);
  };

  // Immediate save on unmount / navigate away to prevent losing layout updates
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        
        const layoutData = itemsRef.current.map(i => ({
          artId: i.artId,
          positionX: i.positionX,
          positionY: i.positionY,
          width: i.width,
          height: i.height,
          zIndex: i.zIndex
        }));
        
        if (layoutData.length > 0 && collection.id && collection.authorId === authUser?.id) {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          fetch(`${apiBaseUrl}/api/v1/art/folder/${collection.id}/layout`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ layout: layoutData }),
          }).catch(err => console.error("Error saving layout on unmount:", err));
        }
      }
    };
  }, [token, collection.id, collection.authorId, authUser?.id]);

  const handleAutoLayout = async () => {
    if (collection.authorId !== authUser?.id) return;
    const reorganized = itemsRef.current.map((item, idx) => ({
      ...item,
      positionX: 50 + (idx % 4) * 260,
      positionY: 50 + Math.floor(idx / 4) * 320,
      width: 220,
      height: 280,
      zIndex: 1
    }));
    setItems(reorganized);
    itemsRef.current = reorganized;
    setSaveStatus('saving');
    
    const layoutData = reorganized.map(i => ({
      artId: i.artId,
      positionX: i.positionX,
      positionY: i.positionY,
      width: i.width,
      height: i.height,
      zIndex: i.zIndex
    }));
    
    const ok = await updateCollectionLayout(collection.id, layoutData, token);
    if (ok) {
      setSaveStatus('saved');
    } else {
      setSaveStatus('idle');
    }
  };

  const handleFitView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1.0);
  };

  return (
    <div className="relative w-full flex flex-col gap-4">
      <div 
        onMouseDown={handleBgMouseDown}
        onMouseMove={(e) => {
          handleBgMouseMove(e);
          handleCardMouseMove(e);
        }}
        onMouseUp={() => {
          handleBgMouseUp();
          handleCardMouseUp();
        }}
        className="relative w-full h-[650px] bg-transparent rounded-[2.5rem] border border-white/10 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      >
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <div 
            className="absolute pointer-events-none"
            style={{
              top: -10000,
              left: -10000,
              width: 20000,
              height: 20000,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          
          {items.map((item) => (
            <div
              key={item.art.id}
              style={{
                left: item.positionX,
                top: item.positionY,
                width: item.width,
                height: item.height,
                zIndex: item.zIndex || 1,
              }}
              className={`absolute bg-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-lg group transition-all duration-200 cursor-pointer ${
                item.artId === activeDragId
                  ? 'border border-white/40 ring-1 ring-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(255,255,255,0.15)] scale-[1.03] cursor-grabbing z-50'
                  : item.artId === activeResizeId
                  ? 'border border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)] z-50'
                  : 'border border-white/10 hover:border-white/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]'
              }`}
              onDoubleClick={() => onOpenArt(item.art)}
              title="Duplo clique para focar"
            >
              {/* Main Image covering the entire card bounds */}
              <img 
                src={item.art.imageUrl.startsWith('http') || item.art.imageUrl.startsWith('blob:') ? item.art.imageUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${item.art.imageUrl}`} 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" 
                alt="" 
              />

              {/* Top hoverable grab-to-drag handle layer */}
              {collection.authorId === authUser?.id && (
                <div
                  onMouseDown={(e) => handleCardMouseDown(e, item.artId, item.positionX || 0, item.positionY || 0)}
                  className="absolute top-0 inset-x-0 h-11 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between px-4 text-white cursor-grab active:cursor-grabbing z-10"
                >
                  <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">
                    Arrastar
                  </span>
                </div>
              )}

              {/* Combined Title and Artist bottom overlay layer */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex flex-col gap-1.5 z-10 pointer-events-none">
                <span className="text-[10px] font-black text-white uppercase tracking-wider truncate">
                  {item.art.title}
                </span>
                <div className="flex items-center gap-2">
                  <img
                    src={item.art.author?.profile?.avatarUrl ? (item.art.author.profile.avatarUrl.startsWith('http') ? item.art.author.profile.avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${item.art.author.profile.avatarUrl}`) : '/uploads/avatars/default.png'}
                    className="w-4 h-4 rounded-full border border-white/20 object-cover"
                    alt=""
                  />
                  <span className="text-[9px] font-bold text-white/60 truncate">
                    {item.art.author?.profile?.displayName || item.art.author?.profile?.username || 'Artista'}
                  </span>
                </div>
              </div>

              {/* Resize Handle overlay */}
              {collection.authorId === authUser?.id && (
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, item.artId, item.width || 220, item.height || 280)}
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 pointer-events-auto z-20"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" className="text-white/40 group-hover:text-white transition-colors">
                    <path d="M8 8H0V6.5H6.5V0H8V8Z" fill="currentColor"/>
                  </svg>
                </div>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10 mb-2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center">Mesa sem conteúdos</p>
              {collection.authorId === authUser?.id && (
                <p className="text-[9px] font-medium text-white/20 text-center mt-1 leading-relaxed">Adiciona artes usando o botão de upload para começar a compor o teu moodboard.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-md w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all text-xs font-bold"
            title="Aproximar Zoom"
          >
            +
          </button>
          <span className="text-[9px] font-black uppercase text-white/50 w-12 text-center tracking-widest">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all text-xs font-bold"
            title="Afastar Zoom"
          >
            -
          </button>
          <button
            onClick={handleFitView}
            className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all"
            title="Repor zoom e posição inicial"
          >
            Enquadrar
          </button>
          {collection.authorId === authUser?.id && items.length > 0 && (
            <button
              onClick={handleAutoLayout}
              className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all"
              title="Re-alinhar todos os itens na mesa"
            >
              Organizar Mesa
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saving' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">A Gravar layout...</span>
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[9px] font-black uppercase text-green-500/80 tracking-wider">Guardado na Nuvem</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">Erro ao gravar</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LazerArtView() {
  const { arts, savedArts, collections, isLoading, searchQuery, activeCategory, fetchArts, fetchSavedArts, fetchUserCollections, setActiveCategory, setSearchQuery, updateCollectionViewMode, updateCollectionLayout, forkCollection } = useArtStore();
  const { user: authUser, accessToken } = useAuthStore();
  const { isFriend, hasSentRequest, sendFriendRequest, cancelFriendRequest, removeFriend, fetchFriends } = useLazerStore();
  
  const [viewMode, setViewMode] = useState<'feed' | 'profile'>('feed');
  const [profileTab, setProfileTab] = useState<'collections' | 'saved'>('collections');
  const [selectedArt, setSelectedArt] = useState<Art | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState<Art | null>(null);

  const [personalizedArts, setPersonalizedArts] = useState<Art[]>([]);

  const handleOpenArt = (art: Art) => {
    setSelectedArt(art);
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alpha_art_interest_categories');
        let list: string[] = raw ? JSON.parse(raw) : [];
        list.unshift(art.category);
        if (list.length > 20) list = list.slice(0, 20);
        localStorage.setItem('alpha_art_interest_categories', JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveTrigger = (art: Art) => {
    setShowSaveModal(art);
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('alpha_art_interest_categories');
        let list: string[] = raw ? JSON.parse(raw) : [];
        list.unshift(art.category);
        if (list.length > 20) list = list.slice(0, 20);
        localStorage.setItem('alpha_art_interest_categories', JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
    }
  };
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [activeParentCollection, setActiveParentCollection] = useState<any>(null);
  const [activeParentIdForModal, setActiveParentIdForModal] = useState<string | undefined>(undefined);
  const [isGroupForModal, setIsGroupForModal] = useState<boolean | undefined>(undefined);
  const [editingArt, setEditingArt] = useState<Art | null>(null);
  const [editingCollection, setEditingCollection] = useState<any>(null);

  const [isForking, setIsForking] = useState(false);

  const handleFork = async () => {
    if (!selectedCollection || !accessToken) return;
    setIsForking(true);
    try {
      const newFork = await forkCollection(selectedCollection.id, accessToken);
      if (newFork) {
        setSelectedCollection(newFork);
        setSelectedAuthor(null);
        setViewMode('profile');
      }
    } catch (e) {
      console.error("Fork error:", e);
    } finally {
      setIsForking(false);
    }
  };

  const [myProfile, setMyProfile] = useState<any>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [showAllSaved, setShowAllSaved] = useState(false);

  useEffect(() => {
    if (authUser?.id) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      fetch(`${apiBaseUrl}/api/v1/users/id/${authUser.id}`)
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data?.profile) setMyProfile(json.data.profile);
        })
        .catch(err => console.error("Error fetching my profile:", err));
    }
  }, [authUser?.id]);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedAuthor, setSelectedAuthor] = useState<{ id: string; name: string } | null>(null);
  const [authorProfile, setAuthorProfile] = useState<any>(null);

  const [showAddArtModal, setShowAddArtModal] = useState(false);
  const [addArtExiting, setAddArtExiting] = useState(false);
  const handleCloseAddArt = () => {
    setAddArtExiting(true);
    setTimeout(() => {
      setShowAddArtModal(false);
      setAddArtExiting(false);
    }, 550);
  };

  const [userArts, setUserArts] = useState<Art[]>([]);
  const [loadingUserArts, setLoadingUserArts] = useState(false);
  const [addingArtId, setAddingArtId] = useState<string | null>(null);

  useEffect(() => {
    if (showAddArtModal && authUser?.id) {
      setLoadingUserArts(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      fetch(`${apiBaseUrl}/api/v1/art/arts?authorId=${authUser.id}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) setUserArts(json.data.arts);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingUserArts(false));
    }
  }, [showAddArtModal, authUser?.id]);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (selectedAuthor) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      fetch(`${apiBaseUrl}/api/v1/users/id/${selectedAuthor.id}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setAuthorProfile(json.data);
          }
        })
        .catch(err => console.error("Error fetching author profile:", err));
    } else {
      setAuthorProfile(null);
    }
  }, [selectedAuthor]);

  // Sincroniza a pesquisa local se for limpa por outro lado (ex: mudar de categoria)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (viewMode === 'feed') {
      fetchArts({ 
        category: selectedAuthor ? undefined : (activeCategory || undefined), 
        search: searchQuery || undefined,
        requesterId: authUser?.id,
        authorId: selectedAuthor ? selectedAuthor.id : undefined
      });
    } else {
      const targetId = selectedAuthor ? selectedAuthor.id : authUser?.id;
      if (targetId) {
        // Pass authUser.id as requesterId so backend applies correct privacy rules:
        // - Own profile: userId === requesterId → no filter, sees private folders
        // - Other's profile: userId !== requesterId → only public folders returned
        fetchUserCollections(targetId, authUser?.id);
        if (!selectedAuthor && accessToken) fetchSavedArts(accessToken);
      }
    }
  }, [viewMode, activeCategory, searchQuery, authUser?.id, accessToken, selectedAuthor]);

  useEffect(() => {
    if (selectedCollection && collections.length > 0) {
      const updated = collections.find(c => c.id === selectedCollection.id);
      if (updated) setSelectedCollection(updated);
    }
    if (activeParentCollection && collections.length > 0) {
      const updated = collections.find(c => c.id === activeParentCollection.id);
      if (updated) setActiveParentCollection(updated);
    }
  }, [collections]);

  useEffect(() => {
    if (viewMode === 'feed' && arts.length > 0) {
      if (activeCategory || searchQuery || selectedAuthor) {
        // Direct search or category filters: show raw chronological feed with no personalization
        setPersonalizedArts(arts);
      } else {
        // Pinterest dynamic feed engine
        try {
          const raw = localStorage.getItem('alpha_art_interest_categories');
          const history: string[] = raw ? JSON.parse(raw) : [];
          
          const affinityCounts: Record<string, number> = {};
          history.forEach(cat => {
            affinityCounts[cat] = (affinityCounts[cat] || 0) + 1;
          });

          const scored = arts.map((art, idx) => {
            // Recency decays smoothly
            const recencyScore = 1 / (1 + idx * 0.04);
            const affinityCount = affinityCounts[art.category] || 0;
            const affinityBoost = affinityCount * 0.15;
            // 15% shuffle variance brings dynamic life to each reload
            const randomFactor = 0.85 + Math.random() * 0.3;
            
            const score = (recencyScore + affinityBoost) * randomFactor;
            return { art, score };
          });

          // Sort by descending final personalized recommendation score
          const sorted = scored.sort((a, b) => b.score - a.score).map(x => x.art);
          setPersonalizedArts(sorted);
        } catch (e) {
          console.error("Pinterest personalization error:", e);
          setPersonalizedArts(arts);
        }
      }
    } else {
      setPersonalizedArts(arts);
    }
  }, [arts, viewMode, activeCategory, searchQuery, selectedAuthor]);


  return (
    <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar bg-transparent">
      <style>{`
        @keyframes premium-fade-in {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes premium-slide-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes hover-glint {
          0% {
            left: -150%;
          }
          100% {
            left: 250%;
          }
        }

        .premium-animate-fade {
          animation: premium-fade-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .premium-animate-slide {
          animation: premium-slide-up 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .premium-card-glint {
          position: relative;
          overflow: hidden;
        }

        .premium-card-glint::after {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.12),
            transparent
          );
          transform: skewX(-20deg);
          pointer-events: none;
        }

        .premium-card-glint:hover::after {
          animation: hover-glint 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

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

        /* Fluid custom scrollbar */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-[100] bg-white/[0.02] backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-6">
           <button 
             onClick={() => { setViewMode('feed'); setSelectedCollection(null); setSelectedAuthor(null); setActiveParentCollection(null); }}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${viewMode === 'feed' && !selectedAuthor ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
             title="Feed Principal"
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
           </button>

           {selectedAuthor ? (
             <div className="flex-1 flex items-center justify-start">
               <button 
                 onClick={() => setSelectedAuthor(null)}
                 className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
               >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                 Voltar ao Feed
               </button>
             </div>
           ) : (
             <div className="relative flex-1 group">
               <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/40 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
               <input 
                 type="text" 
                 placeholder="Pesquisar inspirações... (Prima Enter)"
                 value={localSearch}
                 onChange={(e) => setLocalSearch(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     setSelectedAuthor(null);
                     setSearchQuery(localSearch);
                   }
                 }}
                 className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-4 sm:pr-6 rounded-full bg-white/5 border border-white/5 focus:bg-white/10 focus:border-white/20 text-white placeholder-white/20 text-sm transition-all focus:outline-none"
               />
             </div>
           )}

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

        {viewMode === 'feed' && !selectedAuthor && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => { setSelectedAuthor(null); setActiveCategory(cat); }}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat && !selectedAuthor ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}


      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 px-3 sm:px-8 pt-4 pb-20">
        
        {viewMode === 'feed' ? (
          <>
            {selectedAuthor && (
              <div className="relative mb-6 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white/[0.02] border border-white/10 backdrop-blur-xl p-5 sm:p-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-4 sm:gap-6 animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                {/* Background Glass Shine / Color banner */}
                <div 
                  className="absolute inset-x-0 top-0 h-32 bg-cover bg-center opacity-30 pointer-events-none"
                  style={{
                    backgroundImage: authorProfile?.bannerUrl 
                      ? `url(${resolveUrl(authorProfile.bannerUrl)})` 
                      : `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))`
                  }}
                />
                
                {/* Main Profile Info */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left mt-6 sm:mt-0">
                  {/* Big Avatar */}
                  <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-2 border-white/20 bg-white/10 shadow-xl shrink-0">
                    {authorProfile?.avatarUrl ? (
                      <img src={resolveUrl(authorProfile.avatarUrl)} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black bg-white/5">
                        {(authorProfile?.displayName || authorProfile?.username || selectedAuthor.name || 'A')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Text details */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                      <h1 className="text-2xl font-black text-white tracking-tight leading-none">
                        {authorProfile?.displayName || selectedAuthor.name}
                      </h1>
                      <p className="text-xs font-bold text-white/30 tracking-widest uppercase mt-1">
                        @{authorProfile?.username || 'criador'}
                      </p>
                    </div>
                    
                    {authorProfile?.bio && (
                      <p className="text-xs text-white/60 font-medium max-w-md leading-relaxed mt-1">
                        {authorProfile.bio}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-[10px] font-black uppercase tracking-widest text-white/40">
                      <span className="text-white bg-white/5 px-3 py-1 rounded-full border border-white/10">{arts.length} Publicações</span>
                      {authorProfile?.status && (
                        <>
                          <span>•</span>
                          <span className="text-white/60">{authorProfile.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Friendship & Back Actions */}
                <div className="relative z-10 flex items-center gap-3 shrink-0 self-center md:self-end">
                  {/* Dynamic Friendship Button */}
                  {authUser?.id !== selectedAuthor.id && (
                    <button
                      onClick={() => {
                        const status = isFriend(selectedAuthor.id) ? 'friend' : hasSentRequest(selectedAuthor.id) ? 'sent' : 'none';
                        if (status === 'friend') removeFriend(selectedAuthor.id);
                        else if (status === 'sent') cancelFriendRequest(selectedAuthor.id);
                        else sendFriendRequest(selectedAuthor.id);
                      }}
                      className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl border ${
                        isFriend(selectedAuthor.id)
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                          : hasSentRequest(selectedAuthor.id)
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-white text-black hover:bg-white/80 border-transparent'
                      }`}
                    >
                      {isFriend(selectedAuthor.id) ? 'Amigos ✓' : hasSentRequest(selectedAuthor.id) ? 'Pendente' : 'Seguir'}
                    </button>
                  )}
                  
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedAuthor(null)}
                    className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest border border-white/10 transition-all hover:scale-105 active:scale-95"
                    title="Voltar ao Feed Principal"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}
            {isLoading && arts.length === 0 ? (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 sm:gap-4">
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
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 sm:gap-4">
                {personalizedArts.map(art => (
                  <ArtCard 
                    key={art.id} 
                    art={art} 
                    onOpen={handleOpenArt}
                    onSave={handleSaveTrigger}
                  />
                ))}
              </div>
            )}
          </>
        ) : (() => {
          const isOwnProfile = !selectedAuthor || selectedAuthor.id === authUser?.id;
          const activeProfile = isOwnProfile ? (myProfile || authUser?.profile) : authorProfile;
          const activeUserId = isOwnProfile ? authUser?.id : selectedAuthor?.id;

          return (
            <div className="flex flex-col gap-10 w-full animate-in fade-in duration-500">
              
              {/* Unified Profile Card */}
              {activeProfile && (
                <div className="relative mb-6 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white/[0.02] border border-white/10 backdrop-blur-xl p-5 sm:p-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-4 sm:gap-6 animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                  
                  {/* Main Profile Info */}
                  <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left mt-6 sm:mt-0">
                    {/* Big Avatar */}
                    <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-2 border-white/20 bg-white/10 shadow-xl shrink-0">
                      {activeProfile?.avatarUrl ? (
                        <img src={resolveUrl(activeProfile.avatarUrl)} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black bg-white/5">
                          {(activeProfile?.displayName || activeProfile?.username || 'A')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Text details */}
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col">
                        <h1 className="text-2xl font-black text-white tracking-tight leading-none">
                          {activeProfile?.displayName}
                        </h1>
                        <p className="text-xs font-bold text-white/30 tracking-widest uppercase mt-1">
                          @{activeProfile?.username || 'criador'}
                        </p>
                      </div>
                      
                      {activeProfile?.bio && (
                        <p className="text-xs text-white/60 font-medium max-w-md leading-relaxed mt-1">
                          {activeProfile.bio}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-[10px] font-black uppercase tracking-widest text-white/40">
                        <span className="text-white bg-white/5 px-3 py-1 rounded-full border border-white/10">
                          {collections.filter(c => c.authorId === activeUserId).length} Pastas
                        </span>
                        {activeProfile?.status && (
                          <>
                            <span>•</span>
                            <span className="text-white/60">{activeProfile.status}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Friendship Actions */}
                  <div className="relative z-10 flex items-center gap-3 shrink-0 self-center md:self-end">
                    {/* Dynamic Friendship Button */}
                    {!isOwnProfile && (
                      <button
                        onClick={() => {
                          const status = isFriend(activeProfile.id) ? 'friend' : hasSentRequest(activeProfile.id) ? 'sent' : 'none';
                          if (status === 'friend') removeFriend(activeProfile.id);
                          else if (status === 'sent') cancelFriendRequest(activeProfile.id);
                          else sendFriendRequest(activeProfile.id);
                        }}
                        className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl border ${
                          isFriend(activeProfile.id)
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                            : hasSentRequest(activeProfile.id)
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                            : 'bg-white text-black hover:bg-white/80 border-transparent'
                        }`}
                      >
                        {isFriend(activeProfile.id) ? 'Amigos ✓' : hasSentRequest(activeProfile.id) ? 'Pendente' : 'Seguir'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Opened sub-view details or unified profile sections */}
              {selectedCollection ? (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full">
                  {/* Header of Collection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 w-full shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <button 
                        onClick={() => { setSelectedCollection(null); setActiveParentCollection(null); }}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        Coleções
                      </button>
                      {activeParentCollection && (
                        <>
                          <span className="text-white/30">/</span>
                          <button 
                            onClick={() => setSelectedCollection(null)}
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            {activeParentCollection.title}
                          </button>
                        </>
                      )}
                      <span className="text-white/30">/</span>
                      <span className="text-white">{selectedCollection.title}</span>

                      {selectedCollection.forkedFrom && (
                        <span className="text-[9px] font-bold text-white/30 lowercase tracking-normal normal-case ml-2.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 flex items-center gap-1">
                          forked de
                          <button
                            onClick={() => {
                              setSelectedAuthor({
                                id: selectedCollection.forkedFrom.author?.id || selectedCollection.forkedFrom.authorId,
                                name: selectedCollection.forkedFrom.author?.profile?.displayName || selectedCollection.forkedFrom.author?.profile?.username || 'artista'
                              });
                              setViewMode('feed');
                              setSelectedCollection(null);
                            }}
                            className="text-white hover:underline font-extrabold"
                          >
                            @{selectedCollection.forkedFrom.author?.profile?.username || 'artista'}
                          </button>
                        </span>
                      )}

                      {selectedCollection.authorId === authUser?.id && (
                        <button 
                          onClick={() => setEditingCollection(selectedCollection)}
                          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all ml-1.5"
                          title="Editar Coleção/Subgrupo"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      {/* View Mode Toggle */}
                      <div className="flex items-center p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <button
                          onClick={async () => {
                            if (selectedCollection.authorId === authUser?.id) {
                              await updateCollectionViewMode(selectedCollection.id, 'grid', accessToken || '');
                            } else {
                              setSelectedCollection({ ...selectedCollection, viewMode: 'grid' });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            (selectedCollection.viewMode || 'grid') === 'grid'
                              ? 'bg-white/10 text-white shadow-md'
                              : 'text-white/40 hover:text-white/80'
                          }`}
                          title="Visualização em Grelha"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="stroke-current"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                          Grelha
                        </button>
                        <button
                          onClick={async () => {
                            if (selectedCollection.authorId === authUser?.id) {
                              await updateCollectionViewMode(selectedCollection.id, 'canvas', accessToken || '');
                            } else {
                              setSelectedCollection({ ...selectedCollection, viewMode: 'canvas' });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            selectedCollection.viewMode === 'canvas'
                              ? 'bg-white/10 text-white shadow-md'
                              : 'text-white/40 hover:text-white/80'
                          }`}
                          title="Visualização em Mesa Infinita"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="stroke-current"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          Mesa Infinita
                        </button>
                      </div>

                      {selectedCollection.authorId !== authUser?.id && authUser?.id && (
                        <button 
                          onClick={handleFork}
                          disabled={isForking}
                          className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {isForking ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              A Clonar...
                            </>
                          ) : (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="stroke-current">
                                <path d="M6 3v12M18 3v12M6 15a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3" />
                                <circle cx="6" cy="15" r="2" />
                                <circle cx="18" cy="15" r="2" />
                                <circle cx="12" cy="3" r="2" />
                              </svg>
                              Fork
                            </>
                          )}
                        </button>
                      )}

                      {selectedCollection.authorId === authUser?.id && (
                        <button 
                          onClick={() => setShowAddArtModal(true)}
                          className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(220,38,38,0.3)]"
                        >
                          + Adicionar Artes
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items Display (Grid or Infinite Canvas) */}
                  {(selectedCollection.viewMode || 'grid') === 'grid' ? (
                    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 sm:gap-4">
                      {selectedCollection.items?.map((item: any) => (
                        <ArtCard 
                          key={item.art.id} 
                          art={item.art} 
                          onOpen={setSelectedArt}
                          onSave={setShowSaveModal}
                        />
                      ))}
                      {(!selectedCollection.items || selectedCollection.items.length === 0) && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 bg-white/[0.02] backdrop-blur-md rounded-[2rem] border border-white/10 max-w-sm mx-auto my-10 p-10 animate-in fade-in duration-300">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10 mb-2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center">Esta pasta está vazia</p>
                          {selectedCollection.authorId === authUser?.id && (
                            <p className="text-[9px] font-medium text-white/20 text-center leading-relaxed">Clica no botão acima para organizar as tuas artes aqui.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <InfiniteCanvas
                      collection={selectedCollection}
                      authUser={authUser}
                      token={accessToken || ''}
                      updateCollectionLayout={updateCollectionLayout}
                      onOpenArt={setSelectedArt}
                      onSaveArt={setShowSaveModal}
                    />
                  )}
                </div>
              ) : activeParentCollection ? (() => {
                const renderSubgroups = collections.find((c: any) => c.id === activeParentCollection.id)?.subgroups || [];

                return (
                  <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full">
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 w-fit animate-in slide-in-from-top-3 duration-300 shadow-lg backdrop-blur-md text-[10px] font-black uppercase tracking-widest">
                      <button 
                        onClick={() => setActiveParentCollection(null)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        Coleções
                      </button>
                      <span className="text-white/30">/</span>
                      <span className="text-white">{activeParentCollection.title}</span>
                      
                      {activeParentCollection.authorId === authUser?.id && (
                        <button 
                          onClick={() => setEditingCollection(activeParentCollection)}
                          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all ml-1.5"
                          title="Editar Grupo"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                      {renderSubgroups.map((col: any) => (
                        <div 
                          key={col.id} 
                          className="group cursor-pointer animate-in zoom-in-95 duration-300"
                          onClick={() => setSelectedCollection(col)}
                        >
                            <div className="aspect-[4/3] rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden relative mb-3 group-hover:border-white/20 transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-95 premium-card-glint shadow-xl group-hover:shadow-2xl">
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
                                  <span className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                                    Abrir Subgrupo
                                  </span>
                              </div>
                            </div>
                            <h3 className="text-sm font-black text-white px-2 group-hover:text-white/80 transition-colors flex items-center gap-2">
                              {col.title}
                            </h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">
                              {col._count?.items || 0} Itens
                            </p>
                        </div>
                      ))}

                      {activeParentCollection.authorId === authUser?.id && (
                        <div 
                          className="aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/5 cursor-pointer transition-all hover:border-white/20 group hover:shadow-xl"
                          onClick={() => {
                            setActiveParentIdForModal(activeParentCollection.id);
                            setIsGroupForModal(false);
                            setShowSaveModal({} as any);
                          }}
                        >
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            </div>
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest group-hover:text-white/40 transition-colors">
                              Criar Subgrupo
                            </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="flex flex-col gap-14 animate-in fade-in duration-500 w-full">
                  
                  {/* ── SECTION 1: GRUPOS DE PORTFÓLIO ── */}
                  {(() => {
                    const profileGroups = collections.filter(c => {
                      if (c.authorId !== activeUserId) return false;
                      if (!isOwnProfile && !c.isPublic) return false;
                      return c.isGroup && !c.parentId;
                    });
                    const displayedGroups = showAllGroups ? profileGroups : profileGroups.slice(0, isOwnProfile ? 3 : 4);
                    const hasMoreGroups = profileGroups.length > (isOwnProfile ? 3 : 4);

                    return (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500">
                              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                              <polyline points="2 17 12 22 22 17"/>
                              <polyline points="2 12 12 17 22 12"/>
                            </svg>
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Grupos de Portfólio</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/50 tracking-wider">
                              {profileGroups.length} Pastas
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            {hasMoreGroups && (
                              <button 
                                onClick={() => setShowAllGroups(!showAllGroups)}
                                className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-md"
                              >
                                {showAllGroups ? 'Ver Menos' : 'Ver Todos'}
                              </button>
                            )}
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest hidden sm:block">Organização de Artes Próprias</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                          {displayedGroups.map((col: any) => (
                          <div 
                            key={col.id} 
                            className="group cursor-pointer animate-in zoom-in-95 duration-300"
                            onClick={() => setActiveParentCollection(col)}
                          >
                            <div className="aspect-[4/3] rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden relative mb-3 group-hover:border-white/20 transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-95 premium-card-glint shadow-xl group-hover:shadow-2xl">
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
                                  <span className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                                    Abrir Grupo
                                  </span>
                              </div>
                            </div>
                            <h3 className="text-sm font-black text-white px-2 group-hover:text-white/80 transition-colors flex items-center gap-2">
                              {col.title}
                            </h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">
                              {col.subgroups?.length || 0} Subgrupos
                            </p>
                          </div>
                        ))}

                          {isOwnProfile && (
                            <div 
                              className="aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/5 cursor-pointer transition-all hover:border-white/20 group hover:shadow-xl"
                              onClick={() => {
                                setActiveParentIdForModal('none');
                                setIsGroupForModal(true);
                                setShowSaveModal({} as any);
                              }}
                            >
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                </div>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest group-hover:text-white/40 transition-colors">
                                  Criar Grupo
                                </span>
                            </div>
                          )}
                        </div>

                        {profileGroups.length === 0 && (
                          <div className="py-8 text-center text-white/20 text-xs italic uppercase tracking-widest">Nenhum grupo de portfólio criado ainda.</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── SECTION 2: COLEÇÕES DE INSPIRAÇÃO ── */}
                  {(() => {
                    const profileCollections = collections.filter(c => {
                      if (c.authorId !== activeUserId) return false;
                      if (!isOwnProfile && !c.isPublic) return false;
                      return !c.isGroup && !c.parentId;
                    });
                    const displayedCollections = showAllCollections ? profileCollections : profileCollections.slice(0, isOwnProfile ? 3 : 4);
                    const hasMoreCollections = profileCollections.length > (isOwnProfile ? 3 : 4);

                    return (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Coleções de Inspiração</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/50 tracking-wider">
                              {profileCollections.length} Pastas
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            {hasMoreCollections && (
                              <button 
                                onClick={() => setShowAllCollections(!showAllCollections)}
                                className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-md"
                              >
                                {showAllCollections ? 'Ver Menos' : 'Ver Todos'}
                              </button>
                            )}
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest hidden sm:block">Referências e Inspirações Guardadas</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                          {displayedCollections.map((col: any) => (
                          <div 
                            key={col.id} 
                            className="group cursor-pointer animate-in zoom-in-95 duration-300"
                            onClick={() => setSelectedCollection(col)}
                          >
                            <div className="aspect-[4/3] rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden relative mb-3 group-hover:border-white/20 transition-all duration-500 ease-out hover:scale-[1.02] hover:brightness-95 premium-card-glint shadow-xl group-hover:shadow-2xl">
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
                                  <span className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                                    Abrir Coleção
                                  </span>
                              </div>
                            </div>
                            <h3 className="text-sm font-black text-white px-2 group-hover:text-white/80 transition-colors flex items-center gap-2">
                              {col.title}
                            </h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">
                              {col._count?.items || 0} Itens
                            </p>
                          </div>
                        ))}

                          {isOwnProfile && (
                            <div 
                              className="aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/5 cursor-pointer transition-all hover:border-white/20 group hover:shadow-xl"
                              onClick={() => {
                                setActiveParentIdForModal('none');
                                setIsGroupForModal(false);
                                setShowSaveModal({} as any);
                              }}
                            >
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                </div>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest group-hover:text-white/40 transition-colors">
                                  Criar Coleção
                                </span>
                            </div>
                          )}
                        </div>

                        {profileCollections.length === 0 && (
                          <div className="py-8 text-center text-white/20 text-xs italic uppercase tracking-widest">Nenhuma coleção criada ainda.</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── SECTION 3: INSPIRAÇÕES GUARDADAS ── */}
                  {isOwnProfile && (() => {
                    const displayedSaved = showAllSaved ? savedArts : savedArts.slice(0, 4);
                    const hasMoreSaved = savedArts.length > 4;

                    return (
                      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-500">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Inspirações Guardadas</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/50 tracking-wider">
                              {savedArts.length} Artes
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            {hasMoreSaved && (
                              <button 
                                onClick={() => setShowAllSaved(!showAllSaved)}
                                className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-md"
                              >
                                {showAllSaved ? 'Ver Menos' : 'Ver Todos'}
                              </button>
                            )}
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest hidden sm:block">Referências Guardadas no Feed</p>
                          </div>
                        </div>

                        {savedArts.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-3 bg-white/[0.01] rounded-3xl border border-white/5 p-8 max-w-sm mx-auto">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">Ainda não guardaste nenhuma inspiração.</p>
                          </div>
                        ) : (
                          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 sm:gap-4">
                            {displayedSaved.map(art => (
                              <ArtCard 
                                key={art.id} 
                                art={art} 
                                onOpen={setSelectedArt}
                                onSave={setShowSaveModal}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              )}
            </div>
          );
        })()}
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
          onProfileClick={(authorId, authorName) => {
            setSelectedAuthor({ id: authorId, name: authorName });
            setViewMode('profile');
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
          parentId={activeParentIdForModal}
          isGroup={isGroupForModal}
          onClose={() => {
            setShowSaveModal(null);
            setEditingCollection(null);
            setActiveParentIdForModal(undefined);
            setIsGroupForModal(undefined);
          }} 
        />
      )}

      {showAddArtModal && selectedCollection && (
        <div className={`fixed inset-0 z-[1300] flex items-center justify-center p-8 ${addArtExiting ? 'premium-animate-backdrop-exit' : 'premium-animate-backdrop-enter'}`} onClick={handleCloseAddArt}>
          <div className="absolute inset-0 bg-black/40" />
          <div 
            className={`relative w-full max-w-2xl mx-2 sm:mx-0 bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] border-t-[1.5px] border-l-[1.5px] border-white/40 border-b border-r border-white/10 overflow-hidden flex flex-col ${addArtExiting ? 'premium-animate-scale-exit' : 'premium-animate-scale-enter'} shadow-[0_40px_100px_rgba(0,0,0,0.7),inset_0_2px_15px_rgba(255,255,255,0.2)] max-h-[85vh]`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 sm:p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Adicionar Artes</h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Selecione as suas publicações para organizar</p>
              </div>
              <button onClick={handleCloseAddArt} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-3 sm:space-y-4 no-scrollbar">
              {loadingUserArts ? (
                <div className="text-center py-20 opacity-40 text-xs font-black uppercase tracking-widest animate-pulse">A carregar as suas publicações...</div>
              ) : userArts.length === 0 ? (
                <div className="text-center py-20 opacity-20 text-xs italic uppercase tracking-widest">Ainda não publicou nenhuma arte.</div>
              ) : (
                userArts.map(art => {
                  const isAdded = selectedCollection.items?.some((item: any) => item.art.id === art.id);
                  return (
                    <div key={art.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/20 overflow-hidden shrink-0">
                          <img src={resolveUrl(art.imageUrl)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">{art.title}</h3>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{art.category}</p>
                        </div>
                      </div>

                      <button
                        disabled={isAdded || addingArtId === art.id}
                        onClick={async () => {
                          if (!accessToken) return;
                          setAddingArtId(art.id);
                          const success = await useArtStore.getState().addArtToCollection(art.id, selectedCollection.id, accessToken);
                          if (success) {
                            setSelectedCollection((prev: any) => {
                              if (!prev) return prev;
                              const newItems = [...(prev.items || []), { 
                                collectionId: prev.id, 
                                artId: art.id, 
                                art, 
                                positionX: null, 
                                positionY: null, 
                                width: null, 
                                height: null, 
                                zIndex: null 
                              }];
                              return { ...prev, items: newItems };
                            });
                            // Refresh global collections list
                            if (authUser?.id) {
                              useArtStore.getState().fetchUserCollections(authUser.id);
                            }
                          }
                          setAddingArtId(null);
                        }}
                        className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : addingArtId === art.id
                            ? 'bg-white/10 text-white/40'
                            : 'bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isAdded ? '✓ Adicionado' : addingArtId === art.id ? '...' : '+ Adicionar'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
