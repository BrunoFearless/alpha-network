'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { LazerProfileView } from './components/profile/LazerProfileView';
import { LazerProfileEditor } from './components/profile/LazerProfileEditor';
import { DEMO_USER, LazerUserProfile } from './components/profile/types';
import { ThemeBg } from './components/profile/ThemeBg';
import { LazerHomeView } from './components/home/LazerHomeView';
import { ExploreModal } from './components/modals/ExploreModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { FriendsModal } from './components/modals/FriendsModal';
import { CommunityModal } from './components/modals/CommunityModal';
import { MessagesModal } from './components/modals/MessagesModal';
import { useAlphaCoreStore } from '@/store/useAlphaCoreStore';
import { AlphaCoreAvatar } from '@/components/alpha-core/AlphaCoreAvatar';
import AlphaCoreChat from '@/components/alpha-core/AlphaCoreChat';
import { LazerSidebar } from './components/layout/LazerSidebar';

type ActiveView = 'feed' | 'explore' | 'profile' | 'notifications' | 'friends' | 'community' | 'messages';

export default function LazerPage() {
  const { user: authUser, accessToken, updateUserProfile } = useAuthStore();
  const [activeView, setActiveView] = useState<ActiveView>('feed');
  const { isOpen: isChatOpen, openChat, status: alphaStatus } = useAlphaCoreStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [autoOpenPostId, setAutoOpenPostId] = useState<string | null>(null);
  // Track when notifications were last "seen" — stops pulsing when panel is open
  const [notifsSeen, setNotifsSeen] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);

  const navigateToCommunity = (id?: string) => {
    setCommunityId(id || null);
    setActiveView('community');
  };

  const { userPosts, feedPosts, fetchFeed, fetchUserPosts, fetchFriends, friendRequests } = useLazerStore();

  // Detect Spotify callback success and refresh user session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify') === 'success') {
      // Remove param from URL without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // Refresh user data so spotifyEnabled is up to date
      const { refresh } = useAuthStore.getState();
      refresh().then(() => {
        // Navigate to profile so the SpotifyCard appears immediately
        setActiveView('profile');
      });
    }
  }, []);

  // Handle external links (e.g. from Alpha Core)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const userId = params.get('userId');
    const postId = params.get('post');
    const communityId = params.get('community');

    if (view === 'profile' && userId) {
      navigateToProfile(userId);
    } else if (postId) {
      navigateToPost(postId);
    } else if (communityId) {
      navigateToCommunity(communityId);
    }
  }, []);

  useEffect(() => { fetchFeed(); fetchFriends(); }, []);

  useEffect(() => {
    if (activeView === 'profile') {
      fetchUserPosts(viewingUser?.id || authUser?.id || '');
    }
    // Mark notifs as seen when panel opens
    if (activeView === 'notifications') {
      setNotifsSeen(true);
    } else {
      setNotifsSeen(false);
    }
  }, [activeView, viewingUser?.id, authUser?.id]);

  const navigateToProfile = async (userId: string) => {
    if (userId === authUser?.id) {
      setViewingUser(null);
      setActiveView('profile');
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
        setActiveView('profile');
      }
    } catch (e) { console.error('navigateToProfile error', e); }
  };

  const navigateToPost = (postId: string) => {
    setAutoOpenPostId(postId);
    setActiveView('feed');
  };

  const myProfileData = useMemo<LazerUserProfile>(() => {
    if (!authUser) return DEMO_USER;
    const p = authUser.profile || ((authUser as any).username ? authUser : {}) as any;
    const laz = p.lazerData || {};
    return {
      userId: authUser.id || '',
      displayName: p.displayName || authUser.email?.split('@')[0] || p.username,
      username: p.username || 'unknown',
      status: p.status || '', bio: p.bio || '',
      avatarUrl: p.avatarUrl || null, bannerUrl: p.bannerUrl || null,
      listening: laz.listening || '', stats: laz.stats || DEMO_USER.stats,
      primaryAction: 'Editar Perfil',
      quickActions: laz.quickActions || ['Match', 'Message', 'Battle', 'Trade'],
      communities: laz.communities || [],
      sectionLabel: laz.sectionLabel || 'A MINHA COLEÇÃO',
      relics: laz.relics || ['🗡️', '🛡️'],
      nameFont: p.nameFont || 'default', nameEffect: p.nameEffect || 'none', nameColor: p.nameColor || '#e879f9',
      themeColor: laz.themeColor || '#e879f9', themeMode: laz.themeMode || 'dark',
      bannerColor: p.bannerColor, chronicles: [],
      spotifyEnabled: p.spotifyEnabled || false,
      lastPlayedTrack: p.lastPlayedTrack || null,
      aiAssistant: authUser.alphaAI?.isActive ? {
        name: authUser.alphaAI.name,
        botname: authUser.alphaAI.botname,
        avatarUrl: authUser.alphaAI.avatarUrl,
        themeColor: authUser.alphaAI.bannerColor || '#a78bfa',
      } : undefined,
    };
  }, [authUser]);

  const viewingProfileData = useMemo<LazerUserProfile>(() => {
    if (!viewingUser) {
      return {
        ...myProfileData,
        chronicles: userPosts.map((post: any, idx: number) => ({
          id: post.id, side: idx % 2 === 0 ? 'left' : 'right',
          title: post.tag || '', quote: post.content,
          img: post.imageUrl || null, // null → elegant placeholder in ProfileView
        })),
      };
    }
    const p = viewingUser.profile || viewingUser as any;
    const laz = p.lazerData || {};
    return {
      userId: viewingUser.id || '',
      displayName: p.displayName || p.username || 'Utilizador',
      username: p.username || 'unknown',
      status: p.status || '', bio: p.bio || '',
      avatarUrl: p.avatarUrl || null, bannerUrl: p.bannerUrl || null,
      listening: laz.listening || '', stats: laz.stats || DEMO_USER.stats,
      primaryAction: 'Adicionar Amigo',
      quickActions: laz.quickActions || ['Match', 'Message', 'Battle', 'Trade'],
      communities: laz.communities || [], sectionLabel: laz.sectionLabel || 'COLEÇÃO',
      relics: laz.relics || ['🗡️', '🛡️'],
      nameFont: p.nameFont || 'default', nameEffect: p.nameEffect || 'none', nameColor: p.nameColor || '#e879f9',
      themeColor: laz.themeColor || p.nameColor || '#e879f9',
      themeMode: myProfileData.themeMode,
      bannerColor: p.bannerColor,
      spotifyEnabled: p.spotifyEnabled || false,
      lastPlayedTrack: p.lastPlayedTrack || null,
      aiAssistant: viewingUser.user?.alphaAI?.isActive ? {
        name: viewingUser.user.alphaAI.name,
        botname: viewingUser.user.alphaAI.botname,
        avatarUrl: viewingUser.user.alphaAI.avatarUrl,
        themeColor: viewingUser.user.alphaAI.bannerColor || '#a78bfa',
      } : undefined,
      chronicles: userPosts.map((post: any, idx: number) => ({
        id: post.id, side: idx % 2 === 0 ? 'left' : 'right',
        title: post.tag || '', quote: post.content,
        img: post.imageUrl || null,
      })),
    };
  }, [viewingUser, userPosts, myProfileData]);

  async function handleSaveProfile(newUser: LazerUserProfile, files: { avatar: File | null; banner: File | null; bgImage: File | null }) {
    setIsSaving(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let avatarUrl = newUser.avatarUrl, bannerUrl = newUser.bannerUrl, bgImageUrl = newUser.bgImageUrl;
    try {
      if (files.avatar) {
        const fd = new FormData(); fd.append('file', files.avatar);
        const res = await fetch(`${apiUrl}/api/v1/users/me/avatar`, {
          method: 'POST', headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: fd,
        });
        if (res.ok) { const j = await res.json(); avatarUrl = j.data?.url || j.data?.avatarUrl; }
      }
      if (files.banner) {
        const fd = new FormData(); fd.append('file', files.banner);
        const res = await fetch(`${apiUrl}/api/v1/users/me/banner`, {
          method: 'POST', headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: fd,
        });
        if (res.ok) { const j = await res.json(); bannerUrl = j.data?.url || j.data?.bannerUrl; }
      }
      if (files.bgImage) {
        const fd = new FormData(); fd.append('file', files.bgImage);
        const res = await fetch(`${apiUrl}/api/v1/users/me/banner`, {
          method: 'POST', headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: fd,
        });
        if (res.ok) { const j = await res.json(); bgImageUrl = j.data?.url || j.data?.bannerUrl; }
      }
      const payload = {
        displayName: newUser.displayName, avatarUrl, bannerUrl, bannerColor: newUser.bannerColor,
        bio: newUser.bio, status: newUser.status, nameFont: newUser.nameFont,
        nameEffect: newUser.nameEffect, nameColor: newUser.nameColor,
        lazerData: {
          listening: newUser.listening, stats: newUser.stats,
          quickActions: newUser.quickActions, communities: newUser.communities,
          sectionLabel: newUser.sectionLabel, relics: newUser.relics,
          themeColor: newUser.themeColor, themeMode: newUser.themeMode,
          bgImageUrl,
        },
      };
      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        updateUserProfile(payload);
        setIsEditing(false);
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
      }
    } catch (e) { console.error('handleSaveProfile error', e); }
    finally { setIsSaving(false); }
  }

  // Always MY colors for bottom nav
  const c = myProfileData.themeColor || '#e879f9';
  const themeMode = myProfileData.themeMode || 'dark';
  const isLight = themeMode === 'light';

  // ── Notification counts ──────────────────────────────────────────────────
  const myId = authUser?.id;
  const pendingRequests = friendRequests.filter(r => r.toUserId === myId && r.status === 'pending').length;

  // Count reactions + comments on MY posts from the feed
  const myPosts = feedPosts.filter(p => p.authorId === myId);
  const notifFromPosts = myPosts.filter(p =>
    (p._count?.reactions || 0) > 0 || (p._count?.comments || 0) > 0
  ).length;

  const totalNotifs = pendingRequests + notifFromPosts;

  // Badge only appears if > 0 AND panel is not currently open (stops pulsing)
  const showNotifBadge = totalNotifs > 0 && activeView !== 'notifications' && !notifsSeen;
  const showFriendBadge = pendingRequests > 0 && activeView !== 'friends';

  // isOwnProfile — only true when viewing self
  const isOwnProfile = !viewingUser;

  return (
    <div className="w-full min-h-screen relative flex">
      <ThemeBg color={c} mode={themeMode} />
      {/* Sidebar Vertical (Estrutura) */}
      <LazerSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        themeColor={c}
        alphaStatus={alphaStatus}
        onAlphaClick={openChat}
        userAvatar={authUser?.profile?.avatarUrl}
        userName={authUser?.profile?.displayName || authUser?.profile?.username}
      />

      {/* Main Content Area com margem para a sidebar */}
      <div className="flex-1 ml-[120px] p-6 animate-in fade-in duration-300">
        {activeView === 'feed' && (
          <LazerHomeView
            user={myProfileData}
            onProfileClick={navigateToProfile}
            onCommunityClick={navigateToCommunity}
            initialPostId={autoOpenPostId}
            onPostOpened={() => setAutoOpenPostId(null)} />
        )}
        {activeView === 'profile' && (
          <LazerProfileView
            user={viewingProfileData}
            isOwnProfile={isOwnProfile}
            onEdit={isOwnProfile ? () => setIsEditing(true) : undefined}
            viewingUserId={viewingUser?.id}
            onPostClick={navigateToPost} />
        )}

        {/* Full-screen modals */}
        {activeView === 'explore' && (
          <ExploreModal onClose={() => setActiveView('feed')} onPostClick={navigateToPost}
            onCommunityClick={navigateToCommunity}
            onProfileClick={navigateToProfile} themeColor={c} themeMode={themeMode} />
        )}
        {activeView === 'notifications' && (
          <NotificationsModal onClose={() => setActiveView('feed')} onPostClick={navigateToPost}
            onProfileClick={navigateToProfile} themeColor={c} themeMode={themeMode} />
        )}
        {activeView === 'friends' && (
          <FriendsModal onClose={() => setActiveView('feed')}
            onProfileClick={navigateToProfile} themeColor={c} themeMode={themeMode} />
        )}
        {activeView === 'community' && (
          <CommunityModal onClose={() => setActiveView('feed')}
            themeColor={c} themeMode={themeMode}
            initialCommunityId={communityId}
            onProfileClick={navigateToProfile} />
        )}
        {activeView === 'messages' && (
          <MessagesModal onClose={() => setActiveView('feed')}
            themeColor={c} themeMode={themeMode} />
        )}

        {isEditing && (
          <LazerProfileEditor user={myProfileData} onClose={() => setIsEditing(false)} onSave={handleSaveProfile} />
        )}

        {showSavedMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 border-[3px] border-green-400 rounded-full font-bold shadow-[0_8px_32px_rgba(34,197,94,0.4)] z-[300]">
            ✓ Perfil guardado com sucesso!
          </div>
        )}
      </div>

      {/* Alpha Core Phase 3 Integration */}
      {isChatOpen && (
        <AlphaCoreChat 
          themeColor={c}
          themeMode={themeMode}
          currentMode="Lazer"
          floating={true}
          onClose={() => useAlphaCoreStore.getState().closeChat()}
        />
      )}
    </div>
  );
}
