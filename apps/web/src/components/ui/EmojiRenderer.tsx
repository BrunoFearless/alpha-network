'use client';

import React from 'react';

// Mapeamento de Unicode Emojis para Codepoints do Google Noto (GIFs Animados)
export const UNICODE_TO_ANIMATED: Record<string, string> = {
  // Faces
  '😀': '1f600', '😁': '1f601', '😂': '1f602', '🤣': '1f923', '😃': '1f603',
  '😄': '1f604', '😅': '1f605', '😆': '1f606', '😉': '1f609', '😊': '1f60a',
  '😋': '1f60b', '😎': '1f60e', '😍': '1f60d', '😘': '1f618', '🥰': '1f970',
  '😗': '1f617', '😙': '1f619', '😚': '1f61a', '☺️': '263a', '🙂': '1f642',
  '🤗': '1f917', '🤩': '1f929', '🤔': '1f914', '🤨': '1f928', '😐': '1f610',
  '😑': '1f611', '😶': '1f636', '🙄': '1f644', '😏': '1f60f', '😣': '1f623',
  '😥': '1f625', '😮': '1f62e', '🤐': '1f910', '😯': '1f62f', '😪': '1f62a',
  '😫': '1f62b', '🥱': '1f971', '😴': '1f634', '😱': '1f631', '😡': '1f621',
  '😠': '1f620', '🥳': '1f973', '🥺': '1f97a', '😭': '1f62d', '🤤': '1f924',
  
  // Gestos
  '👍': '1f44d', '👎': '1f44e', '👏': '1f44f', '🙌': '1f64c', '👐': '1f450',
  '🤲': '1f932', '🙏': '1f64f', '🤝': '1f91d', '💪': '1f4aa', '🦾': '1f9be',
  '👋': '1f44b', '✋': '270b', '🖖': '1f596', '🤞': '1f91e', '🤟': '1f91f',
  
  // Corações & Símbolos
  '❤️': '2764_fe0f', '🔥': '1f525', '✨': '2728', '💯': '1f4af', '💡': '1f4a1',
  '💩': '1f4a9', '💎': '1f48e', '🚀': '1f680', '🎉': '1f389', '🎁': '1f381',
  '🎂': '1f382', '⚡': '26a1', '🌈': '1f308', '🍀': '1f340', '⭐': '2b50',
  '✅': '2705', '❌': '274c', '⚠️': '26a0_fe0f', '🛑': '1f6d1', '🔔': '1f514'
};

// Custom Discord-style Shortcodes
export const SHORTCODE_TO_ANIMATED: Record<string, { url: string; label: string }> = {
  ':cat_jam:': { 
    url: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHYyeDN6Z2N6ZnZ6Z2N6ZnZ6Z2N6ZnZ6Z2N6ZnZ6Z2N6ZnV6Z2N6ZnYmZXA9djFfaW50ZXJuYWxfZ2lmX2J5X2lkJmN0PWc/13f0m9V9H8J0S/giphy.gif', 
    label: 'Cat Jam' 
  },
  ':party_blob:': { 
    url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHYyeDN6Z2N6ZnZ6Z2N6ZnZ6Z2N6ZnZ6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV/3o7TKVUn7iM8FMEU24/giphy.gif', 
    label: 'Party Blob' 
  },
  ':parrot:': { 
    url: 'https://raw.githubusercontent.com/jmhobbs/cult-of-the-party-parrot/master/parrots/parrot.gif',
    label: 'Dancing Parrot' 
  },
  ':pika_dance:': { 
    url: 'https://media.tenor.com/4a742ea37812832a8264566f1e29c669/tenor.gif',
    label: 'Pika Dance' 
  },
  ':pepe_hype:': { 
    url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHYyeDN6Z2N6ZnZ6Z2N6ZnZ6Z2N6ZnZ6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV6Z2N6ZnV/l41lI4bYyS5N7HnMY/giphy.gif', 
    label: 'Pepe Hype' 
  }
};

// Funções de exportação para o Picker
export const ALL_ANIMATED_EMOJIS = [
  ...Object.keys(SHORTCODE_TO_ANIMATED),
  ...Object.keys(UNICODE_TO_ANIMATED)
];

interface EmojiRendererProps {
  content: string;
  emojiSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renderiza texto substituindo Shortcodes e Unicode Emojis por suas versões animadas.
 */
export function EmojiRenderer({ content, emojiSize = 22, className, style }: EmojiRendererProps) {
  if (!content) return null;

  // 1. Regex para detectar Shortcodes (:short:) E Unicode Emojis
  // Usamos as chaves do nosso mapa unicode para criar uma regex específica
  const unicodeEmojis = Object.keys(UNICODE_TO_ANIMATED).join('|');
  const regex = new RegExp(`(:[a-z0-9_]+:|${unicodeEmojis})`, 'g');

  const parts = content.split(regex);

  return (
    <span className={className} style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px', verticalAlign: 'middle', ...style }}>
      {parts.map((part, index) => {
        // Tentar shortcode
        const shortcodeEmoji = SHORTCODE_TO_ANIMATED[part];
        if (shortcodeEmoji) {
          return (
            <img 
              key={`${part}-${index}`}
              src={shortcodeEmoji.url} 
              alt={shortcodeEmoji.label}
              title={part}
              style={{ width: emojiSize, height: emojiSize, objectFit: 'contain', verticalAlign: 'middle' }}
            />
          );
        }

        // Tentar Unicode
        const unicodePoint = UNICODE_TO_ANIMATED[part];
        if (unicodePoint) {
          return (
            <img 
              key={`${part}-${index}`}
              src={`https://fonts.gstatic.com/s/e/notoemoji/latest/${unicodePoint}/512.gif`} 
              alt={part}
              title={part}
              style={{ width: emojiSize, height: emojiSize, objectFit: 'contain', verticalAlign: 'middle' }}
            />
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

export function isAnimatedEmoji(code: string): boolean {
  return !!SHORTCODE_TO_ANIMATED[code] || !!UNICODE_TO_ANIMATED[code];
}

export function getAnimatedUrl(code: string): string | null {
  if (SHORTCODE_TO_ANIMATED[code]) return SHORTCODE_TO_ANIMATED[code].url;
  if (UNICODE_TO_ANIMATED[code]) return `https://fonts.gstatic.com/s/e/notoemoji/latest/${UNICODE_TO_ANIMATED[code]}/512.gif`;
  return null;
}
