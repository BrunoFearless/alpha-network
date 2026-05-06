'use client';

import React from 'react';
import { LazerUserProfile } from './types';
import { useState } from 'react';
import { AlphaAIProfileModal } from '@/components/alpha-core/AlphaAIProfileModal';
import { ThemeBg } from './ThemeBg';

interface ProfileViewProps {
  user: LazerUserProfile;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onPostClick?: (postId: string) => void;
  viewingUserId?: string;
}

export function LazerProfileView({ user, isOwnProfile, onEdit, onPostClick, viewingUserId }: ProfileViewProps) {
  const [showAiModal, setShowAiModal] = useState(false);
  const c = user.themeColor || '#e879f9';
  const mode = user.themeMode || 'dark';
   const isLight = user?.themeMode === 'light';
  const cardBg = isLight ? 'glass-panel-light' : 'glass-panel-dark';
  const borderCol = 'transparent';
  const textPrimary = isLight ? 'text-[#111]' : 'text-[#fff]';
  const textSecondary = isLight ? 'text-[#666]' : 'text-[#888]';
  
  return (
    <div className=" h-full flex flex-col overflow-hidden pl-0 pr-4 py-4 lg:-ml-12 lg:pr-8">
      
      {/* Background Glows */}
      <ThemeBg color={c} mode={mode} bgImageUrl={user.bgImageUrl} />

      {/* Main Foreground Container (Ultra Clean Glass) */}
      <div className={`flex-1 border-[1.5px] rounded-[3rem] flex flex-col overflow-hidden relative animate-in fade-in duration-700 z-10 ${cardBg}`}
           style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        
        {/* Botão de Edição Temporário */}
        {onEdit && (
          <button 
            onClick={onEdit} 
            className="absolute top-8 right-8 px-6 py-2.5 bg-white/5 backdrop-blur-xl rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all cursor-pointer z-50 shadow-2xl"
          >
            Editar Perfil
          </button>
        )}

        {/* O conteúdo do perfil será construído aqui dentro */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <div className="flex flex-col items-center gap-4">
             <div className="w-20 h-20 rounded-full bg-white/5 border border-white/5 flex items-center justify-center animate-pulse">
                <span className="text-3xl opacity-10">✦</span>
             </div>
             <span className="text-white/10 font-black text-xl uppercase tracking-[1em] ml-[1em]">Liquid Alpha</span>
             <p className="text-white/5 font-bold text-[10px] uppercase tracking-[0.5em]">Transparência Máxima</p>
          </div>
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
