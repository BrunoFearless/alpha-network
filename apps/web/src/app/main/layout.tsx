'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, refresh, logout } = useAuthStore();
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
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop: sidebar oculto até hover no canto esquerdo; mobile: sempre visível */}
        <div className="group relative flex-shrink-0 w-56 max-md:w-56 md:w-0 md:self-stretch min-h-0">
          <div className="hidden md:block absolute inset-y-0 left-0 w-5 z-[100] bg-transparent" aria-hidden />
          <div
            className={[
              'flex flex-col min-h-0 h-full overflow-hidden bg-alpha-surface border-alpha-border',
              'max-md:relative max-md:w-56 max-md:border-r max-md:translate-x-0',
              'md:absolute md:inset-y-0 md:left-0 md:w-56 md:border-r md:shadow-[4px_0_28px_rgba(0,0,0,0.45)]',
              'md:-translate-x-full md:transition-transform md:duration-200 md:ease-out',
              'md:group-hover:translate-x-0',
            ].join(' ')}
          >
            <Sidebar activeModes={activeModes} />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}