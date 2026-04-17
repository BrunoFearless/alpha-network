'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { LazerUserProfile } from '../profile/types';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { EmojiPicker } from '@/components/community/EmojiPicker';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconComment = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconRepost = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const IconHeart = ({ filled, size = 16 }: { filled?: boolean; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconShare = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const IconDots = ({ size = 18 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>;
const IconImage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconSparkle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>;
const IconTag = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconAddUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const IconUserCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
const IconVerified = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c4dff"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
const IconEmoji = ({ size = 18 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const IconEdit = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconPin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 10.5C5 7 8.134 4 12 4s7 3 7 6.5c0 2-1.2 3.8-3 5l-4 2.5-4-2.5c-1.8-1.2-3-3-3-5z"/><circle cx="12" cy="10" r="2"/></svg>;
const IconUnpin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><line x1="12" y1="17" x2="12" y2="22"/><path d="M7.3 7.3A7 7 0 0 0 5 10.5c0 2 1.2 3.8 3 5l.5.3"/></svg>;
const IconTrash = ({ size = 15 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconEyeOff = ({ size = 15 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconReply = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>;
const IconClose = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IconUserX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>;
const IconClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconFlame = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
const IconUsers = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconTv = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>;
const IconMessageSquare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconHash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IconPlay = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;

// ─── Community Preview Card ──────────────────────────────────────────────────
function CommunityPreviewCard({ community, onClick, c, isLight, borderCol, cardBg, textPrimary, textSecondary }: any) {
  const icon = community.iconUrl;
  const banner = community.bannerUrl;

  return (
    <div onClick={onClick} className={`group cursor-pointer rounded-[24px] overflow-hidden border-[1.5px] transition-all hover:scale-[1.02] hover:shadow-xl ${cardBg}`}
      style={{ borderColor: borderCol }}>
      <div className="h-20 relative bg-cover bg-center" style={{ backgroundImage: banner ? `url(${banner})` : `linear-gradient(135deg, ${c}dd, ${c}44)` }}>
        {banner?.match(/\.(mp4|webm|mov)(\?|$)/i) && <video src={banner} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover"/>}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"/>
      </div>
      <div className="px-4 pb-4 pt-10 relative">
        <div className="absolute -top-7 left-4">
          <div className="w-14 h-14 rounded-[18px] border-[3px] overflow-hidden shadow-lg bg-cover bg-center"
            style={{ borderColor: isLight ? '#fff' : '#09090b', backgroundColor: icon ? 'transparent' : c, backgroundImage: icon ? `url(${icon})` : 'none' }}>
            {!icon && <span className="flex items-center justify-center h-full text-2xl">🌐</span>}
            {icon?.match(/\.(mp4|webm|mov)(\?|$)/i) && <video src={icon} autoPlay muted loop playsInline className="w-full h-full object-cover"/>}
          </div>
        </div>
        <div className="flex flex-col">
          <h4 className={`font-black text-sm uppercase tracking-tight truncate ${textPrimary}`}>{community.name}</h4>
          <div className="flex items-center gap-3 mt-1.5 ">
            <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider" style={{ color: c }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c }}/>
              {community.onlineCount ?? 0} online
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>
              {community.membersCount?.toLocaleString() ?? 0} membros
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PREMIUM_FONTS = [
  { id: 'default', label: 'Default', family: "'Nunito', sans-serif" },
  { id: 'serif', label: 'Serif', family: "'Playfair Display', serif" },
  { id: 'mono', label: 'Mono', family: "'Fira Code', monospace" },
  { id: 'display', label: 'Display', family: "'Outfit', sans-serif" },
  { id: 'elegant', label: 'Elegant', family: "'Libre Baskerville', serif" },
];

const PREMIUM_COLORS_LIST = [
  { id: 'pink', value: '#ff9ef0', label: 'Neon' },
  { id: 'gold', value: '#ffeb3b', label: 'Gold' },
  { id: 'blue', value: '#7dd3fc', label: 'Alpha' },
  { id: 'green', value: '#86efac', label: 'Green' },
  { id: 'orange', value: '#ffb07c', label: 'Flame' },
];

function formatContent(content: string, postTitleFont?: string | null, postTitleColor?: string | null, isLight?: boolean) {
  if (!content) return null;
  const lines = content.split('\n');
  const title = lines[0];
  const body = lines.slice(1).join('\n');
  const fontData = PREMIUM_FONTS.find(f => f.id === postTitleFont) || PREMIUM_FONTS[0];
  const titleCol = postTitleColor || (isLight ? '#000000' : '#ffffff');
  return (
    <div className="flex flex-col">
      <div className="font-black text-[24px] xl:text-[28px] leading-[1.05] tracking-tight uppercase mb-2" style={{ fontFamily: fontData.family, color: titleCol }}>
        <EmojiRenderer content={title} emojiSize={28}/>
      </div>
      {body && <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${isLight ? 'text-black font-medium' : 'text-white/70'}`}><EmojiRenderer content={body} emojiSize={20}/></div>}
    </div>
  );
}

// ─── Helper: get author info from post ───────────────────────────────────────
function getAuthorInfo(post: any, authUser: any, myProfile: any) {
  const isOwn = post.authorId === authUser?.id;
  // Always prefer the embedded author.profile from the API
  const apiProfile = post.author?.profile;
  if (apiProfile) {
    return {
      name: apiProfile.displayName || apiProfile.username || 'Utilizador',
      handle: `@${apiProfile.username || 'user'}`,
      avatar: apiProfile.avatarUrl || null,
      profile: apiProfile,
    };
  }
  // Fallback: if it's own post, use local auth state
  if (isOwn && myProfile) {
    return {
      name: myProfile.displayName || myProfile.username || 'Eu',
      handle: `@${myProfile.username || 'user'}`,
      avatar: myProfile.avatarUrl || null,
      profile: myProfile,
    };
  }
  return {
    name: 'Utilizador',
    handle: '@user',
    avatar: null,
    profile: null,
  };
}

// ─── Comment Item ─────────────────────────────────────────────────────────────
function CommentItem({
  cm, allComments, postId, postAuthorId, authUser, myProfile, isLight, c,
  textPrimary, textSecondary, borderCol, cardBg,
  hiddenComments, setHiddenComments, onReply, nested = false
}: {
  cm: any; allComments: any[]; postId: string; postAuthorId: string;
  authUser: any; myProfile: any; isLight: boolean; c: string;
  textPrimary: string; textSecondary: string; borderCol: string; cardBg: string;
  hiddenComments: Set<string>; setHiddenComments: (v: Set<string>) => void;
  onReply: (cm: any) => void; nested?: boolean;
}) {
  const { deleteComment, toggleCommentReaction } = useLazerStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (hiddenComments.has(cm.id)) return null;

  const replies = allComments.filter(r => r.parentId === cm.id);
  const isAuthor = cm.authorId === authUser?.id;
  const isPostOwner = postAuthorId === authUser?.id;
  const canDelete = isAuthor || isPostOwner;

  // Get comment author info
  const commentProfile = cm.author?.profile;
  const authorName = commentProfile?.displayName || commentProfile?.username || 'Utilizador';
  const authorAvatar = commentProfile?.avatarUrl || null;

  const bubbleBg = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const menuBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(14,14,20,0.97)';

  return (
    <div className={`flex flex-col ${nested ? 'ml-9 mt-1' : 'mt-3'} relative`}>
      {nested && <div className="absolute -left-5 top-0 bottom-4 w-px opacity-20" style={{ background: isLight ? '#000' : '#fff' }}/>}
      {nested && <div className="absolute -left-5 top-3 h-px w-5 opacity-20" style={{ background: isLight ? '#000' : '#fff' }}/>}

      <div className="flex gap-2.5 items-start relative group/comment"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}>
        <Avatar src={authorAvatar} name={authorName} size={nested ? 'xs' : 'sm'} style={{ flexShrink: 0, marginTop: 2 }}/>

        <div className="flex-1 min-w-0">
          <div className="inline-flex flex-col rounded-2xl px-3.5 py-2.5 relative" style={{ background: bubbleBg, border: `1px solid ${borderCol}20`, maxWidth: '100%' }}>
            <DisplayName
              profile={commentProfile}
              fallbackName={authorName}
              style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: 2, cursor: 'pointer' }}
            />
            <div className={`text-[13px] leading-snug ${textSecondary} font-medium`}>
              <EmojiRenderer content={cm.content} emojiSize={16}/>
            </div>
            {(cm._count?.reactions > 0 || cm.isLiked) && (
              <div className="absolute -right-2.5 -bottom-2 px-1.5 py-0.5 rounded-full border flex items-center gap-1 shadow-md"
                style={{ background: isLight ? '#fff' : '#1e1e2e', borderColor: borderCol }}>
                <span style={{ color: c, fontSize: 10 }}><IconHeart filled size={10}/></span>
                <span className={`text-[10px] font-black ${textPrimary}`}>{Math.max(1, cm._count?.reactions || 0)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1.5 ml-1 text-[10px] font-black uppercase tracking-widest">
            <button onClick={() => toggleCommentReaction(postId, cm.id)}
              className="bg-transparent border-none cursor-pointer flex items-center gap-1 transition-all hover:scale-105"
              style={{ color: cm.isLiked ? c : (isLight ? '#999' : '#666') }}>
              <IconHeart filled={cm.isLiked} size={12}/> Gosto
            </button>
            <button onClick={() => onReply(cm)}
              className="bg-transparent border-none cursor-pointer flex items-center gap-1 transition-colors hover:opacity-80"
              style={{ color: isLight ? '#999' : '#666' }}>
              <IconReply/> Responder
            </button>
            <button onClick={() => { const s = new Set(hiddenComments); s.add(cm.id); setHiddenComments(s); }}
              className="bg-transparent border-none cursor-pointer transition-colors hover:opacity-80"
              style={{ color: isLight ? '#bbb' : '#444' }}>
              Ocultar
            </button>
            <span style={{ color: isLight ? '#ccc' : '#333', fontSize: 9 }}>
              {new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {/* Menu with delete */}
            <div className="relative ml-auto">
              {(hovered || canDelete) && (
                <button onClick={() => setMenuOpen(o => !o)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors"
                  style={{ color: isLight ? '#999' : '#666', opacity: hovered ? 1 : 0 }}>
                  <IconDots size={14}/>
                </button>
              )}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}/>
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] rounded-xl border py-1 shadow-2xl"
                    style={{ background: menuBg, borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}>
                    {canDelete && (
                      <button onClick={() => { deleteComment(postId, cm.id); setMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[12px] text-red-500 hover:bg-red-500/10 border-none bg-transparent cursor-pointer flex items-center gap-2 font-bold">
                        <IconTrash/> {isAuthor ? 'Eliminar' : 'Remover'}
                      </button>
                    )}
                    <button onClick={() => { const s = new Set(hiddenComments); s.add(cm.id); setHiddenComments(s); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-[12px] border-none bg-transparent cursor-pointer flex items-center gap-2 hover:bg-black/5"
                      style={{ color: isLight ? '#666' : '#aaa' }}>
                      <IconEyeOff/> Ocultar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="flex flex-col">
          {replies.map(reply => (
            <CommentItem key={reply.id} cm={reply} allComments={allComments} postId={postId} postAuthorId={postAuthorId}
              authUser={authUser} myProfile={myProfile} isLight={isLight} c={c} textPrimary={textPrimary}
              textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg}
              hiddenComments={hiddenComments} setHiddenComments={setHiddenComments}
              onReply={onReply} nested/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, isOwner, openModal, onProfileClick, authUser, myProfile, isLight, c, textPrimary, textSecondary, cardBg, borderCol }: {
  post: any; isOwner: boolean; openModal: (focus?: boolean) => void; onProfileClick?: (userId: string) => void;
  authUser: any; myProfile: any; isLight: boolean; c: string; textPrimary: string; textSecondary: string; cardBg: string; borderCol: string;
}) {
  const { deletePost, editPost, pinPost, fetchComments, addComment, comments, feedPosts, toggleReaction } = useLazerStore();
  const { isFriend, hasSentRequest, sendFriendRequest, cancelFriendRequest, removeFriend } = useLazerStore();

  const rawPost = feedPosts.find(p => p.id === post.id);
  const isPinned = rawPost?.isPinned ?? false;
  const isLiked = rawPost?.isLiked ?? false;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editFont, setEditFont] = useState(rawPost?.titleFont || 'default');
  const [editColor, setEditColor] = useState(rawPost?.titleColor || '');
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hiddenComments, setHiddenComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const commentRef = useRef<HTMLInputElement>(null);
  const postComments = comments[post.id] || [];

  // Get author info from the post's embedded data
  const authorInfo = getAuthorInfo(rawPost || post, authUser, myProfile);
  const friendStatus = isFriend(post.authorId) ? 'friend' : hasSentRequest(post.authorId) ? 'sent' : 'none';

  const handleToggleComments = async () => {
    if (!showComments && !comments[post.id]) await fetchComments(post.id);
    setShowComments(v => !v);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    await addComment(post.id, commentText.trim(), replyingTo?.id);
    setCommentText(''); setReplyingTo(null);
    setSubmitting(false);
  };

  const handleSaveEdit = async () => {
    await editPost(post.id, editContent, undefined, undefined, editFont !== 'default' ? editFont : undefined, editColor || undefined);
    setEditing(false);
  };

  const handleFriendBtn = () => {
    if (friendStatus === 'friend') removeFriend(post.authorId);
    else if (friendStatus === 'sent') cancelFriendRequest(post.authorId);
    else sendFriendRequest(post.authorId);
  };

  const menuBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,18,0.97)';
  const PREMIUM_COLORS = [...PREMIUM_COLORS_LIST, { id: 'dynamic', value: isLight ? '#000' : '#fff', label: isLight ? 'Black' : 'Pure' }];

  return (
    <div className={`rounded-3xl border-[1.5px] backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${cardBg}`} style={{ borderColor: isPinned ? c : borderCol }}>
      {isPinned && (
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0 text-[11px] font-bold tracking-wide" style={{ color: c }}>
          <IconPin/> Publicação fixada
        </div>
      )}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onProfileClick?.(post.authorId)}>
            <Avatar src={authorInfo.avatar} name={authorInfo.name} className="w-[42px] h-[42px] rounded-full object-cover shrink-0"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 cursor-pointer flex-wrap" onClick={() => onProfileClick?.(post.authorId)}>
              <DisplayName profile={authorInfo.profile} fallbackName={authorInfo.name} className="font-bold text-sm"/>
              {post.verified && <IconVerified/>}
            </div>
            <div className={`text-xs ${textSecondary}`}>{authorInfo.handle} · {new Date(post.createdAt).toLocaleDateString('pt-PT')}</div>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <button onClick={handleFriendBtn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] transition-all hover:scale-105"
                style={{
                  background: friendStatus === 'friend' ? `${c}20` : friendStatus === 'sent' ? 'rgba(255,165,0,0.12)' : 'transparent',
                  borderColor: friendStatus === 'friend' ? c : friendStatus === 'sent' ? '#f97316' : borderCol,
                  color: friendStatus === 'friend' ? c : friendStatus === 'sent' ? '#f97316' : (isLight ? '#999' : '#666'),
                }}>
                {friendStatus === 'friend' ? <><IconUserCheck/> Amigos</> : friendStatus === 'sent' ? <><IconClock/> Enviado</> : <><IconAddUser/> Seguir</>}
              </button>
            )}
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)}
                className={`bg-transparent border-none cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition-all ${menuOpen ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                style={{ background: menuOpen ? `${c}18` : 'transparent', color: menuOpen ? c : undefined }}>
                <IconDots/>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}/>
                  <div className="absolute right-0 top-10 z-40 w-[200px] rounded-2xl overflow-hidden border-[1.5px] py-1"
                    style={{ background: menuBg, borderColor: borderCol, boxShadow: `0 20px 60px rgba(0,0,0,0.35)` }}>
                    {isOwner && <>
                      <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:bg-black/5"
                        style={{ color: isLight ? '#333' : '#ddd' }}><IconEdit/> Editar</button>
                      <button onClick={async () => { await pinPost(post.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:bg-black/5"
                        style={{ color: isLight ? '#333' : '#ddd' }}>{isPinned ? <><IconUnpin/> Desafixar</> : <><IconPin/> Fixar</>}</button>
                      <button onClick={async () => { await deletePost(post.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-red-500 bg-transparent border-none cursor-pointer hover:bg-red-500/10"><IconTrash/> Apagar</button>
                    </>}
                    {!isOwner && (
                      <button onClick={() => { handleFriendBtn(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:bg-black/5"
                        style={{ color: friendStatus === 'friend' ? '#ef4444' : (isLight ? '#333' : '#ddd') }}>
                        {friendStatus === 'friend' ? <><IconUserX/> Remover amigo</> : <><IconAddUser/> {friendStatus === 'sent' ? 'Cancelar pedido' : 'Adicionar amigo'}</>}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div onClick={() => !editing && openModal(false)} className="cursor-pointer select-none">
          {editing ? (
            <div className="mb-3" onClick={e => e.stopPropagation()}>
              <textarea className={`w-full border rounded-xl px-3 py-2 text-sm bg-transparent resize-none outline-none ${textPrimary}`}
                style={{ borderColor: borderCol }} value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} autoFocus/>
              <div className="flex items-center gap-3 mt-2">
                <select value={editFont} onChange={e => setEditFont(e.target.value)} className="text-xs px-2 py-1 rounded-lg border bg-transparent" style={{ borderColor: borderCol }}>
                  {PREMIUM_FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <div className="flex gap-1.5">
                  {PREMIUM_COLORS.map(col => (
                    <button key={col.id} onClick={() => setEditColor(editColor === col.value ? '' : col.value)}
                      className="w-4 h-4 rounded-full border-none cursor-pointer transition-all hover:scale-125"
                      style={{ background: col.value, outline: editColor === col.value ? '2px solid #fff' : 'none' }}/>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => setEditing(false)} className={`text-xs px-4 py-1.5 rounded-full border bg-transparent cursor-pointer ${textSecondary}`} style={{ borderColor: borderCol }}>Cancelar</button>
                <button onClick={handleSaveEdit} className="text-xs px-4 py-1.5 rounded-full text-black border-none cursor-pointer font-bold" style={{ background: c }}>Guardar</button>
              </div>
            </div>
          ) : (
            <div className="mb-3">{formatContent(post.content, rawPost?.titleFont, rawPost?.titleColor, isLight)}</div>
          )}
          {(rawPost?.imageUrl || post.imageUrl) && !editing && (
            <img src={rawPost?.imageUrl || post.imageUrl} alt="post" className="w-full rounded-xl object-cover max-h-[300px] block mb-3"/>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between xl:justify-start xl:gap-8 pt-2.5 border-t-[1.5px]" style={{ borderColor: borderCol }}>
          <button onClick={() => toggleReaction(post.id)}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] transition-all hover:opacity-80"
            style={{ color: isLiked ? c : (isLight ? '#9e9e9e' : '#888'), fontWeight: isLiked ? 600 : 400 }}>
            <span className="transition-transform active:scale-125"><IconHeart filled={isLiked}/></span>
            {rawPost?._count?.reactions || 0}
          </button>
          <button onClick={handleToggleComments}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] transition-all hover:opacity-80"
            style={{ color: showComments ? c : (isLight ? '#9e9e9e' : '#888'), fontWeight: showComments ? 600 : 400 }}>
            <IconComment/> {rawPost?._count?.comments || 0}
          </button>
          <button className={`bg-transparent border-none cursor-pointer text-[13px] hover:opacity-80 ${textSecondary}`}><IconRepost/></button>
          <button className={`bg-transparent border-none cursor-pointer xl:ml-auto hover:opacity-80 ${textSecondary}`}><IconShare/></button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 border-t-[1.5px] pt-4" style={{ borderColor: borderCol }}>
            {/* Comment input */}
            <div className="flex gap-2 mb-4">
              <Avatar src={myProfile?.avatarUrl} name={myProfile?.displayName || myProfile?.username || 'Me'} size="sm" style={{ flexShrink: 0 }}/>
              <div className="flex-1 relative">
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl mb-2 border border-dashed"
                    style={{ background: `${c}10`, borderColor: `${c}30` }}>
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${textSecondary}`}>A responder a</span>
                      <span className="text-[11px] font-bold truncate" style={{ color: c }}>
                        {replyingTo.author?.profile?.displayName || replyingTo.author?.profile?.username || 'Utilizador'}
                      </span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100"><IconClose size={14}/></button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input ref={commentRef} type="text" placeholder="Escreve um eco..." value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                    className={`flex-1 text-xs px-3 py-1.5 rounded-full border bg-transparent outline-none ${textPrimary}`} style={{ borderColor: borderCol }}/>
                  <div className="relative">
                    <button onClick={() => setShowEmojiPicker(v => !v)} className="w-7 h-7 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: isLight ? '#999' : '#666' }}><IconEmoji size={16}/></button>
                    {showEmojiPicker && <div className="absolute bottom-full right-0 mb-2 z-50"><EmojiPicker onSelect={e => { setCommentText(p => p + e); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)}/></div>}
                  </div>
                  <button onClick={handleSubmitComment} disabled={!commentText.trim() || submitting}
                    className="w-7 h-7 rounded-full text-black text-[10px] font-bold border-none cursor-pointer disabled:opacity-40 flex items-center justify-center"
                    style={{ background: c }}>{submitting ? '…' : '➤'}</button>
                </div>
              </div>
            </div>

            {/* Comment list */}
            <div className="flex flex-col">
              {postComments.length === 0
                ? <p className={`text-xs text-center py-4 italic ${textSecondary} opacity-50`}>Sê o primeiro a comentar!</p>
                : postComments.filter(cm => !cm.parentId).map((cm: any) => (
                    <CommentItem key={cm.id} cm={cm} allComments={postComments} postId={post.id}
                      postAuthorId={post.authorId} authUser={authUser} myProfile={myProfile}
                      isLight={isLight} c={c} textPrimary={textPrimary} textSecondary={textSecondary}
                      borderCol={borderCol} cardBg={cardBg} hiddenComments={hiddenComments}
                      setHiddenComments={setHiddenComments}
                      onReply={(cm) => { setReplyingTo(cm); commentRef.current?.focus(); }}/>
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Font Selector ────────────────────────────────────────────────────────────
function CustomFontSelector({ selected, onSelect, fonts, borderColor, textColor, isLightMode }: {
  selected: string; onSelect: (id: string) => void; fonts: typeof PREMIUM_FONTS;
  borderColor: string; textColor: string; isLightMode: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const label = fonts.find(f => f.id === selected)?.label || 'Font';
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border-[1.5px] bg-transparent outline-none cursor-pointer flex items-center gap-1.5 ${textColor}`}
        style={{ borderColor }}>
        {label} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)}/>
          <div className="absolute left-0 bottom-full mb-2 w-[160px] rounded-2xl overflow-hidden border-[1.5px] z-[70] shadow-2xl"
            style={{ borderColor, background: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(14,14,20,0.98)', backdropFilter: 'blur(32px)' }}>
            {fonts.map(f => (
              <button key={f.id} onClick={() => { onSelect(f.id); setIsOpen(false); }}
                className="w-full px-4 py-2 text-[11px] font-extrabold text-left border-none cursor-pointer rounded-xl transition-all hover:bg-black/10"
                style={{ fontFamily: f.family, color: selected === f.id ? undefined : (isLightMode ? '#555' : '#aaa'), opacity: selected === f.id ? 1 : 0.7 }}>
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sidebar Widgets ──────────────────────────────────────────────────────────
const TRENDING_TROPES = [
  { rank: 1, tag: '#EnemiesToLovers', count: '15.2k', color: '#f472b6' },
  { rank: 2, tag: '#SchoolFestival', count: '8.4k', color: '#fb923c' },
  { rank: 3, tag: '#ChildhoodFriend', count: '5.1k', color: '#a78bfa' },
  { rank: 4, tag: '#RainyConfession', count: '3.2k', color: '#60a5fa' },
  { rank: 5, tag: '#SliceOfLife', count: '2.9k', color: '#4ade80' },
];

const WATCHING_NOW = [
  { title: 'Solo Leveling', ep: 'EP 8', genre: 'Ação', emoji: '⚔️' },
  { title: 'Frieren', ep: 'EP 22', genre: 'Aventura', emoji: '🌿' },
  { title: 'Dandadan', ep: 'EP 4', genre: 'Comédia', emoji: '👻' },
  { title: 'Blue Lock', ep: 'EP 16', genre: 'Desporto', emoji: '⚽' },
];

const HOT_DISCUSSIONS = [
  { title: 'O melhor final do ano?', replies: 142, heat: 98 },
  { title: 'Personagem mais odiada', replies: 89, heat: 76 },
  { title: 'Arc favorito de Frieren', replies: 67, heat: 54 },
];

function TrendingWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, onTagClick }: {
  c: string; isLight: boolean; textPrimary: string; textSecondary: string; borderCol: string; cardBg: string;
  onTagClick: (tag: string) => void;
}) {
  return (
    <div className={`rounded-3xl border-[1.5px] backdrop-blur-xl p-4 ${cardBg}`} style={{ borderColor: borderCol }}>
      <div className="flex items-center gap-2 mb-3">
        <IconFlame/>
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Trending Tropes</h3>
      </div>
      <div className="flex flex-col gap-2">
        {TRENDING_TROPES.map(t => (
          <button key={t.rank} onClick={() => onTagClick(t.tag)}
            className="flex items-center gap-2.5 w-full bg-transparent border-none cursor-pointer text-left rounded-xl px-2 py-1.5 transition-all hover:scale-[1.02] group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = `${t.color}15`)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span className="font-black text-[13px] w-5 text-center opacity-50" style={{ color: t.rank === 1 ? '#fbbf24' : (isLight ? '#aaa' : '#555') }}>{t.rank}</span>
            <span className="flex-1 font-bold text-[12px]" style={{ color: t.color }}>{t.tag}</span>
            <span className={`text-[10px] font-bold ${textSecondary}`}>{t.count} ✨</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WatchingWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg }: any) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className={`rounded-3xl border-[1.5px] backdrop-blur-xl p-4 ${cardBg}`} style={{ borderColor: borderCol }}>
      <div className="flex items-center gap-2 mb-3">
        <IconTv/>
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>A ver agora</h3>
      </div>
      <div className="flex flex-col gap-1.5">
        {WATCHING_NOW.map((w, i) => (
          <button key={i} onClick={() => setSelected(selected === i ? null : i)}
            className="flex items-center gap-3 w-full rounded-xl px-2.5 py-2 transition-all border-[1.5px] cursor-pointer text-left"
            style={{
              background: selected === i ? `${c}18` : 'transparent',
              borderColor: selected === i ? `${c}50` : 'transparent',
            }}>
            <span className="text-xl">{w.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-bold truncate ${textPrimary}`}>{w.title}</p>
              <p className={`text-[10px] ${textSecondary}`}>{w.ep} · {w.genre}</p>
            </div>
            {selected === i && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: c }}/>}
          </button>
        ))}
      </div>
      <p className={`text-center text-[10px] mt-2 ${textSecondary} opacity-50`}>Clica para mostrar no teu perfil</p>
    </div>
  );
}

function HotDiscussionsWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, onDiscussionClick }: any) {
  return (
    <div className={`rounded-3xl border-[1.5px] backdrop-blur-xl p-4 ${cardBg}`} style={{ borderColor: borderCol }}>
      <div className="flex items-center gap-2 mb-3">
        <IconMessageSquare/>
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Hot Discussions</h3>
      </div>
      <div className="flex flex-col gap-2">
        {HOT_DISCUSSIONS.map((d, i) => (
          <button key={i} onClick={() => onDiscussionClick(d.title)}
            className="flex flex-col w-full bg-transparent border-none cursor-pointer text-left rounded-xl px-2 py-2 transition-all"
            onMouseEnter={e => (e.currentTarget.style.background = `${c}10`)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <p className={`text-[12px] font-bold ${textPrimary} mb-1`}>{d.title}</p>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] ${textSecondary}`}>{d.replies} respostas</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: isLight ? '#eee' : '#333' }}>
                <div className="h-full rounded-full" style={{ width: `${d.heat}%`, background: `linear-gradient(90deg, ${c}, #f97316)` }}/>
              </div>
              <span className="text-[10px] font-bold" style={{ color: '#f97316' }}>🔥{d.heat}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveNowWidget({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, feedPosts, authUserId, onProfileClick }: any) {
  const recentlyActive = feedPosts
    .filter((p: any) => p.authorId !== authUserId)
    .reduce((acc: any[], p: any) => {
      const exists = acc.find(a => a.authorId === p.authorId);
      if (!exists) acc.push(p);
      return acc;
    }, [])
    .slice(0, 5);

  return (
    <div className={`rounded-3xl border-[1.5px] backdrop-blur-xl p-4 ${cardBg}`} style={{ borderColor: borderCol }}>
      <div className="flex items-center gap-2 mb-3">
        <IconUsers/>
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Ativos agora</h3>
        <div className="w-2 h-2 rounded-full ml-auto animate-pulse" style={{ background: '#22c55e' }}/>
      </div>
      {recentlyActive.length === 0 ? (
        <p className={`text-[11px] italic ${textSecondary} opacity-50 text-center py-2`}>Nenhum utilizador ativo ainda</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recentlyActive.map((p: any) => {
            const profile = p.author?.profile;
            const name = profile?.displayName || profile?.username || 'Utilizador';
            return (
              <button key={p.authorId} onClick={() => onProfileClick?.(p.authorId)}
                className="flex items-center gap-2.5 w-full bg-transparent border-none cursor-pointer rounded-xl px-1 py-1 transition-all hover:opacity-80">
                <div className="relative shrink-0">
                  <Avatar src={profile?.avatarUrl} name={name} size="xs"/>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: '#22c55e', borderColor: isLight ? '#fff' : '#09090b' }}/>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <DisplayName profile={profile} fallbackName={name} style={{ fontSize: 12, fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}/>
                  <p className={`text-[10px] truncate ${textSecondary}`}>publicou há pouco</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyCommunities({ c, isLight, textPrimary, textSecondary, borderCol, cardBg, onCommunityClick }: any) {
  const { myCommunities } = useLazerStore();
  
  return (
    <div className={`rounded-3xl border-[1.5px] backdrop-blur-xl p-4 ${cardBg}`} style={{ borderColor: borderCol }}>
      <button className="flex items-center gap-2 mb-3 w-full bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity p-0" onClick={() => onCommunityClick?.()}>
        <IconHash/>
        <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary} flex-1 text-left`}>Minhas Communities</h3>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <div className="flex flex-col gap-1.5">
        {myCommunities.length === 0 ? (
          <p className={`text-[10px] italic py-2 text-center ${textSecondary} opacity-40`}>Ainda não entraste em nenhuma community.</p>
        ) : (
          myCommunities.slice(0, 6).map((com) => {
            const icon = com.iconUrl;
            return (
              <button key={com.id}
                onClick={() => onCommunityClick?.(com.id)}
                className="flex items-center gap-2.5 w-full bg-transparent border-none cursor-pointer rounded-xl px-2 py-2 transition-all text-left group"
                onMouseEnter={e => (e.currentTarget.style.background = `${c}15`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden border" 
                  style={{ background: `${c}25`, borderColor: `${c}30` }}>
                  {icon ? (
                    icon.match(/\.(mp4|webm|mov)(\?|$)/i) 
                    ? <video src={icon} autoPlay muted loop playsInline className="w-full h-full object-cover"/>
                    : <img src={icon} className="w-full h-full object-cover"/>
                  ) : <span className="text-sm">🌐</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-bold truncate ${textPrimary}`}>{com.name}</p>
                  <p className={`text-[10px] ${textSecondary}`}>{com.membersCount ?? 0} membros</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full opacity-40 group-hover:opacity-100 transition-opacity" style={{ background: c }}/>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Post Detail Modal ────────────────────────────────────────────────────────
function PostDetailModal({ selectedPostId, setSelectedPostId, feedPosts, comments, authUser, myProfile, isLight, c, textPrimary, textSecondary, borderCol, cardBg, onProfileClick }: {
  selectedPostId: string | null; setSelectedPostId: (id: string | null) => void;
  feedPosts: any[]; comments: Record<string, any[]>; authUser: any; myProfile: any;
  isLight: boolean; c: string; textPrimary: string; textSecondary: string; borderCol: string; cardBg: string;
  onProfileClick?: (userId: string) => void;
}) {
  const { toggleReaction, addComment, fetchComments } = useLazerStore();
  const [modalCommentText, setModalCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hiddenComments, setHiddenComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedPostId && !comments[selectedPostId]) fetchComments(selectedPostId);
  }, [selectedPostId]);

  if (!selectedPostId) return null;
  const raw = feedPosts.find(p => p.id === selectedPostId);
  if (!raw) return null;

  const authorInfo = getAuthorInfo(raw, authUser, myProfile);
  const postComments = comments[selectedPostId] || [];

  const panelBg = isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)';

  const handleModalComment = async () => {
    if (!modalCommentText.trim()) return;
    setSubmitting(true);
    await addComment(selectedPostId, modalCommentText.trim(), replyingTo?.id);
    setModalCommentText(''); setReplyingTo(null);
    setSubmitting(false);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col rounded-3xl overflow-hidden" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={isLight ? 'light' : 'dark'}/></div>
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <button onClick={() => setSelectedPostId(null)} className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer transition-opacity hover:opacity-60 ${textPrimary}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Voltar
        </button>
        <span className="text-sm font-extrabold tracking-widest uppercase opacity-60" style={{ color: c }}>Publicação</span>
        <div className="w-20"/>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-10 flex gap-6 items-start justify-center">
        {/* Post */}
        <div className="w-full max-w-[620px] flex flex-col rounded-[32px] overflow-hidden"
          style={{ background: panelBg, backdropFilter: 'blur(50px)', boxShadow: isLight ? '0 12px 60px rgba(0,0,0,0.06)' : '0 12px 60px rgba(0,0,0,0.4)' }}>
          <div className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => onProfileClick?.(raw.authorId)} className="cursor-pointer">
                <Avatar src={authorInfo.avatar} name={authorInfo.name} className="w-12 h-12 rounded-full shrink-0 hover:opacity-80"/>
              </button>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5 cursor-pointer" onClick={() => onProfileClick?.(raw.authorId)}>
                  <DisplayName profile={authorInfo.profile} fallbackName={authorInfo.name} className="font-bold text-[16px]"/>
                  <IconVerified/>
                </div>
                <div className={`text-[11px] uppercase tracking-widest opacity-40 font-black ${textSecondary}`}>@{authorInfo.profile?.username || 'user'}</div>
              </div>
            </div>
            <div className={`mb-6 ${textPrimary}`}>{formatContent(raw.content, raw.titleFont, raw.titleColor, isLight)}</div>
            {raw.imageUrl && <img src={raw.imageUrl} alt="post" className="w-full rounded-[16px] object-cover mb-3 block" style={{ maxHeight: 500 }}/>}
            <div className="flex items-center gap-8 pt-3" style={{ borderTop: `1px solid ${c}08` }}>
              <button onClick={() => toggleReaction(raw.id)} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-[15px] font-bold hover:opacity-70" style={{ color: c }}>
                <IconHeart filled={raw.isLiked} size={22}/> {raw._count?.reactions || 0}
              </button>
              <button onClick={() => modalInputRef.current?.focus()} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-[15px] font-bold hover:opacity-70" style={{ color: c }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {postComments.length || raw._count?.comments || 0}
              </button>
            </div>
          </div>
        </div>

        {/* Comments panel */}
        <div className="w-[360px] flex flex-col rounded-[32px] overflow-hidden self-start h-fit max-h-[85vh]"
          style={{ background: panelBg, backdropFilter: 'blur(50px)', boxShadow: isLight ? '0 12px 60px rgba(0,0,0,0.06)' : '0 12px 60px rgba(0,0,0,0.4)', border: `1px solid ${c}25` }}>
          <div className="px-6 py-5 shrink-0" style={{ borderBottom: `1px solid ${c}15` }}>
            <h3 className={`font-black text-[15px] uppercase tracking-widest ${textPrimary}`}>
              Ecos <span className="font-bold text-xs opacity-30 ml-1">({postComments.length})</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {postComments.length === 0
              ? <div className={`flex flex-col items-center justify-center h-full text-center opacity-30 ${textSecondary}`}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <p className="text-xs font-bold leading-relaxed">Nenhum eco ainda.<br/>Sê o primeiro!</p>
                </div>
              : postComments.filter(cm => !cm.parentId).map((cm: any) => (
                  <CommentItem key={cm.id} cm={cm} allComments={postComments} postId={selectedPostId}
                    postAuthorId={raw.authorId} authUser={authUser} myProfile={myProfile}
                    isLight={isLight} c={c} textPrimary={textPrimary} textSecondary={textSecondary}
                    borderCol={borderCol} cardBg={cardBg} hiddenComments={hiddenComments}
                    setHiddenComments={setHiddenComments}
                    onReply={(cm) => { setReplyingTo(cm); modalInputRef.current?.focus(); }}/>
                ))}
          </div>
          <div className="px-6 py-4 shrink-0 flex flex-col gap-2 relative"
            style={{ background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', borderTop: `1px solid ${c}15` }}>
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-dashed"
                style={{ background: `${c}10`, borderColor: `${c}30` }}>
                <div className="flex items-center gap-2 truncate">
                  <span className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${textSecondary}`}>A responder a</span>
                  <span className="text-[10px] font-bold truncate" style={{ color: c }}>
                    {replyingTo.author?.profile?.displayName || 'Utilizador'}
                  </span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="bg-transparent border-none cursor-pointer opacity-40 hover:opacity-100"><IconClose size={14}/></button>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <input ref={modalInputRef} type="text" placeholder="Deixa um eco..." value={modalCommentText}
                onChange={e => setModalCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleModalComment(); } }}
                className={`flex-1 text-sm px-4 py-2.5 rounded-full outline-none font-medium border-[1px] ${textPrimary}`}
                style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', borderColor: `${c}40` }}/>
              <div className="relative">
                <button onClick={() => setShowEmojiPicker(v => !v)} className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: isLight ? '#999' : '#666' }}><IconEmoji size={18}/></button>
                {showEmojiPicker && <div className="absolute bottom-full right-0 mb-2 z-50"><EmojiPicker onSelect={e => { setModalCommentText(p => p + e); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)}/></div>}
              </div>
              <button onClick={handleModalComment} disabled={!modalCommentText.trim() || submitting}
                className="w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface LazerHomeViewProps {
  user?: LazerUserProfile;
  onProfileClick?: (userId: string) => void;
  onCommunityClick?: (communityId?: string) => void;
  initialPostId?: string | null;
  onPostOpened?: () => void;
}

const TABS = ['For You', 'Following', 'Anime', 'Manga'];

export function LazerHomeView({ user, onProfileClick, onCommunityClick, initialPostId, onPostOpened }: LazerHomeViewProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts, createPost, fetchComments, comments, fetchFriends, fetchMyCommunities, fetchExploreCommunities } = useLazerStore();
  const { exploreCommunities } = useLazerStore();

  const [activeTab, setActiveTab] = useState('For You');
  const [postText, setPostText] = useState('');
  const [showTag, setShowTag] = useState(false);
  const [tag, setTag] = useState('');
  const [isSparkle, setIsSparkle] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState('default');
  const [selectedColor, setSelectedColor] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeDiscussion, setActiveDiscussion] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = user?.themeMode === 'light';
  const c = user?.themeColor || '#e879f9';
  const cardBg = isLight ? 'bg-white/40' : 'bg-black/25';
  const borderCol = isLight ? `${c}40` : `${c}15`;
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';

  // Current user profile (for composer & comments)
  const myProfile = authUser?.profile || null;

  const PREMIUM_COLORS = [...PREMIUM_COLORS_LIST, { id: 'dynamic', value: isLight ? '#000' : '#fff', label: isLight ? 'Black' : 'Pure' }];

  useEffect(() => {
    fetchFriends();
    fetchMyCommunities();
    fetchExploreCommunities();
  }, []);

  useEffect(() => {
    if (initialPostId) {
      setSelectedPostId(initialPostId);
      onPostOpened?.();
    }
  }, [initialPostId]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(''); setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!postText.trim()) return;
    setIsPosting(true);
    await createPost(postText, imageUrl || undefined, tag || undefined, isSparkle, selectedFont !== 'default' ? selectedFont : undefined, selectedColor || undefined);
    setPostText(''); setImagePreview(''); setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTag(''); setIsSparkle(false); setShowTag(false); setSelectedFont('default'); setSelectedColor('');
    setIsPosting(false);
  };

  const handleOpenPost = async (postId: string) => {
    setSelectedPostId(postId);
    if (!comments[postId]) await fetchComments(postId);
  };

  // Filter posts based on active tab/tag
  const displayPosts = feedPosts.filter(p => {
    if (activeTag && p.tag !== activeTag.replace('#', '')) return false;
    if (activeTab !== 'For You' && activeTab !== 'Following') {
      const tabMap: Record<string, string> = { 'Anime': 'anime', 'Manga': 'manga' };
      if (tabMap[activeTab] && p.tag !== tabMap[activeTab]) return false;
    }
    return true;
  });

  return (
    <div className="min-h-full font-[Nunito,sans-serif] pb-32 relative rounded-3xl shadow-2xl border-[1.5px] backdrop-blur-3xl" style={{ isolation: 'isolate', borderColor: borderCol }}>
      <div className="absolute inset-0 rounded-3xl overflow-hidden -z-10 pointer-events-none"><ThemeBg color={c} mode={user?.themeMode || 'dark'}/></div>

      <PostDetailModal
        selectedPostId={selectedPostId} setSelectedPostId={setSelectedPostId}
        feedPosts={feedPosts} comments={comments} authUser={authUser} myProfile={myProfile}
        isLight={isLight} c={c} textPrimary={textPrimary} textSecondary={textSecondary}
        borderCol={borderCol} cardBg={cardBg} onProfileClick={onProfileClick}/>

      <div className="max-w-[1240px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] xl:grid-cols-[260px_1fr_300px] gap-6 items-start relative z-10">

        {/* Left sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-6">
          <div className={`rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[1.5px] backdrop-blur-xl ${cardBg}`} style={{ borderColor: borderCol }}>
            <div className="h-[100px] relative overflow-hidden" style={{ backgroundImage: user?.bannerUrl ? `url('${user.bannerUrl}')` : `linear-gradient(135deg, ${c}80, ${c}20)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {user?.bannerUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) && <video src={user.bannerUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0"/>}
            </div>
            <div className="px-4 pb-4 relative text-center flex flex-col items-center">
              <div className={`mt-[-42px] mb-2 w-[84px] h-[84px] rounded-full border-[3px] overflow-hidden shrink-0 shadow-xl ${cardBg}`} style={{ borderColor: borderCol }}>
                <Avatar src={user?.avatarUrl} name={user?.displayName || user?.username || 'U'} className="w-full h-full object-cover"/>
              </div>
              <DisplayName profile={user} fallbackName={user?.displayName || 'Alpha'} className="font-extrabold text-base flex justify-center w-full mb-1"/>
              <div className={`text-xs mb-4 font-medium ${textSecondary}`}>@{user?.username || 'user'}</div>
              <div className="grid grid-cols-3 w-full text-center pt-3 border-t-[1.5px]" style={{ borderColor: borderCol }}>
                {(user?.stats?.slice(0, 3) || [{ label: 'POSTS', value: feedPosts.filter(p => p.authorId === authUser?.id).length.toString() }]).map(s => (
                  <div key={s.label} className="cursor-pointer">
                    <div className={`font-extrabold text-[15px] ${textPrimary}`}>{s.value}</div>
                    <div className={`text-[9px] font-bold tracking-widest mt-1 uppercase ${textSecondary}`}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Communities */}
          <MyCommunities c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg} onCommunityClick={onCommunityClick}/>
        </aside>

        {/* Center feed */}
        <main className="flex flex-col gap-5 w-full">
          {/* Tabs */}
          <div className={`flex gap-4 border-b-[1.5px] border-x-[1.5px] border-t-0 sm:border-[1.5px] pt-1 px-4 sm:px-6 rounded-b-3xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-x-auto backdrop-blur-xl mb-1 ${cardBg}`} style={{ borderColor: borderCol }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setActiveTag(null); }}
                className="py-3 px-1 mt-1 bg-transparent border-none cursor-pointer text-sm whitespace-nowrap transition-all"
                style={{ borderBottom: activeTab === tab ? `3px solid ${c}` : '3px solid transparent', marginBottom: '-2px', color: activeTab === tab ? c : (isLight ? '#9e9e9e' : '#666'), fontWeight: activeTab === tab ? 800 : 500 }}>
                {tab}
              </button>
            ))}
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="py-3 px-1 mt-1 bg-transparent border-none cursor-pointer text-sm whitespace-nowrap flex items-center gap-1.5"
                style={{ borderBottom: `3px solid ${c}`, marginBottom: '-2px', color: c, fontWeight: 800 }}>
                {activeTag} <IconClose size={12}/>
              </button>
            )}
          </div>

          {/* Composer */}
          <div className={`rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[1.5px] backdrop-blur-xl ${cardBg}`} style={{ borderColor: borderCol }}>
            <div className="flex gap-3 items-start">
              <Avatar src={myProfile?.avatarUrl} name={myProfile?.displayName || myProfile?.username || 'U'} className="w-[42px] h-[42px] rounded-full shrink-0"/>
              <div className="flex-1">
                <textarea className={`w-full border-none resize-none text-sm bg-transparent min-h-[48px] outline-none ${textPrimary}`}
                  placeholder="O que está a acontecer no teu universo?..."
                  value={postText} onChange={e => setPostText(e.target.value)} rows={2}/>
                <input ref={fileInputRef} type="file" accept="image/*,video/*,.gif" className="hidden" onChange={handleImagePick}/>
                {imagePreview && (
                  <div className="relative mt-2 rounded-xl overflow-hidden inline-block">
                    <img src={imagePreview} alt="preview" className="max-h-[200px] rounded-xl object-cover block"/>
                    <button onClick={handleRemoveImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full text-white text-xs flex items-center justify-center border-none cursor-pointer font-bold shadow-lg"
                      style={{ background: 'rgba(0,0,0,0.65)' }}><IconClose size={14}/></button>
                  </div>
                )}
                {showTag && (
                  <input type="text" placeholder="#tag..." value={tag} onChange={e => setTag(e.target.value)}
                    className={`w-full mt-2 text-xs px-3 py-1.5 rounded-lg border bg-transparent outline-none ${textPrimary}`} style={{ borderColor: borderCol }}/>
                )}
                <div className="flex items-center justify-between pt-3 mt-2 border-t-[1.5px]" style={{ borderColor: borderCol }}>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center"
                      style={{ borderColor: imagePreview ? c : borderCol, color: c }}><IconImage/></button>
                    <button onClick={() => setIsSparkle(!isSparkle)}
                      className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center"
                      style={{ borderColor: borderCol, color: isSparkle ? '#fbbf24' : c }}><IconSparkle/></button>
                    <button onClick={() => setShowTag(!showTag)}
                      className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center"
                      style={{ borderColor: borderCol, color: c }}><IconTag/></button>
                    <div className="relative">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center"
                        style={{ borderColor: borderCol, color: c }}><IconEmoji/></button>
                      {showEmojiPicker && <div className="absolute top-full left-0 mt-2 z-50"><EmojiPicker onSelect={e => { setPostText(p => p + e); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)}/></div>}
                    </div>
                    <CustomFontSelector selected={selectedFont} onSelect={setSelectedFont} fonts={PREMIUM_FONTS} borderColor={borderCol} textColor={textPrimary} isLightMode={isLight}/>
                    <div className="flex gap-1 items-center px-2 py-1 rounded-lg border-[1.5px]" style={{ borderColor: borderCol }}>
                      {PREMIUM_COLORS.map(col => (
                        <button key={col.id} onClick={() => setSelectedColor(selectedColor === col.value ? '' : col.value)}
                          className="w-3.5 h-3.5 rounded-full border-none cursor-pointer transition-all hover:scale-125"
                          style={{ background: col.value, outline: selectedColor === col.value ? '2px solid #fff' : 'none', opacity: selectedColor === col.value ? 1 : 0.5 }}/>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleCreate} disabled={(!postText.trim() && !imageUrl) || isPosting}
                    className="text-black border-none rounded-full px-5 py-2 text-sm font-bold cursor-pointer transition-opacity disabled:opacity-50 hover:opacity-90 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${c}dd, ${c})`, boxShadow: `0 4px 14px ${c}50` }}>
                    {isPosting ? 'A publicar...' : 'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active discussion banner */}
          {activeDiscussion && (
            <div className={`rounded-2xl px-4 py-3 flex items-center justify-between border-[1.5px] ${cardBg}`} style={{ borderColor: `${c}40` }}>
              <span className={`text-sm font-bold ${textPrimary}`}>💬 {activeDiscussion}</span>
              <button onClick={() => setActiveDiscussion(null)} className="bg-transparent border-none cursor-pointer opacity-50 hover:opacity-100" style={{ color: isLight ? '#000' : '#fff' }}><IconClose/></button>
            </div>
          )}

          {/* Posts */}
          <div className="flex flex-col gap-4">
            {displayPosts.length === 0
              ? <div className={`text-center py-10 opacity-60 text-sm ${textPrimary}`}>
                  {activeTag ? `Nenhuma publicação com ${activeTag}` : 'Nenhuma publicação para mostrar.'}
                </div>
              : displayPosts.map((post: any) => (
                  <div key={post.id} className="relative">
                    {post.isSparkle && <div className="absolute -top-1 -right-1 z-10 w-4 h-4 text-yellow-400 rotate-12 drop-shadow-md"><IconSparkle/></div>}
                    <div className={post.isSparkle ? 'p-[2px] rounded-3xl' : ''} style={{ background: post.isSparkle ? `linear-gradient(135deg, ${c}, transparent, ${c})` : 'transparent' }}>
                      <PostCard
                        post={post}
                        isOwner={post.authorId === authUser?.id}
                        openModal={() => handleOpenPost(post.id)}
                        onProfileClick={onProfileClick}
                        authUser={authUser}
                        myProfile={myProfile}
                        isLight={isLight} c={c}
                        textPrimary={textPrimary} textSecondary={textSecondary}
                        cardBg={cardBg} borderCol={borderCol}/>
                    </div>
                  </div>
                ))}
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-6">
          <div className={`rounded-3xl border-[1.5px] backdrop-blur-xl p-4 ${cardBg}`} style={{ borderColor: borderCol }}>
            <div className="flex items-center gap-2 mb-4">
              <IconFlame/>
              <h3 className={`text-[11px] font-extrabold uppercase tracking-[1.2px] ${textPrimary}`}>Em Alta</h3>
              <button onClick={() => onCommunityClick?.()} className="ml-auto text-[10px] font-black uppercase tracking-widest bg-transparent border-none cursor-pointer" style={{ color: c }}>Ver todas</button>
            </div>
            <div className="flex flex-col gap-4">
              {exploreCommunities.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 opacity-30">
                  <div className="text-2xl">🌐</div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">A carregar...</p>
                </div>
              ) : (
                exploreCommunities.slice(0, 3).map(com => (
                  <CommunityPreviewCard 
                    key={com.id} 
                    community={com} 
                    c={c} 
                    isLight={isLight} 
                    cardBg={isLight ? 'bg-white/60' : 'bg-white/5'} 
                    borderCol={borderCol}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    onClick={() => onCommunityClick?.(com.id)}
                  />
                ))
              )}
            </div>
          </div>

          <TrendingWidget
            c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary}
            borderCol={borderCol} cardBg={cardBg}
            onTagClick={(tag) => { setActiveTag(tag); setActiveTab(''); }}/>

          <WatchingWidget c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg}/>

          <HotDiscussionsWidget c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg}
            onDiscussionClick={(title: string) => setActiveDiscussion(title)}/>

          <ActiveNowWidget c={c} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} borderCol={borderCol} cardBg={cardBg}
            feedPosts={feedPosts} authUserId={authUser?.id} onProfileClick={onProfileClick}/>
        </aside>
      </div>
    </div>
  );
}