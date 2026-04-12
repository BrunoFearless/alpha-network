'use client';
import Link from 'next/link';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';

interface NavbarProps {
  user?: { 
    id: string; 
    profile?: { 
      username: string; 
      displayName?: string | null; 
      avatarUrl?: string | null;
      nameFont?: string | null;
      nameEffect?: string | null;
      nameColor?: string | null;
    } | null 
  } | null;
  onLogout?: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <nav className="h-14 bg-black flex items-center px-6 gap-4 sticky top-0 z-40">
      {/* Logo */}
      <Link href="/main" className="font-display text-gold text-lg tracking-widest hover:text-gold-light transition-colors">
        ALPHA
        <span className="text-text-muted text-xs ml-1 tracking-normal font-sans">network</span>
      </Link>

      <div className="flex-1" />

      {/* Utilizador */}
      {user?.profile && (
        <div className="flex items-center gap-3">
          <DisplayName 
            profile={user.profile} 
            fallbackName={user.profile.username} 
            className="text-sm hidden sm:block" 
          />
          <Avatar
            src={user.profile.avatarUrl}
            name={user.profile.displayName || user.profile.username}
            size="sm"
          />
          <button
            onClick={onLogout}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}
