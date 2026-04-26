'use client';

import { X } from 'lucide-react';
import MessagesModule from '@/components/chat/MessagesModule';
import { ThemeBg } from '../profile/ThemeBg';

interface MessagesModalProps {
  onClose: () => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

export function MessagesModal({ onClose, themeColor, themeMode }: MessagesModalProps) {
  const isLight = themeMode === 'light';

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-black animate-in fade-in duration-300">
      {/* Background with theme colors */}
      <ThemeBg color={themeColor} mode={themeMode} />
      
      {/* Header Bar */}
      <div className={`relative z-10 flex items-center justify-between px-6 py-4 border-b ${
        isLight ? 'border-black/5 bg-white/40' : 'border-white/5 bg-black/40'
      } backdrop-blur-xl shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg" style={{ background: themeColor }}>
            💬
          </div>
          <div>
            <h2 className={`text-lg font-black tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>Mensagens</h2>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-black/40' : 'text-white/40'}`}>Alpha Network Chat</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className={`p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
            isLight ? 'bg-black/5 hover:bg-black/10 text-black' : 'bg-white/5 hover:bg-white/10 text-white'
          }`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <MessagesModule themeColor={themeColor} themeMode={themeMode} />
      </div>
    </div>
  );
}
