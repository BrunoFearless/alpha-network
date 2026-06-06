'use client';

import MessagesModule from '@/components/chat/MessagesModule';

interface MessagesModalProps {
  onClose: () => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
  onMobileViewChange?: (mode: 'list' | 'chat') => void;
}

export function MessagesModal({ onClose, themeColor, themeMode, onMobileViewChange }: MessagesModalProps) {
  const isLight = themeMode === 'light';

  return (
    <div className="w-full h-[100dvh] md:h-[calc(100vh-40px)] flex flex-col overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500">
      {/* Main Glass Foreground */}
      <div className={`flex-1 border-0 md:border-[1.5px] rounded-none md:rounded-[3rem] flex flex-col overflow-hidden relative z-10 ${isLight ? 'glass-panel-light' : 'glass-panel-dark'} min-h-0`}
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col relative z-20 min-h-0">
          <MessagesModule themeColor={themeColor} themeMode={themeMode} onMobileViewChange={onMobileViewChange} />
        </div>
      </div>
    </div>
  );
}
