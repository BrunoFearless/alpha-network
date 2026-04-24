'use client';

import { useCallback, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { useAlphaCoreStore, ChatMessage } from '@/store/useAlphaCoreStore';
import { buildAlphaCoreSystemPrompt, buildAlphaCoreSystemPromptCompact } from './alpha-core-system-prompt';

export interface UseAlphaCoreOptions {
  themeColor?: string;
  currentMode?: string;
  capabilities?: string[];
  onError?: (err: string) => void;
}

export function useAlphaCore(options: UseAlphaCoreOptions = {}) {
  const { user, accessToken } = useAuthStore();
  const { userPosts } = useLazerStore();
  const { messages, addMessage, clearMessages, status, setStatus } = useAlphaCoreStore();
  const [streamingContent, setStreamingContent] = useState('');

  const sendMessage = useCallback(async (userText: string): Promise<void> => {
    if (!userText.trim() || status !== 'idle') return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date(),
    };

    addMessage(userMsg);
    setStatus('thinking');
    setStreamingContent('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const promptOptions = {
        userName: user?.profile?.displayName || user?.profile?.username,
        userProfile: user?.profile as any,
        recentPosts: userPosts.map(p => ({ content: p.content, createdAt: p.createdAt })),
        currentMode: options.currentMode || 'Lazer',
      };

      const systemPrompt = buildAlphaCoreSystemPrompt(promptOptions);
      const compactPrompt = buildAlphaCoreSystemPrompt({ ...promptOptions, compact: true });

      const response = await fetch(`${apiUrl}/api/v1/alpha-core/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: userText.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
          systemPrompt,
          compactPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
      }

      const data = await response.json();
      const reply = data.reply;

      const imageMatch = reply.match(/!\[.*?\]\((https?:\/\/.*?)\)/);
      const imageUrl = imageMatch ? imageMatch[1] : undefined;
      
      // If we have an image URL, we can optionally clean it from the content 
      // if the UI renders it separately.
      let cleanContent = reply;
      if (imageUrl) {
        // Only remove if it's the only thing or at the end
        // cleanContent = reply.replace(/!\[.*?\]\(.*?\)/, '').trim();
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: cleanContent,
        timestamp: new Date(),
        imageUrl: imageUrl,
      };

      addMessage(assistantMsg);
    } catch (err: any) {
      console.error('Alpha Core Error:', err);
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpa, tive um problema ao processar a tua mensagem. Tenta novamente.',
        timestamp: new Date(),
        isError: true,
      };
      addMessage(errorMsg);
      options.onError?.(err.message);
    } finally {
      setStatus('idle');
    }
  }, [messages, status, user, userPosts, accessToken, addMessage, setStatus, options]);

  return {
    messages,
    streamingContent,
    isStreaming: status === 'thinking',
    sendMessage,
    stopStreaming: () => setStatus('idle'), // Basic implementation
    clearHistory: clearMessages,
    sendQuickPrompt: (prompt: string) => sendMessage(prompt),
  };
}

export function parseMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}
