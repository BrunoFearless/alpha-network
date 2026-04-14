'use client';
import { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

import { useLazerStore } from '@/store/lazer.store';
import { LazerProfileView } from './components/profile/LazerProfileView';
import { LazerProfileEditor } from './components/profile/LazerProfileEditor';
import { DEMO_USER, LazerUserProfile } from './components/profile/types';
import { LazerHomeView } from './components/home/LazerHomeView';

export default function LazerPage() {
  const { user: authUser, accessToken, updateUserProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [autoOpenPostId, setAutoOpenPostId] = useState<string | null>(null);

  const { userPosts, fetchFeed, fetchUserPosts } = useLazerStore();

  // Switch between self and other user profile
  const currentProfileUser = useMemo(() => {
    return viewingUser || authUser;
  }, [viewingUser, authUser]);

  useEffect(() => {
    if (activeTab === 'feed') fetchFeed();
    if (activeTab === 'profile' && currentProfileUser?.id) {
      fetchUserPosts(currentProfileUser.id);
    }
  }, [activeTab, currentProfileUser?.id, fetchFeed, fetchUserPosts]);

  const navigateToProfile = async (userId: string) => {
    if (userId === authUser?.id) {
      setViewingUser(null);
      setActiveTab('profile');
      return;
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/v1/users/id/${userId}`, {
        headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }
      });
      if (res.ok) {
        const json = await res.json();
        setViewingUser(json.data);
        setActiveTab('profile');
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e);
    }
  };

  const navigateToPost = (postId: string) => {
    setAutoOpenPostId(postId);
    setActiveTab('feed');
  };

  // 1. Dados do utilizador logado (para a sidebar e feed)
  const myProfileData = useMemo<LazerUserProfile>(() => {
    if (!authUser) return DEMO_USER;
    const p = authUser.profile || ((authUser as any).username ? authUser : {}) as any;
    const laz = p.lazerData || {};
    
    return {
      displayName: p.displayName || authUser.email?.split('@')[0] || p.username,
      username: p.username || 'unknown',
      status: p.status || '',
      bio: p.bio || '',
      avatarUrl: p.avatarUrl || null,
      bannerUrl: p.bannerUrl || null,
      listening: laz.listening || '',
      stats: laz.stats || DEMO_USER.stats,
      primaryAction: "Edit Profile",
      quickActions: laz.quickActions || ["Match", "Message", "Battle", "Trade"],
      communities: laz.communities || [],
      sectionLabel: laz.sectionLabel || "A MINHA COLEÇÃO",
      relics: laz.relics || ["🗡️", "🛡️"],
      nameFont: p.nameFont || 'default',
      nameEffect: p.nameEffect || 'none',
      nameColor: p.nameColor || '#e879f9',
      themeColor: laz.themeColor || '#e879f9',
      themeMode: laz.themeMode || 'dark',
      bannerColor: p.bannerColor,
      chronicles: [], // Unused for sidebar
    };
  }, [authUser]);

  // 2. Dados do perfil que estamos a visitar (pode ser o nosso ou de outro)
  const viewingProfileData = useMemo<LazerUserProfile>(() => {
    const p = currentProfileUser?.profile || ((currentProfileUser as any)?.username ? currentProfileUser : {}) as any;
    if (!p || !currentProfileUser) return myProfileData;
    const laz = p.lazerData || {};
    
    return {
      displayName: p.displayName || currentProfileUser.email?.split('@')[0] || p.username,
      username: p.username || 'unknown',
      status: p.status || '',
      bio: p.bio || '',
      avatarUrl: p.avatarUrl || null,
      bannerUrl: p.bannerUrl || null,
      listening: laz.listening || '',
      stats: laz.stats || DEMO_USER.stats,
      primaryAction: laz.primaryAction || (currentProfileUser.id === authUser?.id ? "Edit Profile" : "Add Friend"),
      quickActions: laz.quickActions || ["Match", "Message", "Battle", "Trade"],
      communities: laz.communities || [],
      sectionLabel: laz.sectionLabel || "A MINHA COLEÇÃO",
      relics: laz.relics || ["🗡️", "🛡️"],
      nameFont: p.nameFont || 'default',
      nameEffect: p.nameEffect || 'none',
      nameColor: p.nameColor || '#e879f9',
      themeColor: laz.themeColor || '#e879f9',
      themeMode: myProfileData.themeMode,
      bannerColor: p.bannerColor,
      chronicles: userPosts.map((post: any, idx: number) => ({
        id: post.id,
        side: idx % 2 === 0 ? "left" : "right",
        title: post.tag || "Publicação",
        quote: post.content,
        img: post.imageUrl || `https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&q=80`
      })),
    };
  }, [currentProfileUser, userPosts, authUser?.id, myProfileData]);

  async function handleSaveProfile(newUser: LazerUserProfile, files: { avatar: File | null; banner: File | null }) {
    setIsSaving(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let currentAvatarUrl = newUser.avatarUrl;
    let currentBannerUrl = newUser.bannerUrl;

    try {
      // 1. Upload Avatar if it's a new file
      if (files.avatar) {
        const formData = new FormData();
        formData.append('file', files.avatar);
        const res = await fetch(`${apiUrl}/api/v1/users/me/avatar`, {
          method: 'POST',
          headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
          body: formData
        });
        if (res.ok) {
          const json = await res.json();
          currentAvatarUrl = json.data.url;
        }
      }

      // 2. Upload Banner if it's a new file
      if (files.banner) {
        const formData = new FormData();
        formData.append('file', files.banner);
        const res = await fetch(`${apiUrl}/api/v1/users/me/banner`, {
          method: 'POST',
          headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
          body: formData
        });
        if (res.ok) {
          const json = await res.json();
          currentBannerUrl = json.data.url;
        }
      }

      const payload = {
        displayName: newUser.displayName,
        avatarUrl: currentAvatarUrl,
        bannerUrl: currentBannerUrl,
        bannerColor: newUser.bannerColor,
        bio: newUser.bio,
        status: newUser.status,
        nameFont: newUser.nameFont,
        nameEffect: newUser.nameEffect,
        nameColor: newUser.nameColor,
        lazerData: {
          listening: newUser.listening,
          stats: newUser.stats,
          primaryAction: newUser.primaryAction,
          quickActions: newUser.quickActions,
          communities: newUser.communities,
          sectionLabel: newUser.sectionLabel,
          relics: newUser.relics,
          themeColor: newUser.themeColor,
          themeMode: newUser.themeMode,
        }
      };

      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        updateUserProfile(payload);
        setIsEditing(false);
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setIsSaving(false);
    }
  }

  const viewerColor = myProfileData.themeColor || '#e879f9';
  const c = viewingProfileData.themeColor || '#e879f9';

  const resetToMeProfile = () => {
    setViewingUser(null);
    setActiveTab('profile');
    setAutoOpenPostId(null);
  };

  return (
    <div className="w-full min-h-screen relative">
      {/* Header global overlay - Hidden as requested */}
      <div className={`hidden flex items-center justify-between mb-2 max-w-[1400px] mx-auto px-6 pt-6 relative z-50 pointer-events-none`}>
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5">
             <h1 className="font-display text-xl text-white tracking-wide m-0">🎮 Lazer</h1>
             <Badge variant="green">Beta</Badge>
          </div>
        </div>
        <div className="flex gap-1.5 bg-alpha-bg/90 backdrop-blur-md border border-alpha-border p-1 rounded-lg pointer-events-auto shadow-lg">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${activeTab === 'feed' ? 'bg-gold/20 text-gold shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
          >
            Feed Geral
          </button>
          <button 
            onClick={resetToMeProfile}
            className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${activeTab === 'profile' && !viewingUser ? 'bg-gold/20 text-gold shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
          >
            O Meu Perfil
          </button>
        </div>
      </div>

      {activeTab === 'feed' && (
        <div className="animate-in fade-in duration-300 pt-4">
          <LazerHomeView 
            user={myProfileData} 
            onProfileClick={navigateToProfile} 
            initialPostId={autoOpenPostId || undefined}
            onPostOpened={() => setAutoOpenPostId(null)}
          />
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="animate-in fade-in duration-300 -mt-[88px]">
          <LazerProfileView 
            user={viewingProfileData} 
            onEdit={() => setIsEditing(true)} 
            onPostClick={navigateToPost}
          />
        </div>
      )}

      {isEditing && (
        <LazerProfileEditor 
           user={myProfileData} 
           onClose={() => setIsEditing(false)} 
           onSave={handleSaveProfile} 
        />
      )}

      {showSavedMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 border-[3px] border-green-400 rounded-full font-bold shadow-[0_8px_32px_rgba(34,197,94,0.4)] animate-in slide-in-from-bottom-5 duration-300 z-50">
          ✓ Perfil guardado com sucesso!
        </div>
      )}

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 rounded-[32px] bg-white/20 dark:bg-[#1a1a24]/30 backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.2)] border-[1.5px] border-white/40 dark:border-white/[0.03] transition-colors">
        <button 
          onClick={() => setActiveTab('feed')} 
          className="cursor-pointer border-none flex items-center justify-center w-[44px] h-[44px] rounded-full transition-all"
          style={{ 
            backgroundColor: (activeTab === 'feed' || viewingUser !== null) ? `${viewerColor}33` : 'transparent',
            color: (activeTab === 'feed' || viewingUser !== null) ? viewerColor : undefined,
            boxShadow: (activeTab === 'feed' || viewingUser !== null) ? `inset 0 2px 8px ${viewerColor}20` : 'none'
          }}
        >
          <svg className={(activeTab !== 'feed' && viewingUser === null) ? 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors' : ''} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        </button>
        
        <button className="cursor-pointer border-none bg-transparent flex items-center justify-center w-[44px] h-[44px] rounded-full text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
        </button>
        
        <button className="cursor-pointer border-none w-[52px] h-[52px] rounded-full flex items-center justify-center text-white mx-1 hover:scale-[1.08] transition-transform border-[2px] border-white/20" style={{ background: `linear-gradient(135deg, ${viewerColor}ee, ${viewerColor})`, boxShadow: `0 8px 24px ${viewerColor}80` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" /></svg>
        </button>

        <button className="cursor-pointer border-none bg-transparent flex items-center justify-center w-[44px] h-[44px] rounded-full text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        
        <button 
          onClick={resetToMeProfile}
          className="cursor-pointer border-none flex items-center justify-center w-[44px] h-[44px] rounded-full transition-all"
          style={{ 
            backgroundColor: (activeTab === 'profile' && viewingUser === null) ? `${viewerColor}33` : 'transparent',
            color: (activeTab === 'profile' && viewingUser === null) ? viewerColor : undefined,
            boxShadow: (activeTab === 'profile' && viewingUser === null) ? `inset 0 2px 8px ${viewerColor}20` : 'none'
          }}
        >
          <svg className={(activeTab !== 'profile' || viewingUser !== null) ? 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors' : ''} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </button>

        <div className="w-[1px] h-[24px] bg-gray-400/30 mx-1"></div>

        <button 
          onClick={() => setIsEditing(true)}
          className="cursor-pointer border-[1.5px] border-white/20 dark:border-white/10 flex items-center justify-center w-[44px] h-[44px] rounded-full transition-all bg-black/5 dark:bg-white/5 text-gray-600 hover:bg-black/10 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white dark:hover:bg-white/10"
          title="Editar Perfil"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
      </div>
    </div>
  );
}
