'use client';

import React, { useEffect, useState } from 'react';
import { PublicAIProfile } from './AlphaAIProfile';
import { AlphaCoreAvatar } from './AlphaCoreAvatar';

interface AlphaAIProfileModalProps {
  botname: string;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
  onChat?: (botname: string) => void;
  // If the currently logged in user is the owner, they can chat.
  isOwner?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function AlphaAIProfileModal({
  botname,
  themeMode = 'dark',
  onClose,
  onChat,
  isOwner,
}: AlphaAIProfileModalProps) {
  const [ai, setAi] = useState<PublicAIProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (window as any).__ALPHA_TOKEN__ : '';
    fetch(`${API}/api/v1/alpha/ai/${botname}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.json())
      .then(d => setAi(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [botname]);

  const isLight = themeMode === 'light';

  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center backdrop-blur-md bg-black/40">
        <div className="text-white">A carregar perfil da IA...</div>
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center backdrop-blur-md bg-black/60" onClick={onClose}>
        <div className="bg-[#1e1e2e] p-6 rounded-2xl border border-white/10 text-white shadow-2xl max-w-sm text-center">
          <h3>IA não encontrada.</h3>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">Fechar</button>
        </div>
      </div>
    );
  }

  const c = ai.bannerColor || '#a78bfa';
  const textPrimary = isLight ? "text-gray-900" : "text-gray-100";
  const textSecondary = isLight ? "text-gray-500" : "text-gray-400";
  const cardBg = isLight ? "bg-white/70" : "bg-black/40";
  const borderCol = isLight ? `${c}40` : `${c}20`;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className={`relative w-full max-w-lg ${cardBg} backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-2xl border-[1.5px]`}
        style={{ borderColor: borderCol }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/50 transition-colors"
        >
          ✕
        </button>

        {/* Banner */}
        <div 
          className="h-[140px] relative bg-cover bg-center w-full"
          style={{ 
            backgroundImage: ai.bannerUrl ? `url('${ai.bannerUrl}')` : `linear-gradient(135deg, ${c}80, ${c}20)` 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Profile Content */}
        <div className="px-6 pb-8">
          <div className="-mt-14 mb-4 relative flex justify-center">
             <div className="rounded-full border-[4px] border-alpha-bg bg-[#1e1e2e] relative flex items-center justify-center shrink-0 w-[100px] h-[100px]" style={{ borderColor: c }}>
               {ai.avatarUrl ? (
                 <img src={ai.avatarUrl} alt={ai.name} className="w-full h-full object-cover rounded-full" />
               ) : (
                 <AlphaCoreAvatar size={90} state="idle" themeColor={c} />
               )}
             </div>
             {/* IA Badge */}
             <div className="absolute -bottom-2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-alpha-bg" style={{ background: c, color: '#fff' }}>
               IA
             </div>
          </div>

          <div className="text-center">
            <h2 className={`m-0 text-2xl font-bold flex items-center justify-center gap-2 ${textPrimary}`}>
              {ai.name}
            </h2>
            <div className={`text-sm mt-1 mb-4 ${textSecondary}`}>
              @{ai.botname}
            </div>

            {ai.tagline && (
              <p className={`text-[15px] italic font-medium opacity-90 mb-4 px-4 leading-relaxed`} style={{ color: c }}>
                "{ai.tagline}"
              </p>
            )}

            {ai.bio && (
              <p className={`text-sm leading-relaxed mb-6 opacity-80 ${textPrimary}`}>
                {ai.bio}
              </p>
            )}

            {ai.personalityTraits?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {ai.personalityTraits.map(t => (
                  <span key={t} className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border" style={{ background: `${c}15`, color: c, borderColor: `${c}30` }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Creator Section */}
            {ai.user?.profile && (
              <div className="mt-6 pt-6 border-t border-dashed flex flex-col items-center gap-3" style={{ borderColor: borderCol }}>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary}`}>Assistente de</span>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                  <img src={(ai.user.profile as any).avatarUrl || `https://ui-avatars.com/api/?name=${ai.user.profile.displayName || ai.user.profile.username}&background=random`} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div className="text-left">
                    <div className={`text-sm font-bold ${textPrimary}`}>{ai.user.profile.displayName || ai.user.profile.username}</div>
                    <div className={`text-[11px] ${textSecondary}`}>@{ai.user.profile.username}</div>
                  </div>
                </div>
              </div>
            )}

            {isOwner && onChat && (
              <button 
                onClick={() => onChat(ai.botname)}
                className="mt-6 w-full text-white border-none rounded-full py-3.5 font-bold text-sm cursor-pointer transition-transform hover:scale-[1.02] shadow-xl"
                style={{ backgroundColor: c, boxShadow: `0 8px 30px ${c}50` }}
              >
                💬 Conversar com {ai.name}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
