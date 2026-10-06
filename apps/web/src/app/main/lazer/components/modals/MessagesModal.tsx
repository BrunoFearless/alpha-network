'use client';

import { LazerShell } from '../layout/LazerShell';
import MessagesModule from '@/components/chat/MessagesModule';

interface MessagesModalProps {
  onClose: () => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
  onMobileViewChange?: (mode: 'list' | 'chat') => void;
}

export function MessagesModal({ onClose, themeColor, themeMode, onMobileViewChange }: MessagesModalProps) {
  return (
    <LazerShell variant="full" themeMode={themeMode}>
      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col relative z-20 min-h-0">
        <MessagesModule themeColor={themeColor} themeMode={themeMode} onMobileViewChange={onMobileViewChange} />
      </div>
    </LazerShell>
  );
}
