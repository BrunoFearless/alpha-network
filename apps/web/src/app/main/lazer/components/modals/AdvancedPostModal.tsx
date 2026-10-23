'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { EmojiPicker } from '@/components/community/EmojiPicker';
import { useMusicStore, Track } from '@/store/music.store';
import { useAuthStore } from '@/store/auth.store';
import { resolveUrl } from '@/lib/api';
import {
  FRAME_STYLES,
  WATERMARK_SUGGESTIONS,
  WATERMARK_ANIMATIONS,
  FrameStyleId,
  WatermarkAnimId,
  PostFrameRenderer,
  buildFrameTag,
  parsePostMetadata,
} from '../home/PostFrameStyles';

// Icons
const IconClose = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IconSparkles = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);
const IconGlass = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="6" />
    <path d="M7 8h10M7 12h6" />
  </svg>
);
const IconBook = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6 6h10M6 10h10" />
  </svg>
);
const IconTerminal = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);
const IconFilm = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="2" y1="9" x2="22" y2="9" /><line x1="2" y1="15" x2="22" y2="15" />
    <line x1="7" y1="4" x2="7" y2="9" /><line x1="17" y1="4" x2="17" y2="9" />
    <line x1="7" y1="15" x2="7" y2="20" /><line x1="17" y1="15" x2="17" y2="20" />
  </svg>
);
const IconDisc = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconMangaQuote = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-1 6-1 6z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-1 6-1 6z" />
  </svg>
);
const IconCosmos = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="5" strokeDasharray="2 2" />
    <circle cx="12" cy="12" r="9" strokeDasharray="1 3" opacity="0.5" />
    <circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" opacity="0.8" />
    <circle cx="19" cy="5" r="0.8" fill="currentColor" stroke="none" opacity="0.6" />
    <circle cx="20" cy="17" r="1" fill="currentColor" stroke="none" opacity="0.7" />
  </svg>
);
const IconImage = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconMusic = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);
const IconTrash = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconTag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconEmoji = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const IconHeart = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const IconComment = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconShare = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const PREMIUM_FONTS = [
  { id: 'default', label: 'Default', family: "'Nunito', sans-serif" },
  { id: 'serif', label: 'Serif', family: "'Playfair Display', serif" },
  { id: 'mono', label: 'Mono', family: "'Fira Code', monospace" },
  { id: 'display', label: 'Display', family: "'Outfit', sans-serif" },
  { id: 'elegant', label: 'Elegant', family: "'Libre Baskerville', serif" },
];

const PREMIUM_COLORS_LIST = [
  { id: 'pure_white', value: '#ffffff', label: 'White' },
  { id: 'pure_black', value: '#000000', label: 'Black' },
  { id: 'neon_pink', value: '#ff9ef0', label: 'Pink' },
  { id: 'cyan', value: '#00f2ff', label: 'Cyan' },
  { id: 'yellow', value: '#ffd600', label: 'Yellow' },
  { id: 'purple', value: '#bc13fe', label: 'Purple' },
  { id: 'green', value: '#86efac', label: 'Green' },
  { id: 'orange', value: '#ffb07c', label: 'Flame' },
  { id: 'red', value: '#ef4444', label: 'Red' },
];

const POPULAR_TAGS = ['#cultura', '#games', '#musica', '#cinema', '#lifestyle', '#anime', '#tech', '#arte', '#viagens'];

interface AdvancedPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    content: string;
    mediaFiles?: string[];
    tropeNames?: string[];
    isSparkle?: boolean;
    titleFont?: string;
    titleColor?: string;
  }) => Promise<boolean>;
  c: string;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  borderCol: string;
  cardBg: string;
  initialPost?: any | null;
}

export function AdvancedPostModal({
  isOpen,
  onClose,
  onSubmit,
  c,
  isLight,
  textPrimary,
  textSecondary,
  borderCol,
  cardBg,
  initialPost,
}: AdvancedPostModalProps) {
  const authUser = useAuthStore(s => s.user);
  const myProfile = authUser?.profile;
  const isEditMode = Boolean(initialPost);

  // Active view on mobile: 'editor' | 'preview'
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Form State
  const [postText, setPostText] = useState('');
  const [frameStyle, setFrameStyle] = useState<FrameStyleId>('standard');
  const [customWatermark, setCustomWatermark] = useState<string>('');
  const [watermarkAnim, setWatermarkAnim] = useState<WatermarkAnimId>('none');
  const [showWatermarkEmojiPicker, setShowWatermarkEmojiPicker] = useState(false);
  const [selectedFont, setSelectedFont] = useState('default');
  const [selectedColor, setSelectedColor] = useState('');
  const [isSparkle, setIsSparkle] = useState(false);
  const [enableAmbilight, setEnableAmbilight] = useState(true);

  // Media
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // BGM
  const [selectedBgm, setSelectedBgm] = useState<Track | null>(null);
  const [bgmSearch, setBgmSearch] = useState('');
  const [showBgmDrawer, setShowBgmDrawer] = useState(false);
  const { tracks: musicTracks, fetchTracks: fetchMusicTracks, currentTrack, isPlaying, playTrack, togglePlay } = useMusicStore();

  // Tags & Emoji
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Loading
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!musicTracks.length) fetchMusicTracks();

      if (initialPost) {
        const { cleanContent, frameStyle: parsedStyle, watermark: parsedWatermark, watermarkAnim: parsedAnim, bgm } = parsePostMetadata(initialPost.content || '');

        setPostText(cleanContent);
        setFrameStyle(parsedStyle);
        setCustomWatermark(parsedWatermark || '');
        setWatermarkAnim(parsedAnim || 'none');
        setSelectedBgm(bgm ? ({ id: bgm.id, title: bgm.title, artist: bgm.artist } as Track) : null);
        setSelectedFont(initialPost.titleFont || 'default');
        setSelectedColor(initialPost.titleColor || '');
        setIsSparkle(!!initialPost.isSparkle);

        if (initialPost.imageUrl) {
          let mediaArr: string[] = [];
          try {
            if (typeof initialPost.imageUrl === 'string' && initialPost.imageUrl.startsWith('[')) {
              mediaArr = JSON.parse(initialPost.imageUrl);
            } else if (Array.isArray(initialPost.imageUrl)) {
              mediaArr = initialPost.imageUrl;
            } else {
              mediaArr = [initialPost.imageUrl];
            }
          } catch {
            mediaArr = [initialPost.imageUrl];
          }
          const resolvedMedia = mediaArr.map((m: string) => resolveUrl(m));
          setMediaPreviews(resolvedMedia);
          setMediaFiles(mediaArr);
        } else {
          setMediaPreviews([]);
          setMediaFiles([]);
        }

        if (initialPost.tropes && Array.isArray(initialPost.tropes)) {
          setTagsList(initialPost.tropes.map((t: any) => t.name || t));
        } else {
          setTagsList([]);
        }
      } else {
        setPostText('');
        setFrameStyle('standard');
        setCustomWatermark('');
        setWatermarkAnim('none');
        setSelectedFont('default');
        setSelectedColor('');
        setIsSparkle(false);
        setMediaPreviews([]);
        setMediaFiles([]);
        setSelectedBgm(null);
        setTagsList([]);
      }
    }
  }, [isOpen, initialPost]);

  if (!isOpen) return null;

  // Handle Frame selection & defaults
  const handleSelectFrameStyle = (style: FrameStyleId) => {
    setFrameStyle(style);
    if (style !== 'standard' && !customWatermark) {
      const defaultWm = FRAME_STYLES.find(s => s.id === style)?.defaultWatermark || '';
      setCustomWatermark(defaultWm);
    }
  };

  // Helper render frame icon
  const renderFrameIcon = (id: FrameStyleId) => {
    switch (id) {
      case 'standard': return <IconSparkles size={14} />;
      case 'glass': return <IconGlass size={14} />;
      case 'editorial': return <IconBook size={14} />;
      case 'cyber': return <IconTerminal size={14} />;
      case 'cinema': return <IconFilm size={14} />;
      case 'retro': return <IconDisc size={14} />;
      case 'cosmos': return <IconCosmos size={14} />;
      case 'manga': return <IconMangaQuote size={14} />;
      default: return <IconSparkles size={14} />;
    }
  };

  // Handle Media Pick
  const handleMediaPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        if (result) {
          setMediaPreviews(prev => [...prev, result]);
          setMediaFiles(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (idx: number) => {
    setMediaPreviews(prev => prev.filter((_, i) => i !== idx));
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddTag = (t: string) => {
    const clean = t.replace('#', '').trim();
    if (clean && !tagsList.includes(clean)) {
      setTagsList(prev => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (clean: string) => {
    setTagsList(prev => prev.filter(item => item !== clean));
  };

  // Build final content string
  const buildFinalContent = () => {
    let finalContent = postText.trim();
    if (frameStyle !== 'standard') {
      finalContent = buildFrameTag(frameStyle, customWatermark, watermarkAnim) + finalContent;
    }
    if (selectedBgm) {
      finalContent = finalContent + `\n[bgm:${selectedBgm.id}:${selectedBgm.title}:${selectedBgm.artist}]`;
    }
    return finalContent;
  };

  const handlePublish = async () => {
    if (!postText.trim() && mediaFiles.length === 0) return;
    setIsPublishing(true);
    const finalContent = buildFinalContent();

    const success = await onSubmit({
      content: finalContent,
      mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
      tropeNames: tagsList.length > 0 ? tagsList : undefined,
      isSparkle,
      titleFont: selectedFont !== 'default' ? selectedFont : undefined,
      titleColor: selectedColor || undefined,
    });

    setIsPublishing(false);
    if (success) {
      onClose();
    }
  };

  // Dynamic color synchronization: watermark, borders, accents inherit selectedColor or themeColor
  const activeColor = selectedColor || c;
  const isBgmPlaying = isPlaying && currentTrack?.id === selectedBgm?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/45 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Shell */}
      <div
        className="w-full max-w-6xl h-[92vh] max-h-[880px] rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          background: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(20, 20, 28, 0.75)',
          backdropFilter: 'blur(36px) saturate(170%)',
          WebkitBackdropFilter: 'blur(36px) saturate(170%)',
          border: isLight ? '1.5px solid rgba(255, 255, 255, 0.95)' : '1px solid rgba(255, 255, 255, 0.22)',
          borderTop: isLight ? '2px solid rgba(255, 255, 255, 1)' : '1.5px solid rgba(255, 255, 255, 0.45)',
          borderBottom: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: isLight
            ? '0 30px 60px -12px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 1)'
            : '0 30px 60px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
        }}
      >
        {/* Specular Ridge Glow on Top */}
        <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none z-30" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: borderCol }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform hover:rotate-12"
              style={{ background: `linear-gradient(135deg, ${activeColor}, #ec4899)` }}
            >
              <IconSparkles size={20} />
            </div>
            <div>
              <h2 className={`font-black text-base sm:text-lg tracking-tight uppercase ${textPrimary}`}>
                {isEditMode ? 'Editar Publicação' : 'Estúdio de Criação Avançado'}
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                {isEditMode
                  ? 'Ajuste textos, modelos dinâmicos, marcas d\'água e trilha sonora'
                  : 'Design interativo, enquadramentos de conteúdo e pré-visualização em tempo real'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Tab Switcher */}
            <div className="lg:hidden flex p-1 rounded-2xl border" style={{ borderColor: borderCol, background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }}>
              <button
                type="button"
                onClick={() => setMobileTab('editor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${mobileTab === 'editor' ? 'shadow-sm text-white' : textSecondary}`}
                style={{ background: mobileTab === 'editor' ? c : 'transparent' }}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${mobileTab === 'preview' ? 'shadow-sm text-white' : textSecondary}`}
                style={{ background: mobileTab === 'preview' ? c : 'transparent' }}
              >
                Pré-visualização
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`w-9 h-9 rounded-2xl border flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 ${textSecondary} hover:${textPrimary}`}
              style={{
                borderColor: borderCol,
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Screen */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">

          {/* 🎛️ Left Column: Creation Tools & Inputs */}
          <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 ${mobileTab === 'editor' ? 'block' : 'hidden lg:flex'} lg:col-span-7 xl:col-span-7 min-w-0 w-full`}>

            {/* 1. Format / Presentation Style */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                  Modelo & Enquadramento do Conteúdo
                </label>
                {frameStyle !== 'standard' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors duration-300" style={{ background: `${activeColor}20`, color: activeColor }}>
                    ✦ Efeito sincronizado com a cor
                  </span>
                )}
              </div>

              {/* Grid of 7 Frame Models */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {FRAME_STYLES.map(style => {
                  const isSel = frameStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleSelectFrameStyle(style.id)}
                      className="flex flex-col text-left p-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-98"
                      style={{
                        borderColor: isSel ? activeColor : borderCol,
                        background: isSel
                          ? (isLight ? `${activeColor}15` : `${activeColor}20`)
                          : (isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)'),
                        boxShadow: isSel ? `0 4px 20px -2px ${activeColor}30` : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            background: isSel ? activeColor : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                            color: isSel ? '#ffffff' : (isLight ? '#444' : '#bbb'),
                          }}
                        >
                          {renderFrameIcon(style.id)}
                        </div>
                        <span className={`text-xs font-black truncate ${isSel ? textPrimary : textSecondary}`}>
                          {style.name}
                        </span>
                      </div>
                      <span className={`text-[10px] leading-tight line-clamp-1 opacity-70 ${textSecondary}`}>
                        {style.tagline}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Customization of Watermark & Sync info (if any frame is active) */}
              {frameStyle !== 'standard' && (
                <div
                  className="mt-3 p-3.5 rounded-2xl border animate-in fade-in duration-200"
                  style={{
                    borderColor: `${activeColor}35`,
                    background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>
                      Palavra / Marca d'Água de Fundo (Personalizada)
                    </label>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: activeColor }}>
                      ✦ Cor ajusta ao texto
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="flex-1 flex items-center px-3 py-2 rounded-xl border transition-all"
                      style={{
                        borderColor: `${activeColor}50`,
                        background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.2)',
                      }}
                    >
                      <input
                        type="text"
                        value={customWatermark}
                        onChange={e => setCustomWatermark(e.target.value)}
                        placeholder="Digita a tua palavra de fundo ou escolhe um emoji (ex: VIBE, 🔥, 🌸, CINEMA)..."
                        maxLength={24}
                        className={`w-full bg-transparent border-none outline-none text-xs font-black tracking-widest ${textPrimary} placeholder:${isLight ? 'text-black/35' : 'text-white/35'}`}
                      />
                      {customWatermark && (
                        <button
                          type="button"
                          onClick={() => setCustomWatermark('')}
                          className="text-xs opacity-50 hover:opacity-100 cursor-pointer p-0.5 ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Emoji Picker Button for Watermark */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowWatermarkEmojiPicker(!showWatermarkEmojiPicker)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                        style={{
                          borderColor: `${activeColor}50`,
                          background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                          color: activeColor,
                        }}
                        title="Adicionar Emoji na Marca d'Água"
                      >
                        <EmojiRenderer content="🔥" emojiSize={14} />
                        <span className="text-[10px] font-black uppercase">Emoji</span>
                      </button>
                      {showWatermarkEmojiPicker && (
                        <div className="absolute right-0 bottom-full mb-2 z-50">
                          <EmojiPicker
                            onSelect={emoji => {
                              setCustomWatermark(prev => (prev ? prev + ' ' + emoji : emoji));
                              setShowWatermarkEmojiPicker(false);
                            }}
                            onClose={() => setShowWatermarkEmojiPicker(false)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="mb-3">
                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 opacity-60 ${textSecondary}`}>
                      Sugestões Rápidas:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                      {WATERMARK_SUGGESTIONS.map(sug => {
                        const isMatch = customWatermark.toUpperCase() === sug.toUpperCase();
                        return (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setCustomWatermark(sug)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95 border"
                            style={{
                              borderColor: isMatch ? activeColor : (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                              background: isMatch ? `${activeColor}25` : (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'),
                              color: isMatch ? activeColor : undefined,
                            }}
                          >
                            {sug}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 8 Modelos de Animação da Marca d'Água do Fundo */}
                  <div className="pt-2.5 border-t" style={{ borderColor: `${activeColor}25` }}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-[10px] font-black uppercase tracking-wider ${textSecondary}`}>
                        Animação do Fundo & Marca d'Água (8 Modelos)
                      </label>
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: activeColor }}>
                        ✦ Efeito Dinâmico
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                      {WATERMARK_ANIMATIONS.map(an => {
                        const isSel = watermarkAnim === an.id;
                        return (
                          <button
                            key={an.id}
                            type="button"
                            onClick={() => setWatermarkAnim(an.id)}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer hover:scale-[1.03] active:scale-95"
                            style={{
                              borderColor: isSel ? activeColor : borderCol,
                              background: isSel
                                ? (isLight ? `${activeColor}20` : `${activeColor}25`)
                                : (isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)'),
                              boxShadow: isSel ? `0 4px 14px -2px ${activeColor}35` : 'none',
                            }}
                            title={an.tagline}
                          >
                            <div className="text-base mb-0.5">
                              <EmojiRenderer content={an.emoji} emojiSize={18} />
                            </div>
                            <span
                              className={`text-[10px] font-black truncate w-full ${isSel ? textPrimary : textSecondary}`}
                              style={{ color: isSel ? activeColor : undefined }}
                            >
                              {an.name}
                            </span>
                            <span className="text-[8px] opacity-60 truncate w-full" style={{ color: isLight ? '#555' : '#aaa' }}>
                              {an.tagline.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Text Content Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                  Texto da Publicação
                </label>
                <span className={`text-[10px] font-bold ${textSecondary}`}>
                  {postText.length} caracteres
                </span>
              </div>
              <div
                className="relative rounded-2xl border p-3.5 transition-all w-full min-w-0 break-words"
                style={{
                  borderColor: borderCol,
                  background: isLight ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="Primeira linha será o Título da publicação...&#10;Linhas seguintes formam o corpo e a reflexão da publicação."
                  rows={4}
                  className={`w-full min-w-0 bg-transparent resize-none outline-none text-sm font-medium leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] ${textPrimary} placeholder:${isLight ? 'text-black/35' : 'text-white/35'}`}
                />
                <div className="flex items-center justify-between pt-2 border-t mt-2" style={{ borderColor: borderCol }}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${textSecondary} hover:${textPrimary}`}
                      style={{ borderColor: borderCol, background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }}
                    >
                      <IconEmoji size={14} />
                      <span>Emoji</span>
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute left-0 bottom-full mb-2 z-50">
                        <EmojiPicker
                          onSelect={emoji => {
                            setPostText(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSparkle(!isSparkle)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${isSparkle ? 'text-amber-400 border-amber-400/50 bg-amber-400/10' : textSecondary}`}
                    style={{ borderColor: isSparkle ? undefined : borderCol }}
                  >
                    <IconSparkles size={14} />
                    <span>Efeito Sparkle</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Typography & Color Palettes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Font Selector */}
              <div>
                <label className={`text-[11px] font-black uppercase tracking-wider mb-2 block ${textSecondary}`}>
                  Tipografia do Título
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PREMIUM_FONTS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFont(f.id)}
                      className="py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer"
                      style={{
                        fontFamily: f.family,
                        borderColor: selectedFont === f.id ? activeColor : borderCol,
                        background: selectedFont === f.id ? `${activeColor}20` : (isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.03)'),
                        color: selectedFont === f.id ? activeColor : (isLight ? '#222' : '#ddd'),
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector with Synchronization Note */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                    Cor de Destaque
                  </label>
                  {selectedColor && (
                    <button
                      type="button"
                      onClick={() => setSelectedColor('')}
                      className="text-[10px] font-bold opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      Redefinir
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {PREMIUM_COLORS_LIST.map(color => {
                    const isSel = selectedColor === color.value;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColor(selectedColor === color.value ? '' : color.value)}
                        className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer relative"
                        style={{
                          background: color.value,
                          borderColor: isSel ? '#ffffff' : 'rgba(255,255,255,0.25)',
                          boxShadow: isSel ? `0 0 12px ${color.value}` : 'none',
                        }}
                        title={color.label}
                      >
                        {isSel && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-black">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className={`text-[10px] mt-2 opacity-70 ${textSecondary}`}>
                  ✦ Sincroniza a cor do texto, marca d'água de fundo e aura da moldura.
                </div>
              </div>
            </div>

            {/* 4. Media Upload & Previews */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}>
                  Mídia & Efeitos de Imersão ({mediaPreviews.length}/4)
                </label>
                {mediaPreviews.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEnableAmbilight(!enableAmbilight)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all ${enableAmbilight ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : textSecondary}`}
                    style={{ borderColor: enableAmbilight ? undefined : borderCol }}
                  >
                    Ambilight: {enableAmbilight ? 'Ligado' : 'Desligado'}
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaPick}
              />

              <div className="grid grid-cols-4 gap-2">
                {mediaPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border group"
                    style={{ borderColor: borderCol }}
                  >
                    {preview.match(/\.(mp4|webm|mov)(\?|$)/i) || preview.startsWith('data:video') ? (
                      <video src={preview} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                    ) : (
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-all cursor-pointer shadow-md"
                    >
                      <IconClose size={12} />
                    </button>
                  </div>
                ))}

                {mediaPreviews.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{
                      borderColor: borderCol,
                      background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                      color: activeColor,
                    }}
                  >
                    <IconImage size={20} />
                    <span className="text-[10px] font-bold">Adicionar</span>
                  </button>
                )}
              </div>
            </div>

            {/* 5. Soundtrack / BGM Attachment */}
            <div>
              <label className={`text-[11px] font-black uppercase tracking-wider mb-2 block ${textSecondary}`}>
                Trilha Sonora do Post (BGM)
              </label>

              {selectedBgm ? (
                <div
                  className="flex items-center justify-between p-3 rounded-2xl border transition-all"
                  style={{
                    borderColor: `${activeColor}40`,
                    background: `${activeColor}12`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentTrack?.id === selectedBgm.id) {
                          togglePlay();
                        } else {
                          playTrack(selectedBgm);
                        }
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 shadow-md cursor-pointer transition-transform hover:scale-105"
                      style={{ background: activeColor }}
                    >
                      {isBgmPlaying ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      )}
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black truncate" style={{ color: activeColor }}>
                        {selectedBgm.title}
                      </span>
                      <span className={`text-[10px] font-bold opacity-70 truncate ${textSecondary}`}>
                        {selectedBgm.artist}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBgm(null)}
                    className="p-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBgmDrawer(!showBgmDrawer)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer"
                    style={{
                      borderColor: borderCol,
                      background: isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.03)',
                      color: textSecondary,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <IconMusic size={16} />
                      <span>Anexar Música ao Post...</span>
                    </div>
                    <span className="text-[10px] opacity-60">Escolher</span>
                  </button>

                  {/* BGM Dropdown Drawer */}
                  {showBgmDrawer && (
                    <div
                      className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border p-3 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150"
                      style={{
                        background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(25, 25, 35, 0.95)',
                        borderColor: borderCol,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Pesquisar faixas do Alpha Music..."
                        value={bgmSearch}
                        onChange={e => setBgmSearch(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs border bg-transparent outline-none mb-2 ${textPrimary}`}
                        style={{ borderColor: borderCol }}
                      />
                      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                        {musicTracks
                          .filter(t => t.title.toLowerCase().includes(bgmSearch.toLowerCase()) || t.artist.toLowerCase().includes(bgmSearch.toLowerCase()))
                          .slice(0, 10)
                          .map(track => (
                            <div
                              key={track.id}
                              onClick={() => {
                                setSelectedBgm(track);
                                setShowBgmDrawer(false);
                              }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-all"
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className={`text-xs font-bold truncate ${textPrimary}`}>{track.title}</span>
                                <span className={`text-[10px] opacity-60 truncate ${textSecondary}`}>{track.artist}</span>
                              </div>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: `${activeColor}20`, color: activeColor }}>
                                Anexar
                              </span>
                            </div>
                          ))}
                        {musicTracks.length === 0 && (
                          <div className={`p-4 text-center text-xs opacity-60 ${textSecondary}`}>
                            Nenhuma faixa encontrada na biblioteca.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Tropes & Tags */}
            <div>
              <label className={`text-[11px] font-black uppercase tracking-wider mb-2 block ${textSecondary}`}>
                Tags & Tropes Temáticos
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Escreve uma tag (ex: #games, #cinema)..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border bg-transparent outline-none ${textPrimary}`}
                  style={{ borderColor: borderCol }}
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
                  style={{ background: activeColor }}
                >
                  Adicionar
                </button>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5">
                {tagsList.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{ borderColor: `${activeColor}50`, background: `${activeColor}15`, color: activeColor }}
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="cursor-pointer hover:opacity-100 opacity-60 p-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {POPULAR_TAGS.map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => handleAddTag(pt)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border cursor-pointer hover:opacity-100 opacity-60 transition-all ${textSecondary}`}
                    style={{ borderColor: borderCol }}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* 📱 Right Column: Live Interactive Preview */}
          <div
            className={`flex flex-col h-full overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:border-l relative ${mobileTab === 'preview' ? 'block' : 'hidden lg:flex'} lg:col-span-5 xl:col-span-5 min-w-0 w-full`}
            style={{
              borderColor: borderCol,
              background: isLight ? 'rgba(0, 0, 0, 0.015)' : 'rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Live Indicator Chip */}
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider" style={{ color: activeColor }}>
                <span className="w-2 h-2 rounded-full animate-ping" style={{ background: activeColor }} />
                <span>Pré-visualização em Tempo Real</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${textSecondary}`} style={{ borderColor: borderCol }}>
                Como ficará no feed
              </span>
            </div>

            {/* Simulated Post Card in Preview */}
            <div
              className="rounded-3xl p-5 border relative overflow-hidden transition-all duration-300 w-full min-w-0 break-words"
              style={{
                background: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.04)',
                borderColor: borderCol,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isLight
                  ? '0 12px 30px -4px rgba(0, 0, 0, 0.08)'
                  : '0 20px 40px -8px rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* Sparkle border glow if active */}
              {isSparkle && (
                <div
                  className="absolute inset-0 border-2 rounded-3xl pointer-events-none animate-pulse"
                  style={{ borderColor: '#fbbf24', boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}
                />
              )}

              {/* Author Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={myProfile?.avatarUrl}
                    name={myProfile?.displayName || myProfile?.username || 'U'}
                    className="w-10 h-10 rounded-full border shadow-sm"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-black truncate ${textPrimary}`}>
                      <DisplayName
                        profile={myProfile}
                        fallbackName={myProfile?.displayName || myProfile?.username || 'Eu'}
                      />
                    </span>
                    <span className={`text-xs opacity-60 ${textSecondary}`}>
                      @{myProfile?.username || 'user'} · Agora mesmo
                    </span>
                  </div>
                </div>
              </div>

              {/* BGM Badge preview if attached */}
              {selectedBgm && (
                <div
                  className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border mb-3 cursor-default select-none transition-all"
                  style={{
                    background: `${activeColor}15`,
                    borderColor: `${activeColor}40`,
                    boxShadow: `0 4px 15px ${activeColor}20`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-neutral-900 border border-white/20 flex items-center justify-center shrink-0"
                    style={{
                      animation: isBgmPlaying ? 'spin 3s linear infinite' : 'none',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: activeColor }} />
                  </div>
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="text-[11px] font-black truncate max-w-[150px]" style={{ color: activeColor }}>
                      {selectedBgm.title}
                    </span>
                    <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest truncate max-w-[100px]">
                      {selectedBgm.artist}
                    </span>
                  </div>
                  {/* Equalizer animation */}
                  <div className="flex items-end gap-[2px] h-3 px-1">
                    <span className="w-[2px] h-full rounded-full" style={{ background: activeColor }} />
                    <span className="w-[2px] h-[60%] rounded-full" style={{ background: activeColor }} />
                    <span className="w-[2px] h-[90%] rounded-full" style={{ background: activeColor }} />
                  </div>
                </div>
              )}

              {/* Dynamic Post Container Frame Renderer */}
              <div className="my-2 w-full min-w-0 break-words">
                <PostFrameRenderer
                  content={postText || 'Título da Publicação\nUma reflexão envolvente para a tua publicação no Lazer Alpha Network.'}
                  frameStyle={frameStyle}
                  watermark={customWatermark}
                  watermarkAnim={watermarkAnim}
                  postTitleFont={selectedFont}
                  postTitleColor={selectedColor}
                  isLight={isLight}
                  themeColor={c}
                  fontsList={PREMIUM_FONTS}
                />
              </div>

              {/* Media Preview with Real-time Ambilight */}
              {mediaPreviews.length > 0 && (
                <div className="relative group/amb my-3">
                  {/* Dynamic Ambilight Back-Glow */}
                  {enableAmbilight && (
                    <div
                      className="absolute -inset-3 rounded-[28px] opacity-60 transition-all duration-700 pointer-events-none -z-10 blur-2xl scale-[0.98]"
                      style={{
                        backgroundImage: `url('${mediaPreviews[0]}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(36px) saturate(220%)',
                      }}
                    />
                  )}

                  <div className="rounded-2xl overflow-hidden border relative" style={{ borderColor: borderCol }}>
                    {mediaPreviews[0].match(/\.(mp4|webm|mov)(\?|$)/i) || mediaPreviews[0].startsWith('data:video') ? (
                      <video src={mediaPreviews[0]} className="w-full max-h-72 object-cover" controls muted />
                    ) : (
                      <img src={mediaPreviews[0]} alt="preview" className="w-full max-h-72 object-cover" />
                    )}
                  </div>

                  {/* Thumbnail gallery if multiple media */}
                  {mediaPreviews.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {mediaPreviews.slice(1).map((m, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border shrink-0" style={{ borderColor: borderCol }}>
                          <img src={m} alt="thumb" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tags List */}
              {tagsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: borderCol }}>
                  {tagsList.map(t => (
                    <span
                      key={t}
                      className="text-xs font-bold"
                      style={{ color: activeColor }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Simulated Action Bar */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t text-xs font-bold opacity-60" style={{ borderColor: borderCol }}>
                <span className="flex items-center gap-1.5"><IconHeart size={14} /> Curtir</span>
                <span className="flex items-center gap-1.5"><IconComment size={14} /> Comentar</span>
                <span className="flex items-center gap-1.5"><IconShare size={14} /> Partilhar</span>
              </div>
            </div>

            {/* Bottom publish tip */}
            <div className={`mt-auto pt-6 text-center text-xs ${textSecondary}`}>
              Podes alternar livremente entre os estilos e cores até estares 100% satisfeito com o resultado visual.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0" style={{ borderColor: borderCol }}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-full text-xs font-bold border cursor-pointer transition-all hover:scale-105 active:scale-95 ${textSecondary} hover:${textPrimary}`}
            style={{ borderColor: borderCol, background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }}
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={(!postText.trim() && mediaFiles.length === 0) || isPublishing}
              className="px-7 py-2.5 rounded-full text-xs font-black text-black cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg flex items-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${activeColor}, #ec4899)`,
                boxShadow: `0 8px 24px -4px ${activeColor}50`,
              }}
            >
              {isPublishing ? (
                <span>A processar...</span>
              ) : (
                <>
                  <IconSparkles size={14} />
                  <span>{isEditMode ? 'Guardar Alterações' : 'Publicar no Feed'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
