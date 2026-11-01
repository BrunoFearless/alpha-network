'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LazerProfileView } from '../profile/LazerProfileView';
import { LazerUserProfile, DEMO_USER } from '../profile/types';
import { ThemeBg } from '../profile/ThemeBg';
import { useAuthStore } from '@/store/auth.store';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onPostClick?: (postId: string) => void;
  onChatClick?: (userId: string) => void;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  myBgImageUrl?: string | null;
}

export function UserProfileModal({
  userId,
  onClose,
  onPostClick,
  onChatClick,
  themeColor = '#e879f9',
  themeMode = 'dark',
  myBgImageUrl,
}: UserProfileModalProps) {
  const { accessToken, user: authUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);

  // Wallpaper to use: user's own wallpaper
  const authProfile = authUser?.profile as any;
  const finalMyBg = myBgImageUrl !== undefined ? myBgImageUrl : (authProfile?.lazerData?.bgImageUrl || null);

  useEffect(() => {
    if (!userId) {
      setUserData(null);
      setUserPosts([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    Promise.all([
      fetch(`${apiUrl}/api/v1/users/id/${userId}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
      fetch(`${apiUrl}/api/v1/lazer/users/${userId}/posts`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ])
      .then(([userRes, postsRes]) => {
        if (!isMounted) return;
        if (userRes) {
          setUserData(userRes.data || userRes);
        }
        if (postsRes) {
          setUserPosts(postsRes.data || postsRes || []);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar perfil do utilizador:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, accessToken]);

  // Fechar com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const profileData = useMemo<LazerUserProfile | null>(() => {
    if (!userData) return null;
    const p = userData.profile || (userData as any);
    const laz = p.lazerData || {};
    return {
      userId: userData.id || userId || '',
      displayName: p.displayName || p.username || 'Utilizador',
      username: p.username || 'unknown',
      status: p.status || '',
      bio: p.bio || '',
      avatarUrl: p.avatarUrl || null,
      bannerUrl: p.bannerUrl || null,
      listening: laz.listening || '',
      stats: laz.stats || DEMO_USER.stats,
      primaryAction: 'Adicionar Amigo',
      quickActions: laz.quickActions || ['Match', 'Message', 'Battle', 'Trade'],
      communities: laz.communities || [],
      sectionLabel: laz.sectionLabel || 'COLEÇÃO',
      relics: laz.relics || ['🗡️', '🛡️'],
      nameFont: p.nameFont || 'default',
      nameEffect: p.nameEffect || 'none',
      nameColor: p.nameColor || '#e879f9',
      themeColor: laz.themeColor || p.nameColor || themeColor,
      themeMode: themeMode,
      bannerColor: p.bannerColor,
      spotifyEnabled: p.spotifyEnabled || false,
      lastPlayedTrack: p.lastPlayedTrack || null,
      foregroundUrl: laz.personaUrl || null,
      bgImageUrl: laz.bgImageUrl || null,
      aiAssistant: userData.user?.alphaAI?.isActive ? {
        name: userData.user.alphaAI.name,
        botname: userData.user.alphaAI.botname,
        avatarUrl: userData.user.alphaAI.avatarUrl,
        themeColor: userData.user.alphaAI.bannerColor || '#a78bfa',
      } : undefined,
      chronicles: userPosts.map((post: any, idx: number) => {
        let img = post.imageUrl ?? null;
        if (typeof img === 'string' && img.startsWith('[')) {
          try { img = JSON.parse(img); } catch { /* ignore */ }
        }
        return { id: post.id, side: idx % 2 === 0 ? 'left' : 'right', title: post.tag || '', quote: post.content, img };
      }),
    };
  }, [userData, userPosts, userId, themeColor, themeMode]);

  if (!userId) return null;

  const activeColor = profileData?.themeColor || themeColor;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* ── Background: O MESMO FUNDO QUE O MEU, MAS COM AS CORES DA OUTRA PESSOA (SEM ESCURECIMENTO) ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-none md:rounded-[3rem]">
        <ThemeBg
          color={activeColor}
          mode={themeMode}
          bgImageUrl={finalMyBg}
        />
      </div>

      {loading ? (
        <div className="w-full flex-1 flex flex-col items-center justify-center gap-4 py-20 rounded-none md:rounded-[3rem] border-0 md:border md:border-white/[0.08] glass-panel-dark relative z-10">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${activeColor} transparent ${activeColor} ${activeColor}` }}
          />
          <p className="text-xs font-black uppercase tracking-widest text-white/60">A carregar perfil...</p>
        </div>
      ) : !profileData ? (
        <div className="w-full flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center rounded-none md:rounded-[3rem] border-0 md:border md:border-white/[0.08] glass-panel-dark relative z-10">
          <p className="text-sm font-bold text-white/80">Não foi possível carregar o perfil deste utilizador.</p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white cursor-pointer"
            style={{ background: activeColor }}
          >
            Voltar
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex-1 min-h-0 relative z-10 flex">
          <LazerProfileView
            user={profileData}
            isOwnProfile={false}
            viewingUserId={userId}
            customPosts={userPosts}
            onClose={onClose}
            onPostClick={onPostClick}
            onChatClick={onChatClick}
          />
        </div>
      )}
    </div>
  );
}
