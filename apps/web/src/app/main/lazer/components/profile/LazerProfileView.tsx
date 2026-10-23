'use client';

import React from 'react';
import { LazerUserProfile } from './types';
import { useState, useRef, useEffect } from 'react';
import { AlphaAIProfileModal } from '@/components/alpha-core/AlphaAIProfileModal';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { useLazerStore } from '@/store/lazer.store';
import { uploadUserPersona, resolveUrl } from '@/lib/api';
import { useMusicStore } from '@/store/music.store';
import { AestheticCaptureModal } from '../modals/AestheticCaptureModal';

const t = (s: string) => s;

interface ProfileViewProps {
  user: LazerUserProfile;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onPostClick?: (postId: string) => void;
  viewingUserId?: string;
  onChatClick?: (userId: string) => void;
}

export function LazerProfileView({ user, isOwnProfile, onEdit, onPostClick, viewingUserId, onChatClick }: ProfileViewProps) {
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'chronicles' | 'media' | 'about' | 'music'>('chronicles');
  const [localPersonaUrl, setLocalPersonaUrl] = useState<string | null>(null);
  const [uploadingPersona, setUploadingPersona] = useState(false);
  const [profileTracks, setProfileTracks] = useState<any[]>([]);
  const [profilePlaylists, setProfilePlaylists] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isFriend, sendFriendRequest, userPosts } = useLazerStore();
  const { playTrack } = useMusicStore();

  // Load music for profile
  useEffect(() => {
    if (activeTab !== 'music') return;
    const userId = user.userId;
    if (!userId) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    Promise.all([
      fetch(`${apiBase}/api/v1/music/tracks/user/${userId}`).then(r => r.json()),
      fetch(`${apiBase}/api/v1/music/playlists/user/${userId}`).then(r => r.json()),
    ]).then(([t, p]) => {
      setProfileTracks(t.success ? t.data : []);
      setProfilePlaylists(p.success ? p.data : []);
    }).catch(() => {});
  }, [activeTab, user]);

  const rawPersona = localPersonaUrl || user.foregroundUrl || (user as any).personaUrl;
  const displayPersona = rawPersona ? resolveUrl(rawPersona) : null;

  const handlePersonaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Optimistic preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPersonaUrl(previewUrl);
    // Persist to backend
    setUploadingPersona(true);
    try {
      const persistedUrl = await uploadUserPersona(file);
      setLocalPersonaUrl(persistedUrl);
    } catch (err) {
      console.error('Persona upload failed:', err);
      // Keep the local preview even if the upload fails
    } finally {
      setUploadingPersona(false);
      e.target.value = '';
    }
  };

  const c = user.themeColor || '#e879f9';
  const mode = user.themeMode || 'dark';
  const isLight = user?.themeMode === 'light';
  const cardBg = isLight ? 'glass-panel-light' : 'glass-panel-dark';

  return (
    <div className="w-full h-auto lg:h-full lg:max-h-[675px] max-w-[1200px] flex flex-col overflow-visible lg:overflow-hidden pl-0 pr-0 py-0 lg:ml-0 lg:pr-0 font-['Nunito',sans-serif]">
      {/* Main Glass Foreground */}
      <div className={`flex-1 border-0 md:border-[1.5px] rounded-none md:rounded-[3rem] block lg:flex overflow-visible lg:overflow-hidden relative animate-in fade-in duration-700 z-10 ${cardBg} min-h-0`}
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

        {/* IDENTITY SECTION */}
        {activeTab !== 'about' && (
          <aside className="w-full lg:w-[350px] h-auto lg:h-full border-b lg:border-b-0 lg:border-r border-white/5 block lg:flex lg:flex-col overflow-visible lg:overflow-y-auto no-scrollbar relative z-20 shrink-0">

          {/* Top Decorative Banner Area */}
          <div className="h-32 w-full shrink-0 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${c}30, ${c}05)` }}>
            {user.bannerUrl && (() => {
              const finalUrl = resolveUrl(user.bannerUrl!);
              const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(finalUrl) || finalUrl.includes('video');
              return isVideo ? (
                <video
                  src={finalUrl}
                  className="w-full h-full object-cover opacity-40"
                  autoPlay muted loop playsInline
                />
              ) : (
                <img src={finalUrl} className="w-full h-full object-cover opacity-40" alt="" />
              );
            })()}
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
              {isOwnProfile ? (
                <div className="flex gap-2 w-full">
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] text-white shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      {t('Editar Perfil')}
                    </button>
                  )}
                  <button
                    onClick={() => setShowCaptureModal(true)}
                    className="px-3.5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] text-white border border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Gerar captura elegante do perfil para Stories ou Status"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Status</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => isFriend && !isFriend(user.userId) && sendFriendRequest(user.userId)}
                    className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ background: isFriend && isFriend(user.userId) ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${c}, ${c}cc)` }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    {isFriend && isFriend(user.userId) ? 'entrelaçados' : 'Criar laço'}
                  </button>
                  <button
                    onClick={() => onChatClick && user.userId && onChatClick(user.userId)}
                    className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] text-white border border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    Chat
                  </button>
                  <button
                    onClick={() => setShowCaptureModal(true)}
                    className="p-2.5 rounded-xl text-white border border-white/10 bg-white/5 hover:bg-white/10 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                    title="Capturar perfil para Status ou Stories"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </button>
                </div>
              )}
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
              <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 text-center">{t('Favorite Tropes')}</p>
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
                <p className="text-[9px] font-black uppercase text-white/20 tracking-widest mb-0.5">{t('Spotify Active')}</p>
                <p className="text-xs font-bold text-white truncate">{t('Sparkle - Your Name OST')}</p>
              </div>
            </div>

          </div>
        </aside>
        )}

        {/* RIGHT AREA */}
        <div className="w-full lg:w-auto lg:flex-1 block lg:flex lg:flex-col min-w-0 relative h-auto lg:h-full overflow-visible lg:overflow-hidden shrink-0 lg:shrink pb-20 lg:pb-0">

          {/* Header & Tabs */}
          <header className="px-6 lg:px-10 pt-6 lg:pt-10 pb-0 flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
            <nav className="flex gap-6 lg:gap-10 w-max lg:w-auto">
              {[
                { id: 'posts', label: 'Postagens' },
                { id: 'chronicles', label: 'Crônicas' },
                { id: 'media', label: 'Mídia' },
                { id: 'music', label: '🎵 Música' },
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
          </header>

          {/* Main Content Scroll Area */}
          <main className={`flex-1 overflow-visible lg:overflow-y-auto no-scrollbar relative ${activeTab === 'about' ? 'p-0' : 'p-6 lg:p-10'}`}>
            
            {/* CHRONICLES VIEW */}
            {activeTab === 'chronicles' && (
              <div className="relative pt-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                {user.chronicles?.length ? (
                  <>
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/5 -translate-x-1/2" />
                    
                    <div className="flex flex-col gap-32 relative">
                      {user.chronicles.map((item, i) => (
                        <div key={item.id} className={`flex w-full items-center ${item.side === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          {/* Image Card Side */}
                          <div className="w-[45%]">
                            <div className="group relative p-1 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-700 overflow-hidden shadow-2xl hover:-translate-y-2">
                              <div className="aspect-[16/9] rounded-[2rem] overflow-hidden relative bg-white/5">
                                
                                {/* Media Renderer */}
                                {(() => {

                                  const isVideo = (url: string) => 
                                    /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url) || url.startsWith('data:video');
                                  const media = item.img;
                                  const rawArr = Array.isArray(media) ? media : media ? [media] : [];
                                  const mediaArr = rawArr.map(resolveUrl).filter(Boolean);

                                  if (mediaArr.length === 0) {
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
                                    const url = mediaArr[0];
                                    return isVideo(url) ? (
                                      <video src={url} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700" autoPlay muted loop playsInline />
                                    ) : (
                                      <img src={url} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[0.3] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 scale-110 group-hover:scale-100" alt="" />
                                    );
                                  }

                                  const visible = mediaArr.slice(0, 4);
                                  const extra = mediaArr.length - 4;
                                  return (
                                    <div className="absolute inset-0 grid gap-0.5 grid-cols-2">
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

                          {/* Quote Text Side */}
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

                    {/* Bottom Decorative */}
                    <div className="w-full flex justify-center mt-20">
                       <div className="w-1 h-20 bg-gradient-to-b from-white/5 to-transparent" />
                    </div>
                  </>
                ) : (
                  /* Empty State — clean, no mockups */
                  <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-30">
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-white/40">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                      </svg>
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-white/40">{t('Nenhuma crónica ainda')}</p>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'media' && (
              <div className="p-8 animate-in fade-in zoom-in-95 duration-1000">
                {(() => {

                  const isVid = (url: string) => /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url) || url.startsWith('data:video');

                  const allMedia = userPosts.flatMap(p => {
                    let raw = p.imageUrl;
                    if (typeof raw === 'string' && raw.startsWith('[')) {
                      try { raw = JSON.parse(raw); } catch { return []; }
                    }
                    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
                    return arr.map(url => ({ 
                      url: resolveUrl(url), 
                      postId: p.id, 
                      date: p.createdAt,
                      isVideo: isVid(resolveUrl(url))
                    }));
                  }).filter(m => m.url);

                  if (allMedia.length === 0) {
                    return (
                      <div className="text-center py-20 opacity-30">
                        <p className="text-xs font-black uppercase tracking-[0.3em]">{t('Nenhuma mídia encontrada')}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {allMedia.map((m, i) => (
                        <div 
                          key={`${m.postId}-${i}`}
                          className="group relative aspect-square rounded-[2rem] overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 transition-all duration-500 cursor-pointer shadow-xl hover:-translate-y-1"
                          onClick={() => onPostClick?.(m.postId)}
                        >
                          {m.isVideo ? (
                            <video src={m.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" autoPlay muted loop playsInline />
                          ) : (
                            <img src={m.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                            <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                               <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">
                                 {new Date(m.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                               </p>
                               <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                   <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                 </div>
                                 <span className="text-[10px] font-black text-white tracking-widest uppercase">{t('Ver Post')}</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {userPosts && userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <ProfilePostCard 
                      key={post.id} 
                      post={post} 
                      themeColor={c} 
                      isLight={isLight}
                      onPostClick={onPostClick}
                    />
                  ))
                ) : (
                  <div className="text-center py-20 opacity-30">
                    <p className="text-xs font-black uppercase tracking-[0.3em]">{t('Nenhuma postagem recente')}</p>
                  </div>
                )}
                
                {/* End of Feed Decor */}
                <div className="flex flex-col items-center pt-10 opacity-10">
                  <div className="w-px h-20 bg-gradient-to-b from-white to-transparent" />
                </div>
              </div>
            )}

            {activeTab === 'music' && (() => {
              const totalPlays = profileTracks.reduce((acc, t) => acc + (t.plays || 0), 0);
              const totalCollabs = profileTracks.filter(t => t.collaborations?.length > 0).length;

              return (
              <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Artist Stats Header */}
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">{profileTracks.length}</span>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">{t('Faixas Publicadas')}</span>
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">{totalPlays.toLocaleString()}</span>
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">{t('Total de Plays')}</span>
                  </div>
                  {totalCollabs > 0 && (
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">{totalCollabs}</span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">{t('Colaborações')}</span>
                    </div>
                  )}
                </div>

                {/* Tracks Section */}
                <div className="mb-8">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">{t('Discografia · ')}{profileTracks.length} {t('faixas')}</p>
                  {profileTracks.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-3 text-white/20">
                      <span className="text-5xl">🎵</span>
                      <p className="text-xs font-bold">{t('Ainda nenhuma música publicada.')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {profileTracks.map((track: any, i: number) => {

                        return (
                          <div key={track.id}
                            className="group flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all"
                            onClick={() => playTrack?.(track, profileTracks)}
                          >
                            <span className="w-6 text-center text-xs font-black text-white/20 group-hover:hidden">{i + 1}</span>
                            <svg className="w-4 h-4 hidden group-hover:block text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0">
                              {track.coverUrl ? <img src={resolveUrl(track.coverUrl)} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-white/20">🎵</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                                {track.title}
                                {track.collaborations?.length > 0 && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-md">
                                    + {track.collaborations.length} Collab{track.collaborations.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-white/40 truncate">
                                {track.artist}
                                {track.collaborations?.map((c: any) => ` & ${c.user?.profile?.displayName || c.user?.profile?.username}`).join('')}
                              </p>
                            </div>
                            <div className="flex flex-col items-end mr-4">
                              <span className="text-xs font-black text-white">{track.plays?.toLocaleString() || 0}</span>
                              <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">{t('Plays')}</span>
                            </div>
                            {track.genre && <span className="text-[9px] font-black uppercase tracking-widest text-white/20 px-2 py-1 rounded-full bg-white/5">{track.genre}</span>}
                            <span className="text-xs text-white/20 font-black ml-2">{Math.floor(track.duration/60)}:{String(track.duration%60).padStart(2,'0')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Playlists Section */}
                <div>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">{t('Playlists · ')}{profilePlaylists.length}</p>
                  {profilePlaylists.length === 0 ? (
                    <div className="flex flex-col items-center py-8 gap-3 text-white/20">
                      <span className="text-4xl">📂</span>
                      <p className="text-xs font-bold">{t('Sem playlists públicas.')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {profilePlaylists.map((pl: any) => {

                        const coverSrc = pl.coverUrl || pl.tracks?.[0]?.track?.coverUrl;
                        return (
                          <div 
                            key={pl.id} 
                            onClick={() => {
                              if (pl.tracks?.length > 0) {
                                const tracks = pl.tracks.map((t: any) => t.track);
                                playTrack?.(tracks[0], tracks);
                              }
                            }}
                            className="group p-4 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                          >
                            <div className="w-full aspect-square rounded-[1.5rem] bg-gradient-to-br from-white/10 to-white/5 mb-3 overflow-hidden flex items-center justify-center">
                              {coverSrc ? (
                                <img src={resolveUrl(coverSrc)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                              ) : (
                                <div className="text-4xl opacity-20">🎵</div>
                              )}
                            </div>
                            <p className="text-sm font-black text-white truncate">{pl.title}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-0.5">{pl._count?.tracks ?? 0} músicas</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            {activeTab === 'about' && (
              <div className="relative w-full h-full min-h-[600px] overflow-hidden p-4 md:p-8 flex items-center justify-center animate-in fade-in zoom-in duration-1000">
                
                {/* ── BACKGROUND ORB GLOWS & GRID ── */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20 animate-pulse" style={{ background: c }} />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-10" style={{ background: '#ffffff' }} />
                
                {/* Crosshair Grid Overlay */}
                <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z' fill='white' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize: '24px 24px' }} />
                
                {/* Corner Framing Accents */}
                <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-white/20 z-0 rounded-tl-lg" />
                <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-white/20 z-0 rounded-tr-lg" />
                <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-white/20 z-0 rounded-bl-lg" />
                <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-white/20 z-0 rounded-br-lg" />

                {/* ── SCALED CONTENT WRAPPER ── */}
                <div className="absolute inset-0 transform scale-[0.85] origin-center">

                {/* ── BACKGROUND WIDGETS (Behind Character Z-10) ── */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                  
                  {/* Date & Status (Top Left) */}
                  <div className="absolute top-10 left-10 md:top-14 md:left-14 flex items-center gap-4 animate-in slide-in-from-top-10 duration-1000 delay-200">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-t-2xl rounded-br-2xl rounded-bl-md shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform pointer-events-auto cursor-default">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">{t('Data Estelar')}</p>
                      <p className="text-sm font-black">{new Date().toLocaleDateString('pt-PT', { month: 'long', day: 'numeric' }).toUpperCase()}</p>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-white/50 tracking-[0.2em] uppercase">{t('Sinal')}</span>
                       <span className="text-xs font-black text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">{t('ATIVO')}</span>
                    </div>
                  </div>

                  {/* Vertical Music Player Card (Middle Left) */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-6 md:left-12 w-[160px] md:w-[200px] animate-in slide-in-from-left-10 duration-1000 delay-300">
                    <div className="glass-panel-light p-3 md:p-4 rounded-3xl border border-white/20 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform backdrop-blur-xl pointer-events-auto group cursor-pointer">
                      <div className="w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-white/10 relative shadow-inner">
                         {userPosts?.[0]?.imageUrl ? (
                           <img src={userPosts[0].imageUrl.startsWith('[') ? JSON.parse(userPosts[0].imageUrl)[0] : userPosts[0].imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                         ) : (
                           <div className="w-full h-full bg-gradient-to-tr from-purple-500/50 to-pink-500/50" />
                         )}
                         <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center border border-white/50">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                           </div>
                         </div>
                      </div>
                      <p className="text-[8px] md:text-[9px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">{t('A tocar agora')}</p>
                      <p className="text-xs md:text-sm font-bold text-white truncate drop-shadow-md">{user.listening || 'Vibe Alpha'}</p>
                      
                      <div className="flex items-center justify-between mt-3 px-1">
                        <span className="text-[8px] font-black text-white/50">1:44</span>
                        <div className="flex-1 h-1 bg-white/10 mx-2 rounded-full overflow-hidden">
                          <div className="w-1/3 h-full bg-white rounded-full shadow-[0_0_5px_white]" />
                        </div>
                        <span className="text-[8px] font-black text-white/50">2:43</span>
                      </div>
                    </div>
                  </div>

                  {/* Giant Faded Text Background */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8rem] md:text-[14rem] font-black text-white/[0.02] uppercase tracking-tighter whitespace-nowrap select-none">
                    {user.username}
                  </div>

                  {/* Scattered Polaroids - Background (Z-10) */}
                  {userPosts && userPosts.length > 1 && (
                    <div className="absolute top-10 right-10 md:top-16 md:right-32 z-10 animate-in slide-in-from-right duration-1000 delay-500 pointer-events-auto">
                      {(() => {
                         const img = userPosts[1].imageUrl ? (userPosts[1].imageUrl.startsWith('[') ? JSON.parse(userPosts[1].imageUrl)[0] : userPosts[1].imageUrl) : '';
                         return (
                           <div className="w-48 h-48 md:w-64 md:h-64 rounded-[2.5rem] bg-white/5 backdrop-blur-sm border border-white/10 p-2 shadow-2xl transform rotate-12 blur-[3px] opacity-40 hover:opacity-100 hover:blur-none hover:rotate-6 transition-all duration-700 cursor-pointer"
                                onClick={() => onPostClick && onPostClick(userPosts[1].id)}>
                             <div className="w-full h-full rounded-[2rem] overflow-hidden">
                               <img src={img.startsWith('http') || img.startsWith('data:') ? img : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${img}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt="" />
                             </div>
                           </div>
                         );
                      })()}
                    </div>
                  )}

                  {userPosts && userPosts.length > 2 && (
                    <div className="absolute bottom-20 left-10 md:bottom-24 md:left-40 z-10 animate-in slide-in-from-left duration-1000 delay-700 pointer-events-auto">
                      {(() => {
                         const img = userPosts[2].imageUrl ? (userPosts[2].imageUrl.startsWith('[') ? JSON.parse(userPosts[2].imageUrl)[0] : userPosts[2].imageUrl) : '';
                         return (
                           <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-2xl transform -rotate-12 opacity-50 hover:opacity-100 hover:-rotate-3 transition-all duration-700 cursor-pointer"
                                onClick={() => onPostClick && onPostClick(userPosts[2].id)}>
                             <div className="w-full h-full rounded-[1.5rem] overflow-hidden">
                               <img src={img.startsWith('http') || img.startsWith('data:') ? img : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${img}`} className="w-full h-full object-cover transition-all duration-700" alt="" />
                             </div>
                           </div>
                         );
                      })()}
                    </div>
                  )}
                </div>

                {/* ── THE PERSONA (CENTERPIECE Z-20) ── */}
                <div className="relative z-20 w-full max-w-4xl h-full flex items-center justify-center pointer-events-none">
                  
                  <div className="relative group perspective-1000 pointer-events-auto">
                    <div className="absolute -inset-20 bg-gradient-to-b from-transparent via-white/10 to-transparent blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                    
                    {displayPersona ? (
                      <img 
                        src={displayPersona} 
                        alt="Persona" 
                        className="relative z-10 max-h-[650px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)] transform-gpu group-hover:scale-[1.02] transition-all duration-1000 animate-bounce-slow"
                      />
                    ) : (
                      <div className="relative z-10 flex flex-col items-center gap-6 mt-20">
                        {/* Persona Base - Clear and Vibrant while waiting for removal */}
                        <img 
                          src={user.avatarUrl || ''} 
                          alt="Persona Base" 
                          className="max-h-[450px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-700"
                          style={{ 
                            WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
                            maskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
                            filter: 'contrast(1.05) brightness(1.05)'
                          }}
                        />
                        
                        {isOwnProfile && (
                          <>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/png,image/webp,image/gif" 
                              onChange={handlePersonaUpload}
                            />
                            <button 
                              className="group/btn relative px-8 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingPersona}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                              <span className="relative flex items-center gap-3">
                                {uploadingPersona ? '⏳ A processar...' : '🖼️ Inserir Modelo 3D / Persona'}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── FOREGROUND WIDGETS (In Front of Character Z-30) ── */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                  
                  {/* Dialog Speech Bubble (Middle Right) */}
                  <div className="absolute top-1/3 right-6 md:right-16 z-30 max-w-[240px] md:max-w-[280px] animate-in slide-in-from-right-10 duration-1000 delay-400">
                    <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 text-white p-5 md:p-6 rounded-[2rem] rounded-bl-sm shadow-2xl transform rotate-2 hover:rotate-0 transition-transform pointer-events-auto cursor-default">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{t('Conexão')}</p>
                        <div className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-black tracking-widest text-white/80">PT</div>
                      </div>
                      <p className="text-sm font-bold leading-relaxed">
                        "{user.bio || 'A explorar a rede em busca de novas ligações e inspiração...'}"
                      </p>
                      
                      {/* Speech Bubble Tail pointing left towards character */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/10 backdrop-blur-xl border-l border-b border-white/20 rotate-45" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                    </div>
                  </div>

                  {/* Scattered Polaroids - Foreground (Z-30) */}
                  {userPosts && userPosts.length > 0 && (
                    <div className="absolute top-1/2 right-4 md:right-24 z-30 animate-in zoom-in duration-1000 delay-1000 pointer-events-auto">
                      {(() => {
                         const img = userPosts[0].imageUrl ? (userPosts[0].imageUrl.startsWith('[') ? JSON.parse(userPosts[0].imageUrl)[0] : userPosts[0].imageUrl) : '';
                         return (
                           <div className="w-40 h-40 md:w-56 md:h-56 rounded-[2rem] bg-white/20 backdrop-blur-2xl border border-white/30 p-2.5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-700 cursor-pointer"
                                onClick={() => onPostClick && onPostClick(userPosts[0].id)}>
                             <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative group/polaroid">
                               <img src={img.startsWith('http') || img.startsWith('data:') ? img : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${img}`} className="w-full h-full object-cover" alt="" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/polaroid:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                  <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">{t('Ver Publicação')}</span>
                               </div>
                             </div>
                           </div>
                         );
                      })()}
                    </div>
                  )}

                  {/* Toggle Style Personality Tags (Bottom Left) */}
                  <div className="absolute bottom-10 left-6 md:bottom-16 md:left-14 z-30 flex flex-col gap-3 animate-in slide-in-from-left-10 duration-1000 delay-500">
                    {(user.personalityTags || ['CRIATIVO', 'EXPLORADOR', 'ALPHA']).map((tag, i) => (
                       <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 pl-4 pr-1 py-1 rounded-full shadow-2xl pointer-events-auto transform hover:translate-x-2 transition-transform cursor-default">
                         <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase drop-shadow-md">{tag}</span>
                         <div className="w-10 h-6 rounded-full p-0.5 flex items-center justify-end shadow-inner" style={{ backgroundColor: i === 0 ? c : 'rgba(255,255,255,0.2)' }}>
                            <div className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center">
                              {i === 0 && <span className="text-[8px] font-black text-black">ON</span>}
                            </div>
                         </div>
                       </div>
                    ))}
                  </div>

                  {/* Massive Nameplate (Bottom Right) */}
                  <div className="absolute bottom-8 right-6 md:bottom-12 md:right-12 z-30 animate-in slide-in-from-bottom-10 duration-1000 delay-600 pointer-events-none">
                    <div className="flex flex-col items-end">
                       <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-none" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.4)' }}>
                         {user.displayName}
                       </h1>
                       <div className="flex items-center gap-3 mt-2 mr-2 bg-black/60 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
                          <span className="text-lg leading-none" style={{ color: c }}>✦</span>
                          <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] pt-0.5">{user.username}</span>
                       </div>
                    </div>
                  </div>

                </div>

                </div>

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

      <AestheticCaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        mode="profile"
        profile={user}
        isOwnProfile={isOwnProfile}
        themeColor={c}
        isLight={isLight}
      />

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

/**
 * Minimalist Post Card for Profile View
 */
function ProfilePostCard({ post, themeColor, isLight, onPostClick }: { post: any, themeColor: string, isLight: boolean, onPostClick?: (id: string) => void }) {
  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url) || url.startsWith('data:video');


  const media = (() => {
    let raw = post.imageUrl;
    if (typeof raw === 'string' && raw.startsWith('[')) {
      try { raw = JSON.parse(raw); } catch { /* ignore */ }
    }
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return arr.map(resolveUrl).filter(Boolean);
  })();

  return (
    <div className={`group relative p-1 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-500 cursor-pointer overflow-hidden`}
         onClick={() => onPostClick?.(post.id)}>
      <div className="p-6">
        {/* Header - Date & Tropes */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            {new Date(post.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
          </span>
          <div className="flex gap-2">
            {post.tropes?.slice(0, 2).map((t: any) => (
              <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                {t.iconEmoji} {t.name}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-white/80 leading-relaxed mb-6 whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Media Grid */}
        {media.length > 0 && (
          <div className={`relative rounded-3xl overflow-hidden border border-white/5 mb-6 bg-black/20 ${media.length === 1 ? 'aspect-video' : 'grid grid-cols-2 gap-1 aspect-square md:aspect-video'}`}>
            {media.slice(0, 4).map((url, i) => (
              <div key={i} className={`relative h-full w-full overflow-hidden ${media.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
                {isVideo(url) ? (
                  <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" alt="" />
                )}
                {i === 3 && media.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-black">+{media.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer - Stats */}
        <div className="flex items-center gap-6 opacity-40 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: themeColor }} />
            <span className="text-[10px] font-black text-white tracking-widest">{post._count?.reactions || 0} REAÇÕES</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[10px] font-black text-white tracking-widest">{post._count?.comments || 0} COMENTÁRIOS</span>
          </div>
        </div>
      </div>
      
      {/* Decorative Gradient Line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
