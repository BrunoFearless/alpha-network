'use client';
import { createPortal } from 'react-dom';
import { Art, useArtStore } from '@/store/art.store';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { useState, useEffect, useRef } from 'react';
import { ArtCard } from './ArtCard';

interface Props {
  art: Art;
  onClose: () => void;
  onSave: (art: Art) => void;
  onEdit?: (art: Art) => void;
  onProfileClick?: (authorId: string, authorName: string) => void;
}

export function ArtDetailModal({ art: initialArt, onClose, onSave, onEdit, onProfileClick }: Props) {
  const { fetchArt, currentArt, arts, toggleSaveArt, likeArt, deleteArt } = useArtStore();
  const { isFriend, hasSentRequest, sendFriendRequest, cancelFriendRequest, removeFriend, fetchFriends } = useLazerStore();
  const [activeArt, setActiveArt] = useState<Art>(initialArt);
  const [history, setHistory] = useState<Art[]>([]);
  const art = currentArt && currentArt.id === activeArt.id ? currentArt : activeArt;
  const { user: authUser, accessToken } = useAuthStore();
  const [comment, setComment] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const dragStart = useRef({ x: 0, y: 0 });

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const resolveUrl = (url: string) => url.startsWith('http') || url.startsWith('blob:') ? url : `${apiBase}${url}`;

  // Resolve all images for carousel
  const allImages: string[] = (() => {
    if (art.imageUrls && Array.isArray(art.imageUrls) && art.imageUrls.length > 0) return art.imageUrls;
    return [art.imageUrl];
  })();
  const currentModalImage = resolveUrl(allImages[carouselIndex]);

  useEffect(() => {
    setActiveArt(initialArt);
    setHistory([]);
    fetchFriends();
  }, [initialArt]);

  const handleBack = () => {
    if (history.length === 0) return;
    const prevArt = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setActiveArt(prevArt);
  };

  useEffect(() => {
    fetchArt(activeArt.id, authUser?.id);
    setCarouselIndex(0);
    // Scroll to top when opening a new art
    const container = document.getElementById('art-detail-scroll');
    if (container) container.scrollTop = 0;
  }, [activeArt.id, authUser?.id]);

  const isOwn = art.authorId === authUser?.id;
  const friendStatus = isFriend(art.authorId) ? 'friend' : hasSentRequest(art.authorId) ? 'sent' : 'none';

  const handleFriendBtn = () => {
    if (friendStatus === 'friend') removeFriend(art.authorId);
    else if (friendStatus === 'sent') cancelFriendRequest(art.authorId);
    else sendFriendRequest(art.authorId);
  };

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
        {/* Header Fixo com botões de fechar e voltar */}
        {history.length > 0 && (
          <div className="absolute top-6 left-6 z-[1100]">
            <button
              onClick={handleBack}
              className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-all hover:scale-105 active:scale-95 shadow-xl"
              title="Voltar para a anterior"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
          </div>
        )}

        <div className="absolute top-6 right-6 z-[1100]">
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-all hover:rotate-90">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Área de Scroll */}
        <div id="art-detail-scroll" className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">

          <div className="min-h-fit p-6 md:p-10">
            <div className="bg-white/5 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

              {/* Lado Esquerdo: Imagem / Carousel */}
              <div className="flex-1 bg-black/20 flex flex-col items-center justify-center p-4 min-h-[400px] relative">
                <img
                  src={currentModalImage}
                  className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl cursor-zoom-in transition-all duration-500 hover:scale-[1.02]"
                  alt={art.title}
                  onClick={() => setIsZoomed(true)}
                />

                {/* Carousel navigation arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIndex(i => (i - 1 + allImages.length) % allImages.length)}
                      className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button
                      onClick={() => setCarouselIndex(i => (i + 1) % allImages.length)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-xl"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                    {/* Dot indicators */}
                    <div className="flex gap-2 mt-4">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselIndex(i)}
                          className={`rounded-full transition-all ${i === carouselIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Lado Direito: Info */}
              <div className="w-full md:w-[400px] flex flex-col p-8 border-l border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-3">
                    <div className="relative">
                      <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                      </button>

                      {showMenu && (
                        <>
                          <div className="fixed inset-0 z-[1200]" onClick={() => setShowMenu(false)}></div>
                          <div className="absolute top-full left-0 mt-2 w-56 bg-black/60 border border-white/20 rounded-2xl shadow-2xl z-[1201] overflow-hidden py-2 animate-in zoom-in-95" style={{ backdropFilter: 'blur(1500px)', WebkitBackdropFilter: 'blur(1500px)' }}>
                            <button onClick={() => { setShowMenu(false); onSave(art); }} className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-white/10 text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>
                              À Coleção
                            </button>
                            <button onClick={() => { setShowMenu(false); if (accessToken) likeArt(art.id, accessToken); }} className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-white/10 text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={art.liked ? '#ef4444' : 'none'} stroke={art.liked ? '#ef4444' : 'currentColor'} strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                              {art.liked ? 'Remover Interesse' : 'Marcar Interesse'}
                            </button>
                            <button onClick={() => { setShowMenu(false); window.open(currentModalImage, '_blank'); }} className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-white/10 text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                              Transferir
                            </button>
                            {authUser?.id === art.authorId && (
                              <>
                                <div className="mx-4 my-1 h-px bg-white/10" />
                                {confirmDelete ? (
                                  <div className="px-4 py-3 flex flex-col gap-2">
                                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Tens a certeza?</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={async () => {
                                          if (!accessToken) return;
                                          const ok = await deleteArt(art.id, accessToken);
                                          if (ok) { setShowMenu(false); setConfirmDelete(false); onClose(); }
                                        }}
                                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                      >
                                        Eliminar
                                      </button>
                                      <button
                                        onClick={() => setConfirmDelete(false)}
                                        className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDelete(true)}
                                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-500/20 text-red-400 transition-colors text-[10px] font-black uppercase tracking-widest"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                    Eliminar Arte
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {authUser?.id === art.authorId && (
                      <button
                        onClick={() => onEdit?.(art)}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/10"
                        title="Editar Arte"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (accessToken) toggleSaveArt(art.id, accessToken); }}
                      className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl ${art.saved ? 'bg-black text-white border border-white/20' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                    >
                      {art.saved ? 'Guardado' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => onSave(art)}
                      className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md shadow-xl border border-white/10"
                      title="Organizar em Coleção"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-8">
                  <div
                    onClick={() => {
                      if (onProfileClick && art.authorId && art.author) {
                        onProfileClick(art.authorId, art.author.profile?.displayName || art.author.profile?.username || 'Criador');
                      }
                    }}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-white/10">
                      {art.author?.profile?.avatarUrl ? (
                        <img src={resolveUrl(art.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">{(art.author?.profile?.username || 'A')[0].toUpperCase()}</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{art.author?.profile?.displayName || art.author?.profile?.username}</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Criador Digital</p>
                    </div>
                  </div>
                  {!isOwn && (
                    <button
                      onClick={handleFriendBtn}
                      className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl border ${
                        friendStatus === 'friend'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                          : friendStatus === 'sent'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-white/10 hover:bg-white text-white hover:text-black border-white/20'
                      }`}
                    >
                      {friendStatus === 'friend' ? 'Amigos ✓' : friendStatus === 'sent' ? 'Pendente' : 'Seguir'}
                    </button>
                  )}
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
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg></button>
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
                      setHistory(prev => [...prev, activeArt]);
                      setActiveArt(a);
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

      {/* OVERLAY DE ZOOM FULLSCREEN (Liquid Glass & Cinematic) */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-3xl flex items-center justify-center animate-in fade-in duration-500 overflow-hidden"
          onClick={() => { setIsZoomed(false); setScale(1); setPan({ x: 0, y: 0 }); }}
          onMouseMove={(e) => {
            if (isDragging && scale > 1) {
              setPan({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
              });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'zoom-out') }}
        >
          {/* Spotlight Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-white/[0.03] rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

          <img
            src={currentModalImage}
            className={`relative max-w-none drop-shadow-[0_0_100px_rgba(255,255,255,0.1)] ${scale === 1 ? 'rounded-2xl shadow-2xl transition-all duration-500 ease-out' : ''}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              maxHeight: scale === 1 ? '90vh' : 'none',
              maxWidth: scale === 1 ? '95vw' : 'none',
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            onMouseDown={(e) => {
              if (scale > 1 && e.button === 2) {
                e.stopPropagation();
                setIsDragging(true);
                dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              if (scale === 1) {
                setScale(2.5);
                setPan({ x: 0, y: 0 });
              }
            }}
            alt={art.title}
          />

          {/* Top Bar: Close Button */}
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between pointer-events-none z-[2010]">
            <button
              onClick={(e) => { e.stopPropagation(); setIsZoomed(false); setScale(1); setPan({ x: 0, y: 0 }); }}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-xl border border-white/20 pointer-events-auto shadow-2xl hover:scale-110 active:scale-95"
              title="Fechar (Esc)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>

            <div className="flex gap-3 pointer-events-auto">
              <button onClick={(e) => { e.stopPropagation(); if (accessToken) likeArt(art.id, accessToken); }} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-xl border border-white/20 shadow-2xl hover:scale-110 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill={art.liked ? '#ef4444' : 'none'} stroke={art.liked ? '#ef4444' : 'currentColor'} strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); window.open(currentModalImage, '_blank'); }} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-xl border border-white/20 shadow-2xl hover:scale-110 active:scale-95">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </button>
            </div>
          </div>

          {/* Bottom Info Bar (Glassmorphism) */}
          <div className="absolute bottom-8 left-8 pointer-events-none z-[2010]">
            <div className="px-6 py-4 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 flex flex-col gap-1 shadow-2xl pointer-events-auto max-w-sm">
              <h2 className="text-lg font-black text-white truncate">{art.title}</h2>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20">
                  {art.author?.profile?.avatarUrl && <img src={resolveUrl(art.author.profile.avatarUrl)} className="w-full h-full object-cover" alt="" />}
                </div>
                <p className="text-xs font-bold text-white/60 truncate">{art.author?.profile?.displayName || art.author?.profile?.username}</p>
              </div>
            </div>
          </div>

          {/* Zoom Controls (Glassmorphism) */}
          <div className="absolute bottom-8 right-8 flex flex-col gap-3 pointer-events-none z-[2010]">
            <button
              onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.5, 4)); }}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-xl border border-white/20 transition-all shadow-2xl hover:scale-110 active:scale-95 pointer-events-auto"
              title="Aumentar Zoom"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <div className="w-12 flex justify-center py-1">
              <span className="text-[10px] font-black text-white/60 bg-black/40 px-2 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-inner">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setScale(s => { const newScale = Math.max(s - 0.5, 0.5); if (newScale === 1) setPan({ x: 0, y: 0 }); return newScale; }); }}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-xl border border-white/20 transition-all shadow-2xl hover:scale-110 active:scale-95 pointer-events-auto"
              title="Diminuir Zoom"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
            </button>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
