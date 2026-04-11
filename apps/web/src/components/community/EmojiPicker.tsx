'use client';

/**
 * EmojiPicker Component
 * 
 * Seletor de emojis simples
 * Mostra emojis por categoria e permite busca
 * 
 * Alternativas mais avançadas:
 * - emoji-mart (mais completo)
 * - react-emoji-picker
 * - native emoji input
 */

import React, { useCallback, useMemo } from 'react';
import { 
  SHORTCODE_TO_ANIMATED, 
  UNICODE_TO_ANIMATED,
  getAnimatedUrl 
} from '@/components/ui/EmojiRenderer';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Emojis agrupados por categoria
const EMOJI_CATEGORIES = {
  'Animados': [
    ...Object.keys(SHORTCODE_TO_ANIMATED),
    ...Object.keys(UNICODE_TO_ANIMATED)
  ],
  'Reações': ['👍', '❤️', '😂', '😮', '😢', '😡', '🤔', '😍', '🙏', '👏', '🎉', '🔥', '✨', '💯'],
  'Gestos': ['👋', '🤝', '✌️', '🙌', '🤲', '👐', '🤷', '🤞', '🤟', '🙏', '👌', '🤘'],
  'Rostos': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰'],
  'Emoções': ['😍', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😎', '🤩', '😎', '😏'],
  'Símbolos': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗'],
  'Natureza': ['🌟', '⭐', '✨', '⚡', '🔥', '💥', '🌈', '☀️', '🌙', '⭐', '🌺', '🌸', '🌼', '🌻'],
  'Objetos': ['🎁', '🎈', '🎊', '🎉', '🎀', '🎵', '🎶', '🎤', '🎧', '🎬', '🎮', '🎯', '🎲', '🧩'],
};

export function EmojiPicker({ onSelect, onClose, position = 'bottom' }: EmojiPickerProps) {
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // Filtrar emojis por busca
  const filteredEmojis = useMemo(() => {
    if (!search.trim()) {
      return EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES] || [];
    }
    
    // Busca em todas as categorias
    const results: string[] = [];
    for (const category of Object.values(EMOJI_CATEGORIES)) {
      results.push(...category.filter((e) => e.toLowerCase().includes(search.toLowerCase())));
    }
    return results;
  }, [search, activeCategory]);

  // Fechar ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSelect = useCallback((emoji: string) => {
    onSelect(emoji);
    onClose();
  }, [onSelect, onClose]);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', marginBottom: 8 },
    bottom: { top: '100%', marginTop: 8 },
    left: { right: '100%', marginRight: 8 },
    right: { left: '100%', marginLeft: 8 },
  };

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute',
        ...positionStyles[position],
        background: '#1E1F22',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        width: 320,
        maxHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Search Bar */}
      <div style={{ padding: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <input
          type="text"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6,
            color: '#FFF',
            fontSize: 13,
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = '#A5E600';
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        />
      </div>

      {/* Categories (se não estiver em modo busca) */}
      {!search && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? '#A5E600' : 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                color: activeCategory === cat ? '#000' : '#B5BAC1',
                cursor: 'pointer',
                fontWeight: activeCategory === cat ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== cat) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== cat) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 8,
        }}
      >
        {filteredEmojis.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '20px 0',
              color: '#B5BAC1',
              fontSize: 13,
            }}
          >
            No emojis found
          </div>
        ) : (
          filteredEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              onClick={() => handleSelect(emoji)}
              title={emoji}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                padding: 8,
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 36,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(165, 230, 0, 0.15)';
                e.currentTarget.style.borderColor = '#A5E600';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {(() => {
                const url = getAnimatedUrl(emoji);
                if (url) {
                  return <img src={url} alt={emoji} style={{ width: 24, height: 24, objectFit: 'contain' }} />;
                }
                return emoji;
              })()}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Hook para usar o EmojiPicker facilmente
 * 
 * const { showPicker, triggerRef, handleSelect } = useEmojiPickerPopup();
 * 
 * return (
 *   <>
 *     <button ref={triggerRef}>Add Reaction</button>
 *     {showPicker && <EmojiPicker onSelect={handleSelect} onClose={() => setShowPicker(false)} />}
 *   </>
 * );
 */
export function useEmojiPickerPopup() {
  const [showPicker, setShowPicker] = React.useState(false);
  const [selectedEmoji, setSelectedEmoji] = React.useState<string | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return {
    showPicker,
    setShowPicker,
    triggerRef,
    selectedEmoji,
    onEmojiSelect: (emoji: string) => {
      setSelectedEmoji(emoji);
      setShowPicker(false);
    },
  };
}
