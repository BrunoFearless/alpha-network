'use client';
import React from 'react';
import { AlphaCoreAvatar } from '@/components/alpha-core/AlphaCoreAvatar';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  themeColor: string;
  alphaStatus: any;
  onAlphaClick: () => void;
  userAvatar?: string | null;
  userName?: string;
}

export function LazerSidebar({
  activeView,
  setActiveView,
  themeColor,
  alphaStatus,
  onAlphaClick,
  userAvatar,
  userName
}: SidebarProps) {
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

  return (
    <aside 
      className="fixed left-10 inset-y-0 my-auto h-fit z-[200] flex flex-col items-center gap-4 px-3 py-6 rounded-[35px] transition-all duration-500 glass-panel-dark min-w-[76px] "
    >
      {/* User Icon */}
      <button
        onClick={() => setActiveView('profile')}
        className="w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
        style={{ borderColor: activeView === 'profile' ? themeColor : 'transparent' }}
      >
        {userAvatar ? (() => {
          const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(userAvatar) || userAvatar.includes('/video');
          return isVideo ? (
            <video
              src={userAvatar}
              className="w-full h-full object-cover"
              autoPlay muted loop playsInline
            />
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

      {/* Nav Items */}
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

      {/* Alpha Core Trigger */}
      <button
        onClick={onAlphaClick}
        className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
        style={{ background: themeColor, border: 'none' }}
      >
        <AlphaCoreAvatar size={40} state={alphaStatus} themeColor="#fff" />
      </button>
    </aside>
  );
}
