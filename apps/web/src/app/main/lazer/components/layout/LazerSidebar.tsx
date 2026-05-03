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
      className="fixed left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col items-center gap-4 px-2 py-6 rounded-full"
      style={{ background: '#1a1a24', width: '80px', border: '1px solid #333' }}
    >
      {/* User Icon */}
      <button
        onClick={() => setActiveView('profile')}
        className="w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer transition-transform hover:scale-105"
        style={{ borderColor: activeView === 'profile' ? themeColor : 'transparent' }}
      >
        {userAvatar ? (
          <img src={userAvatar} alt={userName || 'User'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold" style={{ background: '#333', color: '#fff' }}>
            {(userName || 'U')[0].toUpperCase()}
          </div>
        )}
      </button>

      <div className="w-8 h-px bg-white/20 my-2" />

      {/* Nav Items */}
      <nav className="flex flex-col gap-3">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl cursor-pointer transition-colors"
              style={{
                background: isActive ? `${themeColor}33` : 'transparent',
                color: isActive ? themeColor : '#888',
                border: 'none'
              }}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>

      <div className="w-8 h-px bg-white/20 my-2" />

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
