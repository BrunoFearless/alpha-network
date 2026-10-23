'use client';

import React, { useState, useRef, useCallback } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { Avatar } from '@/components/ui';
import { DisplayName } from '@/components/ui/DisplayName';
import { PostFrameRenderer, parsePostMetadata } from '../home/PostFrameStyles';
import { resolveUrl } from '@/lib/api';

type CaptureFormat = 'story' | 'feed' | 'horizontal' | 'banner';
type CanvasThemeId = 'obsidian' | 'aura' | 'midnight' | 'cyber' | 'emerald' | 'sunset';
type CardStyleId = 'glass' | 'solid' | 'glow';
type PaddingStyleId = 'normal' | 'expanded';

interface AestheticCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'post' | 'profile';
  post?: any | null;
  profile?: any | null;
  isOwnProfile?: boolean;
  themeColor?: string;
  isLight?: boolean;
}

export function AestheticCaptureModal({
  isOpen,
  onClose,
  mode = 'post',
  post,
  profile,
  themeColor = '#00f2ff',
  isLight = false,
}: AestheticCaptureModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Core settings
  const [format, setFormat] = useState<CaptureFormat>('story');
  const [canvasTheme, setCanvasTheme] = useState<CanvasThemeId>('obsidian');
  const [cardStyle, setCardStyle] = useState<CardStyleId>('glass');
  const [canvasPadding, setCanvasPadding] = useState<PaddingStyleId>('normal');
  
  // Optional toggles
  const [enableAmbilight, setEnableAmbilight] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showMedia, setShowMedia] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Post Metadata Resolution
  const rawPostContent = post?.content || '';
  const { cleanContent, frameStyle, watermark, watermarkAnim, bgm } = parsePostMetadata(rawPostContent);

  // Media preview resolution if post has images
  let postImages: string[] = [];
  if (post?.imageUrl) {
    try {
      if (typeof post.imageUrl === 'string' && post.imageUrl.startsWith('[')) {
        postImages = JSON.parse(post.imageUrl);
      } else if (Array.isArray(post.imageUrl)) {
        postImages = post.imageUrl;
      } else {
        postImages = [post.imageUrl];
      }
    } catch {
      postImages = [post.imageUrl];
    }
  }

  // Author / Profile data
  const targetAuthor = mode === 'post' ? (post?.author || {}) : profile;
  const authorProfile = targetAuthor?.profile || targetAuthor;
  const authorName = authorProfile?.displayName || authorProfile?.username || 'Usuário Alpha';
  const authorHandle = authorProfile?.username || 'usuario';
  const authorAvatar = authorProfile?.avatarUrl;
  const authorBanner = authorProfile?.bannerUrl;
  const authorBio = authorProfile?.bio;
  const authorStatus = authorProfile?.status;

  const activeAccent = post?.titleColor || profile?.themeColor || themeColor || '#00f2ff';

  // Canvas background theme styles
  const getCanvasBackground = () => {
    switch (canvasTheme) {
      case 'aura':
        return `linear-gradient(145deg, #07080c 45%, ${activeAccent}25 100%)`;
      case 'midnight':
        return 'linear-gradient(145deg, #040714 0%, #0b1430 100%)';
      case 'cyber':
        return 'linear-gradient(145deg, #0d0614 0%, #200a2b 100%)';
      case 'emerald':
        return 'linear-gradient(145deg, #030d0a 0%, #082419 100%)';
      case 'sunset':
        return 'linear-gradient(145deg, #120606 0%, #290d0b 100%)';
      case 'obsidian':
      default:
        return '#07080c';
    }
  };

  // Card background & border styles
  const getCardStyles = () => {
    switch (cardStyle) {
      case 'solid':
        return {
          background: '#101118',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        };
      case 'glow':
        return {
          background: 'rgba(16, 17, 24, 0.94)',
          borderColor: `${activeAccent}80`,
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px -4px ${activeAccent}40`,
        };
      case 'glass':
      default:
        return {
          background: 'rgba(16, 17, 24, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.14)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
        };
    }
  };

  const showToast = useCallback((msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3200);
  }, []);

  // 1. Download High-DPI PNG
  const handleDownload = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });

      const a = document.createElement('a');
      const filename = mode === 'post'
        ? `alpha-post-${format}-${authorHandle}-${Date.now()}.png`
        : `alpha-perfil-${format}-${authorHandle}-${Date.now()}.png`;
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('✓ Imagem HD descarregada com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      showToast('Não foi possível gerar a imagem. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Direct Clipboard Copy
  const handleCopy = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });

      if (!blob) throw new Error('Falha ao gerar blob de imagem');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('✓ Imagem copiada! Pode colar no WhatsApp ou Stories.');
      } else {
        await handleDownload();
      }
    } catch (err) {
      console.error('Erro ao copiar imagem:', err);
      await handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Native Web Share
  const handleShare = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });

      if (!blob) throw new Error('Falha ao gerar blob');

      const file = new File([blob], `alpha-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Alpha Network · @${authorHandle}`,
          text: `Compartilhado de @${authorHandle} no Alpha Network.`,
        });
        showToast('✓ Partilhado com sucesso!');
      } else {
        await handleCopy();
      }
    } catch (err) {
      console.error('Erro ao partilhar:', err);
      await handleCopy();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const isStory = format === 'story';
  const isFeed = format === 'feed';
  const isHorizontal = format === 'horizontal';
  const isBanner = format === 'banner';

  // Responsive target card styles
  const getTargetDimensions = () => {
    if (isHorizontal) {
      return {
        width: '560px',
        height: '320px',
        borderRadius: '24px',
        padding: canvasPadding === 'expanded' ? '18px 20px' : '24px 28px',
      };
    }
    if (isBanner) {
      return {
        width: '560px',
        minHeight: '180px',
        height: 'auto',
        borderRadius: '22px',
        padding: canvasPadding === 'expanded' ? '16px 20px' : '22px 26px',
      };
    }
    if (isFeed) {
      return {
        width: '420px',
        height: '525px',
        borderRadius: '26px',
        padding: canvasPadding === 'expanded' ? '18px 14px' : '24px 20px',
      };
    }
    // Story (9:16)
    return {
      width: '390px',
      height: '690px',
      borderRadius: '32px',
      padding: canvasPadding === 'expanded' ? '22px 16px' : '32px 24px',
    };
  };

  const targetDims = getTargetDimensions();

  const THEMES: { id: CanvasThemeId; label: string; preview: string }[] = [
    { id: 'obsidian', label: 'Obsidian', preview: '#07080c' },
    { id: 'aura', label: 'Aura', preview: `linear-gradient(135deg, #07080c, ${activeAccent})` },
    { id: 'midnight', label: 'Midnight', preview: 'linear-gradient(135deg, #040714, #182859)' },
    { id: 'cyber', label: 'Cyber', preview: 'linear-gradient(135deg, #0d0614, #3a1052)' },
    { id: 'emerald', label: 'Esmeralda', preview: 'linear-gradient(135deg, #030d0a, #0b422e)' },
    { id: 'sunset', label: 'Sunset', preview: 'linear-gradient(135deg, #120606, #4d1813)' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] px-5 py-2.5 rounded-full bg-white text-black font-black text-xs shadow-2xl animate-in fade-in slide-in-from-top-3 flex items-center gap-2">
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Main Studio Frame */}
      <div
        className="w-full max-w-4xl max-h-[96vh] flex flex-col rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative"
        style={{
          background: 'linear-gradient(180deg, #0e1017 0%, #06070a 100%)',
        }}
      >
        {/* ── Top Header ── */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/10 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm shadow-md"
              style={{ background: `${activeAccent}25`, color: activeAccent, border: `1px solid ${activeAccent}40` }}
            >
              📸
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                <span>{mode === 'post' ? 'Captura de Publicação' : 'Captura de Perfil'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest text-black" style={{ background: activeAccent }}>
                  HD Clean
                </span>
              </h2>
              <p className="text-[11px] text-white/50">
                {mode === 'post' ? 'Design original fiel do Alpha com formatos verticais e horizontais' : 'Cartão de perfil autêntico do Alpha para Status, Feed e Banners'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Format Pill Switcher */}
            <div className="flex p-1 rounded-2xl border border-white/10 bg-white/5">
              <button
                type="button"
                onClick={() => setFormat('story')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isStory ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                title="Status do WhatsApp e Instagram Stories (9:16)"
              >
                <span>📱 Status</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('feed')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isFeed ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                title="Post Quadrado / Retangular para Redes (4:5)"
              >
                <span>🖼️ Feed</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('horizontal')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isHorizontal ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                title="Paisagem Horizontal (16:9)"
              >
                <span>💻 16:9</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('banner')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isBanner ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                title="Faixa Compacta Horizontal sob medida para citações e frases curtas"
              >
                <span>📏 Faixa</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-white/70 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Optional Customization Toolbar (Sleek & Unobtrusive) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-white/5 bg-white/[0.02] shrink-0 text-xs">
          {/* Fundo do Canvas */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Fundo:</span>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setCanvasTheme(theme.id)}
                  className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${canvasTheme === theme.id ? 'scale-125 border-white shadow-md ring-2 ring-white/40' : 'border-white/20 opacity-70 hover:opacity-100'}`}
                  style={{ background: theme.preview }}
                  title={theme.label}
                />
              ))}
            </div>
          </div>

          {/* Estilo do Card */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Card:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setCardStyle('glass')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${cardStyle === 'glass' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Vidro
              </button>
              <button
                type="button"
                onClick={() => setCardStyle('solid')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${cardStyle === 'solid' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Sólido
              </button>
              <button
                type="button"
                onClick={() => setCardStyle('glow')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${cardStyle === 'glow' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Borda Neon
              </button>
            </div>
          </div>

          {/* Respiro / Padding */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Respiro:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setCanvasPadding('normal')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${canvasPadding === 'normal' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Padrão
              </button>
              <button
                type="button"
                onClick={() => setCanvasPadding('expanded')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${canvasPadding === 'expanded' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                Expandido
              </button>
            </div>
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-3">
            {postImages.length > 0 && mode === 'post' && (
              <button
                type="button"
                onClick={() => setShowMedia(!showMedia)}
                className="text-[11px] font-bold text-white/70 hover:text-white flex items-center gap-1.5 cursor-pointer"
                title="Mostrar ou ocultar imagem anexada (para focar só no texto da crônica)"
              >
                <span className={`w-2 h-2 rounded-full ${showMedia ? 'bg-purple-400' : 'bg-white/20'}`} />
                <span>Foto: {showMedia ? 'Sim' : 'Não'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDate(!showDate)}
              className="text-[11px] font-bold text-white/70 hover:text-white flex items-center gap-1.5 cursor-pointer"
              title="Mostrar ou ocultar data da publicação"
            >
              <span className={`w-2 h-2 rounded-full ${showDate ? 'bg-amber-400' : 'bg-white/20'}`} />
              <span>Data: {showDate ? 'Sim' : 'Não'}</span>
            </button>
          </div>
        </div>

        {/* ── Studio Viewport (Centerpiece Preview) ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex items-center justify-center relative">

          {/* 📸 CAPTURE TARGET (This exact element is exported to PNG) */}
          <div
            ref={cardRef}
            className="relative overflow-hidden transition-all duration-300 flex flex-col justify-between shrink-0 select-none"
            style={{
              width: targetDims.width,
              height: targetDims.height,
              minHeight: (targetDims as any).minHeight,
              background: getCanvasBackground(),
              borderRadius: targetDims.borderRadius,
              padding: targetDims.padding,
              boxShadow: '0 30px 90px -20px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* ── 1. AMBIENT AMBILIGHT BACK-GLOW (Soft & Elegant) ── */}
            {enableAmbilight && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div
                  className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] opacity-40"
                  style={{
                    background: postImages[0] ? `url('${resolveUrl(postImages[0])}')` : activeAccent,
                    backgroundSize: 'cover',
                  }}
                />
                <div
                  className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[100px] opacity-30"
                  style={{
                    background: activeAccent,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080c]/60 via-transparent to-black/40" />
              </div>
            )}

            {/* ── 2. TOP BRANDING PILL ── */}
            <div className="relative z-20 flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full" style={{ background: activeAccent }} />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                  ALPHA NETWORK
                </span>
              </div>
              <span className="text-[9px] font-bold text-white/40 tracking-wider">
                {mode === 'post' ? 'PUBLICADO' : 'PERFIL'}
              </span>
            </div>

            {/* ── 3. CENTER CONTENT: AUTHENTIC ALPHA LOOK ── */}
            <div className="relative z-20 my-auto w-full">

              {/* ── MODE: POST (Authentic Alpha Publication) ── */}
              {mode === 'post' && (
                <div
                  className={`w-full rounded-[24px] border relative overflow-hidden transition-all ${isHorizontal || isBanner ? 'p-4 sm:p-5' : 'p-5'}`}
                  style={getCardStyles()}
                >
                  {/* Author Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar
                      src={authorAvatar}
                      name={authorName}
                      className="w-10 h-10 rounded-full border-2 shadow-md shrink-0"
                      style={{ borderColor: activeAccent }}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white truncate">
                          <DisplayName profile={authorProfile} fallbackName={authorName} />
                        </span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill={activeAccent}>
                          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-white/50 font-bold truncate">
                        @{authorHandle}{showDate ? ` · ${post?.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-PT') : 'Hoje'}` : ''}
                      </span>
                    </div>

                    {/* BGM Pill if post has music */}
                    {bgm && (
                      <div
                        className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border shrink-0"
                        style={{
                          background: `${activeAccent}18`,
                          borderColor: `${activeAccent}40`,
                          color: activeAccent,
                        }}
                      >
                        <span className="text-[10px]">💿</span>
                        <span className="truncate max-w-[85px]">{bgm.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Post Frame Content */}
                  <div className="w-full min-w-0">
                    <PostFrameRenderer
                      content={cleanContent || 'Uma reflexão memorável compartilhada no Alpha Network.'}
                      frameStyle={frameStyle}
                      watermark={watermark}
                      watermarkAnim={watermarkAnim}
                      postTitleFont={post?.titleFont}
                      postTitleColor={post?.titleColor}
                      isLight={false}
                      themeColor={activeAccent}
                      collapsible={false}
                    />

                    {/* Attached Image if any and enabled */}
                    {showMedia && postImages.length > 0 && (
                      <div className={`mt-3 rounded-2xl overflow-hidden border border-white/10 shadow-lg ${isHorizontal ? 'max-h-28' : 'max-h-52'}`}>
                        <img
                          src={resolveUrl(postImages[0])}
                          alt="post media"
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}

                    {/* Tropes tags list */}
                    {(post?.tropes || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                        {post.tropes.map((trope: any) => (
                          <span
                            key={trope.id || trope.name}
                            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                            style={{ background: `${activeAccent}18`, color: activeAccent }}
                          >
                            #{trope.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── MODE: PROFILE (Authentic Alpha Profile Card) ── */}
              {mode === 'profile' && (
                <div
                  className="w-full rounded-[26px] border relative overflow-hidden transition-all"
                  style={getCardStyles()}
                >
                  {/* Vertical / Standard Profile layout for Story and Feed */}
                  {!isHorizontal && !isBanner ? (
                    <>
                      {/* Profile Banner */}
                      <div
                        className="h-28 w-full relative overflow-hidden shrink-0"
                        style={{
                          background: authorBanner
                            ? `url('${resolveUrl(authorBanner)}') center/cover no-repeat`
                            : `linear-gradient(135deg, ${activeAccent}40, rgba(255,255,255,0.05))`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      </div>

                      {/* Profile Info Area */}
                      <div className="px-6 pb-6 -mt-12 relative flex flex-col items-center text-center">
                        {/* Avatar with Status Bubble */}
                        <div className="relative w-20 h-20 mb-3">
                          <div className="absolute inset-0 rounded-full bg-white p-0.5 shadow-2xl overflow-hidden">
                            <Avatar
                              src={authorAvatar}
                              name={authorName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>
                          <div
                            className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-[#07080c] shadow-lg"
                            style={{ background: '#22c55e' }}
                          />

                          {/* Thought Bubble Status if present */}
                          {authorStatus && (
                            <div className="absolute -top-3 -right-20 z-30">
                              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-2.5 py-1.5 rounded-xl shadow-xl max-w-[120px]">
                                <p className="text-[9px] font-black italic text-white/90 leading-tight">
                                  "{authorStatus}"
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Name & Username */}
                        <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 justify-center mb-0.5">
                          <DisplayName profile={authorProfile} fallbackName={authorName} />
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={activeAccent}>
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </h1>
                        <span className="text-white/40 font-bold text-xs">@{authorHandle}</span>

                        {/* Bio */}
                        {authorBio && (
                          <p className="mt-3 text-xs text-white/70 leading-relaxed max-w-[280px] line-clamp-3">
                            {authorBio}
                          </p>
                        )}

                        {/* Stats Grid */}
                        <div className="mt-4 w-full grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-white">
                              {authorProfile?.followersCount ?? authorProfile?.followers?.length ?? '1.2k'}
                            </span>
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                              Seguidores
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black" style={{ color: activeAccent }}>
                              {authorProfile?.postsCount ?? authorProfile?.posts?.length ?? '84'}
                            </span>
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                              Crônicas
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-amber-400">
                              {authorProfile?.points ?? '2.4k'}
                            </span>
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                              Pontos
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Horizontal / Banner Profile layout */
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 shrink-0">
                          <div className="absolute inset-0 rounded-full bg-white p-0.5 shadow-xl overflow-hidden">
                            <Avatar
                              src={authorAvatar}
                              name={authorName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>
                          <div
                            className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#07080c] shadow-lg"
                            style={{ background: '#22c55e' }}
                          />
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                            <DisplayName profile={authorProfile} fallbackName={authorName} />
                            <svg width="13" height="13" viewBox="0 0 24 24" fill={activeAccent}>
                              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </h1>
                          <span className="text-white/40 font-bold text-xs">@{authorHandle}</span>
                          {authorStatus && (
                            <span className="text-[10px] font-black italic text-white/80 mt-0.5 truncate">
                              "{authorStatus}"
                            </span>
                          )}
                        </div>

                        {/* Horizontal Stats Column */}
                        <div className="flex items-center gap-4 pl-4 border-l border-white/10 shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-white">
                              {authorProfile?.followersCount ?? authorProfile?.followers?.length ?? '1.2k'}
                            </span>
                            <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                              Seguidores
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black" style={{ color: activeAccent }}>
                              {authorProfile?.postsCount ?? authorProfile?.posts?.length ?? '84'}
                            </span>
                            <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                              Crônicas
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-amber-400">
                              {authorProfile?.points ?? '2.4k'}
                            </span>
                            <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                              Pontos
                            </span>
                          </div>
                        </div>
                      </div>

                      {authorBio && (
                        <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2 pt-2 border-t border-white/5">
                          {authorBio}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 4. BOTTOM WATERMARK BADGE ── */}
            {showWatermark && (
              <div className="relative z-20 flex items-center justify-between pt-2.5 border-t border-white/10 mt-3 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeAccent }} />
                  <span className="text-[10px] font-bold text-white/80 tracking-wide">
                    alphamode.app/@{authorHandle}
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                  {mode === 'post' ? 'Alpha Network' : 'Perfil Alpha'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Studio Bottom Controls Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/10 shrink-0 bg-black/40">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setEnableAmbilight(!enableAmbilight)}
              className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${enableAmbilight ? 'bg-green-400' : 'bg-white/20'}`} />
              <span>Brilho Ambiente: {enableAmbilight ? 'Ligado' : 'Desligado'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowWatermark(!showWatermark)}
              className="text-xs font-bold text-white/70 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${showWatermark ? 'bg-cyan-400' : 'bg-white/20'}`} />
              <span>Link Rodapé: {showWatermark ? 'Visível' : 'Oculto'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Copiar */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              title="Copiar imagem diretamente para colar no WhatsApp Web ou redes"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copiar Imagem</span>
            </button>

            {/* Partilhar Mobile */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleShare}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                borderColor: `${activeAccent}50`,
                background: `${activeAccent}18`,
                color: activeAccent,
              }}
              title="Partilhar direto no WhatsApp ou Stories"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Partilhar</span>
            </button>

            {/* Baixar PNG */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black text-black transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${activeAccent}, #ffffff)`,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{isExporting ? 'A gerar...' : 'Baixar PNG'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
