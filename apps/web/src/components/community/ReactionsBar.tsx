'use client';

/**
 * ReactionsBar Component
 * 
 * Exibe uma barra de reactions (emojis) com contagem
 * Similar ao Discord/Slack
 * 
 * Props:
 * - reactions: Array de reações agregadas por emoji
 * - onReact: Callback quando usuário clica em um emoji
 * - onEmojiPickerOpen: Callback para abrir o picker (opcional)
 */

import React from 'react';
import { ANIMATED_EMOJIS } from '@/components/ui/EmojiRenderer';

export interface ReactionItem {
  emoji: string;
  count: number;
  reacted: boolean; // true se o usuário atual reagiu
}

interface ReactionsBarProps {
  reactions: ReactionItem[];
  onReact: (emoji: string) => void;
  onEmojiPickerOpen?: () => void;
  maxVisible?: number; // Limite de reações visíveis antes de expandir
}

const UNIGRAM_GREEN = '#A5E600';

export function ReactionsBar({ 
  reactions, 
  onReact, 
  onEmojiPickerOpen,
  maxVisible = 5
}: ReactionsBarProps) {
  const [showMore, setShowMore] = React.useState(false);
  const visibleReactions = showMore ? reactions : reactions.slice(0, maxVisible);
  const hasMore = reactions.length > maxVisible;

  return (
    <div 
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 10,
        alignItems: 'center',
      }}
    >
      {/* Reactions existentes */}
      {visibleReactions.map((r) => (
        <ReactionButton
          key={r.emoji}
          emoji={r.emoji}
          count={r.count}
          reacted={r.reacted}
          onClick={() => onReact(r.emoji)}
        />
      ))}

      {/* Mostrar mais reactions */}
      {hasMore && !showMore && (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: '4px 8px',
            fontSize: 11,
            color: '#B5BAC1',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          +{reactions.length - maxVisible}
        </button>
      )}

      {/* Botão para adicionar reação */}
      {onEmojiPickerOpen && (
        <button
          type="button"
          onClick={onEmojiPickerOpen}
          title="Adicionar reação"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: '4px 8px',
            fontSize: 12,
            color: '#B5BAC1',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.borderColor = UNIGRAM_GREEN;
            e.currentTarget.style.color = UNIGRAM_GREEN;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = '#B5BAC1';
          }}
        >
          +
        </button>
      )}
    </div>
  );
}

/**
 * ReactionButton Component
 * Botão individual de reação
 */
interface ReactionButtonProps {
  emoji: string;
  count: number;
  reacted: boolean;
  onClick: () => void;
}

function ReactionButton({ emoji, count, reacted, onClick }: ReactionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: reacted 
          ? 'rgba(165, 230, 0, 0.15)' 
          : 'rgba(255, 255, 255, 0.06)',
        border: `1.5px solid ${reacted ? UNIGRAM_GREEN : 'rgba(255, 255, 255, 0.12)'}`,
        borderRadius: 12,
        padding: '4px 10px',
        fontSize: 12,
        color: '#FFFFFF',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: reacted ? 600 : 400,
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = reacted 
          ? 'rgba(165, 230, 0, 0.25)' 
          : 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.transform = 'scale(1.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = reacted 
          ? 'rgba(165, 230, 0, 0.15)' 
          : 'rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={{ lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {ANIMATED_EMOJIS[emoji] ? (
          <img src={ANIMATED_EMOJIS[emoji].url} alt={emoji} style={{ width: 16, height: 16, objectFit: 'contain' }} />
        ) : emoji}
      </span>
      <span style={{ fontSize: 11, opacity: 0.9 }}>{count}</span>
    </button>
  );
}
