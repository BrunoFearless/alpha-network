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
    { id: 'feed', icon: '🏠', label: 'Início' },
    { id: 'explore', icon: '🧭', label: 'Explorar' },
    { id: 'messages', icon: '💬', label: 'Mensagens' },
    { id: 'notifications', icon: '🔔', label: 'Notificações' },
    { id: 'friends', icon: '👥', label: 'Amigos' },
    { id: 'community', icon: '🏘️', label: 'Comunidade' },
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
        {userAvatar ? (
          <img src={userAvatar} alt={userName || 'User'} className="w-full h-full object-cover" />
        ) : (
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
              className="w-12 h-12 rounded-[18px] flex items-center justify-center text-xl cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: isActive ? `${themeColor}30` : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? themeColor : 'rgba(255, 255, 255, 0.6)',
                border: isActive ? `1.5px solid ${themeColor}` : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isActive ? `0 0 15px ${themeColor}40` : 'none'
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
