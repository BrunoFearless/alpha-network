'use client';

/**
 * Hook useReactions
 * 
 * Gerencia reactions com otimistic UI
 * 
 * Funcionalidades:
 * - Toggle reaction (add/remove)
 * - Agregação local
 * - Sincronização com backend
 * - Otimistic updates
 * - Debounce de requests
 */

import { useCallback, useRef, useState, useEffect } from 'react';

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface IAggregatedReaction {
  emoji: string;
  count: number;
  me: boolean;
}

/**
 * Agrupa reactions por emoji
 * @param reactions Array flat de reactions
 * @param myId ID do usuário atual
 * @returns Array de reações agregadas
 */
export function aggregateReactions(reactions: Reaction[] | undefined, myId: string | undefined): IAggregatedReaction[] {
  const map = new Map<string, { count: number; me: boolean }>();
  
  for (const r of reactions ?? []) {
    const existing = map.get(r.emoji) ?? { count: 0, me: false };
    existing.count++;
    if (myId && r.userId === myId) existing.me = true;
    map.set(r.emoji, existing);
  }
  
  return [...map.entries()].map(([emoji, v]) => ({ emoji, ...v }));
}

interface UseReactionsOptions {
  messageId: string;
  userId?: string;
  onToggle: (emoji: string) => Promise<void>;
  initialReactions?: Reaction[];
}

export function useReactions({
  messageId,
  userId,
  onToggle,
  initialReactions = [],
}: UseReactionsOptions) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const aggregated = aggregateReactions(reactions, userId);

  /**
   * Toggle reaction com otimistic UI
   */
  const toggleReaction = useCallback(
    async (emoji: string) => {
      // Validação
      if (!emoji.trim() || emoji.length > 32) {
        console.warn('Invalid emoji');
        return;
      }

      // Otimistic update
      const existsIndex = reactions.findIndex(
        (r) => r.emoji === emoji && r.userId === userId
      );

      const optimisticReactions = [...reactions];
      if (existsIndex >= 0) {
        optimisticReactions.splice(existsIndex, 1);
      } else if (userId) {
        optimisticReactions.push({ emoji, userId });
      }

      setReactions(optimisticReactions);

      // Debounced backend call
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsLoading(true);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await onToggle(emoji);
          setIsLoading(false);
        } catch (error) {
          console.error('Failed to toggle reaction:', error);
          // Revert on error
          setReactions(reactions);
          setIsLoading(false);
        }
      }, 200); // 200ms debounce
    },
    [reactions, userId, onToggle]
  );

  /**
   * Sync reactions quando vem do backend
   */
  const syncReactions = useCallback((newReactions: Reaction[]) => {
    setReactions(newReactions);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    reactions,
    aggregated,
    isLoading,
    toggleReaction,
    syncReactions,
  };
}

/**
 * Hook para gerenciar múltiplas reactions
 * (útil para listas de mensagens)
 */
interface UseMultipleReactionsOptions {
  userId?: string;
  onToggle: (messageId: string, emoji: string) => Promise<void>;
}

export function useMultipleReactions({
  userId,
  onToggle,
}: UseMultipleReactionsOptions) {
  const [reactionsMap, setReactionsMap] = useState<Map<string, Reaction[]>>(new Map());
  const [loadingMap, setLoadingMap] = useState<Map<string, boolean>>(new Map());

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const msgReactions = reactionsMap.get(messageId) ?? [];
      const existsIndex = msgReactions.findIndex(
        (r) => r.emoji === emoji && r.userId === userId
      );

      // Otimistic update
      const optimisticReactions = [...msgReactions];
      if (existsIndex >= 0) {
        optimisticReactions.splice(existsIndex, 1);
      } else if (userId) {
        optimisticReactions.push({ emoji, userId });
      }

      setReactionsMap((prev) => new Map(prev).set(messageId, optimisticReactions));
      setLoadingMap((prev) => new Map(prev).set(messageId, true));

      try {
        await onToggle(messageId, emoji);
      } catch (error) {
        console.error('Failed to toggle reaction:', error);
        setReactionsMap((prev) => new Map(prev).set(messageId, msgReactions));
      } finally {
        setLoadingMap((prev) => new Map(prev).set(messageId, false));
      }
    },
    [reactionsMap, userId, onToggle]
  );

  const syncReactions = useCallback((messageId: string, newReactions: Reaction[]) => {
    setReactionsMap((prev) => new Map(prev).set(messageId, newReactions));
  }, []);

  const getReactions = useCallback(
    (messageId: string) => reactionsMap.get(messageId) ?? [],
    [reactionsMap]
  );

  const getAggregated = useCallback(
    (messageId: string) => aggregateReactions(getReactions(messageId), userId),
    [getReactions, userId]
  );

  return {
    toggleReaction,
    syncReactions,
    getReactions,
    getAggregated,
    isLoading: (messageId: string) => loadingMap.get(messageId) ?? false,
  };
}
