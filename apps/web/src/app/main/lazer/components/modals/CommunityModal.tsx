'use client';

import React, { useState, useRef, useEffect } from 'react';
import { lazerApi, uploadLazerCommunityFile } from '@/lib/api';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { ThemeBg } from '../profile/ThemeBg';
import { useAuthStore } from '@/store/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────
type CTab = 'Discussions' | 'Recommendations' | 'Media Vault' | 'Members List';
interface CommunityRule { id: string; text: string; }
interface CommunityPost {
  id: string; communityId: string; authorId: string;
  authorName: string; authorHandle: string; authorAvatar?: string | null;
  authorProfile?: any;
  content: string; imageUrl?: string | null;
  titleFont?: string | null; titleColor?: string | null;
  reactions: number; comments: number; shares: number; isLiked: boolean;
  createdAt: string;
}
interface LazerCommunity {
  id: string; name: string; description: string;
  bannerUrl?: string | null; iconUrl?: string | null; iconEmoji?: string;
  themeColor: string; accentColor: string; isPublic: boolean;
  membersCount: number; onlineCount: number;
  rules: CommunityRule[];
  role: 'admin' | 'member' | 'none';
  createdAt: string; inviteCode: string;
  tags: string[]; posts?: CommunityPost[];
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const ACCENT_PRESETS = ['#fbbf24','#f472b6','#a78bfa','#60a5fa','#34d399','#f87171','#fb923c','#e879f9','#22d3ee','#a3e635'];

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
      <div className="font-black text-[22px] xl:text-[26px] leading-[1.1] tracking-tight uppercase mb-2" style={{ fontFamily: fontData.family, color: titleCol }}>
        <EmojiRenderer content={title} emojiSize={26}/>
      </div>
      {body && <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${isLight ? 'text-black font-medium' : 'text-white/70'}`}><EmojiRenderer content={body} emojiSize={20}/></div>}
    </div>
  );
}

function isVideo(url?: string | null) { if (!url) return false; return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov'); }
function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'agora'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; }
function readFile(f: File): Promise<string> { return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target!.result as string); fr.readAsDataURL(f); }); }

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Arrow: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Heart: ({ f, s=18 }: { f?: boolean; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Msg: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Img: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Camera: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Crown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19l3-10 5 6 2-8 5 8 3-6 2 10H2z"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
};

// ─── Community Card ─────────────────────────────────────────────────────────
function CommunityCard({ com: initialCom, onClick, borderCol, isLight, textPrimary, textSecondary }: {
  com: LazerCommunity; onClick: () => void;
  borderCol: string; isLight: boolean; textPrimary: string; textSecondary: string;
}) {
  const [hov, setHov] = useState(false);
  const com = { ...initialCom, tags: initialCom.tags || [] };
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="relative rounded-[28px] overflow-hidden cursor-pointer group flex flex-col transition-all duration-300"
      style={{
        border: `1.5px solid ${hov ? `${com.accentColor}60` : `${com.accentColor}20`}`,
        background: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(24px)',
        boxShadow: hov ? `0 20px 60px ${com.accentColor}20, 0 0 0 1px ${com.accentColor}30` : '0 4px 20px rgba(0,0,0,0.15)',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
      }}>

      <div className="h-28 relative shrink-0 overflow-visible" style={{ background: `linear-gradient(135deg, ${com.accentColor}60, ${com.accentColor}15)` }}>
        <div className="absolute inset-0 rounded-t-[28px] overflow-hidden">
          {isVideo(com.bannerUrl)
            ? <video src={com.bannerUrl!} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"/>
            : com.bannerUrl ? <img src={com.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
            : null}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)' }}/>
        </div>

        {com.role !== 'none' && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider z-20"
            style={{ background: com.role === 'admin' ? 'rgba(240,177,50,0.15)' : `${com.accentColor}20`, border: `1px solid ${com.role === 'admin' ? 'rgba(240,177,50,0.4)' : `${com.accentColor}40`}`, color: com.role === 'admin' ? '#F0B132' : com.accentColor, backdropFilter: 'blur(12px)' }}>
            {com.role === 'admin' ? <><Ic.Crown/> Admin</> : <><Ic.Check/> Member</>}
          </div>
        )}

        <div className="absolute -bottom-7 left-5 w-14 h-14 rounded-[18px] border-[3px] shadow-2xl flex items-center justify-center text-2xl z-20 overflow-hidden group-hover:scale-105 transition-transform"
          style={{ borderColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)', background: com.iconUrl ? 'transparent' : com.accentColor, backdropFilter: 'blur(4px)' }}>
          {isVideo(com.iconUrl) ? <video src={com.iconUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover"/>
            : com.iconUrl ? <img src={com.iconUrl} alt="" className="w-full h-full object-cover"/>
            : com.iconEmoji || '🌐'}
        </div>
      </div>

      <div className="pt-10 pb-4 px-5 flex flex-col flex-1">
        <h3 className={`font-black text-[15px] truncate ${textPrimary} transition-colors duration-200`} style={{ color: hov ? com.accentColor : undefined }}>{com.name}</h3>
        <p className={`text-[12px] mt-1 line-clamp-2 leading-relaxed ${textSecondary}`}>{com.description}</p>

        <div className="flex flex-wrap gap-1 mt-2.5">
          {com.tags?.slice(0, 3).map(t => (
            <span key={t} className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md"
              style={{ background: `${com.accentColor}18`, color: com.accentColor }}>{t}</span>
          ))}
        </div>

        <div className={`flex items-center gap-4 mt-3 pt-3 text-[11px] font-bold border-t ${textSecondary}`} style={{ borderColor: `${com.accentColor}15` }}>
          <span className="flex items-center gap-1.5"><Ic.Users/> {(com.membersCount ?? 0).toLocaleString()}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_#4ade80]"/> {com.onlineCount} online</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] transition-opacity duration-300" style={{ background: `linear-gradient(90deg, transparent, ${com.accentColor}, transparent)`, opacity: hov ? 1 : 0 }}/>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, com, onLike, textPrimary, textSecondary, isLight }: {
  post: CommunityPost; com: LazerCommunity; onLike: (id: string) => void;
  textPrimary: string; textSecondary: string; isLight: boolean;
}) {
  const { user: authUser } = useAuthStore() as any;
  const isMe = post.authorId === authUser?.id;
  const profile = isMe ? authUser?.profile : null;

  return (
    <div className="rounded-[24px] overflow-hidden transition-all duration-200 hover:translate-y-[-2px]"
      style={{ background: isLight ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(24px)', border: `1.5px solid ${com.accentColor}20`, boxShadow: `0 4px 24px rgba(0,0,0,0.1)` }}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={isMe ? profile?.avatarUrl : post.authorAvatar} name={isMe ? (profile?.displayName || profile?.username || post.authorName) : post.authorName} className="w-10 h-10 rounded-full shrink-0"/>
          <div className="flex-1 min-w-0">
            {isMe
              ? <DisplayName profile={profile} fallbackName={profile?.displayName || post.authorName} className={`font-extrabold text-[14px] ${textPrimary}`}/>
              : <p className={`font-extrabold text-[14px] truncate ${textPrimary}`}>{post.authorName}</p>}
            <p className={`text-[11px] ${textSecondary}`}>@{isMe ? (profile?.username || post.authorHandle) : post.authorHandle} · {timeAgo(post.createdAt)}</p>
          </div>
        </div>

        <div className="mb-4">
          {formatContent(post.content, post.titleFont, post.titleColor, isLight)}
        </div>
        {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full rounded-[16px] object-cover mb-4 block" style={{ maxHeight: 400 }}/>}

        <div className="flex items-center gap-6 pt-3 border-t" style={{ borderColor: `${com.accentColor}15` }}>
          <button onClick={() => onLike(post.id)} className="flex items-center gap-2 font-bold text-[13px] bg-transparent border-none cursor-pointer transition-all hover:scale-110"
            style={{ color: post.isLiked ? com.accentColor : (isLight ? '#aaa' : '#555') }}>
            <Ic.Heart f={post.isLiked} s={18}/> {post.reactions.toLocaleString()}
          </button>
          <button className="flex items-center gap-2 font-bold text-[13px] bg-transparent border-none cursor-pointer hover:opacity-70" style={{ color: isLight ? '#aaa' : '#555' }}>
            <Ic.Msg/> {post.comments}
          </button>
          <button className="flex items-center gap-2 font-bold text-[13px] bg-transparent border-none cursor-pointer hover:opacity-70" style={{ color: isLight ? '#aaa' : '#555' }}>
            <Ic.Share/> {post.shares}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Glass Panel Helper ────────────────────────────────────────────────────────
function GlassPanel({ children, accent, isLight, className = '', style = {} }: { children: React.ReactNode; accent: string; isLight: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-[28px] ${className}`} style={{ background: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)', backdropFilter: 'blur(28px)', border: `1.5px solid ${accent}22`, boxShadow: `0 8px 40px rgba(0,0,0,0.12)`, ...style }}>
      {children}
    </div>
  );
}

// ─── Overlay Modal Wrapper ────────────────────────────────────────────────────
function OverlayModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

// ─── Community Edit Modal ─────────────────────────────────────────────────────
function EditCommunityModal({ com, onSave, onClose, isLight, textPrimary, textSecondary, borderCol }: {
  com: LazerCommunity; onSave: (updated: Partial<LazerCommunity>, banner?: File | null, icon?: File | null) => Promise<void>; onClose: () => void;
  isLight: boolean; textPrimary: string; textSecondary: string; borderCol: string;
}) {
  const [name, setName] = useState(com.name);
  const [desc, setDesc] = useState(com.description);
  const [accent, setAccent] = useState(com.accentColor);
  const [isPublic, setIsPublic] = useState(com.isPublic);
  const [bannerPreview, setBannerPreview] = useState<string | null>(com.bannerUrl || null);
  const [iconPreview, setIconPreview] = useState<string | null>(com.iconUrl || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 14,
    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
    border: `1.5px solid ${accent}30`, color: isLight ? '#111' : '#fff',
    fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit',
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, description: desc, accentColor: accent, themeColor: accent, isPublic }, bannerFile, iconFile);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao guardar alterações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OverlayModal onClose={onClose}>
      <div className="w-full max-w-[500px] rounded-[32px] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(12,12,20,0.95)', border: `1.5px solid ${accent}30`, backdropFilter: 'blur(40px)' }}>

        <div className="relative h-40 shrink-0 cursor-pointer group" style={{ background: `linear-gradient(135deg, ${accent}80, ${accent}20)` }} onClick={() => bannerRef.current?.click()}>
          {isVideo(bannerPreview) ? <video src={bannerPreview!} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"/>
            : bannerPreview ? <img src={bannerPreview} alt="" className="absolute inset-0 w-full h-full object-cover"/>
            : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md"><Ic.Camera/> Alterar capa</span>
          </div>
          <input ref={bannerRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={async e => { 
            const f = e.target.files?.[0]; 
            if (f) { setBannerFile(f); setBannerPreview(await readFile(f)); } 
          }}/>

          <div className="absolute -bottom-8 left-6 cursor-pointer group/icon" onClick={e => { e.stopPropagation(); iconRef.current?.click(); }}>
            <div className="w-16 h-16 rounded-[20px] border-[3px] flex items-center justify-center text-2xl overflow-hidden shadow-2xl"
              style={{ borderColor: isLight ? '#fff' : '#000', background: iconPreview ? 'transparent' : accent }}>
              {isVideo(iconPreview) ? <video src={iconPreview!} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-[17px]"/>
                : iconPreview ? <img src={iconPreview} alt="" className="w-full h-full object-cover"/>
                : com.iconEmoji || '🌐'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ background: accent, borderColor: isLight ? '#fff' : '#000' }}>
              <Ic.Camera/>
            </div>
          </div>
          <input ref={iconRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={async e => { 
            const f = e.target.files?.[0]; 
            if (f) { setIconFile(f); setIconPreview(await readFile(f)); } 
          }}/>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-12 flex flex-col gap-4">
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-[1.5px] mb-1.5 ${textSecondary}`}>Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} style={fieldStyle} maxLength={50}/>
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-[1.5px] mb-1.5 ${textSecondary}`}>Descrição</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'none' } as any}/>
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-[1.5px] mb-2 ${textSecondary}`}>Cor de Destaque</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map(col => (
                <button key={col} onClick={() => setAccent(col)} className="w-8 h-8 rounded-full border-[3px] cursor-pointer transition-transform hover:scale-110" style={{ background: col, borderColor: accent === col ? '#fff' : 'transparent', boxShadow: accent === col ? `0 0 12px ${col}` : 'none' }}/>
              ))}
            </div>
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-[1.5px] mb-2 ${textSecondary}`}>Privacidade</label>
            <div className="flex gap-2">
              {([{ v: true, icon: '🌐', label: 'Pública' }, { v: false, icon: '🔒', label: 'Privada' }] as const).map(opt => (
                <button key={String(opt.v)} onClick={() => setIsPublic(opt.v)} className="flex-1 py-2.5 rounded-[16px] text-[13px] font-black border-none cursor-pointer transition-all"
                  style={{ background: isPublic === opt.v ? accent : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'), color: isPublic === opt.v ? '#fff' : (isLight ? '#555' : '#888') }}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0 shrink-0">
          <button onClick={onClose} className={`flex-1 py-3 rounded-full font-black text-[13px] uppercase tracking-widest border-none cursor-pointer ${textPrimary}`} style={{ background: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-full font-black text-[13px] uppercase tracking-widest text-white border-none cursor-pointer shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
            style={{ background: accent }}>
            {saving ? 'A guardar...' : 'Guardar ✓'}
          </button>
        </div>
      </div>
    </OverlayModal>
  );
}

// ─── Create Community Modal ───────────────────────────────────────────────────
function CreateCommunityModal({ onCreated, onClose, isLight, textPrimary, textSecondary, initialAccentColor }: {
  onCreated: (com: LazerCommunity) => void; onClose: () => void;
  isLight: boolean; textPrimary: string; textSecondary: string;
  initialAccentColor?: string;
}) {
  const [step, setStep] = useState<'type' | 'details' | 'success'>('type');
  const [isPublic, setIsPublic] = useState(true);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [accent, setAccent] = useState(initialAccentColor || ACCENT_PRESETS[0]);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [created, setCreated] = useState<LazerCommunity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 14,
    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
    border: `1.5px solid ${accent}30`, color: isLight ? '#111' : '#fff',
    fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit',
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const res: any = await lazerApi.createCommunity({
        name, description: desc, isPublic, accentColor: accent, iconEmoji: '🌐'
      });
      let com = res.data || res;
      
      const patch: any = {};
      if (bannerFile) patch.bannerUrl = await uploadLazerCommunityFile(bannerFile, com.id);
      if (iconFile) patch.iconUrl = await uploadLazerCommunityFile(iconFile, com.id);
      
      if (Object.keys(patch).length > 0) {
        const upRes: any = await lazerApi.updateCommunity(com.id, patch);
        com = upRes.data || upRes;
      }

      setCreated(com);
      setStep('success');
      onCreated(com);
    } catch (e) {
      console.error(e);
      alert('Erro ao criar community');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OverlayModal onClose={onClose}>
      <div className="w-full max-w-[480px] rounded-[32px] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        style={{ background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(12,12,20,0.95)', border: `1.5px solid ${accent}30`, backdropFilter: 'blur(40px)' }}>

        {step === 'type' && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3" style={{ animation: 'bounce 1s infinite' }}>🌐</div>
              <h2 className={`font-black text-[22px] ${textPrimary}`}>Nova Community</h2>
              <p className={`text-[13px] mt-1.5 ${textSecondary}`}>Escolhe o tipo de comunidade</p>
            </div>
            {[{ v: true, icon: '🌐', label: 'Pública', sub: 'Qualquer pessoa pode descobrir e entrar.' }, { v: false, icon: '🔒', label: 'Privada', sub: 'Apenas acessível por código de convite.' }].map(opt => (
              <div key={String(opt.v)} onClick={() => setIsPublic(opt.v)}
                className="flex items-center gap-4 p-4 rounded-[20px] mb-3 cursor-pointer transition-all"
                style={{ border: `1.5px solid ${isPublic === opt.v ? accent : 'rgba(255,255,255,0.08)'}`, background: isPublic === opt.v ? `${accent}12` : (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)') }}>
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl shrink-0" style={{ background: `${accent}18` }}>{opt.icon}</div>
                <div className="flex-1">
                  <p className={`font-extrabold text-[14px] ${textPrimary}`}>{opt.label}</p>
                  <p className={`text-[12px] mt-0.5 ${textSecondary}`}>{opt.sub}</p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: isPublic === opt.v ? accent : '#666', background: isPublic === opt.v ? accent : 'transparent' }}>
                  {isPublic === opt.v && <div className="w-2 h-2 rounded-full bg-white"/>}
                </div>
              </div>
            ))}
            <button onClick={() => setStep('details')} className="w-full mt-4 py-3.5 rounded-full text-white font-black text-[13px] uppercase tracking-widest border-none cursor-pointer hover:scale-[1.02] transition-transform shadow-lg" style={{ background: accent }}>
              Próximo →
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="flex flex-col max-h-[92vh]">
            <div className="relative h-36 shrink-0 cursor-pointer group" style={{ background: `linear-gradient(135deg, ${accent}80, ${accent}20)` }} onClick={() => bannerRef.current?.click()}>
              {bannerPreview && (isVideo(bannerPreview)
                ? <video src={bannerPreview} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"/>
                : <img src={bannerPreview} alt="" className="absolute inset-0 w-full h-full object-cover"/>)}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5"><Ic.Camera/> Capa</span>
              </div>
              <input ref={bannerRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={async e => { 
                const f = e.target.files?.[0]; 
                if (f) {
                  setBannerFile(f);
                  setBannerPreview(await readFile(f));
                } 
              }}/>

              <div className="absolute -bottom-7 left-5 cursor-pointer" onClick={e => { e.stopPropagation(); iconRef.current?.click(); }}>
                <div className="w-14 h-14 rounded-[18px] border-[3px] flex items-center justify-center text-2xl overflow-hidden shadow-xl" style={{ borderColor: isLight ? '#fff' : '#000', background: iconPreview ? 'transparent' : accent }}>
                  {isVideo(iconPreview) ? <video src={iconPreview!} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-[15px]"/>
                    : iconPreview ? <img src={iconPreview} alt="" className="w-full h-full object-cover"/> 
                    : '📷'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]" style={{ background: accent, borderColor: isLight ? '#fff' : '#000', color: '#fff' }}>+</div>
              </div>
              <input ref={iconRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={async e => { 
                const f = e.target.files?.[0]; 
                if (f) {
                  setIconFile(f);
                  setIconPreview(await readFile(f));
                } 
              }}/>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-10 flex flex-col gap-4">
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-[1.5px] mb-1.5 ${textSecondary}`}>Cor de Destaque</label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map(col => (
                    <button key={col} onClick={() => setAccent(col)} className="w-8 h-8 rounded-full border-[3px] cursor-pointer hover:scale-110 transition-transform" style={{ background: col, borderColor: accent === col ? '#fff' : 'transparent', boxShadow: accent === col ? `0 0 12px ${col}` : 'none' }}/>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-[1.5px] mb-1.5 ${textSecondary}`}>Nome *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="A Minha Community" autoFocus style={fieldStyle} maxLength={50}/>
              </div>
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-[1.5px] mb-1.5 ${textSecondary}`}>Descrição</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Sobre o quê é esta comunidade?" style={{ ...fieldStyle, resize: 'none' } as any}/>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-2 shrink-0">
              <button onClick={() => setStep('type')} className={`flex-1 py-3 rounded-full font-black text-[13px] uppercase tracking-widest border-none cursor-pointer ${textPrimary}`} style={{ background: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)' }}>← Voltar</button>
              <button onClick={handleCreate} disabled={!name.trim() || isLoading} className="flex-1 py-3 rounded-full text-white font-black text-[13px] uppercase tracking-widest border-none cursor-pointer disabled:opacity-30 hover:scale-[1.02] transition-transform shadow-lg" style={{ background: accent }}>
                {isLoading ? 'A criar...' : 'Criar 🚀'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && created && (
          <div className="p-8 text-center">
            <div className="w-24 h-24 rounded-[28px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl overflow-hidden" style={{ background: created.accentColor }}>
              {isVideo(created.iconUrl) ? <video src={created.iconUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover"/>
                : created.iconUrl ? <img src={created.iconUrl} alt="" className="w-full h-full object-cover"/> 
                : '🌐'}
            </div>
            <div className="text-4xl mb-3">🎉</div>
            <h2 className={`font-black text-[22px] mb-2 ${textPrimary}`}>{created.name}</h2>
            <p className={`text-[13px] mb-6 ${textSecondary}`}>Community criada com sucesso!</p>
            <div className="flex items-center gap-3 p-4 rounded-[18px] mb-5 font-mono" style={{ border: `1.5px solid ${created.accentColor}40`, background: `${created.accentColor}10` }}>
              <span className="flex-1 text-left font-black text-[14px]" style={{ color: created.accentColor }}>{created.inviteCode}</span>
              <button onClick={() => navigator.clipboard.writeText(created.inviteCode)} className="text-[11px] font-black uppercase px-3 py-1.5 rounded-lg text-white border-none cursor-pointer hover:scale-105 transition-transform" style={{ background: created.accentColor }}>📋 Copiar</button>
            </div>
            <button onClick={onClose} className="w-full py-3.5 rounded-full text-white font-black text-[13px] uppercase tracking-widest border-none cursor-pointer hover:scale-[1.02] transition-transform shadow-lg" style={{ background: created.accentColor }}>
              🚀 Abrir Community
            </button>
          </div>
        )}
      </div>
    </OverlayModal>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface CommunityModalProps {
  onClose: () => void; themeColor: string; themeMode: 'light' | 'dark';
  initialCommunityId?: string | null;
}

export function CommunityModal({ onClose, themeColor: c, themeMode, initialCommunityId }: CommunityModalProps) {
  const { user: authUser } = useAuthStore() as any;
  const isLight = themeMode === 'light';
  const tp = isLight ? 'text-black' : 'text-white';
  const ts = isLight ? 'text-black/55' : 'text-white/55';
  const borderCol = `${c}25`;

  const [communities, setCommunities] = useState<LazerCommunity[]>([]);
  const [selected, setSelected] = useState<LazerCommunity | null>(null);
  const [activeTab, setActiveTab] = useState<CTab>('Discussions');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postText, setPostText] = useState('');
  const [postTitleFont, setPostTitleFont] = useState('default');
  const [postTitleColor, setPostTitleColor] = useState('');
  const [postImgPreview, setPostImgPreview] = useState('');
  const [postImgFile, setPostImgFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [editRule, setEditRule] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const myProfile = authUser?.profile;

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    if (selected) fetchPosts(selected.id);
    else setPosts([]);
  }, [selected]);

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const [myRes, expRes]: [any, any] = await Promise.all([
        lazerApi.getMyCommunities(),
        lazerApi.exploreCommunities()
      ]);
      const my = Array.isArray(myRes.data) ? myRes.data : Array.isArray(myRes) ? myRes : [];
      const exp = Array.isArray(expRes.data) ? expRes.data : Array.isArray(expRes) ? expRes : [];
      const all = [...my];
      exp.forEach((c: any) => { if (!all.find((x: any) => x.id === c.id)) all.push(c); });
      setCommunities(all);
      if (initialCommunityId && !selected) {
        const initial = all.find((x: any) => x.id === initialCommunityId);
        if (initial) setSelected(initial);
      }
    } catch (e) {
      console.error('Fetch communities error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (comId: string) => {
    try {
      const res: any = await lazerApi.getFeed(undefined, comId);
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setPosts(data);
    } catch (e) { console.error(e); }
  };

  const getCom = (id: string) => communities.find((x: any) => x.id === id);
  const activeCom = selected ? getCom(selected.id) || selected : null;
  
  const tabPosts = activeTab === 'Discussions' ? posts
    : activeTab === 'Media Vault' ? posts.filter((p: any) => p.imageUrl)
    : activeTab === 'Recommendations' ? posts.filter((p: any) => p.reactions > 100)
    : [];

  const myComs = communities.filter((x: any) => x.role !== 'none');
  const suggested = communities.filter((x: any) => x.role === 'none');
  const totalMembers = myComs.reduce((a: number, x: any) => a + (x.membersCount || 0), 0);

  const handlePost = async () => {
    if (!postText.trim() || !activeCom) return;
    setIsPosting(true);
    try {
      let imageUrl = null;
      if (postImgFile) {
        imageUrl = await uploadLazerCommunityFile(postImgFile, activeCom.id);
      }

      await lazerApi.createPost({
        content: postText,
        imageUrl,
        communityId: activeCom.id,
        titleFont: postTitleFont !== 'default' ? postTitleFont : null,
        titleColor: postTitleColor || null,
      });

      setPostText(''); setPostImgPreview(''); setPostImgFile(null);
      setPostTitleFont('default'); setPostTitleColor('');
      fetchPosts(activeCom.id);
    } catch (e) {
      console.error(e);
      alert('Erro ao publicar');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: !p.isLiked, reactions: p.reactions + (p.isLiked ? -1 : 1) } : p));
    } catch (e) { console.error(e); }
  };

  const handleToggleMember = async (com: LazerCommunity) => {
    try {
      if (com.role === 'none') {
        await lazerApi.joinCommunity(com.inviteCode);
      } else {
        await lazerApi.leaveCommunity(com.id);
      }
      fetchCommunities();
    } catch (e) { console.error(e); }
  };

  const handleJoin = async () => {
    try {
      await lazerApi.joinCommunity(joinCode);
      setShowJoin(false); setJoinCode(''); setJoinErr('');
      fetchCommunities();
    } catch (e) { setJoinErr('Código inválido ou erro no servidor'); }
  };

  const addRule = async (comId: string) => {
    if (!editRule.trim() || !activeCom) return;
    try {
      await lazerApi.addRule(comId, editRule.trim());
      setEditRule('');
      const res: any = await lazerApi.getCommunity(comId);
      const updated = res.data || res;
      setCommunities((prev: any) => prev.map((c: any) => c.id === comId ? updated : c));
      if (selected?.id === comId) setSelected(updated);
    } catch (e) { console.error(e); }
  };

  const removeRule = async (comId: string, ruleId: string) => {
    try {
      await lazerApi.deleteRule(ruleId);
      const res: any = await lazerApi.getCommunity(comId);
      const updated = res.data || res;
      setCommunities((prev: any) => prev.map((c: any) => c.id === comId ? updated : c));
      if (selected?.id === comId) setSelected(updated);
    } catch (e) { console.error(e); }
  };

  const handleEditSave = async (patch: Partial<LazerCommunity>, banner?: File | null, icon?: File | null) => {
    if (!activeCom) return;
    try {
      let com = activeCom;
      const res: any = await lazerApi.updateCommunity(com.id, patch);
      com = res.data || res;

      if (banner || icon) {
        const mediaPatch: any = {};
        if (banner) mediaPatch.bannerUrl = await uploadLazerCommunityFile(banner, com.id);
        if (icon) mediaPatch.iconUrl = await uploadLazerCommunityFile(icon, com.id);
        const upRes: any = await lazerApi.updateCommunity(com.id, mediaPatch);
        com = upRes.data || upRes;
      }

      setCommunities((prev: any) => prev.map((c: any) => c.id === com.id ? com : c));
      setSelected(com);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const TABS: CTab[] = ['Discussions', 'Recommendations', 'Media Vault', 'Members List'];

  if (activeCom) {
    const com = activeCom;
    const a = com.accentColor;

    return (
      <div className="fixed inset-0 z-[160] flex flex-col overflow-hidden" style={{ isolation: 'isolate', fontFamily: "'Nunito', sans-serif" }}>
        <div className="absolute inset-0 -z-10"><ThemeBg color={a} mode={themeMode}/></div>

        <div className="relative shrink-0" style={{ height: 196, overflow: 'visible' }}>
          <div className="absolute inset-0 overflow-hidden">
            {isVideo(com.bannerUrl)
              ? <video src={com.bannerUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover"/>
              : com.bannerUrl
                ? <img src={com.bannerUrl} alt="" className="w-full h-full object-cover object-center"/>
                : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${a}90 0%, ${a}30 70%, ${a}08 100%)` }}/>}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.6) 100%)' }}/>
          </div>

          <button onClick={() => setSelected(null)} className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer hover:opacity-70 transition-opacity" style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(10px)' }}>
            <Ic.Arrow/> Comunidades
          </button>
          {com.role === 'admin' && (
            <button onClick={() => setShowEdit(true)} className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer hover:opacity-70 transition-opacity" style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(10px)' }}>
              <Ic.Edit/> Editar
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 flex items-end gap-4 z-10">
            <div className="w-[72px] h-[72px] rounded-[22px] border-[3.5px] flex items-center justify-center text-3xl overflow-hidden shadow-2xl shrink-0 relative"
              style={{ borderColor: 'rgba(255,255,255,0.28)', background: com.iconUrl ? 'transparent' : `${a}dd`, marginBottom: '-26px' }}>
              {isVideo(com.iconUrl)
                ? <video src={com.iconUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover"/>
                : com.iconUrl ? <img src={com.iconUrl} alt="" className="w-full h-full object-cover"/>
                : com.iconEmoji || '🌐'}
            </div>

            <div className="flex-1 min-w-0 pb-1.5">
              <h1 className="text-white font-black text-[26px] leading-tight drop-shadow-lg truncate">{com.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)' }}>
                  <Ic.Users/>
                  <span className="text-[12px] font-bold text-white">{(com.membersCount ?? 0).toLocaleString()}</span>
                  <span className="text-[10px] text-white/55">members</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)' }}>
                  <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]"/>
                  <span className="text-[12px] font-bold text-white">{com.onlineCount}</span>
                  <span className="text-[10px] text-white/55">online</span>
                </div>
              </div>
            </div>

            <button onClick={() => handleToggleMember(com)}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-black border-none cursor-pointer hover:scale-[1.04] active:scale-95 transition-all shadow-xl mb-1"
              style={{ background: com.role !== 'none' ? 'rgba(255,255,255,0.92)' : a, color: com.role !== 'none' ? '#333' : '#fff', boxShadow: com.role === 'none' ? `0 8px 24px ${a}55` : '0 4px 14px rgba(0,0,0,0.2)' }}>
              {com.role === 'admin' ? <><Ic.Crown/> Admin</> : com.role === 'member' ? <><Ic.Check/> Joined</> : <><Ic.Plus/> Join</>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 pt-10 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

            <div className="flex flex-col gap-4">
              <GlassPanel accent={a} isLight={isLight} className="overflow-hidden">
                <div className="flex overflow-x-auto">
                  {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="flex-1 px-3 py-3.5 text-[12px] font-black whitespace-nowrap bg-transparent border-none cursor-pointer min-w-max transition-all"
                      style={{ borderBottom: activeTab === tab ? `2.5px solid ${a}` : '2.5px solid transparent', color: activeTab === tab ? a : (isLight ? '#aaa' : '#666') }}>
                      {tab}
                    </button>
                  ))}
                </div>
              </GlassPanel>

              {activeTab === 'Discussions' && (
                <GlassPanel accent={a} isLight={isLight} className="p-5">
                  <div className="flex gap-3 items-start">
                    <Avatar src={myProfile?.avatarUrl} name={myProfile?.displayName || myProfile?.username || 'U'} className="w-10 h-10 rounded-full shrink-0"/>
                    <div className="flex-1">
                      <textarea value={postText} onChange={e => setPostText(e.target.value)} rows={2}
                        placeholder={`Partilha algo com ${com.name}...`}
                        className={`w-full border-none resize-none text-[14px] bg-transparent outline-none ${tp}`}/>
                      
                      <div className="flex items-center gap-4 mt-2 pb-2">
                        <CustomFontSelector 
                          selected={postTitleFont} 
                          onSelect={setPostTitleFont} 
                          fonts={PREMIUM_FONTS} 
                          borderColor={`${a}30`} 
                          textColor={tp} 
                          isLightMode={isLight}
                        />
                        <div className="flex items-center gap-1.5 ml-1">
                          {PREMIUM_COLORS_LIST.map(col => (
                            <button key={col.id} 
                              onClick={() => setPostTitleColor(postTitleColor === col.value ? '' : col.value)}
                              className="w-4 h-4 rounded-full border-none cursor-pointer transition-all hover:scale-125"
                              style={{ 
                                background: col.value, 
                                outline: postTitleColor === col.value ? `2px solid ${isLight ? '#000' : '#fff'}` : 'none',
                                outlineOffset: '1px'
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {postImgPreview && (
                        <div className="relative mt-2 rounded-xl overflow-hidden inline-block">
                          <img src={postImgPreview} alt="" className="max-h-[200px] rounded-xl object-cover block"/>
                          <button onClick={() => { setPostImgFile(null); setPostImgPreview(''); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center border-none cursor-pointer">✕</button>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t" style={{ borderColor: `${a}15` }}>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => { 
                          const f = e.target.files?.[0]; 
                          if (!f) return; 
                          setPostImgFile(f);
                          setPostImgPreview(await readFile(f)); 
                        }}/>
                        <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center hover:opacity-70" style={{ color: a }}>
                          <Ic.Img/>
                        </button>
                        <button onClick={handlePost} disabled={!postText.trim() || isPosting}
                          className="px-5 py-2 rounded-full text-[12px] font-black uppercase tracking-widest text-white border-none cursor-pointer disabled:opacity-30 hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
                          style={{ background: a, boxShadow: `0 8px 20px ${a}40` }}>{isPosting ? '...' : 'Publicar'}</button>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              )}

              {tabPosts.length === 0 ? (
                <GlassPanel accent={a} isLight={isLight} className={`flex flex-col items-center justify-center py-16 opacity-50 ${ts}`}>
                  <div className="text-5xl mb-3">{activeTab === 'Media Vault' ? '🖼️' : activeTab === 'Recommendations' ? '⭐' : '💬'}</div>
                  <p className="font-black text-[16px]">Sem conteúdo aqui ainda</p>
                  <p className="text-[12px] mt-1">{activeTab === 'Discussions' ? 'Sê o primeiro a publicar!' : 'Interage para ver conteúdo aqui.'}</p>
                </GlassPanel>
              ) : tabPosts.map((post: any) => (
                <PostCard key={post.id} post={post} com={com} onLike={handleLike} textPrimary={tp} textSecondary={ts} isLight={isLight}/>
              ))}

              {activeTab === 'Members List' && (
                <GlassPanel accent={a} isLight={isLight} className="p-6">
                  <h3 className={`font-black text-[11px] uppercase tracking-widest mb-5 ${ts}`}>Membros · {(com.membersCount ?? 0).toLocaleString()}</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={myProfile?.avatarUrl} name={myProfile?.displayName || 'User'} className="w-10 h-10 rounded-full shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <DisplayName profile={myProfile} fallbackName={myProfile?.displayName || 'User'} className={`font-extrabold text-[14px] ${tp}`}/>
                        <p className={`text-[11px] ${ts}`}>@{myProfile?.username || 'user'}</p>
                      </div>
                      {com.role === 'admin' && <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,177,50,0.2)', color: '#F0B132' }}>👑 Admin</span>}
                      <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]"/>
                    </div>
                  </div>
                </GlassPanel>
              )}
            </div>

            <aside className="flex flex-col gap-5 sticky top-6">
              <GlassPanel accent={a} isLight={isLight} className="p-5">
                <h3 className={`text-[10px] font-black uppercase tracking-[1.5px] mb-4 ${ts}`}>Regras</h3>
                <div className="flex flex-col gap-2.5">
                  {com.rules?.map((rule: any, i: number) => (
                    <div key={rule.id} className="flex items-start gap-2.5 group">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 text-white mt-0.5" style={{ background: a }}>{i + 1}</span>
                      <p className={`text-[12.5px] leading-relaxed flex-1 ${tp} opacity-85`}>{rule.text}</p>
                      {com.role === 'admin' && (
                        <button onClick={() => removeRule(com.id, rule.id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer text-red-400 shrink-0 mt-0.5"><Ic.Trash/></button>
                      )}
                    </div>
                  ))}
                  {com.rules.length === 0 && <p className={`text-[12px] italic ${ts} opacity-60`}>Sem regras definidas.</p>}
                </div>
                {com.role === 'admin' && (
                  <div className="mt-4 flex gap-2">
                    <input value={editRule} onChange={e => setEditRule(e.target.value)} placeholder="Nova regra..."
                      className={`flex-1 text-[12px] px-3 py-2 rounded-[12px] border bg-transparent outline-none ${tp}`}
                      style={{ borderColor: `${a}30` }} onKeyDown={e => e.key === 'Enter' && addRule(com.id)}/>
                    <button onClick={() => addRule(com.id)} className="w-8 h-8 rounded-[12px] flex items-center justify-center text-white border-none cursor-pointer hover:scale-105 transition-transform shrink-0" style={{ background: a }}><Ic.Plus/></button>
                  </div>
                )}
              </GlassPanel>

              <GlassPanel accent={a} isLight={isLight} className="p-5">
                <h3 className={`text-[10px] font-black uppercase tracking-[1.5px] mb-3 ${ts}`}>Similares</h3>
                <div className="flex flex-col gap-2">
                  {communities.filter((x: any) => x.id !== com.id).slice(0, 4).map((cc: any) => (
                    <button key={cc.id} onClick={() => { setSelected(cc); setActiveTab('Discussions'); }}
                      className="flex items-center gap-3 w-full bg-transparent border-none cursor-pointer text-left rounded-[14px] p-2 transition-all hover:opacity-80"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = `${cc.accentColor}12`)}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg shrink-0 overflow-hidden" style={{ background: cc.iconUrl ? 'transparent' : `${cc.accentColor}25` }}>
                        {isVideo(cc.iconUrl) ? <video src={cc.iconUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover"/>
                          : cc.iconUrl ? <img src={cc.iconUrl} alt="" className="w-full h-full object-cover"/>
                          : cc.iconEmoji || '🌐'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-extrabold text-[12px] truncate ${tp}`}>{cc.name}</p>
                        <p className={`text-[10px] ${ts}`}>{(cc.membersCount ?? 0).toLocaleString()} membros</p>
                      </div>
                    </button>
                  ))}
                </div>
              </GlassPanel>
            </aside>
          </div>
        </div>

        {showEdit && activeCom && (
          <EditCommunityModal com={activeCom} isLight={isLight} textPrimary={tp} textSecondary={ts} borderCol={borderCol}
            onClose={() => setShowEdit(false)}
            onSave={handleEditSave}/>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[160] flex flex-col" style={{ isolation: 'isolate', fontFamily: "'Nunito', sans-serif" }}>
      <div className="absolute inset-0 -z-10"><ThemeBg color={c} mode={themeMode}/></div>

      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b" style={{ borderColor: `${c}20`, background: isLight ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)', backdropFilter: 'blur(24px)' }}>
        <button onClick={onClose} className={`flex items-center gap-2 text-sm font-bold bg-transparent border-none cursor-pointer hover:opacity-60 transition-opacity ${tp}`}><Ic.Arrow/> Voltar</button>
        <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: c }}>Communities</span>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)} className="px-4 py-2 rounded-full text-[12px] font-black uppercase tracking-widest border-[1.5px] cursor-pointer hover:scale-105 transition-transform bg-transparent" style={{ borderColor: c, color: c }}># Entrar</button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-full text-[12px] font-black uppercase tracking-widest text-white border-none cursor-pointer hover:scale-105 transition-transform shadow-lg" style={{ background: c }}>+ Criar</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-8 items-start">

          <aside className="hidden lg:flex flex-col gap-6 sticky top-6">
            {myProfile && (
              <GlassPanel accent={c} isLight={isLight} className="overflow-hidden">
                <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${c}70, ${c}20)` }}>
                  {isVideo(myProfile.bannerUrl) ? <video src={myProfile.bannerUrl ?? undefined} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"/>
                    : myProfile.bannerUrl ? <img src={myProfile.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/>
                    : null}
                  <div className="absolute inset-0 bg-black/20"/>
                </div>
                <div className="flex flex-col items-center pb-6 px-5">
                  <div className="w-[80px] h-[80px] rounded-full border-[4px] overflow-hidden shadow-2xl -mt-10 relative z-10 mb-2" style={{ borderColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}>
                    <Avatar src={myProfile.avatarUrl} name={myProfile.username || 'U'} className="w-full h-full object-cover"/>
                  </div>
                  <DisplayName profile={myProfile} fallbackName={myProfile.displayName || myProfile.username || 'User'} className={`font-black text-[16px] text-center ${tp}`}/>
                  <p className={`text-[12px] mt-0.5 ${ts}`}>@{myProfile.username || 'user'}</p>
                </div>
              </GlassPanel>
            )}

            <GlassPanel accent={c} isLight={isLight} className="p-6">
              <h3 className={`text-[10px] font-black uppercase tracking-[2px] mb-5 ${ts} opacity-80`}>Visão Geral</h3>
              <div className="flex flex-col gap-5">
                {[
                  { icon: '🏘️', val: myComs.length, label: 'Communities', color: c },
                  { icon: '👥', val: totalMembers.toLocaleString(), label: 'Membros Totais', color: c },
                  { icon: '👑', val: communities.filter((x: any) => x.role === 'admin').length, label: 'Lideradas por ti', color: '#F0B132' },
                ].map(({ icon, val, label, color }) => (
                  <div key={label} className="relative group flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-white/5"
                    style={{ background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.02)', border: `1px solid ${color}15` }}>
                    <div className="w-11 h-11 rounded-[16px] flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `${color}18`, border: `1.5px solid ${color}25`, boxShadow: `0 8px 20px ${color}15` }}>{icon}</div>
                    <div className="flex-1">
                      <p className={`font-black text-[20px] leading-tight ${tp}`}>{val}</p>
                      <p className={`text-[9px] font-extrabold uppercase tracking-widest ${ts}`}>{label}</p>
                    </div>
                    <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: color }}/>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </aside>

          {/* MAIN */}
          <main className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h3 className={`text-[11px] font-black uppercase tracking-[2px] ${ts} opacity-80`}>As Minhas Communities</h3>
                <div className="flex items-center gap-2">
                   <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]"/>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${ts}`}>Tempo Real</span>
                   </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {myComs.length === 0 ? (
                  <GlassPanel accent={c} isLight={isLight} className="col-span-full py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                    <div className="text-5xl">🏘️</div>
                    <p className={`font-black text-[16px] ${tp}`}>Ainda não tens communities</p>
                    <button onClick={() => setShowJoin(true)} className="px-6 py-2 rounded-full text-xs font-bold bg-white/10 border-none cursor-pointer" style={{ color: c }}>Descobrir agora</button>
                  </GlassPanel>
                ) : myComs.map((com: any) => (
                  <CommunityCard key={com.id} com={com} onClick={() => { setSelected(com); setActiveTab('Discussions'); }} borderCol={borderCol} isLight={isLight} textPrimary={tp} textSecondary={ts}/>
                ))}
              </div>
            </div>

            {suggested.length > 0 && (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-3 px-2">
                  <h3 className={`text-[11px] font-black uppercase tracking-[2px] ${ts} opacity-80`}>Descobrir & Explorar</h3>
                  <div className="flex-1 h-px" style={{ background: `${c}15` }}/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {suggested.map((com: any) => (
                    <CommunityCard key={com.id} com={com} onClick={() => { setSelected(com); setActiveTab('Discussions'); }} borderCol={borderCol} isLight={isLight} textPrimary={tp} textSecondary={ts}/>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden lg:flex flex-col gap-5 sticky top-6">
            <GlassPanel accent={c} isLight={isLight} className="p-6">
              <h3 className={`text-[10px] font-black uppercase tracking-[2px] mb-5 ${ts} opacity-80`}>🔥 Em Alta</h3>
              <div className="flex flex-col gap-2">
                {[...communities].sort((a, b) => b.onlineCount - a.onlineCount).slice(0, 5).map(com => (
                  <button key={com.id} onClick={() => { setSelected(com); setActiveTab('Discussions'); }}
                    className="flex items-center gap-3 w-full bg-transparent border-none cursor-pointer text-left rounded-[14px] p-2 transition-all"
                    onMouseEnter={e => (e.currentTarget.style.background = `${com.accentColor}12`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg shrink-0 overflow-hidden" style={{ background: com.iconUrl ? 'transparent' : `${com.accentColor}25` }}>
                      {isVideo(com.iconUrl) ? <video src={com.iconUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover"/>
                        : com.iconUrl ? <img src={com.iconUrl} alt="" className="w-full h-full object-cover"/>
                        : com.iconEmoji || '🌐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-extrabold text-[12px] truncate ${tp}`}>{com.name}</p>
                      <p className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"/>{com.onlineCount} online
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel accent={c} isLight={isLight} className="p-6">
              <h3 className={`text-[10px] font-black uppercase tracking-[2px] mb-5 ${ts} opacity-80`}>Acesso Rápido</h3>
              <div className="flex flex-col gap-3">
                <button onClick={() => setShowCreate(true)} 
                  className="w-full h-[52px] rounded-[20px] text-white font-black text-[13px] uppercase tracking-widest border-none cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 group relative overflow-hidden" 
                  style={{ background: `linear-gradient(135deg, ${c}, ${c}dd)` }}>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
                  <span className="text-xl relative z-10 transition-transform group-hover:rotate-12">🌐</span>
                  <span className="relative z-10">Criar Community</span>
                </button>
                <button onClick={() => setShowJoin(true)} 
                  className="w-full h-[52px] rounded-[20px] font-black text-[13px] uppercase tracking-widest border-[2px] cursor-pointer hover:scale-[1.02] bg-transparent transition-all flex items-center justify-center gap-2 group" 
                  style={{ borderColor: `${c}40`, color: c }}>
                  <span className="text-xl transition-transform group-hover:scale-125">#️⃣</span>
                  <span>Entrar por Código</span>
                </button>
              </div>
            </GlassPanel>
          </aside>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateCommunityModal isLight={isLight} textPrimary={tp} textSecondary={ts}
          initialAccentColor={myProfile?.themeColor}
          onClose={() => setShowCreate(false)}
          onCreated={(nc: LazerCommunity) => { setCommunities((prev: any) => [nc, ...prev]); setShowCreate(false); setSelected(nc); }}/>
      )}

      {/* Join Modal */}
      {showJoin && (
        <OverlayModal onClose={() => { setShowJoin(false); setJoinCode(''); setJoinErr(''); }}>
          <div className="w-full max-w-[380px] rounded-[32px] p-8 shadow-2xl text-center"
            style={{ background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(12,12,20,0.95)', border: `1.5px solid ${c}30`, backdropFilter: 'blur(40px)' }}>
            <div className="text-5xl mb-4">#️⃣</div>
            <h2 className={`font-black text-[20px] mb-2 ${tp}`}>Entrar por Código</h2>
            <p className={`text-[13px] mb-5 ${ts}`}>Introduz o código de convite</p>
            <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinErr(''); }}
              placeholder="Ex: ROMCOM"
              className={`w-full px-4 py-3.5 rounded-[16px] border-[1.5px] text-[16px] font-black uppercase tracking-widest outline-none text-center mb-2 ${tp}`}
              style={{ background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)', borderColor: joinErr ? '#ef4444' : `${c}30` }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}/>
            {joinErr && <p className="text-red-400 text-[12px] font-bold mb-3">{joinErr}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowJoin(false); setJoinCode(''); setJoinErr(''); }} className={`flex-1 py-3 rounded-full font-black text-[13px] uppercase tracking-widest border-none cursor-pointer ${tp}`} style={{ background: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)' }}>Cancelar</button>
              <button onClick={handleJoin} disabled={!joinCode.trim()} className="flex-1 py-3 rounded-full text-white font-black text-[13px] uppercase tracking-widest border-none cursor-pointer disabled:opacity-30 hover:scale-[1.02] transition-transform" style={{ background: c }}>Entrar ✓</button>
            </div>
          </div>
        </OverlayModal>
      )}

      {/* Edit Modal */}
      {showEdit && activeCom && (
        <EditCommunityModal com={activeCom} onClose={() => setShowEdit(false)} onSave={handleEditSave}
          isLight={isLight} textPrimary={tp} textSecondary={ts} borderCol={borderCol}/>
      )}
    </div>
  );
}

// ─── Font Selector (Copied from Home feed for consistency) ───────────────────
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
