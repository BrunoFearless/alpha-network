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
  const [activeTab, setActiveTab] = useState<'posts' | 'chronicles' | 'media' | 'about'>('chronicles');
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

              {/* Thought Bubble Status */}
              {user.status && (
                <div className="absolute -top-4 -right-24 z-30 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-700">
                  <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 px-3 py-2 rounded-2xl shadow-2xl max-w-[130px] animate-bounce-slow">
                    <p className="text-[9px] font-black italic text-white/90 leading-tight">
                      "{user.status}"
                    </p>
                    {/* Bubble Tail Dots */}
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-white/10 border border-white/20" />
                    <div className="absolute -bottom-3 -left-3 w-1.5 h-1.5 rounded-full bg-white/5 border border-white/10 opacity-50" />
                  </div>
                </div>
              )}
            </div>

            {/* Name & Title */}
            <div className="flex flex-col mb-1 items-center text-center relative w-full">
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <DisplayName profile={user} fallbackName={user.displayName || user.username || ''} />
                <span className="text-xl">💖</span>
              </h1>
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
                { label: "", value: "84" },
                { label: "Pontos", value: "2.4k" }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[15px] font-black text-white">{stat.value}</span>
                  {stat.label && <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.1em] mt-1">{stat.label}</span>}
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                {isFriend && isFriend(user.userId) ? 'entrelaçados' : 'Criar laço'}
              </button>
              <button className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] text-white border border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
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

            {/* Tags / Communities Section */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center w-full shrink-0">
              {(user.communities || ["Shoujo Club", "RomCom Fans", "Tearjerkers"]).map((tag, i) => (
                <div key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 hover:bg-white/10 transition-all cursor-default">
                  <span className="text-[10px] opacity-40">🔖</span>
                  <span className="text-[10px] font-bold text-white/60">{tag}</span>
                </div>
              ))}
            </div>

            {/* Favorite Tropes Section */}
            <div className="mt-4 w-full shrink-0 mb-4">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 text-center">Favorite Tropes</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {(user.relics || ["💖", "☁️", "✨"]).map((trope, i) => (
                  <div key={i} className={`w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-lg hover:scale-110 transition-all cursor-help`}
                    style={{ background: i === 0 ? `linear-gradient(135deg, ${c}40, transparent)` : 'rgba(255,255,255,0.05)' }}>
                    {trope}
                  </div>
                ))}
                <button className="w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center text-white/10 hover:border-white/20 hover:text-white/20 transition-all">
                  +
                </button>
              </div>
            </div>

            {/* Spotify Widget (Se disponível) */}
            <div className="mt-4 p-4 w-full rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 shrink-0 mb-8">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.49 17.303c-.215.353-.675.467-1.025.253-2.822-1.725-6.375-2.113-10.562-1.156-.403.093-.812-.16-.906-.563-.094-.403.16-.812.563-.906 4.584-1.047 8.513-.6 11.675 1.334.35.215.464.675.255 1.038zm1.464-3.26c-.272.44-.847.58-1.287.308-3.228-1.983-8.148-2.557-11.957-1.398-.497.15-1.023-.13-1.173-.627-.15-.497.13-1.023.627-1.173 4.356-1.32 9.778-.68 13.483 1.6 0.44.27 0.58.847 0.308 1.29zm.126-3.41c-3.87-2.3-10.25-2.512-13.98-1.383-.593.18-1.22-.158-1.4-.75-.18-.593.158-1.22.75-1.4 4.28-1.3 11.33-1.04 15.8 1.61.534.317.71 1 .39 1.535-.32.536-1.012.712-1.56.388z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase text-white/20 tracking-widest mb-0.5">Spotify Active</p>
                <p className="text-xs font-bold text-white truncate">Sparkle - Your Name OST</p>
              </div>
            </div>

          </div>
        </aside>

        {/* RIGHT AREA */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Header & Tabs */}
          <header className="px-10 pt-10 pb-0 flex items-center justify-between border-b border-white/5 shrink-0">
            <nav className="flex gap-10">
              {[
                { id: 'posts', label: 'Postagens' },
                { id: 'chronicles', label: 'Crônicas' },
                { id: 'media', label: 'Mídia' },
                { id: 'about', label: 'Sobre' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer ${activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div
                      className="absolute bottom-[-1.5px] left-0 right-0 h-[2.5px] rounded-full animate-in fade-in slide-in-from-left-2 duration-300"
                      style={{ background: c }}
                    />
                  )}
                </button>
              ))}
            </nav>

            {onEdit && (
              <button
                onClick={onEdit}
                className="mb-4 px-6 py-2.5 bg-white/5 backdrop-blur-xl rounded-2xl text-white font-black text-[9px] uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all cursor-pointer shadow-2xl"
              >
                Editar Perfil
              </button>
            )}
          </header>

          {/* Main Content Scroll Area */}
          <main className="flex-1 overflow-y-auto no-scrollbar p-10 relative">
            
            {/* CHRONICLES VIEW */}
            {activeTab === 'chronicles' && (
              <div className="relative pt-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Vertical Timeline Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/5 -translate-x-1/2" />
                
                <div className="flex flex-col gap-32 relative">
                  {(user.chronicles?.length ? user.chronicles : [
                    { id: '1', side: 'left', title: 'O Encontro Sob as Estrelas', quote: 'Naquele momento, o céu parou para nos ouvir.', img: 'https://images.unsplash.com/photo-1506318137071-a8e063b4b519?w=800&q=80' },
                    { id: '2', side: 'right', title: 'O Fragmento de Memória', quote: 'Algumas coisas não devem ser esquecidas.', img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80' },
                    { id: '3', side: 'left', title: 'Despertar Alpha', quote: 'A rede conectou o que estava separado.', img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80' }
                  ]).map((item, i) => (
                    <div key={item.id} className={`flex w-full items-center ${item.side === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* Image Card Side */}
                      <div className="w-[45%]">
                        <div className="group relative p-1 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-700 overflow-hidden shadow-2xl hover:-translate-y-2">
                          <div className="aspect-[16/9] rounded-[2rem] overflow-hidden relative bg-white/5">
                            
                            {/* Media Renderer */}
                            {(() => {
                              const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                              const resolveUrl = (url: string) => {
                                if (!url) return '';
                                if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
                                return `${apiBase}${url}`;
                              };
                              const isVideo = (url: string) => 
                                /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url) || url.startsWith('data:video');
                              const media = item.img;
                              const rawArr = Array.isArray(media) ? media : media ? [media] : [];
                              const mediaArr = rawArr.map(resolveUrl).filter(Boolean);

                              if (mediaArr.length === 0) {
                                // No media — elegant gradient placeholder
                                return (
                                  <div className="absolute inset-0 flex items-center justify-center"
                                       style={{ background: `linear-gradient(135deg, ${c}20, transparent)` }}>
                                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/10">
                                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                    </div>
                                  </div>
                                );
                              }

                              if (mediaArr.length === 1) {
                                // Single media
                                const url = mediaArr[0];
                                return isVideo(url) ? (
                                  <video src={url} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700" autoPlay muted loop playsInline />
                                ) : (
                                  <img src={url} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[0.3] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 scale-110 group-hover:scale-100" alt="" />
                                );
                              }

                              // Multiple media — mini grid (max 4)
                              const visible = mediaArr.slice(0, 4);
                              const extra = mediaArr.length - 4;
                              return (
                                <div className={`absolute inset-0 grid gap-0.5 ${visible.length === 2 ? 'grid-cols-2' : visible.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                  {visible.map((url, mi) => (
                                    <div key={mi} className={`relative overflow-hidden ${visible.length === 3 && mi === 0 ? 'row-span-2' : ''}`}>
                                      {isVideo(url) ? (
                                        <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                      ) : (
                                        <img src={url} className="w-full h-full object-cover" alt="" />
                                      )}
                                      {mi === 3 && extra > 0 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                          <span className="text-white font-black text-lg">+{extra}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Overlay gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                            {item.title && (
                              <div className="absolute bottom-5 left-7 right-7 z-10">
                                <h3 className="text-sm font-black text-white tracking-tight group-hover:translate-x-1 transition-transform drop-shadow-lg">{item.title}</h3>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Connection Dot & Branch */}
                      <div className="w-[10%] flex justify-center items-center relative z-10">
                        <div className="w-4 h-4 rounded-full border-2 bg-transparent flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-500 hover:scale-125"
                             style={{ borderColor: c }}>
                           <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c }} />
                        </div>
                        <div className={`absolute top-1/2 h-[1px] w-full -z-10 ${item.side === 'right' ? 'right-1/2' : 'left-1/2'}`}
                             style={{ background: `linear-gradient(${item.side === 'right' ? 'to left' : 'to right'}, ${c}60, transparent)` }} />
                      </div>

                      {/* Quote Text Side (Opposite to Image) */}
                      <div className={`w-[45%] flex flex-col justify-center ${item.side === 'right' ? 'items-end pr-4' : 'items-start pl-4'}`}>
                        <div className={`border-l-2 pl-4 ${item.side === 'right' ? 'border-l-0 border-r-2 pl-0 pr-4' : ''}`}
                             style={{ borderColor: `${c}60` }}>
                          <p className="text-[13px] italic font-medium text-white/50 leading-relaxed">
                            "{item.quote}"
                          </p>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Bottom Decorative Circle */}
                <div className="w-full flex justify-center mt-20">
                   <div className="w-1 h-20 bg-gradient-to-b from-white/5 to-transparent" />
                </div>
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 text-center py-20">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white/10">Feed de Postagens em breve...</p>
              </div>
            )}
          </main>
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

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
