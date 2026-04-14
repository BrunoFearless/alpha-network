'use client';

import React, { useState, useRef, useEffect } from "react";
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { LazerUserProfile } from '../profile/types';
import { ThemeBg } from '../profile/ThemeBg';
import { useLazerStore } from '@/store/lazer.store';
import { useAuthStore } from '@/store/auth.store';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { EmojiPicker } from '@/components/community/EmojiPicker';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Post {
  id: string | number;
  author: string;
  authorId: string;
  handle: string;
  avatar: string;
  authorProfile?: any;
  badge?: string;
  verified?: boolean;
  time: string;
  content: string;
  image?: string;
  comments: number;
  reposts: number | string;
  likes: number | string;
  isLiked?: boolean;
}

interface Community {
  id: number;
  name: string;
  members: string;
  icon: string;
  color: string;
}

interface WatchItem {
  id: number;
  title: string;
  episode: string;
  current: number;
  total: number;
  cover: string;
  color: string;
}

interface TrendingTrope {
  rank: number;
  tag: string;
  sparkles: string;
}

interface HotDiscussion {
  id: number;
  title: string;
  count: string;
  preview: string;
  color: string;
}

interface SuggestedUser {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  badge: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const POSTS: Post[] = [];

const COMMUNITIES: Community[] = [];

const WATCHING: WatchItem[] = [];

const TRENDING: TrendingTrope[] = [];

const HOT_DISCUSSIONS: HotDiscussion[] = [];

const SUGGESTED: SuggestedUser[] = [];

const TABS = ["For You", "Following", "Anime", "Manga"];

// ─── Icons (Inline SVG) ─────────────────────────────────────────────────────
const IconComment = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconRepost = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
const IconHeart = ({ filled, size = 16 }: { filled?: boolean, size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
const IconShare = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
const IconDots = ({ size = 18 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>;
const IconImage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const IconSparkle = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>;
const IconTag = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
const IconAddUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
const IconVerified = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c4dff"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const IconEmoji = ({ size = 18 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>;
// Menu action icons
// Menu action icons
const IconEdit = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconPin = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 10.5C5 7 8.134 4 12 4s7 3 7 6.5c0 2-1.2 3.8-3 5l-4 2.5-4-2.5c-1.8-1.2-3-3-3-5z" />
    <circle cx="12" cy="10" r="2" />
  </svg>
);
const IconUnpin = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="2" x2="22" y2="22" />
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M16.6 6.4A7 7 0 0 1 19 10.5c0 2-1.2 3.8-3 5l-4 2.5-2.1-1.3M7.3 7.3A7 7 0 0 0 5 10.5c0 2 1.2 3.8 3 5l.5.3" />
  </svg>
);
const IconTrash = ({ size = 15 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
const IconHide = ({ size = 15 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
const IconBookmark = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
const IconLock = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;

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

const formatContent = (content: string, postTitleFont?: string, postTitleColor?: string, isLight?: boolean) => {
  if (!content) return null;
  const lines = content.split('\n');
  const title = lines[0];
  const body = lines.slice(1).join('\n');

  const fontData = PREMIUM_FONTS.find((f: any) => f.id === postTitleFont) || PREMIUM_FONTS[0];
  const titleCol = postTitleColor || (isLight ? '#000000' : '#ffffff');

  return (
    <div className="flex flex-col">
      <div
        className="font-black text-[24px] xl:text-[28px] leading-[1.05] tracking-tight uppercase mb-2"
        style={{ fontFamily: fontData.family, color: titleCol }}
      >
        <EmojiRenderer content={title} emojiSize={28} />
      </div>
      {body && (
        <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${isLight ? 'text-black font-medium' : 'text-white/70'}`}>
          <EmojiRenderer content={body} emojiSize={20} />
        </div>
      )}
    </div>
  );
};

function ActionBtn({ icon, count, color, active, onClick }: { icon: React.ReactNode; count: number | string; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] transition-colors hover:opacity-80"
      style={{ color, fontWeight: active ? 600 : 400 }}
    >
      {icon}
      {count}
    </button>
  );
}

function SideSection({ title, children, cardBg, borderCol, c }: { title: string; children: React.ReactNode; cardBg: string; borderCol: string; c: string }) {
  return (
    <div className={`rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[1.5px] backdrop-blur-xl ${cardBg}`} style={{ borderColor: borderCol }}>
      <h3 className="text-[10px] font-extrabold tracking-[1.2px] mb-3 uppercase" style={{ color: c }}>
        {title}
      </h3>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
}

const CustomFontSelector = ({
  selected,
  onSelect,
  fonts,
  borderColor,
  textColor,
  isLightMode
}: {
  selected: string;
  onSelect: (id: string) => void;
  fonts: typeof PREMIUM_FONTS;
  borderColor: string;
  textColor: string;
  isLightMode: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = fonts.find((f: any) => f.id === selected)?.label || 'Font';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border-[1.5px] bg-transparent outline-none cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 ${textColor}`}
        style={{ borderColor }}
      >
        {selectedLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 bottom-full mb-2 w-[160px] rounded-2xl overflow-hidden border-[1.5px] z-[70] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
              borderColor,
              background: isLightMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            }}
          >
            <div className="flex flex-col p-1">
              {fonts.map((f: any) => (
                <button
                  key={f.id}
                  onClick={() => { onSelect(f.id); setIsOpen(false); }}
                  className={`w-full px-4 py-2 text-[11px] font-extrabold text-left border-none cursor-pointer rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 ${selected === f.id ? textColor : 'opacity-60'}`}
                  style={{ fontFamily: f.family, color: selected === f.id ? undefined : (isLightMode ? '#000' : '#fff') }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
function CommentItem({
  cm,
  allComments,
  postId,
  postAuthorId,
  authUser,
  user,
  isLight,
  c,
  textPrimary,
  textSecondary,
  borderCol,
  cardBg,
  hiddenComments,
  setHiddenComments,
  onReply,
  nested = false,
  isLast = false
}: {
  cm: any;
  allComments: any[];
  postId: string;
  postAuthorId: string;
  authUser: any;
  user: any;
  isLight: boolean;
  c: string;
  textPrimary: string;
  textSecondary: string;
  borderCol: string;
  cardBg: string;
  hiddenComments: Set<string>;
  setHiddenComments: (val: Set<string>) => void;
  onReply: (cm: any) => void;
  nested?: boolean;
  isLast?: boolean;
}) {
  const { deleteComment, toggleCommentReaction } = useLazerStore();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (hiddenComments.has(cm.id)) return null;

  const replies = allComments.filter(r => r.parentId === cm.id);
  const isAuthor = cm.authorId === authUser?.id;
  const isPostOwner = postAuthorId === authUser?.id;
  const canDelete = isAuthor || isPostOwner;

  // Bubble color logic
  const bubbleBg = isLight ? 'bg-black/5' : 'bg-white/5';
  const menuBg = isLight ? 'rgba(255,255,255,0.7)' : 'rgba(10,10,18,0.85)';
  const menuBorder = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)';

  return (
    <div className={`flex flex-col relative ${nested ? 'ml-10 mt-2' : 'mt-4'}`}>
      {/* Curved connector for nested replies */}
      {nested && (
        <div
          className="absolute -left-6 top-[-10px] w-6 h-[24px] border-l-2 border-b-2 rounded-bl-xl opacity-20"
          style={{ borderColor: isLight ? '#000' : '#fff' }}
        />
      )}

      {/* Main Comment Content Row */}
      <div
        className="flex gap-2.5 items-start relative group/comment"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      >
        {/* Avatar Thumbnail */}
        <div
          onClick={() => {/* Profile navigation */ }}
          className={`${nested ? 'w-8 h-8' : 'w-9 h-9'} rounded-full shrink-0 border-[1.5px] cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-sm overflow-hidden bg-black/10`}
          style={{ borderColor: borderCol }}
        >
          <Avatar
            src={cm.authorId === authUser?.id ? user?.avatarUrl : cm.author?.profile?.avatarUrl}
            name={cm.authorId === authUser?.id ? user?.displayName : cm.author?.profile?.displayName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 relative min-w-0">
          <div className="flex items-center gap-1.5 max-w-full">
            <div className={`inline-block text-[13px] leading-relaxed rounded-2xl px-3.5 py-2 backdrop-blur-md ${bubbleBg} relative`} style={{ border: `1px solid ${borderCol}15`, maxWidth: '100%' }}>
              <div className="mb-0.5 transition-colors hover:underline cursor-pointer">
                <DisplayName
                  profile={cm.authorId === authUser?.id ? user : cm.author?.profile}
                  fallbackName={cm.authorId === authUser?.id ? (user?.displayName || 'Tu') : (cm.author?.profile?.displayName || 'Utilizador')}
                  className="font-black text-[11px] uppercase tracking-tighter leading-none"
                />
              </div>
              <div className={`${textSecondary} font-medium`}>
                <EmojiRenderer content={cm.content} emojiSize={16} />
              </div>

              {/* Reaction Pill (Floating on bubble if count > 0) */}
              {(cm._count?.reactions > 0 || cm.isLiked) && (
                <div
                  className="absolute -right-3 -bottom-2 px-1.5 py-0.5 rounded-full shadow-lg border flex items-center gap-1 animate-in zoom-in-50 duration-200"
                  style={{
                    background: isLight ? '#fff' : '#1e1e2e',
                    borderColor: borderCol,
                    boxShadow: `0 4px 12px rgba(0,0,0,0.15)`
                  }}
                >
                  <div className="text-[10px]" style={{ color: c }}>
                    <IconHeart filled={true} size={10} />
                  </div>
                  <span className={`text-[10px] font-black ${textPrimary}`}>{Math.max(1, cm._count?.reactions || 0)}</span>
                </div>
              )}
            </div>

            {/* Hover Actions Menu Activator - Larger hit area */}
            <div className={`transition-opacity duration-200 ${hovered || menuOpen ? 'opacity-100' : 'opacity-0'}`}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5 ${isLight ? 'text-black/40' : 'text-white/40'}`}
              >
                <IconDots size={14} />
              </button>
            </div>
          </div>

          {/* Action Links Bar */}
          <div className="flex items-center gap-4 mt-1.5 ml-1 text-[10px] font-black uppercase tracking-widest min-h-[16px]">
            <button
              onClick={() => toggleCommentReaction(postId, cm.id)}
              className="bg-transparent border-none p-0 cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
              style={{ color: cm.isLiked ? c : (isLight ? '#666' : '#999') }}
            >
              <IconHeart filled={cm.isLiked} size={12} />
              {cm.isLiked ? 'Gosto' : 'Gosto'}
            </button>
            <button
              onClick={() => onReply(cm)}
              className={`bg-transparent border-none p-0 cursor-pointer transition-colors hover:opacity-70 ${isLight ? 'text-black/40' : 'text-white/40'}`}
            >
              Responder
            </button>
            <button
              onClick={() => {
                const newSet = new Set(hiddenComments);
                newSet.add(cm.id);
                setHiddenComments(newSet);
              }}
              className={`bg-transparent border-none p-0 cursor-pointer transition-colors hover:opacity-70 ${isLight ? 'text-black/40' : 'text-white/40'}`}
            >
              Ocultar
            </button>
            <span className="opacity-20 lowercase font-normal text-[9px] pointer-events-none">{new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Comment Dropdown Menu */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute left-full ml-2 top-0 z-[70] py-1 backdrop-blur-2xl rounded-xl border shadow-2xl min-w-[140px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                style={{ background: menuBg, borderColor: menuBorder }}
              >
                {canDelete && (
                  <button
                    onClick={() => { deleteComment(postId, cm.id); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-[10px] uppercase tracking-widest font-black text-red-500 hover:bg-red-500/10 border-none bg-transparent cursor-pointer flex items-center gap-2.5 transition-colors"
                  >
                    <IconTrash /> Eliminar Eco
                  </button>
                )}
                <button
                  className="w-full text-left px-4 py-2 text-[10px] uppercase tracking-widest font-black text-white/40 hover:bg-white/5 border-none bg-transparent cursor-pointer flex items-center gap-2.5 transition-colors"
                >
                  <IconShare /> Partilhar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vertical line for parent with children */}
      {replies.length > 0 && (
        <div
          className="absolute left-[18px] top-[40px] bottom-0 w-[2px] opacity-10"
          style={{ background: isLight ? '#000' : '#fff' }}
        />
      )}

      {/* Recursive Replies Container */}
      {replies.length > 0 && (
        <div className="flex flex-col">
          {replies.map((reply, idx) => (
            <CommentItem
              key={reply.id}
              cm={reply}
              allComments={allComments}
              postId={postId}
              postAuthorId={postAuthorId}
              authUser={authUser}
              user={user}
              isLight={isLight}
              c={c}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderCol={borderCol}
              cardBg={cardBg}
              hiddenComments={hiddenComments}
              setHiddenComments={setHiddenComments}
              onReply={onReply}
              nested={true}
              isLast={idx === replies.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  isOwner,
  openModal,
  onProfileClick,
  authUser,
  user,
  isLight,
  c,
  textPrimary,
  textSecondary,
  cardBg,
  borderCol
}: {
  post: any;
  isOwner: boolean;
  openModal: (focus?: boolean) => void;
  onProfileClick?: (userId: string) => void;
  authUser: any;
  user: any;
  isLight: boolean;
  c: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  borderCol: string;
}) {
  const { deletePost, editPost, pinPost, fetchComments, addComment, comments, feedPosts, toggleReaction } = useLazerStore();
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
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hiddenComments, setHiddenComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const postComments = comments[post.id] || [];

  const handleToggleComments = async () => {
    if (!showComments && !comments[post.id]) await fetchComments(post.id);
    setShowComments(v => !v);
  };

  const handleToggleLike = async () => {
    await toggleReaction(post.id);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    await addComment(post.id, commentText.trim(), replyingTo?.id);
    setCommentText('');
    setReplyingTo(null);
    setIsSubmittingComment(false);
  };

  const handleReply = (cm: any) => {
    setReplyingTo(cm);
    commentInputRef.current?.focus();
  };

  const handleSaveEdit = async () => {
    await editPost(post.id, editContent, undefined, undefined, editFont !== 'default' ? editFont : undefined, editColor || undefined);
    setEditing(false);
  };

  const menuGroups = [
    ...(isOwner ? [[
      { icon: <IconEdit />, label: 'Editar', action: () => { setEditing(true); setMenuOpen(false); }, danger: false, muted: false },
      { icon: isPinned ? <IconUnpin /> : <IconPin />, label: isPinned ? 'Desafixar' : 'Fixar', action: async () => { await pinPost(post.id); setMenuOpen(false); }, danger: false, muted: false },
      { icon: <IconTrash />, label: 'Apagar', action: async () => { await deletePost(post.id); setMenuOpen(false); }, danger: true, muted: false },
    ]] : []),
    [
      { icon: <IconBookmark />, label: 'Guardar', action: () => setMenuOpen(false), danger: false, muted: true },
      { icon: <IconLock />, label: 'Privacidade', action: () => setMenuOpen(false), danger: false, muted: true },
    ],
  ];

  const PREMIUM_COLORS = [
    ...PREMIUM_COLORS_LIST,
    { id: 'dynamic', value: isLight ? '#000000' : '#ffffff', label: isLight ? 'Black' : 'Pure' },
  ];

  return (
    <div className={`rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[1.5px] backdrop-blur-2xl transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${cardBg}`} style={{ borderColor: isPinned ? c : borderCol }}>
      {isPinned && (
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0 text-[11px] font-bold tracking-wide rounded-t-3xl" style={{ color: c }}>
          <IconPin /> Publicação fixada
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="cursor-pointer transition-opacity hover:opacity-80" onClick={() => onProfileClick?.(post.authorId)}>
            <Avatar src={post.avatar} name={post.author} className="w-[42px] h-[42px] rounded-full object-cover shrink-0" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => onProfileClick?.(post.authorId)}>
              <DisplayName profile={post.authorProfile} fallbackName={post.author} className="font-bold text-sm" />
              <span className="text-[13px]">{post.badge}</span>
              {post.verified && <IconVerified />}
            </div>
            <div className={`text-xs ${textSecondary}`}>{post.handle} · {post.time}</div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className={`bg-transparent border-none cursor-pointer w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 ${menuOpen ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`} style={{ background: menuOpen ? `${c}18` : 'transparent', color: menuOpen ? c : undefined }}>
              <IconDots />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-40 w-[210px] rounded-2xl overflow-hidden border-[1.5px]" style={{ borderColor: borderCol, background: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(10,10,18,0.55)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', boxShadow: `0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 ${c}20` }}>
                  <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${c}60, transparent)` }} />
                  {menuGroups.map((group, gi) => (
                    <div key={gi}>
                      {gi > 0 && <div className="mx-3 my-1 h-[1px]" style={{ background: borderCol }} />}
                      {group.map((item) => (
                        <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer text-left transition-all group ${item.danger ? 'text-red-500 hover:bg-red-500/10' : item.muted ? `${textSecondary} opacity-40 hover:opacity-60 hover:bg-black/5 dark:hover:bg-white/5` : `${textPrimary} hover:bg-black/5 dark:hover:bg-white/5`}`}>
                          <span className="flex-shrink-0 transition-transform group-hover:scale-110" style={{ color: item.danger ? '#ef4444' : item.muted ? undefined : c }}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div onClick={() => openModal(false)} className="cursor-pointer select-none" title="Ver publicação">
          {editing ? (
            <div className="mb-3" onClick={e => e.stopPropagation()}>
              <textarea className={`w-full border rounded-xl px-3 py-2 text-sm bg-transparent resize-none outline-none ${textPrimary}`} style={{ borderColor: borderCol }} value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} autoFocus />
              <div className="flex items-center gap-2 mt-3 p-2 rounded-2xl border-[1.5px] border-dashed" style={{ borderColor: `${c}30` }}>
                <CustomFontSelector selected={editFont} onSelect={setEditFont} fonts={PREMIUM_FONTS} borderColor={borderCol} textColor={textPrimary} isLightMode={isLight} />
                <div className="h-4 w-[1px]" style={{ background: borderCol }} />
                <div className="flex gap-1.5 items-center">
                  {PREMIUM_COLORS.map((col: any) => (
                    <button key={col.id} onClick={() => setEditColor(editColor === col.value ? '' : col.value)} className={`w-3.5 h-3.5 rounded-full border-none cursor-pointer transition-all hover:scale-125 ${editColor === col.value ? 'ring-2 ring-offset-2 ring-offset-black ring-white' : 'opacity-40 hover:opacity-100'}`} style={{ background: col.value }} title={col.label} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} className={`text-xs px-4 py-1.5 rounded-full border bg-transparent cursor-pointer ${textSecondary}`} style={{ borderColor: borderCol }}>Cancelar</button>
                <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} className="text-xs px-4 py-1.5 rounded-full text-white border-none cursor-pointer font-bold" style={{ background: c }}>Guardar</button>
              </div>
            </div>
          ) : (
            <div className={`${post.image ? "mb-2" : "mb-3"}`}>{formatContent(post.content, rawPost?.titleFont, rawPost?.titleColor, isLight)}</div>
          )}
          {post.image && !editing && <img src={post.image} alt="post" className="w-full rounded-xl object-cover max-h-[260px] block mb-2 pointer-events-none" />}
        </div>

        <div className="flex items-center justify-between xl:justify-start xl:gap-8 pt-2.5 border-t-[1.5px]" style={{ borderColor: borderCol }}>
          <button onClick={(e) => { e.stopPropagation(); handleToggleLike(); }} className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] transition-all hover:opacity-80" style={{ color: isLiked ? c : (isLight ? "#9e9e9e" : "#888"), fontWeight: isLiked ? 600 : 400 }}>
            <div className="transition-transform active:scale-125" style={{ color: isLiked ? c : undefined }}><IconHeart filled={isLiked} /></div>
            <span style={{ color: isLiked ? c : undefined }}>{rawPost?._count?.reactions || post.likes}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleToggleComments(); }} className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[13px] transition-all hover:opacity-80" style={{ color: showComments ? c : (isLight ? "#9e9e9e" : "#888"), fontWeight: showComments ? 600 : 400 }}>
            <IconComment /> {rawPost?._count?.comments || post.comments}
          </button>
          <ActionBtn icon={<IconRepost />} count={post.reposts} color={typeof post.reposts === "number" && post.reposts > 100 ? c : (isLight ? "#9e9e9e" : "#888")} active={typeof post.reposts === "number" && post.reposts > 100} />
          <button className={`bg-transparent border-none cursor-pointer transition-colors xl:ml-auto hover:opacity-80 ${textSecondary}`}><IconShare /></button>
        </div>

        {showComments && (
          <div className="mt-4 border-t-[1.5px] pt-4" style={{ borderColor: borderCol }}>
            <div className="flex gap-2 mb-4">
              <Avatar src={user?.avatarUrl} name={user?.displayName || 'Me'} className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5 relative min-w-0">
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-dashed animate-in slide-in-from-bottom-2 duration-200" style={{ borderColor: `${c}30` }}>
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${textSecondary}`}>A responder a</span>
                      <span className="text-[10px] font-bold truncate" style={{ color: c }}>
                        {replyingTo.author?.profile?.displayName || 'Utilizador'}
                      </span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className={`bg-transparent border-none p-0.5 cursor-pointer opacity-40 hover:opacity-100 transition-opacity ${textSecondary}`}>
                      <IconTrash size={12} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input ref={commentInputRef} type="text" placeholder="Escreve um comentário..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }} className={`flex-1 text-xs px-3 py-1.5 rounded-full border bg-transparent outline-none ${textPrimary}`} style={{ borderColor: borderCol }} />
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${textSecondary}`}
                    title="Emoji"
                  >
                    <IconEmoji />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                      <EmojiPicker onSelect={(emoji) => { setCommentText(prev => prev + emoji); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} />
                    </div>
                  )}
                  <button onClick={handleSubmitComment} disabled={!commentText.trim() || isSubmittingComment} className="w-7 h-7 rounded-full text-white text-[10px] font-bold border-none cursor-pointer disabled:opacity-40 flex items-center justify-center" style={{ background: c }}>{isSubmittingComment ? '...' : '➤'}</button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {postComments.filter(cm => !cm.parentId).map((cm: any) => (
                <CommentItem
                  key={cm.id}
                  cm={cm}
                  allComments={postComments}
                  postId={post.id}
                  postAuthorId={post.authorId}
                  authUser={authUser}
                  user={user}
                  isLight={isLight}
                  c={c}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  borderCol={borderCol}
                  cardBg={cardBg}
                  hiddenComments={hiddenComments}
                  setHiddenComments={setHiddenComments}
                  onReply={handleReply}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PostDetailModal({
  selectedPostId,
  setSelectedPostId,
  feedPosts,
  comments,
  authUser,
  user,
  isLight,
  c,
  textPrimary,
  textSecondary,
  borderCol,
  cardBg,
  onProfileClick
}: {
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
  feedPosts: any[];
  comments: Record<string, any[]>;
  authUser: any;
  user: any;
  isLight: boolean;
  c: string;
  textPrimary: string;
  textSecondary: string;
  borderCol: string;
  cardBg: string;
  onProfileClick?: (userId: string) => void;
}) {
  const { toggleReaction, addComment } = useLazerStore();
  const [modalCommentText, setModalCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const [hiddenComments, setHiddenComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<any>(null);

  if (!selectedPostId) return null;
  const raw = feedPosts.find(p => p.id === selectedPostId);
  if (!raw) return null;

  const postComments = comments[selectedPostId] || [];
  const totalComments = postComments.length || raw._count?.comments || 0;
  const tags = raw.tag ? raw.tag.split(/\s+/).filter((t: string) => t.startsWith('#')) : [];
  const isOwn = raw.authorId === authUser?.id;
  const authorProfile = isOwn ? user : raw.author?.profile;
  const authorName = authorProfile?.displayName || (isOwn ? 'Tu' : 'Guild Member');
  const authorHandle = authorProfile?.username ? `@${authorProfile.username}` : (isOwn ? `@${user?.username}` : '@user');
  const authorAvatar = authorProfile?.avatarUrl || (isOwn ? (user?.avatarUrl || '') : '');

  const panelBg = isLight ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
  const panelShadow = isLight ? '0 12px 60px rgba(0,0,0,0.06)' : '0 12px 60px rgba(0,0,0,0.4)';
  const panelBlur = 'blur(50px) saturate(180%)';

  const handleModalComment = async () => {
    if (!modalCommentText.trim()) return;
    setIsSubmitting(true);
    await addComment(selectedPostId, modalCommentText.trim(), replyingTo?.id);
    setModalCommentText("");
    setReplyingTo(null);
    setIsSubmitting(false);
  };

  const handleModalReply = (cm: any) => {
    setReplyingTo(cm);
    modalInputRef.current?.focus();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col rounded-3xl overflow-hidden" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={user?.themeMode || 'dark'} /></div>
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <button onClick={() => setSelectedPostId(null)} className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer transition-opacity hover:opacity-60 ${textPrimary}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg> Voltar
        </button>
        <span className="text-sm font-extrabold tracking-widest uppercase opacity-60" style={{ color: c }}>Publicação</span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-10 flex gap-6 items-start justify-center">
        <div className="w-full max-w-[620px] flex flex-col rounded-[32px] overflow-hidden transition-all duration-300" style={{ background: panelBg, boxShadow: panelShadow, backdropFilter: panelBlur, WebkitBackdropFilter: panelBlur }}>
          <div className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onProfileClick?.(raw.authorId)}><Avatar src={authorAvatar} name={authorName} className="w-12 h-12 rounded-full object-cover shrink-0" /></div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="cursor-pointer" onClick={() => onProfileClick?.(raw.authorId)}><DisplayName profile={authorProfile} fallbackName={authorName} className="font-bold text-[16px]" /></div>
                  <IconVerified />
                </div>
                <div className={`text-[11px] uppercase tracking-widest opacity-40 font-black ${textSecondary}`}>{authorHandle}</div>
              </div>
            </div>
            {raw.tag && !raw.tag.startsWith('#') && (<h2 className={`text-2xl font-black mb-4 tracking-tight ${textPrimary}`}>{raw.tag}</h2>)}
            <div className={`mb-6 ${textPrimary}`}>{formatContent(raw.content, raw.titleFont, raw.titleColor, isLight)}</div>
            {tags.length > 0 && (<div className="flex flex-wrap gap-2 mb-6">{tags.map((t: string) => (<span key={t} className="text-[11px] px-3 py-1 rounded-full font-bold" style={{ background: `${c}15`, color: c }}>{t}</span>))}</div>)}
            {raw.imageUrl && (
              <div className="mb-3 rounded-[16px] overflow-hidden border-[1px]" style={{ borderColor: `${c}15` }}>
                <img src={raw.imageUrl} alt="post" className="w-full object-cover block" style={{ maxHeight: 500 }} />
              </div>
            )}
            <div className="flex items-center gap-8 pt-3" style={{ borderTop: `1px solid ${c}08` }}>
              <button onClick={() => toggleReaction(raw.id)} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-[15px] font-bold hover:opacity-70 transition-opacity" style={{ color: c }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill={raw.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> {raw._count?.reactions || 0}
              </button>
              <button onClick={() => modalInputRef.current?.focus()} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-[15px] font-bold hover:opacity-70 transition-opacity" style={{ color: c }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> {totalComments}
              </button>
            </div>
          </div>
        </div>
        <div className="w-[360px] flex flex-col rounded-[32px] overflow-hidden self-stretch" style={{ background: panelBg, boxShadow: panelShadow, backdropFilter: panelBlur, WebkitBackdropFilter: panelBlur }}>
          <div className="px-6 py-5 shrink-0" style={{ borderBottom: `1px solid ${c}15` }}>
            <h3 className={`font-black text-[15px] uppercase tracking-widest ${textPrimary}`}>Ecos <span className="font-bold text-xs opacity-30 ml-1">({totalComments})</span></h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 scrollbar-hide">
            {postComments.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full text-center opacity-30 ${textSecondary}`}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <p className="text-xs leading-relaxed font-bold">Nenhum eco ainda.<br />Sê o primeiro!</p>
              </div>
            ) : postComments.filter(cm => !cm.parentId).map((cm: any) => (
              <CommentItem
                key={cm.id}
                cm={cm}
                allComments={postComments}
                postId={selectedPostId}
                postAuthorId={raw.authorId}
                authUser={authUser}
                user={user}
                isLight={isLight}
                c={c}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderCol={borderCol}
                cardBg={cardBg}
                hiddenComments={hiddenComments}
                setHiddenComments={setHiddenComments}
                onReply={handleModalReply}
              />
            ))}
          </div>
          <div className="px-6 py-4 shrink-0 flex flex-col gap-2 relative bg-black/5 dark:bg-white/5" style={{ borderTop: `1px solid ${c}15` }}>
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 border border-dashed animate-in slide-in-from-bottom-2 duration-200" style={{ borderColor: `${c}30` }}>
                <div className="flex items-center gap-2 truncate">
                  <span className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${textSecondary}`}>A responder a</span>
                  <span className="text-[10px] font-bold truncate" style={{ color: c }}>
                    {replyingTo.author?.profile?.displayName || 'Utilizador'}
                  </span>
                </div>
                <button onClick={() => setReplyingTo(null)} className={`bg-transparent border-none p-0.5 cursor-pointer opacity-40 hover:opacity-100 transition-opacity ${textSecondary}`}>
                  <IconTrash size={12} />
                </button>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <input ref={modalInputRef} type="text" placeholder="Deixa um eco..." value={modalCommentText} onChange={e => setModalCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleModalComment(); } }} className={`flex-1 text-sm px-4 py-2.5 rounded-full outline-none bg-black/5 dark:bg-white/5 font-medium transition-all focus:ring-1 ${textPrimary}`} style={{ borderColor: `${c}40` }} />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`w-9 h-9 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${textSecondary}`}
                title="Emoji"
              >
                <IconEmoji size={18} />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-6 mb-2 z-50">
                  <EmojiPicker onSelect={(emoji) => { setModalCommentText(prev => prev + emoji); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} />
                </div>
              )}
              <button onClick={handleModalComment} disabled={!modalCommentText.trim() || isSubmitting} className="w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer shrink-0 disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10" style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
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
  initialPostId?: string | null;
  onPostOpened?: () => void;
}

export function LazerHomeView({ user, onProfileClick, initialPostId, onPostOpened }: LazerHomeViewProps) {
  const { user: authUser } = useAuthStore();
  const { feedPosts, createPost, fetchComments, comments } = useLazerStore();

  const [activeTab, setActiveTab] = useState("For You");
  const [postText, setPostText] = useState("");
  const [showTag, setShowTag] = useState(false);
  const [tag, setTag] = useState("");
  const [isSparkle, setIsSparkle] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>('default');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isLight = user?.themeMode === "light";
  const c = user?.themeColor || '#e879f9';
  const cardBg = isLight ? 'bg-white/40' : 'bg-black/25';
  const borderCol = isLight ? `${c}40` : `${c}15`;
  const textPrimary = isLight ? 'text-black' : 'text-white';
  const textSecondary = isLight ? 'text-black/60' : 'text-white/60';

  const PREMIUM_COLORS = [
    ...PREMIUM_COLORS_LIST,
    { id: 'dynamic', value: isLight ? '#000000' : '#ffffff', label: isLight ? 'Black' : 'Pure' },
  ];

  useEffect(() => {
    if (initialPostId) {
      setSelectedPostId(initialPostId);
      if (onPostOpened) onPostOpened();
    }
  }, [initialPostId, onPostOpened]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!postText.trim()) return;
    setIsPosting(true);
    await createPost(postText, imagePreview || undefined, tag || undefined, isSparkle, selectedFont !== 'default' ? selectedFont : undefined, selectedColor || undefined);
    setPostText("");
    setImagePreview("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTag("");
    setIsSparkle(false);
    setShowTag(false);
    setSelectedFont('default');
    setSelectedColor('');
    setIsPosting(false);
  };

  const handleOpenPost = async (postId: string, focusComment = false) => {
    setSelectedPostId(postId);
    if (!comments[postId]) await fetchComments(postId);
  };

  const sideSectionProps = { cardBg, borderCol, c };

  return (
    <div className="min-h-full font-[Nunito,sans-serif] pb-32 relative rounded-3xl shadow-2xl border-[1.5px] backdrop-blur-3xl" style={{ isolation: 'isolate', borderColor: borderCol }}>
      <div className="absolute inset-0 rounded-3xl overflow-hidden -z-10 pointer-events-none">
        <ThemeBg color={c} mode={user?.themeMode || 'dark'} />
      </div>
      <PostDetailModal
        selectedPostId={selectedPostId}
        setSelectedPostId={setSelectedPostId}
        feedPosts={feedPosts}
        comments={comments}
        authUser={authUser}
        user={user}
        isLight={isLight}
        c={c}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderCol={borderCol}
        cardBg={cardBg}
        onProfileClick={onProfileClick}
      />

      {/* Container - Desktop grid */}
      <div className="max-w-[1240px] mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] xl:grid-cols-[260px_1fr_300px] gap-6 items-start relative z-10">

        {/* ════ LEFT SIDEBAR ════ */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-6">

          {/* Profile Card */}
          <div className={`rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[1.5px] backdrop-blur-xl ${cardBg}`} style={{ borderColor: borderCol }}>
            {/* Banner */}
            <div className="h-[100px] relative bg-cover bg-center overflow-hidden" style={{ backgroundImage: user?.bannerUrl && !user?.bannerUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? `url('${user.bannerUrl}')` : `linear-gradient(135deg, ${c}80, ${c}20)` }}>
              {user?.bannerUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) && (
                <video src={user.bannerUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />
              )}
            </div>

            {/* Avatar & Info */}
            <div className="px-4 pb-4 relative text-center flex flex-col items-center">
              <div className={`mt-[-42px] mb-2 w-[84px] h-[84px] rounded-full border-[3px] overflow-hidden shrink-0 shadow-xl relative z-10 flex items-center justify-center backdrop-blur-md ${cardBg}`} style={{ borderColor: borderCol }}>
                <Avatar src={user?.avatarUrl} name={user?.displayName || user?.username || "Aimi"} className="w-full h-full object-cover" />
              </div>
              <div className="mt-1 mb-2">
                <DisplayName
                  profile={user}
                  fallbackName={user?.displayName || "Aimi"}
                  className="font-extrabold text-base flex justify-center w-full"
                />
              </div>
              <div className={`text-xs mb-4 font-medium ${textSecondary}`}>@{user?.username || "shoujo_dreamer"}</div>

              <div className="grid grid-cols-3 w-full text-center pt-3 border-t-[1.5px]" style={{ borderColor: borderCol }}>
                {(user?.stats?.length ? user.stats.slice(0, 3) : [
                  { label: "SERIES", value: "152" },
                  { label: "FOLLOWERS", value: "8.4k" },
                  { label: "FOLLOWING", value: "340" },
                ]).map((stat) => (
                  <div key={stat.label} className="cursor-pointer group">
                    <div className={`font-extrabold text-[15px] transition-colors ${textPrimary}`} style={{ color: textPrimary }}>{stat.value}</div>
                    <div className={`text-[9px] font-bold tracking-widest mt-1 uppercase ${textSecondary}`}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Communities */}
          <SideSection title="MY COMMUNITIES" {...sideSectionProps}>
            {COMMUNITIES.length === 0 ? (
              <div className={`text-center py-4 text-xs opacity-60 ${textPrimary}`}>Nenhuma comunidade ainda.</div>
            ) : (
              COMMUNITIES.map((co) => (
                <button key={co.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-transparent border-none cursor-pointer w-full transition-colors text-left group hover:bg-black/5 dark:hover:bg-white/5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 border-[1.5px] bg-black/5 dark:bg-white/5" style={{ borderColor: borderCol }}>
                    {co.icon}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className={`text-[13px] font-bold truncate transition-colors ${textPrimary}`}><EmojiRenderer content={co.name} emojiSize={13} /></div>
                    <div className={`text-[11px] truncate ${textSecondary}`}>{co.members}</div>
                  </div>
                </button>
              ))
            )}
          </SideSection>

          {/* Currently Watching */}
          <SideSection title="CURRENTLY WATCHING" {...sideSectionProps}>
            {WATCHING.length === 0 ? (
              <div className={`text-center py-4 text-xs opacity-60 ${textPrimary}`}>Nada assistindo no momento.</div>
            ) : (
              WATCHING.map((w) => (
                <button key={w.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-transparent border-none cursor-pointer w-full transition-colors text-left group hover:bg-black/5 dark:hover:bg-white/5">
                  <img src={w.cover} alt={w.title} className="w-10 h-10 rounded-lg object-cover shrink-0 border-[1.5px]" style={{ borderColor: borderCol }} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-bold truncate transition-colors ${textPrimary}`}><EmojiRenderer content={w.title} emojiSize={13} /></div>
                    <div className={`text-[11px] mb-1.5 truncate ${textSecondary}`}>{w.episode}</div>
                    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(w.current / w.total) * 100}%`, background: w.color }} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </SideSection>
        </aside>

        {/* ════ CENTER FEED ════ */}
        <main className="flex flex-col gap-5 w-full">

          {/* Tabs */}
          <div className={`flex gap-4 sm:gap-6 border-b-[1.5px] border-x-[1.5px] border-t-0 sm:border-[1.5px] sm:border-b-[1.5px] pt-1 px-4 sm:px-6 rounded-b-3xl sm:rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-x-auto no-scrollbar backdrop-blur-xl mb-1 ${cardBg}`} style={{ borderColor: borderCol }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 mt-1 bg-transparent border-none cursor-pointer text-sm font-[Nunito] whitespace-nowrap transition-all ${activeTab === tab ? 'font-extrabold' : 'font-medium'}`}
                style={{
                  borderBottom: activeTab === tab ? `3px solid ${c}` : "3px solid transparent",
                  marginBottom: "-2px",
                  color: activeTab === tab ? c : (isLight ? '#9e9e9e' : '#666')
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Post Composer */}
          <div className={`rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-[1.5px] backdrop-blur-xl ${cardBg}`} style={{ borderColor: borderCol }}>
            <div className="flex gap-3 items-start">
              <Avatar src={user?.avatarUrl} name={user?.displayName || "Aimi"} className="w-[42px] h-[42px] rounded-full object-cover shrink-0" />
              <div className="flex-1">
                <textarea
                  className={`w-full border-none resize-none text-sm bg-transparent min-h-[48px] outline-none font-['Nunito',sans-serif] ${textPrimary}`}
                  placeholder="What's happening in your universe?..."
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  style={{ color: textPrimary }}
                  rows={2}
                />
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />
                {/* Image preview */}
                {imagePreview && (
                  <div className="relative mt-2 rounded-xl overflow-hidden inline-block">
                    <img src={imagePreview} alt="preview" className="max-h-[180px] rounded-xl object-cover block" />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center border-none cursor-pointer font-bold shadow-lg"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >✕</button>
                  </div>
                )}
                {showTag && (
                  <div className="mt-2">
                    <input type="text" placeholder="Adiciona uma tag... (ex: #DailyLife)" value={tag} onChange={e => setTag(e.target.value)} className={`w-full text-xs px-3 py-1.5 rounded-lg border bg-transparent outline-none ${textPrimary}`} style={{ borderColor: borderCol }} />
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 mt-2 border-t-[1.5px]" style={{ borderColor: borderCol }}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${imagePreview ? 'opacity-60' : ''}`}
                      style={{ borderColor: imagePreview ? c : borderCol, color: c }}
                      title="Escolher imagem"
                    >
                      <IconImage />
                    </button>
                    <button onClick={() => setIsSparkle(!isSparkle)} className={`w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5`} style={{ borderColor: borderCol, color: isSparkle ? '#fbbf24' : c }}>
                      <IconSparkle />
                    </button>
                    <button onClick={() => setShowTag(!showTag)} className={`w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${showTag ? 'shadow-inner opacity-60' : ''}`} style={{ borderColor: borderCol, color: c }}>
                      <IconTag />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`w-8 h-8 rounded-lg border-[1.5px] bg-transparent cursor-pointer flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5`}
                        style={{ borderColor: borderCol, color: c }}
                        title="Emoji"
                      >
                        <IconEmoji />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute top-full left-0 mt-2 z-50">
                          <EmojiPicker onSelect={(emoji) => { setPostText(prev => prev + emoji); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} />
                        </div>
                      )}
                    </div>

                    <CustomFontSelector
                      selected={selectedFont}
                      onSelect={setSelectedFont}
                      fonts={PREMIUM_FONTS}
                      borderColor={borderCol}
                      textColor={textPrimary}
                      isLightMode={isLight}
                    />

                    {/* Color Palette */}
                    <div className="flex gap-1 items-center px-2 py-1 rounded-lg border-[1.5px]" style={{ borderColor: borderCol }}>
                      {PREMIUM_COLORS.map((col: any) => (
                        <button
                          key={col.id}
                          onClick={() => setSelectedColor(selectedColor === col.value ? '' : col.value)}
                          className={`w-3.5 h-3.5 rounded-full border-none cursor-pointer transition-all hover:scale-125 ${selectedColor === col.value ? 'ring-2 ring-offset-2 ring-offset-black ring-white' : 'opacity-40 hover:opacity-100'}`}
                          style={{ background: col.value }}
                          title={col.label}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={!postText.trim() || isPosting}
                    className="text-white border-none rounded-full px-5 py-2 text-sm font-bold cursor-pointer transition-opacity disabled:opacity-50 hover:opacity-90 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${c}dd, ${c})`, boxShadow: `0 4px 14px ${c}50` }}
                  >
                    {isPosting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts list */}
          <div className="flex flex-col gap-4">
            {feedPosts.length === 0 ? (
              <div className={`text-center py-10 opacity-60 text-sm ${textPrimary}`}>
                Nenhuma publicação para mostrar.
              </div>
            ) : (
              feedPosts.map((post: any) => (
                <div key={post.id} className="relative">
                  {post.isSparkle && (
                    <div className="absolute -top-1 -right-1 z-10 w-4 h-4 text-yellow-400 rotate-12 drop-shadow-md">
                      <IconSparkle />
                    </div>
                  )}
                  <div className={post.isSparkle ? "p-[2px] rounded-3xl" : ""} style={{ background: post.isSparkle ? `linear-gradient(135deg, ${c}, transparent, ${c})` : 'transparent' }}>
                    <PostCard
                      post={{
                        id: post.id || post.createdAt,
                        author: post.author?.profile?.displayName || (post.authorId === authUser?.id ? (user?.displayName || "Tu") : "Guild Member"),
                        handle: post.author?.profile?.username ? `@${post.author.profile.username}` : (post.authorId === authUser?.id ? `@${user?.username}` : `@hunter`),
                        avatar: post.author?.profile?.avatarUrl || (post.authorId === authUser?.id ? (user?.avatarUrl || "") : ""),
                        authorProfile: post.author?.profile || (post.authorId === authUser?.id ? user : undefined),
                        authorId: post.authorId,
                        time: new Date(post.createdAt).toLocaleDateString(),
                        content: post.content,
                        image: post.imageUrl,
                        comments: post._count?.comments || 0,
                        reposts: 0,
                        likes: post._count?.reactions || 0,
                        isLiked: post.isLiked
                      }}
                      isOwner={post.authorId === authUser?.id}
                      openModal={(focus) => handleOpenPost(post.id, focus ?? false)}
                      onProfileClick={onProfileClick}
                      authUser={authUser}
                      user={user}
                      isLight={isLight}
                      c={c}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      cardBg={cardBg}
                      borderCol={borderCol}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        {/* ════ RIGHT SIDEBAR ════ */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-6">

          {/* Trending Tropes */}
          <SideSection title="TRENDING TROPES" {...sideSectionProps}>
            {TRENDING.length === 0 ? (
              <div className={`text-center py-4 text-xs opacity-60 ${textPrimary}`}>Nenhuma tendência.</div>
            ) : (
              TRENDING.map((t) => (
                <button key={t.rank} className="flex items-center gap-3 p-2 rounded-xl bg-transparent border-none cursor-pointer w-full text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 group">
                  <span className={`w-[22px] h-[22px] rounded-md text-[11px] font-extrabold flex items-center justify-center shrink-0 transition-colors ${t.rank === 1 ? 'text-white shadow-md' : 'shadow-sm'}`} style={{ background: t.rank === 1 ? `linear-gradient(135deg, ${c}dd, ${c})` : (isLight ? '#f5f5f5' : '#222'), color: t.rank === 1 ? 'white' : c }}>
                    {t.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-bold truncate transition-colors ${textPrimary}`}><EmojiRenderer content={t.tag} emojiSize={13} /></div>
                    <div className={`text-[11px] truncate ${textSecondary}`}>{t.sparkles}</div>
                  </div>
                </button>
              ))
            )}
          </SideSection>

          {/* Hot Discussions */}
          <SideSection title="HOT DISCUSSIONS" {...sideSectionProps}>
            {HOT_DISCUSSIONS.length === 0 ? (
              <div className={`text-center py-4 text-xs opacity-60 ${textPrimary}`}>Nenhuma discussão.</div>
            ) : (
              HOT_DISCUSSIONS.map((d) => (
                <button key={d.id} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-transparent border-none cursor-pointer w-full text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 group">
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[13px] font-bold truncate flex-1 transition-colors ${textPrimary}`}>{d.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 shadow-sm" style={{ color: d.color, background: `${d.color}15` }}>
                      {d.count} 💬
                    </span>
                  </div>
                  <p className={`text-[11px] leading-snug m-0 overflow-hidden text-ellipsis ${textSecondary}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {d.preview}
                  </p>
                </button>
              ))
            )}
          </SideSection>

          {/* Suggested Matches */}
          <SideSection title="SUGGESTED MATCHES" {...sideSectionProps}>
            {SUGGESTED.length === 0 ? (
              <div className={`text-center py-4 text-xs opacity-60 ${textPrimary}`}>Nenhuma sugestão.</div>
            ) : (
              SUGGESTED.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 p-2 rounded-xl group hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                  <Avatar src={u.avatar} name={u.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-bold flex items-center gap-1 transition-colors ${textPrimary}`}>
                      {u.name} <span className="text-[10px]">{u.badge}</span>
                    </div>
                    <div className={`text-[11px] truncate ${textSecondary}`}>{u.handle}</div>
                  </div>
                  <button className="w-7 h-7 rounded-full border-[1.5px] bg-transparent flex items-center justify-center cursor-pointer shrink-0 transition-colors hover:text-white hover:bg-black/10 dark:hover:bg-white/10" style={{ borderColor: borderCol, color: c }}>
                    <IconAddUser />
                  </button>
                </div>
              ))
            )}
          </SideSection>

          {/* Footer */}
          <div className={`text-[10px] leading-loose px-1 ${textSecondary}`}>
            <div className="flex gap-2.5 flex-wrap mb-1">
              {["Terms of Service", "Privacy Policy", "Cookie Policy", "Accessibility", "Ads Info"].map((t) => (
                <a key={t} href="#" className={`no-underline transition-colors hover:[color:${c}] ${textSecondary}`}>{t}</a>
              ))}
            </div>
            <span>© 2024 Alpha Network</span>
          </div>
        </aside>

      </div>
    </div>
  );
}
