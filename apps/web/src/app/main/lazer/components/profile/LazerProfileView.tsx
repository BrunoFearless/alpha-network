'use client';

import React from 'react';
import { LazerUserProfile } from './types';
import { useState } from 'react';
import { AlphaAIProfileModal } from '@/components/alpha-core/AlphaAIProfileModal';
import { ThemeBg } from './ThemeBg';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { useLazerStore } from '@/store/lazer.store';

interface ProfileViewProps {
  user: LazerUserProfile;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onPostClick?: (postId: string) => void;
  viewingUserId?: string;
}

export function LazerProfileView({ user, isOwnProfile, onEdit, onPostClick, viewingUserId }: ProfileViewProps) {
  const [showAiModal, setShowAiModal] = useState(false);
  const { isFriend, sendFriendRequest } = useLazerStore();

  const c = user.themeColor || '#e879f9';
  const mode = user.themeMode || 'dark';
  const isLight = user?.themeMode === 'light';
  const cardBg = isLight ? 'glass-panel-light' : 'glass-panel-dark';

  return (
    <div className="w-full h-full max-h-[calc(100vh-40px)] flex flex-col overflow-hidden pl-0 pr-4 py-4 lg:-ml-12 lg:pr-8 font-['Nunito',sans-serif]">

      {/* Background Glows */}
      <ThemeBg color={c} mode={mode} bgImageUrl={user.bgImageUrl} />

      {/* Main Glass Foreground (Limite Fixo) */}
      <div className={`flex-1 border-[1.5px] rounded-[3rem] flex flex-row overflow-hidden relative animate-in fade-in duration-700 z-10 ${cardBg} min-h-0`}
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

        {/* IDENTITY SECTION (Com Scroll Interno) */}
        <aside className="w-full lg:w-[350px] h-full border-r border-white/5 flex flex-col overflow-y-auto no-scrollbar relative z-20 shrink-0">
          
          {/* Top Decorative Banner Area */}
          <div className="h-32 w-full shrink-0 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${c}30, ${c}05)` }}>
             {user.bannerUrl && <img src={user.bannerUrl} className="w-full h-full object-cover opacity-40" alt="" />}
          </div>

          {/* User Info Content */}
          <div className="px-8 pb-10 -mt-12 relative flex flex-col items-center">
            
            {/* Avatar Row */}
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full bg-white p-1 shadow-2xl overflow-hidden">
                <Avatar src={user.avatarUrl} name={user.displayName || user.username} className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-[3px] border-white rounded-full shadow-lg" />
            </div>

            {/* Name & Title */}
            <div className="flex flex-col mb-1 items-center text-center relative w-full">
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <DisplayName profile={user} fallbackName={user.displayName || user.username || ''} />
                <span className="text-xl">💖</span>
              </h1>
              
              {/* Status (Italic, subtle) */}
              <div className="absolute right-0 top-1 hidden lg:block">
                 <p className="text-[10px] italic font-medium text-white/20 max-w-[80px] leading-tight text-right">
                   "{user.status || "Waiting for magic..."}"
                 </p>
              </div>

              <span className="text-white/40 font-bold text-xs uppercase tracking-widest">@{user.username}</span>
            </div>

            {/* Bio Section */}
            <div className="mt-8 text-center px-4">
              <p className="text-[13px] font-medium text-white/60 leading-relaxed">
                {user.bio || "Explorando as fronteiras do Alpha Network..."}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="mt-10 w-full grid grid-cols-3 gap-4 border-y border-white/5 py-6 shrink-0">
              {[
                { label: "Seguidores", value: "1.2k" },
                { label: "Publicações", value: "84" },
                { label: "Pontos", value: "2.4k" }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[15px] font-black text-white">{stat.value}</span>
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.1em] mt-1">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Primary Actions */}
            <div className="mt-10 w-full flex flex-row gap-2.5 px-6 shrink-0">
              <button 
                onClick={() => !isOwnProfile && isFriend && !isFriend(user.userId) && sendFriendRequest(user.userId)}
                className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                style={{ background: isFriend && isFriend(user.userId) ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${c}, ${c}cc)` }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                {isFriend && isFriend(user.userId) ? 'entrelaçados' : 'Criar laço'}
              </button>
              <button className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] text-white border border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Chat
              </button>
            </div>

            {/* Quick Actions (Icons) */}
            <div className="mt-10 flex justify-between w-full px-4 shrink-0">
              {[
                { icon: "❤️", label: "LOVE" },
                { icon: "⭐", label: "FAVORITE" },
                { icon: "✨", label: "SPARKLE" },
                { icon: "☕", label: "CAFE DATE" }
              ].map((act, i) => (
                <button key={i} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-lg group-hover:scale-110 group-hover:bg-white/10 transition-all shadow-sm">
                    {act.icon}
                  </div>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">{act.label}</span>
                </button>
              ))}
            </div>

            {/* Spotify Widget (Se disponível) */}
            <div className="mt-10 p-4 w-full rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 shrink-0 mb-10">
               <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.303c-.215.353-.675.467-1.025.253-2.822-1.725-6.375-2.113-10.562-1.156-.403.093-.812-.16-.906-.563-.094-.403.16-.812.563-.906 4.584-1.047 8.513-.6 11.675 1.334.35.215.464.675.255 1.038zm1.464-3.26c-.272.44-.847.58-1.287.308-3.228-1.983-8.148-2.557-11.957-1.398-.497.15-1.023-.13-1.173-.627-.15-.497.13-1.023.627-1.173 4.356-1.32 9.778-.68 13.483 1.6 0.44.27 0.58.847 0.308 1.29zm.126-3.41c-3.87-2.3-10.25-2.512-13.98-1.383-.593.18-1.22-.158-1.4-.75-.18-.593.158-1.22.75-1.4 4.28-1.3 11.33-1.04 15.8 1.61.534.317.71 1 .39 1.535-.32.536-1.012.712-1.56.388z"/></svg>
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase text-white/20 tracking-widest mb-0.5">Spotify Active</p>
                  <p className="text-xs font-bold text-white truncate">Sparkle - Your Name OST</p>
               </div>
            </div>

          </div>
        </aside>

        {/* RIGHT AREA (Livre) */}
        <div className="flex-1 relative">
           {onEdit && (
            <button
              onClick={onEdit}
              className="absolute top-8 right-8 px-6 py-2.5 bg-white/5 backdrop-blur-xl rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all cursor-pointer z-50 shadow-2xl"
            >
              Editar Perfil
            </button>
          )}
        </div>

      </div>

      {showAiModal && user.aiAssistant && (
        <AlphaAIProfileModal
          botname={user.aiAssistant.botname}
          themeMode={user.themeMode}
          onClose={() => setShowAiModal(false)}
          isOwner={isOwnProfile}
        />
      )}
    </div>
  );
}
