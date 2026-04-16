'use client';

import React, { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface NotificationsProps {
  onClose: () => void;
  onPostClick?: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
  themeColor: string;
  themeMode: 'light' | 'dark';
}

type NotifTab = 'Todas' | 'Pedidos' | 'Reações' | 'Comentários';

export function NotificationsModal({ onClose, onPostClick, onProfileClick, themeColor: c, themeMode }: NotificationsProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts, friendRequests, acceptFriendRequest, rejectFriendRequest, fetchFriends } = useLazerStore();
  const [activeTab, setActiveTab] = useState<NotifTab>('Todas');

  const isLight = themeMode === 'light';
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';
  const cardBg = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? `${c}40` : `${c}18`;

  useEffect(() => { fetchFriends(); }, []);

  // Build reaction notifications from feed posts (posts liked by others on our posts)
  const myPosts = feedPosts.filter(p => p.authorId === authUser?.id);
  const reactionNotifs = myPosts.flatMap(p =>
    p._count?.reactions && p._count.reactions > 0
      ? [{ type: 'reaction', id: `r-${p.id}`, postId: p.id, content: p.content, count: p._count.reactions, createdAt: p.createdAt }]
      : []
  );

  const pendingRequests = friendRequests.filter(r => r.toUserId === authUser?.id && r.status === 'pending');

  const allNotifs = [
    ...pendingRequests.map(r => ({ type: 'friend_request', id: r.id, request: r, createdAt: r.createdAt })),
    ...reactionNotifs,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = activeTab === 'Todas' ? allNotifs
    : activeTab === 'Pedidos' ? allNotifs.filter(n => n.type === 'friend_request')
    : activeTab === 'Reações' ? allNotifs.filter(n => n.type === 'reaction')
    : [];

  const TABS: NotifTab[] = ['Todas', 'Pedidos', 'Reações'];

  return (
    <div className="fixed inset-0 z-[150] flex flex-col" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={themeMode}/></div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 shrink-0 border-b"
        style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)' }}>
        <button onClick={onClose}
          className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity ${textPrimary}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Voltar
        </button>
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Notificações</span>
        <div className="w-20"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 sm:px-8 py-3 shrink-0 border-b overflow-x-auto"
        style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border-none cursor-pointer transition-all"
            style={{
              background: activeTab === tab ? c : 'transparent',
              color: activeTab === tab ? (isLight ? '#fff' : '#000') : (isLight ? '#888' : '#666'),
            }}>
            {tab}
            {tab === 'Pedidos' && pendingRequests.length > 0 && (
              <span className="ml-1.5 w-4 h-4 rounded-full text-[9px] font-black inline-flex items-center justify-center" style={{ background: '#ef4444', color: '#fff' }}>
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-6 flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className={`flex flex-col items-center justify-center py-20 opacity-40 ${textSecondary}`}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <p className="text-sm font-bold">Tudo tranquilo por aqui!</p>
            </div>
          )}

          {filtered.map((notif: any) => {
            if (notif.type === 'friend_request') {
              const req = notif.request;
              const fp = req.fromUser?.profile;
              return (
                <div key={notif.id} className="flex items-center gap-3 p-4 rounded-2xl border-[1.5px]"
                  style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}>
                  <div className="cursor-pointer" onClick={() => onProfileClick?.(req.fromUserId)}>
                    <Avatar src={fp?.avatarUrl} name={fp?.displayName || fp?.username || '?'} className="w-11 h-11 rounded-full shrink-0"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textPrimary}`}>
                      <span className="font-bold cursor-pointer hover:underline" onClick={() => onProfileClick?.(req.fromUserId)}>
                        {fp?.displayName || fp?.username || 'Alguém'}
                      </span>
                      {' '}quer ser teu amigo
                    </p>
                    <p className={`text-[11px] ${textSecondary}`}>{new Date(notif.createdAt).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => acceptFriendRequest(req.id, req.fromUserId)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold border-none cursor-pointer text-black hover:scale-105 transition-transform"
                      style={{ background: c }}>
                      Aceitar
                    </button>
                    <button onClick={() => rejectFriendRequest(req.id)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] cursor-pointer bg-transparent hover:scale-105 transition-transform"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                      Recusar
                    </button>
                  </div>
                </div>
              );
            }

            if (notif.type === 'reaction') {
              return (
                <div key={notif.id} className="flex items-center gap-3 p-4 rounded-2xl border-[1.5px] cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: cardBg, borderColor: borderCol, backdropFilter: 'blur(20px)' }}
                  onClick={() => onPostClick?.(notif.postId)}>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-lg" style={{ background: `${c}20` }}>
                    ❤️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${textPrimary}`}>
                      A tua publicação recebeu <span className="font-bold" style={{ color: c }}>{notif.count} reação{notif.count !== 1 ? 'ões' : ''}</span>
                    </p>
                    <p className={`text-[11px] mt-0.5 truncate ${textSecondary}`}>{notif.content?.slice(0, 60)}…</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: isLight ? '#ccc' : '#444', flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}