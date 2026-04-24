'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { LazerProfileView } from './components/profile/LazerProfileView';
import { LazerProfileEditor } from './components/profile/LazerProfileEditor';
import { DEMO_USER, LazerUserProfile } from './components/profile/types';
import { LazerHomeView } from './components/home/LazerHomeView';
import { ExploreModal } from './components/modals/ExploreModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { FriendsModal } from './components/modals/FriendsModal';
import { CommunityModal } from './components/modals/CommunityModal';
import { useAlphaCoreStore } from '@/store/useAlphaCoreStore';
import { AlphaCoreAvatar } from '@/components/alpha-core/AlphaCoreAvatar';
import AlphaCoreChat from '@/components/alpha-core/AlphaCoreChat';

type ActiveView = 'feed' | 'explore' | 'profile' | 'notifications' | 'friends' | 'community';

export default function LazerPage() {
  const { user: authUser, accessToken, updateUserProfile } = useAuthStore();
  const [activeView, setActiveView] = useState<ActiveView>('feed');
  const { openChat, status: alphaStatus } = useAlphaCoreStore();
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
    };
  }, [authUser]);

  const viewingProfileData = useMemo<LazerUserProfile>(() => {
    if (!viewingUser) {
      return {
        ...myProfileData,
        chronicles: userPosts.map((post: any, idx: number) => ({
          id: post.id, side: idx % 2 === 0 ? 'left' : 'right',
          title: post.tag || 'Publicação', quote: post.content,
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
      chronicles: userPosts.map((post: any, idx: number) => ({
        id: post.id, side: idx % 2 === 0 ? 'left' : 'right',
        title: post.tag || 'Publicação', quote: post.content,
        img: post.imageUrl || null,
      })),
    };
  }, [viewingUser, userPosts, myProfileData]);

  async function handleSaveProfile(newUser: LazerUserProfile, files: { avatar: File | null; banner: File | null }) {
    setIsSaving(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let avatarUrl = newUser.avatarUrl, bannerUrl = newUser.bannerUrl;
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
      const payload = {
        displayName: newUser.displayName, avatarUrl, bannerUrl, bannerColor: newUser.bannerColor,
        bio: newUser.bio, status: newUser.status, nameFont: newUser.nameFont,
        nameEffect: newUser.nameEffect, nameColor: newUser.nameColor,
        lazerData: {
          listening: newUser.listening, stats: newUser.stats,
          quickActions: newUser.quickActions, communities: newUser.communities,
          sectionLabel: newUser.sectionLabel, relics: newUser.relics,
          themeColor: newUser.themeColor, themeMode: newUser.themeMode,
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

  const NavBtn = ({
    view, icon, badge, pulse: doPulse,
  }: {
    view: ActiveView; icon: React.ReactNode; badge?: number; pulse?: boolean;
  }) => {
    const isActive = activeView === view;
    return (
      <div className="relative">
        <button
          onClick={() => setActiveView(view)}
          className="cursor-pointer border-none flex items-center justify-center w-[44px] h-[44px] rounded-full transition-all"
          style={{
            backgroundColor: isActive ? `${c}33` : 'transparent',
            color: isActive ? c : (isLight ? '#888' : '#666'),
            boxShadow: isActive ? `inset 0 2px 8px ${c}20` : 'none',
          }}>
          {icon}
        </button>
        {/* Only render badge when badge is a real positive number */}
        {badge !== undefined && badge > 0 && (
          <div
            className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white px-1"
            style={{
              background: '#ef4444',
              animation: doPulse ? 'pulse 2s infinite' : 'none',
            }}>
            {badge > 9 ? '9+' : badge}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen relative">
      <div className="animate-in fade-in duration-300 pt-4">
        {activeView === 'feed' && (
          <LazerHomeView
            user={myProfileData}
            onProfileClick={navigateToProfile}
            onCommunityClick={navigateToCommunity}
            initialPostId={autoOpenPostId}
            onPostOpened={() => setAutoOpenPostId(null)} />
        )}
        {activeView === 'profile' && (
          <div className="-mt-[88px]">
            <LazerProfileView
              user={viewingProfileData}
              isOwnProfile={isOwnProfile}
              onEdit={isOwnProfile ? () => setIsEditing(true) : undefined}
              viewingUserId={viewingUser?.id}
              onPostClick={navigateToPost} />
          </div>
        )}
      </div>

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

      {isEditing && (
        <LazerProfileEditor user={myProfileData} onClose={() => setIsEditing(false)} onSave={handleSaveProfile} />
      )}

      {showSavedMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 border-[3px] border-green-400 rounded-full font-bold shadow-[0_8px_32px_rgba(34,197,94,0.4)] animate-in slide-in-from-bottom-5 duration-300 z-[300]">
          ✓ Perfil guardado com sucesso!
        </div>
      )}

      {/* Bottom Nav — ALWAYS uses MY theme colors, never changes */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 rounded-[32px] border-[1.5px]"
        style={{
          background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(14,14,20,0.85)',
          backdropFilter: 'blur(32px)',
          borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
        }}>

        {/* Home */}
        <NavBtn view="feed" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>} />

        {/* Explore */}
        <NavBtn view="explore" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>} />

        {/* Center Alpha Core button */}
        <button
          onClick={openChat}
          className="cursor-pointer border-none w-[52px] h-[52px] rounded-full flex items-center justify-center mx-1 hover:scale-[1.15] active:scale-95 transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${c}, ${c}88)`,
            boxShadow: `0 8px 32px ${c}60, inset 0 0 12px rgba(255,255,255,0.4)`,
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
          <AlphaCoreAvatar size={44} state={alphaStatus} themeColor="#fff" />
        </button>

        {/* Notifications — badge disappears & stops pulsing when open */}
        <NavBtn
          view="notifications"
          badge={showNotifBadge ? totalNotifs : 0}
          pulse={showNotifBadge}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>} />

        {/* Friends — badge only when pending */}
        <NavBtn
          view="friends"
          badge={showFriendBadge ? pendingRequests : 0}
          pulse={showFriendBadge}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>} />

        <div className="w-px h-6 mx-1" style={{ background: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }} />

        {/* Profile avatar */}
        <button
          onClick={() => { setViewingUser(null); setActiveView('profile'); }}
          className="cursor-pointer border-none flex items-center justify-center w-[44px] h-[44px] rounded-full transition-all overflow-hidden"
          style={{
            border: `2px solid ${activeView === 'profile' && !viewingUser ? c : 'transparent'}`,
            boxShadow: activeView === 'profile' && !viewingUser ? `0 0 0 2px ${c}40` : 'none',
          }}>
          {authUser?.profile?.avatarUrl
            ? <img src={authUser.profile.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
            : <div className="w-full h-full flex items-center justify-center text-sm font-bold rounded-full"
                style={{ background: `${c}30`, color: c }}>
                {(authUser?.profile?.displayName || authUser?.profile?.username || 'U')[0].toUpperCase()}
              </div>}
        </button>
      </div>

      {/* Alpha Core Phase 2 Integration */}
      <AlphaCoreChat 
        themeColor={c}
        themeMode={themeMode}
        currentMode="Lazer"
        floating={true}
        onClose={() => useAlphaCoreStore.getState().closeChat()}
      />
    </div>
  );
}