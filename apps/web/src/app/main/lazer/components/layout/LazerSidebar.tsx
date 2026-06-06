'use client';
import React, { useState, useRef, useEffect } from 'react';
import { AlphaCoreAvatar } from '@/components/alpha-core/AlphaCoreAvatar';
import { useMusicStore } from '@/store/music.store';
import { resolveUrl } from '@/lib/api';

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
    { id: 'feed', label: 'Início', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id: 'explore', label: 'Explorar', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
    { id: 'music', label: 'Alpha Music', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
    { id: 'watch', label: 'Alpha Watch', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg> },
    { id: 'art', label: 'Alpha Art', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
    { id: 'messages', label: 'Mensagens', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: 'notifications', label: 'Notificações', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
    { id: 'friends', label: 'Amigos', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'community', label: 'Comunidade', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/><circle cx="12" cy="5" r="1"/></svg> },
  ];

  const primaryIds = ['feed', 'friends', 'messages', 'notifications'];
  const mobileSecondaryItems = navItems.filter(i => !primaryIds.includes(i.id));

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
    return (
      <button
        onClick={() => { setActiveView(item.id); setShowMobileMenu(false); }}
        className="w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all"
        style={{ color: isActive ? themeColor : 'rgba(255,255,255,0.4)' }}
      >
        <div className="text-xl transition-transform" style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
          {item.icon}
        </div>
        {isActive && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: themeColor }} />}
      </button>
    );
  };

  return (
    <>
      {/* ─────────────────── DESKTOP SIDEBAR (≥ md) ─────────────────── */}
      <aside 
        className="hidden md:flex fixed left-10 inset-y-0 my-auto h-fit z-[200] flex-col items-center gap-4 px-3 py-6 rounded-[35px] transition-all duration-500 glass-panel-dark min-w-[76px]"
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

        <nav className="flex flex-col items-center gap-3 w-full">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className="w-12 h-12 rounded-[18px] flex items-center justify-center text-xl cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none"
                style={{
                  background: isActive ? `${themeColor}20` : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? themeColor : 'rgba(255, 255, 255, 0.6)',
                  border: isActive ? `1.5px solid ${themeColor}60` : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isActive ? `0 0 15px ${themeColor}30` : 'none'
                }}
                title={item.label}
              >
                {item.icon}
              </button>
            );
          })}
        </nav>

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
        
        {/* Gaveta secundária (Glassmorphism) activada via Long Press */}
        {showMobileMenu && (
          <div className="pointer-events-auto mb-4 p-4 rounded-[2.5rem] glass-panel-dark border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-wrap justify-center gap-4 animate-in slide-in-from-bottom-8 fade-in duration-300 backblur-2xl w-[90%] max-w-[400px]">
            {mobileSecondaryItems.map(item => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id); setShowMobileMenu(false); }}
                  className="flex flex-col items-center gap-2 cursor-pointer focus:outline-none w-16"
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
               className="flex flex-col items-center gap-2 cursor-pointer focus:outline-none w-16"
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
            /* ── EXTENDED PLAYER ── */
            <div 
              className="rounded-[3rem] bg-[#111]/90 backdrop-blur-3xl border border-white/20 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 relative overflow-hidden cursor-pointer"
              onClick={() => { setShowPlayerModal(true); setIsExtended(false); }}
            >
              {/* Background gradient hint */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none" />

              {/* Cover & Title */}
              <div className="flex items-center gap-3 min-w-0 pl-2">
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
            /* ── NORMAL BOTTOM NAV ── */
            <div className="rounded-[3rem] bg-[#111]/85 backdrop-blur-2xl border border-white/10 flex items-center justify-center gap-1 sm:gap-3 px-2 sm:px-4 py-2 shadow-[0_15px_50px_rgba(0,0,0,0.8)] animate-in fade-in duration-300">
              
              {renderMobilePrimary('feed')}
              {renderMobilePrimary('friends')}

              {/* ALPHA CORE CENTER BUTTON (Action Button Estilo Nativo / Mini Player) */}
              <div className="relative mx-1 sm:mx-2 -mt-10">
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
                    /* Mini-Player Visual (Spinning Vinyl or EQ) */
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
          )}
        </div>
      </div>
      )}
    </>
  );
}
