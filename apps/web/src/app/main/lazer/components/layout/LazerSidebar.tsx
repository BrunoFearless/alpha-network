'use client';
import React, { useState, useRef, useEffect } from 'react';
import { AlphaCoreAvatar } from '@/components/alpha-core/AlphaCoreAvatar';
import { useMusicStore } from '@/store/music.store';
import { resolveUrl } from '@/lib/api';
import { LiquidGlassContainer } from '@/components/ui/LiquidGlass';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  themeColor: string;
  alphaStatus: any;
  onAlphaClick: () => void;
  userAvatar?: string | null;
  userName?: string;
  hideMobileNav?: boolean;
}

export function LazerSidebar({
  activeView,
  setActiveView,
  themeColor,
  alphaStatus,
  onAlphaClick,
  userAvatar,
  userName,
  hideMobileNav = false,
}: SidebarProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isExtended, setIsExtended] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const { currentTrack, isPlaying, togglePlay, next, prev, setShowPlayerModal } = useMusicStore();


  const navItems = [
    { id: 'feed', label: 'Início', color: themeColor, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: 'explore', label: 'Explorar', color: '#06b6d4', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
    { id: 'music', label: 'Alpha Music', color: '#ec4899', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
    { id: 'watch', label: 'Alpha Watch', color: '#f97316', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg> },
    { id: 'art', label: 'Alpha Art', color: '#a855f7', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
    { id: 'messages', label: 'Mensagens', color: '#3b82f6', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: 'notifications', label: 'Notificações', color: '#eab308', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
    { id: 'friends', label: 'Amigos', color: '#10b981', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'community', label: 'Comunidade', color: '#6366f1', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/><circle cx="12" cy="5" r="1"/></svg> },
  ];

  const primaryIds = ['feed', 'friends', 'messages', 'notifications'];
  const mobileSecondaryItems = navItems.filter(i => !primaryIds.includes(i.id));
  const activeNavIndex = navItems.findIndex(i => i.id === activeView);

  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const isDraggingRef = useRef(false);
  const lastHapticIndex = useRef<number | null>(null);

  const updateDrag = (clientY: number) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    const relY = clientY - rect.top - 24; // center of 48px pill
    const maxIndex = navItems.length - 1;
    const clampedY = Math.max(0, Math.min(maxIndex * 60, relY));
    const closestIndex = Math.min(maxIndex, Math.max(0, Math.round(clampedY / 60)));

    setDragY(clampedY);
    setDragHoverIndex(closestIndex);

    // Haptic tick when sliding over each icon
    if (closestIndex !== lastHapticIndex.current) {
      lastHapticIndex.current = closestIndex;
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(8);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isDraggingRef.current = true;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* ignore */ }
    updateDrag(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (isDraggingRef.current) {
      updateDrag(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }

    if (dragHoverIndex !== null && navItems[dragHoverIndex]) {
      setActiveView(navItems[dragHoverIndex].id);
    }
    setDragY(null);
    setDragHoverIndex(null);
    lastHapticIndex.current = null;
  };

  // ─── Mobile Sliding Liquid Glass State & Drag ───
  const [mobileBubbleX, setMobileBubbleX] = useState<number | null>(null);
  const [isMobileDragging, setIsMobileDragging] = useState(false);
  const [mobileDragX, setMobileDragX] = useState<number | null>(null);
  const [mobileDragHoverId, setMobileDragHoverId] = useState<string | null>(null);
  const mobileDockRef = useRef<HTMLDivElement>(null);
  const mobileItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isMobileDraggingRef = useRef(false);
  const lastMobileHapticId = useRef<string | null>(null);
  const mobileDragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMovedSignificantly = useRef(false);

  const updateMobileBubblePosition = React.useCallback(() => {
    const targetId = isMobileDragging ? (mobileDragHoverId || activeView) : activeView;
    if (!targetId || !primaryIds.includes(targetId)) {
      setMobileBubbleX(null);
      return;
    }
    const btn = mobileItemRefs.current[targetId];
    if (btn && mobileDockRef.current) {
      const dockRect = mobileDockRef.current.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const centerX = btnRect.left - dockRect.left + btnRect.width / 2;
      setMobileBubbleX(centerX);
    }
  }, [activeView, isMobileDragging, mobileDragHoverId]);

  useEffect(() => {
    updateMobileBubblePosition();
    window.addEventListener('resize', updateMobileBubblePosition);
    return () => window.removeEventListener('resize', updateMobileBubblePosition);
  }, [updateMobileBubblePosition]);

  useEffect(() => {
    const timer = setTimeout(updateMobileBubblePosition, 40);
    return () => clearTimeout(timer);
  }, [activeView, updateMobileBubblePosition]);

  const updateMobileDrag = (clientX: number) => {
    if (!mobileDockRef.current) return;
    const dockRect = mobileDockRef.current.getBoundingClientRect();
    const relX = clientX - dockRect.left;
    const clampedX = Math.max(24, Math.min(dockRect.width - 24, relX));
    setMobileDragX(clampedX);

    // Encontrar o botão primário mais próximo
    let closestId: string | null = null;
    let minDistance = Infinity;

    for (const id of primaryIds) {
      const btn = mobileItemRefs.current[id];
      if (btn) {
        const btnRect = btn.getBoundingClientRect();
        const btnCenterX = btnRect.left - dockRect.left + btnRect.width / 2;
        const dist = Math.abs(clampedX - btnCenterX);
        if (dist < minDistance && dist < 48) {
          minDistance = dist;
          closestId = id;
        }
      }
    }

    setMobileDragHoverId(closestId);

    if (closestId && closestId !== lastMobileHapticId.current) {
      lastMobileHapticId.current = closestId;
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(8);
      }
    }
  };

  const handleMobilePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('.alpha-center-btn')) return;

    mobileDragStartPos.current = { x: e.clientX, y: e.clientY };
    hasMovedSignificantly.current = false;
    isMobileDraggingRef.current = true;
    setIsMobileDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* ignore */ }
    updateMobileDrag(e.clientX);
  };

  const handleMobilePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobileDraggingRef.current) {
      if (mobileDragStartPos.current) {
        const dx = Math.abs(e.clientX - mobileDragStartPos.current.x);
        if (dx > 6) {
          hasMovedSignificantly.current = true;
        }
      }
      updateMobileDrag(e.clientX);
    }
  };

  const handleMobilePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileDraggingRef.current) return;
    isMobileDraggingRef.current = false;
    setIsMobileDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }

    // Obter o ID do botão clicado directamente ou o botão sobre o qual o utilizador arrastou
    const target = e.target as HTMLElement;
    const clickedNavId = target?.closest('[data-nav-id]')?.getAttribute('data-nav-id');
    const finalId = hasMovedSignificantly.current ? (mobileDragHoverId || clickedNavId) : (clickedNavId || mobileDragHoverId);

    if (finalId) {
      setActiveView(finalId);
      setShowMobileMenu(false);
    }

    setMobileDragX(null);
    setMobileDragHoverId(null);
    lastMobileHapticId.current = null;
    mobileDragStartPos.current = null;
    hasMovedSignificantly.current = false;
  };

  // Lógica Long Press
  const handleAlphaTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowMobileMenu(true);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50); // Feedback táctil subtil
      }
    }, 800); // 800ms é o ideal para não empatar o utilizador
  };

  const handleAlphaTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleAlphaClick = () => {
    if (showMobileMenu) {
      setShowMobileMenu(false);
    } else if (currentTrack) {
      setIsExtended(true);
    } else {
      onAlphaClick();
    }
  };

  const renderMobilePrimary = (id: string) => {
    const item = navItems.find(i => i.id === id);
    if (!item) return null;
    const isActive = activeView === item.id;
    const isHoveredByBubble = (isMobileDragging && mobileDragHoverId === id) || (!isMobileDragging && isActive);
    return (
      <button
        ref={el => { mobileItemRefs.current[id] = el; }}
        data-nav-id={id}
        onClick={(e) => {
          e.stopPropagation();
          setActiveView(item.id);
          setShowMobileMenu(false);
        }}
        className="relative z-10 w-12 h-12 flex items-center justify-center cursor-pointer focus:outline-none bg-transparent hover:bg-transparent active:bg-transparent transition-transform duration-200 active:scale-90"
        style={{
          background: 'transparent',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
        title={item.label}
      >
        <div
          className="w-[38px] h-[38px] flex items-center justify-center transition-all duration-300 pointer-events-none bg-transparent"
          style={{
            background: 'transparent',
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            color: isActive || isHoveredByBubble ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
          }}
        >
          <div
            className="transition-all duration-200 text-xl"
            style={{
              transform: isHoveredByBubble ? 'scale(1.18)' : 'scale(1)',
              filter: isHoveredByBubble ? `drop-shadow(0 0 10px ${item.color || themeColor}80)` : 'none',
            }}
          >
            {item.icon}
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      {/* ─────────────────── DESKTOP SIDEBAR (≥ md) ─────────────────── */}
      <aside 
        className="hidden md:flex relative my-auto h-fit z-[200] flex-col items-center gap-4 px-2.5 py-6 rounded-[35px] transition-all duration-500 glass-panel-dark shrink-0"
      >
        <button
          onClick={() => setActiveView('profile')}
          className="w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
          style={{ borderColor: activeView === 'profile' ? themeColor : 'transparent' }}
        >
          {userAvatar ? (() => {
            const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(userAvatar) || userAvatar.includes('/video');
            return isVideo ? (
              <video src={userAvatar} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
              <img src={userAvatar} alt={userName || 'User'} className="w-full h-full object-cover" />
            );
          })() : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs" style={{ background: 'rgba(255,255,255,0.1)' }}>
              {(userName || 'U')[0].toUpperCase()}
            </div>
          )}
        </button>

        <div className="w-8 h-px bg-white/10 my-1" />

        {(() => {
          const currentHoverItem = navItems[isDragging ? (dragHoverIndex ?? activeNavIndex) : activeNavIndex];
          const reflectedColor = currentHoverItem?.color || themeColor;

          return (
            <nav
              ref={navRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="flex flex-col items-center gap-3 w-full relative select-none cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              {/* ── 1. Nav Item Buttons (Layer z-10) ── */}
              {navItems.map((item, idx) => {
                const isActive = activeView === item.id;
                const isHoveredByBubble = (isDragging && dragHoverIndex === idx) || (!isDragging && isActive);
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveView(item.id);
                    }}
                    className="relative z-10 w-12 h-12 flex items-center justify-center cursor-pointer focus:outline-none bg-transparent hover:bg-transparent active:bg-transparent transition-transform duration-200 active:scale-90"
                    style={{
                      background: 'transparent',
                      backgroundColor: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                    }}
                    title={item.label}
                  >
                    {/* ── Botão 100% Transparente (o destaque e reflexo pertencem exclusivamente à bolha Liquid Glass) ── */}
                    <div
                      className="w-[38px] h-[38px] flex items-center justify-center transition-all duration-300 pointer-events-none bg-transparent"
                      style={{
                        background: 'transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        color: isActive || isHoveredByBubble ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
                      }}
                    >
                      <div
                        className="transition-all duration-200"
                        style={{
                          transform: isHoveredByBubble ? 'scale(1.18)' : 'scale(1)',
                          filter: isHoveredByBubble ? `drop-shadow(0 0 10px ${item.color || themeColor}80)` : 'none',
                        }}
                      >
                        {item.icon}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* ── 2. Sliding Liquid Glass Water Bubble Indicator (Layer z-30 pointer-events-none) ── */}
              <div
                className="absolute top-0 left-1/2 w-[54px] h-[54px] pointer-events-none z-30"
                style={{
                  left: '50%',
                  transform: `translate(-50%, ${
                    (isDragging && dragY !== null
                      ? dragY
                      : (activeNavIndex !== -1 ? activeNavIndex * 60 : 0)) - 3
                  }px) ${isDragging ? 'scale(0.94, 1.16)' : 'scale(1)'}`,
                  opacity: (isDragging || activeNavIndex !== -1) ? 1 : 0,
                  transition: isDragging
                    ? 'transform 0.04s linear, scale 0.15s ease'
                    : 'transform 0.45s cubic-bezier(0.18, 1.35, 0.35, 1), scale 0.35s cubic-bezier(0.18, 1.35, 0.35, 1), opacity 0.25s ease',
                }}
              >
                <LiquidGlassContainer
                  width={54}
                  height={54}
                  borderRadius={24}
                  innerShadowColor="rgba(255, 255, 255, 0.92)"
                  innerShadowBlur={14}
                  innerShadowSpread={-3}
                  glassTintColor="#ffffff"
                  glassTintOpacity={0}
                  frostBlurRadius={0.5}
                  noiseFrequency={0.012}
                  noiseStrength={65}
                  reflectedColor={reflectedColor}
                />
              </div>
            </nav>
          );
        })()}

        <div className="w-8 h-px bg-white/10 my-1" />

        <button
          onClick={onAlphaClick}
          className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          style={{ background: themeColor, border: 'none' }}
        >
          <AlphaCoreAvatar size={40} state={alphaStatus} themeColor="#fff" />
        </button>
      </aside>


      {/* ─────────────────── MOBILE BOTTOM NAV (< md) ─────────────────── */}
      {!hideMobileNav && (
      <div className="flex md:hidden fixed bottom-5 left-0 right-0 z-[250] flex-col items-center justify-end pointer-events-none">
        
        {/* Gaveta secundária (Liquid Glass) activada via Long Press */}
        {showMobileMenu && (
          <div className="relative pointer-events-auto mb-4 p-4 rounded-[2.5rem] flex flex-wrap justify-center gap-4 animate-in slide-in-from-bottom-8 fade-in duration-300 w-[90%] max-w-[400px]">
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none z-0">
              <LiquidGlassContainer
                borderRadius={40}
                innerShadowColor="rgba(255, 255, 255, 0.92)"
                innerShadowBlur={14}
                innerShadowSpread={-2}
                glassTintColor="#ffffff"
                glassTintOpacity={4}
                frostBlurRadius={8}
                noiseFrequency={0.012}
                noiseStrength={40}
                reflectedColor={themeColor}
              />
            </div>
            {mobileSecondaryItems.map(item => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id); setShowMobileMenu(false); }}
                  className="relative z-10 flex flex-col items-center gap-2 cursor-pointer focus:outline-none w-16"
                >
                  <div className="w-12 h-12 rounded-[18px] flex items-center justify-center text-xl transition-all shadow-lg"
                    style={{
                      background: isActive ? themeColor : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                    }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase text-white/70 tracking-wider text-center">{item.label}</span>
                </button>
              );
            })}
            
            <button
               onClick={() => { setActiveView('profile'); setShowMobileMenu(false); }}
               className="relative z-10 flex flex-col items-center gap-2 cursor-pointer focus:outline-none w-16"
            >
               <div className="w-12 h-12 min-w-[48px] min-h-[48px] shrink-0 aspect-square rounded-[18px] flex items-center justify-center text-xl transition-all bg-white/10 text-white overflow-hidden border border-white/10">
                 {userAvatar ? (() => {
                   const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(userAvatar) || userAvatar.includes('/video');
                   return isVideo ? (
                     <video src={userAvatar} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                   ) : (
                     <img src={userAvatar} className="w-full h-full object-cover" alt={userAvatar || 'Avatar'} />
                   );
                 })() : <div className="text-sm">U</div>}
               </div>
               <span className="text-[9px] font-black uppercase text-white/70 tracking-wider text-center">Perfil</span>
            </button>
          </div>
        )}

        {/* Barra de Navegação Principal */}
        <div className="pointer-events-auto w-[90%] max-w-[400px]">
          {isExtended && currentTrack ? (
            /* ── EXTENDED PLAYER EM LIQUID GLASS ── */
            <div 
              className="relative rounded-[3rem] p-2 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden cursor-pointer"
              onClick={() => { setShowPlayerModal(true); setIsExtended(false); }}
            >
              <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none z-0">
                <LiquidGlassContainer
                  borderRadius={48}
                  innerShadowColor="rgba(255, 255, 255, 0.92)"
                  innerShadowBlur={16}
                  innerShadowSpread={-2}
                  glassTintColor="#ffffff"
                  glassTintOpacity={4}
                  frostBlurRadius={8}
                  noiseFrequency={0.012}
                  noiseStrength={40}
                  reflectedColor={themeColor}
                />
              </div>

              {/* Cover & Title */}
              <div className="flex items-center gap-3 min-w-0 pl-2 relative z-10">
                <div className={`w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 shrink-0 ${isPlaying ? 'animate-spin-slow' : ''}`} style={{ animationDuration: '4s' }}>
                  {currentTrack.coverUrl ? (
                    <img src={resolveUrl(currentTrack.coverUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-sm">🎵</div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-white truncate drop-shadow-md">{currentTrack.title}</span>
                  <span className="text-[9px] font-bold text-white/50 truncate">{currentTrack.artist}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0 z-10" onClick={e => e.stopPropagation()}>
                <button onClick={prev} className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
                <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
                  {isPlaying ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <button onClick={next} className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
                
                {/* Close Extended Player */}
                <button onClick={() => setIsExtended(false)} className="w-8 h-8 ml-1 flex items-center justify-center text-white/30 hover:text-white/80 bg-white/5 rounded-full">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ) : (
            /* ── NORMAL BOTTOM NAV EM LIQUID GLASS COM BOLHA DESLIZANTE ── */
            <div className="relative w-full">
              {(() => {
                const currentHoverItem = navItems.find(
                  i => i.id === (isMobileDragging ? (mobileDragHoverId || activeView) : activeView)
                );
                const reflectedColor = currentHoverItem?.color || themeColor;
                const targetX = isMobileDragging && mobileDragX !== null ? mobileDragX : mobileBubbleX;
                const isVisible = targetX !== null && (isMobileDragging || primaryIds.includes(activeView));

                return (
                  <>
                    {/* ── Cápsula Principal em Liquid Glass (Fundo da Barra) ── */}
                    <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none z-0">
                      <LiquidGlassContainer
                        borderRadius={48}
                        innerShadowColor="rgba(255, 255, 255, 0.92)"
                        innerShadowBlur={16}
                        innerShadowSpread={-2}
                        glassTintColor="#ffffff"
                        glassTintOpacity={3}
                        frostBlurRadius={8}
                        noiseFrequency={0.012}
                        noiseStrength={40}
                        reflectedColor={reflectedColor}
                      />
                    </div>

                    <div
                      ref={mobileDockRef}
                      onPointerDown={handleMobilePointerDown}
                      onPointerMove={handleMobilePointerMove}
                      onPointerUp={handleMobilePointerUp}
                      onPointerCancel={handleMobilePointerUp}
                      className="relative rounded-[3rem] flex items-center justify-between gap-1 sm:gap-3 px-3 sm:px-4 py-2 select-none cursor-grab active:cursor-grabbing overflow-visible z-10"
                      style={{ touchAction: 'none' }}
                    >
                      {/* ── 1. Indicador Deslizante de Bolha de Água Liquid Glass no Mobile (Layer z-10) ── */}
                      <div
                        className="absolute top-1/2 w-[52px] h-[52px] pointer-events-none z-10"
                        style={{
                          left: `${targetX ?? 0}px`,
                          top: '50%',
                          transform: `translate(-50%, -50%) ${isMobileDragging ? 'scale(1.16, 0.92)' : 'scale(1)'}`,
                          opacity: isVisible ? 1 : 0,
                          transition: isMobileDragging
                            ? 'transform 0.04s linear, scale 0.15s ease'
                            : 'left 0.45s cubic-bezier(0.18, 1.35, 0.35, 1), transform 0.45s cubic-bezier(0.18, 1.35, 0.35, 1), scale 0.35s cubic-bezier(0.18, 1.35, 0.35, 1), opacity 0.25s ease',
                        }}
                      >
                        <LiquidGlassContainer
                          width={52}
                          height={52}
                          borderRadius={22}
                          innerShadowColor="rgba(255, 255, 255, 0.95)"
                          innerShadowBlur={14}
                          innerShadowSpread={-3}
                          glassTintColor="#ffffff"
                          glassTintOpacity={0}
                          frostBlurRadius={0.5}
                          noiseFrequency={0.012}
                          noiseStrength={65}
                          reflectedColor={reflectedColor}
                        />
                      </div>

                      {renderMobilePrimary('feed')}
                      {renderMobilePrimary('friends')}

                      {/* ALPHA CORE CENTER BUTTON (Action Button Estilo Nativo / Mini Player) */}
                      <div
                        className="alpha-center-btn relative mx-1 sm:mx-2 -mt-10 z-20"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div className="absolute inset-0 rounded-full blur-xl opacity-50" style={{ background: themeColor }} />
                        <button
                          onMouseDown={handleAlphaTouchStart}
                          onMouseUp={handleAlphaTouchEnd}
                          onMouseLeave={handleAlphaTouchEnd}
                          onTouchStart={handleAlphaTouchStart}
                          onTouchEnd={handleAlphaTouchEnd}
                          onClick={handleAlphaClick}
                          className={`relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-10 overflow-hidden border-4 border-[#09090b] ${currentTrack && isPlaying ? 'animate-pulse' : ''}`}
                          style={{ 
                            background: showMobileMenu ? '#ef4444' : (currentTrack ? '#000' : themeColor), 
                            transition: 'background 0.3s ease, transform 0.2s ease' 
                          }}
                        >
                          {showMobileMenu ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                          ) : currentTrack ? (
                            <div className="w-full h-full relative">
                              {currentTrack.coverUrl && (
                                <img src={resolveUrl(currentTrack.coverUrl)} className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`} style={{ animationDuration: '4s' }} alt="" />
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="flex items-center gap-0.5">
                                   <div className={`w-1 bg-white rounded-full ${isPlaying ? 'animate-[bounce_1s_infinite]' : 'h-1'}`} style={{ height: isPlaying ? '12px' : '4px' }} />
                                   <div className={`w-1 bg-white rounded-full ${isPlaying ? 'animate-[bounce_1s_infinite_0.2s]' : 'h-1'}`} style={{ height: isPlaying ? '16px' : '4px' }} />
                                   <div className={`w-1 bg-white rounded-full ${isPlaying ? 'animate-[bounce_1s_infinite_0.4s]' : 'h-1'}`} style={{ height: isPlaying ? '10px' : '4px' }} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <AlphaCoreAvatar size={48} state={alphaStatus} themeColor="#fff" />
                          )}
                        </button>
                      </div>

                      {renderMobilePrimary('messages')}
                      {renderMobilePrimary('notifications')}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      )}
    </>
  );
}
