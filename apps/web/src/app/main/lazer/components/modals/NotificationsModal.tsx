'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';

interface NotificationsProps {
  onClose: () => void;
  onPostClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

type NotifTab = 'Todas' | 'Pedidos' | 'Reações' | 'Comentários';

const IconHeart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
const IconComment = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>;
const IconUserPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const IconActivity = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

export function NotificationsModal({ onClose, onPostClick, onProfileClick, themeColor: c, themeMode }: NotificationsProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts, friendRequests, acceptFriendRequest, rejectFriendRequest, fetchFriends } = useLazerStore();
  const [activeTab, setActiveTab] = useState<NotifTab>('Todas');

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const borderCol = isLight ? `${c}40` : `${c}18`;

  useEffect(() => { fetchFriends(); }, []);

  const myId = authUser?.id;

  // Friend requests received
  const pendingReceived = useMemo(() => friendRequests.filter(r => r.toUserId === myId && r.status === 'pending'), [friendRequests, myId]);

  // Reaction notifications
  const myPosts = useMemo(() => feedPosts.filter(p => p.authorId === myId), [feedPosts, myId]);
  const reactionNotifs = myPosts
    .filter(p => (p._count?.reactions || 0) > 0)
    .map(p => ({
      type: 'reaction' as const,
      id: `r-${p.id}`,
      postId: p.id,
      content: p.content,
      count: p._count?.reactions || 0,
      createdAt: p.createdAt,
    }));

  // Comment notifications
  const commentNotifs = myPosts
    .filter(p => (p._count?.comments || 0) > 0)
    .map(p => ({
      type: 'comment' as const,
      id: `c-${p.id}`,
      postId: p.id,
      content: p.content,
      count: p._count?.comments || 0,
      createdAt: p.createdAt,
    }));

  const allNotifs = [
    ...pendingReceived.map(r => ({ type: 'friend_request' as const, id: r.id, request: r, createdAt: r.createdAt })),
    ...reactionNotifs,
    ...commentNotifs,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = activeTab === 'Todas' ? allNotifs
    : activeTab === 'Pedidos' ? allNotifs.filter(n => n.type === 'friend_request')
    : activeTab === 'Reações' ? allNotifs.filter(n => n.type === 'reaction')
    : activeTab === 'Comentários' ? allNotifs.filter(n => n.type === 'comment')
    : [];

  const TABS: NotifTab[] = ['Todas', 'Pedidos', 'Reações', 'Comentários'];

  const getTypeColor = (type: string) => {
    if (type === 'friend_request') return '#fbbf24'; // Yellow/Gold
    if (type === 'reaction') return '#ec4899'; // Pink
    if (type === 'comment') return '#06b6d4'; // Cyan
    return c;
  };

  // Stats Logic
  const totalLikesRes = reactionNotifs.reduce((acc, curr) => acc + curr.count, 0);
  const totalCommentsRes = commentNotifs.reduce((acc, curr) => acc + curr.count, 0);
  
  // Trending Posts Logic
  const trendingPosts = myPosts
    .sort((a,b) => ((b._count?.reactions || 0) + (b._count?.comments || 0)) - ((a._count?.reactions || 0) + (a._count?.comments || 0)))
    .filter(p => (p._count?.reactions || 0) + (p._count?.comments || 0) > 0)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-[160] flex flex-col font-['Nunito',sans-serif]" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={themeMode}/></div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 shrink-0 border-b backdrop-blur-2xl"
        style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}>
        <button onClick={onClose}
          className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity ${textPrimary}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Voltar
        </button>
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Central de Notificações</span>
        <div className="w-20"/>
      </div>

      {/* Core Body Container */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_340px] gap-8 items-start relative z-10">

          {/* ─────────────────── LEFT SIDEBAR ─────────────────── */}
          <aside className="hidden lg:flex flex-col gap-6 sticky top-6">
            
            {/* My Profile Quick Look (from ExploreModal match) */}
            {authUser?.profile && (
              <div className={`rounded-[32px] overflow-hidden border-[1.5px] backdrop-blur-xl shadow-lg ${cardBg}`} style={{ borderColor: borderCol }}>
                <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${c}80, ${c}20)` }}>
                  {authUser.profile.bannerUrl && (
                    authUser.profile.bannerUrl.includes('.mp4') || authUser.profile.bannerUrl.includes('.webm') ? (
                       <video src={authUser.profile.bannerUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                       <img src={authUser.profile.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="flex flex-col items-center px-5 pb-6">
                  <div className="-mt-14 mb-3 w-[88px] h-[88px] rounded-[24px] border-[3px] overflow-hidden shadow-2xl relative z-10 bg-black" style={{ borderColor: isLight ? '#fff' : '#000' }}>
                    <Avatar src={authUser.profile.avatarUrl} name={authUser.profile.username || 'user'} className="w-full h-full object-cover"/>
                  </div>
                  <DisplayName profile={authUser.profile} fallbackName={authUser.profile.displayName || authUser.profile?.username || 'User'} className="font-black text-[18px] text-center" />
                  <p className={`text-[13px] mt-0.5 font-bold tracking-wide ${textSecondary}`}>@{authUser.profile?.username || 'user'}</p>
                </div>
              </div>
            )}

            {/* My Engagement Stats Panel */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm flex flex-col gap-5 ${cardBg}`} style={{ borderColor: borderCol }}>
               <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] ${textSecondary}`}>Dados de Engajamento</h3>
               
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 flex items-center justify-center rounded-[16px] shadow-sm text-white" style={{ background: '#ec4899' }}>
                   <IconHeart/>
                 </div>
                 <div>
                   <p className={`text-[20px] font-black leading-tight ${textPrimary}`}>{totalLikesRes}</p>
                   <p className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>Votos Retidos</p>
                 </div>
               </div>

               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 flex items-center justify-center rounded-[16px] shadow-sm border" style={{ background: 'rgba(6, 182, 212, 0.2)', borderColor: '#06b6d4', color: '#06b6d4' }}>
                   <IconComment/>
                 </div>
                 <div>
                   <p className={`text-[20px] font-black leading-tight ${textPrimary}`}>{totalCommentsRes}</p>
                   <p className={`text-[11px] font-bold uppercase tracking-widest ${textSecondary}`}>Respostas Gerais</p>
                 </div>
               </div>
            </div>
          </aside>


          {/* ─────────────────── MAIN FEED ─────────────────── */}
          <main className="flex flex-col w-full h-full min-h-[500px]">

              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-[22px] font-black tracking-tight ${textPrimary}`}>Caixa de Entrada</h2>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide mb-2 sticky top-0 z-30 pt-2" style={{ background: `linear-gradient(to bottom, ${isLight ? 'var(--background)' : '#000'} 60%, transparent)` }}>
                {TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="px-6 py-2.5 rounded-full text-[13px] font-black tracking-wide whitespace-nowrap border-none cursor-pointer transition-all shadow-sm"
                    style={{
                      background: activeTab === tab ? c : cardBg,
                      color: activeTab === tab ? '#fff' : (isLight ? '#444' : '#ccc'),
                      border: `1.5px solid ${activeTab === tab ? 'transparent' : borderCol}`,
                      boxShadow: activeTab === tab ? `0 4px 15px ${c}60` : 'none',
                    }}>
                    {tab}
                    {tab === 'Pedidos' && pendingReceived.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center justify-center border shadow-sm" style={{ background: '#ef4444', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                        {pendingReceived.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Feed List */}
              <div className="flex flex-col gap-4 mb-20">
                {filtered.length === 0 && (
                  <div className={`flex flex-col items-center justify-center py-20 opacity-50 ${textSecondary}`}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <p className="text-[18px] font-black tracking-tight">O vácuo espacial!</p>
                    <p className="text-[13px] font-bold mt-2 opacity-60">Puxa assunto para a galáxia reagir a ti.</p>
                  </div>
                )}

                {filtered.map((notif: any) => {
                  const nColor = getTypeColor(notif.type);

                  if (notif.type === 'friend_request') {
                    const req = notif.request;
                    const fp = req.fromUser?.profile;
                    return (
                      <div key={notif.id} className="relative flex items-center gap-4 p-5 rounded-[28px] border-[1.5px] shadow-lg overflow-hidden group"
                        style={{ background: cardBg, borderColor: nColor, backdropFilter: 'blur(30px)' }}>
                        
                        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ background: `linear-gradient(135deg, ${nColor}, transparent)` }} />

                        <div className="relative w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-md border-[2px]" style={{ background: `${nColor}20`, borderColor: nColor, color: nColor }}>
                          <IconUserPlus/>
                        </div>

                        <div className="cursor-pointer shrink-0 z-10" onClick={() => onProfileClick?.(req.fromUserId)}>
                          <Avatar src={fp?.avatarUrl} name={fp?.displayName || fp?.username || '?'} className="w-[52px] h-[52px] rounded-full border-[1.5px] shadow-sm group-hover:scale-105 transition-transform" style={{ borderColor: borderCol }}/>
                        </div>
                        
                        <div className="flex-1 min-w-0 z-10">
                          <p className={`text-[15px] font-medium leading-tight ${textPrimary}`}>
                            <span className="font-extrabold cursor-pointer hover:underline" onClick={() => onProfileClick?.(req.fromUserId)}>
                              <DisplayName profile={fp} fallbackName={fp?.displayName || fp?.username || 'Alguém'} style={{ display: 'inline' }} />
                            </span>
                            {' '}lançou um convite de rede.
                          </p>
                          <p className={`text-[11.5px] font-bold mt-1 ${textSecondary} opacity-70`}>{new Date(notif.createdAt).toLocaleDateString('pt-PT')}</p>
                        </div>
                        
                        <div className="flex gap-2 shrink-0 z-10">
                          <button onClick={() => acceptFriendRequest(req.id, req.fromUserId)}
                            className="px-4 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest border-none cursor-pointer text-white hover:scale-105 transition-transform shadow-md"
                            style={{ background: nColor }}>
                            Aceitar
                          </button>
                          <button onClick={() => rejectFriendRequest(req.id)}
                            className="px-4 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest border-[1.5px] cursor-pointer bg-transparent hover:scale-105 transition-transform shadow-sm"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}>
                            Recusar
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (notif.type === 'reaction') {
                    return (
                      <div key={notif.id} className="relative flex items-center gap-4 p-5 rounded-[28px] border-[1.5px] cursor-pointer hover:scale-[1.01] transition-transform shadow-lg group"
                        style={{ background: cardBg, borderColor: nColor, backdropFilter: 'blur(30px)' }}
                        onClick={() => onPostClick?.(notif.postId)}>

                        <div className="absolute inset-0 opacity-[0.08] pointer-events-none transition-opacity group-hover:opacity-[0.15]" style={{ background: `linear-gradient(135deg, ${nColor}, transparent)` }} />

                        <div className="relative w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-md border-[2px] transition-transform group-hover:scale-110" style={{ background: `${nColor}20`, borderColor: nColor, color: nColor }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </div>
                        
                        <div className="flex-1 min-w-0 z-10">
                          <p className={`text-[15px] font-medium leading-tight ${textPrimary}`}>
                            Choveram{' '}
                            <span className="font-black text-[16px] drop-shadow-md" style={{ color: nColor }}>{notif.count} Reação{notif.count !== 1 ? 'ões' : ''}</span>{' '}
                            na tua publicação!
                          </p>
                          <p className={`text-[12px] font-bold mt-1.5 truncate ${textSecondary} opacity-80`}>"{notif.content?.slice(0, 80)}{notif.content?.length > 80 ? '…' : ''}"</p>
                        </div>
                        
                        <div className="shrink-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: nColor }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      </div>
                    );
                  }

                  if (notif.type === 'comment') {
                    return (
                      <div key={notif.id} className="relative flex items-center gap-4 p-5 rounded-[28px] border-[1.5px] cursor-pointer hover:scale-[1.01] transition-transform shadow-lg group"
                        style={{ background: cardBg, borderColor: nColor, backdropFilter: 'blur(30px)' }}
                        onClick={() => onPostClick?.(notif.postId)}>

                        <div className="absolute inset-0 opacity-[0.08] pointer-events-none transition-opacity group-hover:opacity-[0.15]" style={{ background: `linear-gradient(135deg, ${nColor}, transparent)` }} />

                        <div className="relative w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-md border-[2px] transition-transform group-hover:scale-110" style={{ background: `${nColor}20`, borderColor: nColor, color: nColor }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
                        </div>
                        
                        <div className="flex-1 min-w-0 z-10">
                          <p className={`text-[15px] font-medium leading-tight ${textPrimary}`}>
                            Tens{' '}
                            <span className="font-black text-[16px] drop-shadow-md" style={{ color: nColor }}>{notif.count} Comentário{notif.count !== 1 ? 's' : ''}</span>{' '}
                            à espera de leitura.
                          </p>
                          <p className={`text-[12px] font-bold mt-1.5 truncate ${textSecondary} opacity-80`}>"{notif.content?.slice(0, 80)}{notif.content?.length > 80 ? '…' : ''}"</p>
                        </div>
                        
                        <div className="shrink-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: nColor }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

          </main>


          {/* ─────────────────── RIGHT SIDEBAR ─────────────────── */}
          <aside className="hidden xl:flex flex-col gap-6 sticky top-6">
            
            {/* Actividade nas Tuas Publicações */}
            <div className={`rounded-[32px] border-[1.5px] backdrop-blur-xl p-6 shadow-sm ${cardBg}`} style={{ borderColor: borderCol }}>
              <div className="flex items-center gap-2 mb-5">
                <IconActivity/>
                <h3 className={`text-[11px] font-black uppercase tracking-[1.5px] ${textPrimary}`}>As Tuas Publicações Em Alta</h3>
              </div>
              
              <div className="flex flex-col gap-3">
                 {trendingPosts.length === 0 ? (
                    <p className={`text-[12px] italic text-center py-4 ${textSecondary}`}>Ainda não tens publicações com engajamento recente.</p>
                 ) : (
                    trendingPosts.map(p => (
                       <div key={p.id} className="p-4 rounded-[20px] transition-transform hover:scale-[1.02] cursor-pointer group border flex flex-col gap-3 bg-white/5 dark:bg-black/10" style={{ borderColor: borderCol }} onClick={() => onPostClick?.(p.id)}>
                         <p className={`text-[13px] font-bold line-clamp-3 ${textPrimary} leading-relaxed opacity-90`}>{p.content}</p>
                         <div className="flex items-center gap-4 mt-auto">
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-[#ec4899]"><IconHeart/> {p._count?.reactions || 0}</span>
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-[#06b6d4]"><IconComment/> {p._count?.comments || 0}</span>
                         </div>
                       </div>
                    ))
                 )}
              </div>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
}