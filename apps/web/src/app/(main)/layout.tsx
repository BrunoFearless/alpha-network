'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, refresh, logout } = useAuthStore();
  const [ready, setReady] = useState(false);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const state = useAuthStore.getState();
    if (state.isAuthenticated && state.user) {
      setReady(true);
      return;
    }
    refresh().then(ok => {
      if (!ok) router.push('/auth/login');
      else setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-alpha-bg flex items-center justify-center">
        <Spinner size="lg" className="text-gold" />
      </div>
    );
  }

  const activeModes = user?.profile?.activeModes ?? [];

  return (
    <div className="min-h-screen bg-alpha-bg flex flex-col">
      <Navbar user={user} onLogout={logout} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeModes={activeModes} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
