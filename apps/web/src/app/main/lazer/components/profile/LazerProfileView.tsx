'use client';

import React from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { ThemeBg } from './ThemeBg';
import { LazerUserProfile, LazerChronicle } from './types';

interface ChronicleProps {
  item: LazerChronicle;
  color: string;
  isLight: boolean;
  onClick?: (postId: string) => void;
}

function Chronicle({ item, color, isLight, onClick }: ChronicleProps) {
  const textColor = isLight ? "text-gray-800" : "text-gray-100";
  const cardBg = isLight ? "bg-white/40" : "bg-black/25";
  const borderCol = isLight ? `${color}40` : `${color}15`;
  const isLeft = item.side === "left";
  
  return (
    <div className="flex items-center relative w-full lg:min-h-[180px]">
      {isLeft ? (
        <>
          <div className="flex-1 pr-6 lg:pr-12 text-right">
            <div 
              onClick={() => onClick?.(String(item.id))}
              className={`${cardBg} backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] border-[1.5px] inline-block text-left w-full sm:max-w-[340px] transition-transform hover:-translate-y-1 cursor-pointer group`} 
              style={{ borderColor: borderCol }}
            >
              <div className="relative overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-[160px] sm:h-[180px] object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 text-white font-bold text-xs uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">Ver Post</div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className={`m-0 font-bold text-sm ${textColor}`}><EmojiRenderer content={item.title} emojiSize={14} /></p>
              </div>
            </div>
          </div>
          <div className="w-4 h-4 rounded-full shrink-0 relative z-10 mx-auto bg-white border-4" style={{ borderColor: color, boxShadow: `0 0 15px ${color}80` }} />
          <div className="flex-1 pl-6 lg:pl-12">
            <p className={`m-0 text-[13px] lg:text-sm italic leading-relaxed font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>"<EmojiRenderer content={item.quote} emojiSize={14} style={{ display: 'inline' }} />"</p>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 pr-6 lg:pr-12 text-right">
            <p className={`m-0 text-[13px] lg:text-sm italic leading-relaxed font-medium ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>"<EmojiRenderer content={item.quote} emojiSize={14} style={{ display: 'inline' }} />"</p>
          </div>
          <div className="w-4 h-4 rounded-full shrink-0 relative z-10 mx-auto bg-white border-4" style={{ borderColor: color, boxShadow: `0 0 15px ${color}80` }} />
          <div className="flex-1 pl-6 lg:pl-12">
             <div 
                onClick={() => onClick?.(String(item.id))}
                className={`${cardBg} backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] border-[1.5px] inline-block text-left w-full sm:max-w-[340px] transition-transform hover:-translate-y-1 cursor-pointer group`} 
                style={{ borderColor: borderCol }}
              >
              <div className="relative overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-[160px] sm:h-[180px] object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 text-white font-bold text-xs uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">Ver Post</div>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className={`m-0 font-bold text-sm ${textColor}`}><EmojiRenderer content={item.title} emojiSize={14} /></p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ProfileViewProps {
  user: LazerUserProfile;
  onEdit: () => void;
  onPostClick?: (postId: string) => void;
}

export function LazerProfileView({ user, onEdit, onPostClick }: ProfileViewProps) {
  const isLight = user.themeMode === "light";
  const c = user.themeColor || '#e879f9';
  const textPrimary = isLight ? "text-gray-900" : "text-gray-100";
  const textSecondary = isLight ? "text-gray-500" : "text-gray-400";
  const cardBg = isLight ? "bg-white/40" : "bg-black/25";
  const borderCol = isLight ? `${c}40` : `${c}15`;

  return (
    <div className="relative min-h-screen bg-alpha-bg overflow-x-hidden">
      <ThemeBg color={c} mode={user.themeMode} />
      
      <div className="relative z-10 w-full">
        
        {/* Banner - Full Width */}
        <div 
          className="h-[220px] sm:h-[300px] lg:h-[400px] relative bg-cover bg-center w-full overflow-hidden"
          style={{ 
            backgroundImage: user.bannerUrl && !user.bannerUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? `url('${user.bannerUrl}')` : `linear-gradient(135deg, ${c}80, ${c}20)` 
          }}
        >
          {user.bannerUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) && (
             <video src={user.bannerUrl} autoPlay muted loop playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0 pointer-events-none" />
          )}
          <div 
            className="absolute inset-0 z-10"
            style={{ 
               background: `linear-gradient(to bottom, transparent 20%, ${isLight ? "rgba(249,250,251,1)" : "rgba(9,9,11,1)"} 100%)`
            }} 
          />
          <button 
            onClick={onEdit} 
            className="absolute top-4 right-4 sm:top-8 sm:right-8 lg:top-12 lg:right-12 border-none text-white rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer backdrop-blur-md transition-all hover:scale-105 shadow-xl flex items-center gap-2 z-20"
            style={{ backgroundColor: `${c}cc` }}
          >
            <span>✏️</span> Editar Perfil
          </button>
        </div>

        {/* Content Container - 2 columns on Desktop */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-24 flex flex-col lg:flex-row gap-8 lg:gap-16 relative">
           
           {/* Sidebar Card */}
           <div className={`w-full lg:w-[380px] shrink-0 lg:-mt-[160px] lg:sticky lg:top-8 h-max rounded-[2.5rem] p-6 lg:p-8 shadow-2xl border backdrop-blur-3xl ${cardBg}`} style={{ borderColor: borderCol, zIndex: 20 }}>
              
              <div className="mt-[-70px] lg:mt-[-90px] mb-4 relative flex items-center lg:justify-center">
                 <div className="rounded-full border-[6px] border-alpha-bg bg-[#1e1e2e] shadow-xl relative flex items-center justify-center shrink-0 w-[116px] h-[116px] lg:w-[140px] lg:h-[140px]">
                   <Avatar src={user.avatarUrl} name={user.displayName} size="xl" className="!w-[104px] !h-[104px] lg:!w-[128px] lg:!h-[128px] text-5xl border-[3px] shrink-0" style={{ borderColor: c }} />
                 </div>
                 <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-green-500 border-[3.5px] border-white absolute bottom-1 right-2 lg:right-4 z-10" />
              </div>

              <div className="lg:text-center text-left">
                <h1 className="m-0 mb-1 leading-[1.2] flex lg:justify-center">
                  <DisplayName profile={user} fallbackName={user.username} style={{ fontSize: 28 }} />
                </h1>
                
                <div className="flex flex-wrap items-center lg:justify-center gap-2 mb-4">
                  <span className={`text-[14px] font-medium ${textSecondary}`}>@{user.username}</span>
                  {user.status && (
                    <>
                      <span className={`text-[12px] opacity-70 ${textSecondary}`}>•</span>
                      <span className="text-[14px] italic font-medium flex items-center gap-1" style={{ color: c }}><EmojiRenderer content={user.status} emojiSize={14} /></span>
                    </>
                  )}
                </div>

                <p className={`m-0 mb-6 text-[15px] leading-relaxed font-medium opacity-90 ${textPrimary}`}>
                  <EmojiRenderer content={user.bio} emojiSize={18} />
                </p>

                {user.listening && (
                  <div 
                     className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 border-[1.5px] w-full justify-center mb-6 shadow-sm"
                     style={{ backgroundColor: `${c}18`, borderColor: `${c}40` }}
                  >
                    <span className="text-sm animate-pulse">🎵</span>
                    <span className="text-[13px] font-bold tracking-wide truncate" style={{ color: c }}>{user.listening}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-6 border-y py-6 border-dashed" style={{ borderColor: borderCol }}>
                {user.stats.map(s => (
                  <div key={s.label} className="text-center group">
                    <p className={`m-0 font-black text-xl lg:text-2xl transition-colors group-hover:text-gold ${textPrimary}`}>{s.value}</p>
                    <p className={`m-0 text-[10px] lg:text-[11px] uppercase tracking-[0.15em] mt-1.5 font-bold ${textSecondary}`}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mb-6">
                <button 
                  className="flex-[1.5] text-white border-none rounded-full py-3.5 font-bold text-sm cursor-pointer transition-transform hover:scale-[1.03] flex items-center justify-center gap-2 shadow-xl"
                  style={{ backgroundColor: c, boxShadow: `0 8px 30px ${c}50` }}
                >
                  <span className="text-lg">👥</span> {user.primaryAction}
                </button>
                <button 
                   className={`flex-1 bg-transparent border-[2px] rounded-full py-3.5 font-bold text-sm cursor-pointer transition-colors hover:bg-white/10 flex items-center justify-center gap-2 ${textPrimary}`}
                   style={{ borderColor: borderCol, color: isLight ? '#111827' : '#f3f4f6' }}
                >
                  <span className="text-lg">💬</span> Chat
                </button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
                {user.quickActions.map(a => (
                  <button 
                    key={a} 
                     className={`backdrop-blur-md border-[1.5px] rounded-2xl py-3.5 text-[11px] lg:text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all ${cardBg} ${textPrimary}`}
                     style={{ borderColor: borderCol }}
                  >
                    {a}
                  </button>
                ))}
              </div>

              {/* Communities */}
              <div className="flex flex-wrap gap-2.5 mb-8">
                {user.communities.map(co => (
                  <div 
                     key={co} 
                     className={`flex items-center gap-2 backdrop-blur-md border-[1.5px] rounded-full px-4 py-2.5 text-xs lg:text-[13px] font-bold cursor-pointer hover:bg-white/5 transition-colors shadow-sm ${cardBg} ${textPrimary}`}
                     style={{ borderColor: borderCol }}
                  >
                    <span className="text-[14px]" style={{ color: c }}>✦</span>
                    {co}
                  </div>
                ))}
              </div>

              {/* Relics */}
              <p className={`m-0 mb-3 text-[11px] lg:text-[12px] font-black uppercase tracking-[0.2em] ${textSecondary}`}>
                {user.sectionLabel}
              </p>
              <div className="flex flex-wrap gap-3.5">
                {user.relics.map((r,i) => (
                  <div 
                     key={i} 
                     className="w-12 h-12 lg:w-14 lg:h-14 rounded-full border-[2px] flex items-center justify-center text-xl lg:text-2xl cursor-pointer hover:scale-110 transition-transform shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
                     style={{ background: `linear-gradient(135deg, ${c}60, ${c}20)`, borderColor: `${c}80` }}
                  >
                    {r}
                  </div>
                ))}
                <div 
                   className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full border-[2.5px] border-dashed flex items-center justify-center text-xl lg:text-2xl cursor-pointer hover:bg-white/5 transition-colors ${textSecondary}`}
                   style={{ borderColor: borderCol }}
                >
                  +
                </div>
              </div>

           </div>

           {/* Timeline Right Side */}
           <div className="flex-1 lg:mt-[20px] relative pb-10">
              {/* Linha vertical (centrada na timeline) só se tiver crônicas */}
              {user.chronicles.length > 0 && (
                <div 
                  className="absolute left-1/2 top-0 bottom-0 w-[2.5px] -translate-x-1/2 rounded-full" 
                  style={{ background: `linear-gradient(to bottom, transparent, ${c}80, ${c}20, transparent)` }} 
                />
              )}
              <div className="flex flex-col gap-10 lg:gap-20 pt-8 lg:pt-12">
                {user.chronicles.length === 0 ? (
                  <div className={`text-center py-20 opacity-60 text-sm ${textPrimary}`}>
                    Nenhuma publicação encontrada.
                  </div>
                ) : (
                  user.chronicles.map(ch => (
                    <Chronicle key={ch.id} item={ch} color={c} isLight={isLight} onClick={onPostClick} />
                  ))
                )}
              </div>
           </div>
           
        </div>
      </div>
    </div>
  );
}
