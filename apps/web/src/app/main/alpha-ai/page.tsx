'use client';

import { AlphaAIEditor } from '@/components/alpha-core/AlphaAIEditor';
import { useAuthStore } from '@/store/auth.store';

export default function AlphaAIPage() {
  const { user } = useAuthStore();
  const themeColor = (user as any)?.profile?.lazerData?.themeColor ?? '#a78bfa';
  const themeMode  = (user as any)?.profile?.lazerData?.themeMode  ?? 'dark';

  return (
    <div style={{ height: 'calc(100vh - 64px)' }}>
      <AlphaAIEditor
        themeColor={themeColor}
        themeMode={themeMode}
      />
    </div>
  );
}
