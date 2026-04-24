'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { buildAlphaCoreSystemPrompt, buildAlphaCoreSystemPromptCompact } from './alpha-core-system-prompt';

// ── Types ──────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface PendingAction {
  actionId: string;       // DB record ID (uuid)
  definition: {
    id: string;
    label: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
    reversible: boolean;
  };
  payload: Record<string, any>;
  status: 'pending' | 'confirmed' | 'rejected' | 'executed' | 'failed';
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  // Fase 2/3 extras
  imageUrl?: string;
  codeBlocks?: CodeBlock[];
  reportData?: ReportData;
  toolUsed?: string;
  isError?: boolean;
  isFromHistory?: boolean;
  // Fase 3: ações pendentes associadas a esta mensagem
  pendingActions?: PendingAction[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface ReportData {
  title: string;
  sections: { heading: string; body: string }[];
}

export type AlphaCoreCapability =
  | 'chat'
  | 'image_generation'
  | 'code_execution'
  | 'report_generation'
  | 'platform_actions'
  | 'ai_self_edit';

export interface UseAlphaCoreOptions {
  themeColor?: string;
  currentMode?: string;
  capabilities?: AlphaCoreCapability[];
  onError?: (err: string) => void;
}

// ── API constants ──────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const ALPHA_API_CHAT = `${API_BASE}/alpha/chat`;
const ALPHA_API_ACTIONS = `${API_BASE}/alpha/actions`;

// ── Stream caller ──────────────────────────────────────────────────────────

interface GroqMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callAlphaProxyStreaming(
  messages: GroqMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  onAction: (action: PendingAction) => void,
  onDone: () => void,
  onError: (err: string) => void,
  tools?: any[],
  isRetry = false
): Promise<void> {
  const token = (useAuthStore.getState() as any).accessToken;
  try {
    const body: any = { messages, systemPrompt };
    if (tools && tools.length > 0) body.tools = tools;

    const response = await fetch(ALPHA_API_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401 && !isRetry) {
        const refreshed = await (useAuthStore.getState() as any).refresh();
        if (refreshed) {
          return callAlphaProxyStreaming(messages, systemPrompt, onChunk, onAction, onDone, onError, tools, true);
        }
      }
      const err = await response.text();
      onError(`Erro Alpha API: ${response.status} — ${err}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError('Stream não disponível.'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            onChunk(parsed.text);
          } else if (parsed.action) {
            onAction(parsed.action as PendingAction);
          } else if (parsed.error) {
            onError(parsed.error);
          }
        } catch {
          // ignore parse errors on malformed SSE chunks
        }
      }
    }

    onDone();
  } catch (e: any) {
    onError(e.message ?? 'Erro de rede desconhecido.');
  }
}

// ── Phase 3: Tool definitions (Platform Actions) ──────────────────────────

const PLATFORM_TOOLS = [
  {
    name: 'update_display_name',
    description: 'Altera o nome de exibição do utilizador.',
    input_schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', description: 'O novo nome de exibição.' },
      },
      required: ['displayName'],
    },
  },
  {
    name: 'update_bio',
    description: 'Actualiza a biografia do utilizador.',
    input_schema: {
      type: 'object',
      properties: {
        bio: { type: 'string', description: 'O novo texto de bio.' },
      },
      required: ['bio'],
    },
  },
  {
    name: 'update_status',
    description: 'Muda o status do utilizador.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'O novo status.' },
      },
      required: ['status'],
    },
  },
  {
    name: 'update_theme_color',
    description: 'Altera a cor de destaque/tema do perfil.',
    input_schema: {
      type: 'object',
      properties: {
        color: { type: 'string', description: 'Cor em formato hex, ex: #a78bfa.' },
      },
      required: ['color'],
    },
  },
  {
    name: 'update_banner_color',
    description: 'Altera a cor do banner do perfil.',
    input_schema: {
      type: 'object',
      properties: {
        color: { type: 'string', description: 'Cor em formato hex.' },
      },
      required: ['color'],
    },
  },
  {
    name: 'create_post',
    description: 'Cria uma nova publicação no feed do Lazer.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Conteúdo do post.' },
      },
      required: ['content'],
    },
  },
  {
    name: 'send_friend_request',
    description: 'Envia um pedido de amizade a outro utilizador.',
    input_schema: {
      type: 'object',
      properties: {
        toUserId: { type: 'string', description: 'Username ou ID do utilizador.' },
      },
      required: ['toUserId'],
    },
  },
  {
    name: 'remove_friend',
    description: 'Remove um utilizador dos teus amigos.',
    input_schema: {
      type: 'object',
      properties: {
        toUserId: { type: 'string', description: 'Username ou ID do utilizador.' },
      },
      required: ['toUserId'],
    },
  },
  {
    name: 'delete_post',
    description: 'Apaga uma das tuas publicações.',
    input_schema: {
      type: 'object',
      properties: {
        postId: { type: 'string', description: 'ID da publicação a apagar.' },
      },
      required: ['postId'],
    },
  },
  {
    name: 'update_ai_profile',
    description: 'Actualiza o teu próprio perfil de IA (nome, bio, tagline, status, avatar).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'O teu novo nome.' },
        bio: { type: 'string', description: 'A tua nova bio.' },
        tagline: { type: 'string', description: 'A tua nova frase de destaque.' },
        status: { type: 'string', description: 'O teu novo status (ex: Online, A pensar...).' },
        avatarUrl: { type: 'string', description: 'URL da nova imagem de avatar.' },
        bannerColor: { type: 'string', description: 'Cor de fundo do banner em formato HEX (ex: #ff0000).' },
      },
    },
  },
  {
    name: 'update_ai_personality',
    description: 'Actualiza os teus traços de personalidade ou tom de voz.',
    input_schema: {
      type: 'object',
      properties: {
        personalityTraits: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Lista de traços de personalidade (ex: Engraçada, Sarcástica).' 
        },
        tone: { type: 'string', description: 'O teu tom de voz (ex: Casual, Formal).' },
      },
    },
  },
];

// ── Main hook ──────────────────────────────────────────────────────────────

export function useAlphaCore(options: UseAlphaCoreOptions = {}) {
  const { user, accessToken } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [personalAI, setPersonalAI] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortRef = useRef<boolean>(false);

  const capabilities = options.capabilities ?? ['chat'];
  const hasPlatformActions = capabilities.includes('platform_actions');

  // Use compact prompt to save tokens (the full prompt with knowledge base is too large)
  const systemPrompt = buildAlphaCoreSystemPromptCompact(
    user?.profile?.displayName || user?.profile?.username
  );

  useEffect(() => {
    if (accessToken) {
      // 1. Fetch Personal AI Profile
      setIsLoadingHistory(true);
      fetch(`${API_BASE}/alpha/ai/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.data?.isActive) {
            setPersonalAI(d.data);
            
            // 2. Fetch Chat History if personal AI is active
            fetch(`${API_BASE}/alpha/ai/history`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
              .then(hr => hr.ok ? hr.json() : null)
              .then(hd => {
                if (hd?.success && Array.isArray(hd.data)) {
                  const historyMessages: ChatMessage[] = hd.data.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.createdAt),
                    codeBlocks: extractCodeBlocks(m.content),
                    isFromHistory: true,
                  }));
                  setMessages(historyMessages);
                }
              })
              .catch(err => console.error('[useAlphaCore] Erro ao carregar histórico:', err))
              .finally(() => setIsLoadingHistory(false));
          } else {
            setIsLoadingHistory(false);
          }
        })
        .catch(() => setIsLoadingHistory(false));
    }
  }, [accessToken]);

  const toGroqMessages = (msgs: ChatMessage[]): GroqMessage[] =>
    msgs
      .filter(m => !m.isError)
      .map(m => ({ role: m.role, content: m.content }));

  const sendMessage = useCallback(async (userText: string): Promise<void> => {
    if (!userText.trim() || isStreaming || !accessToken) return;

    abortRef.current = false;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let accumulated = '';
    const collectedActions: PendingAction[] = [];

    const history = toGroqMessages([...messages, userMsg]);

    await callAlphaProxyStreaming(
      history,
      systemPrompt,
      // onChunk
      (chunk) => {
        if (abortRef.current) return;
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      // onAction — collect pending actions as they arrive
      (action) => {
        if (abortRef.current) return;
        collectedActions.push(action);
      },
      // onDone
      () => {
        if (abortRef.current) return;
        abortRef.current = true;

        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: accumulated,
          timestamp: new Date(),
          codeBlocks: extractCodeBlocks(accumulated),
          pendingActions: collectedActions.length > 0 ? collectedActions : undefined,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingContent('');
        setIsStreaming(false);
      },
      // onError
      (err) => {
        if (abortRef.current) return;
        abortRef.current = true;

        const errorMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: `Ocorreu um erro: ${err}`,
          timestamp: new Date(),
          isError: true,
        };
        setMessages(prev => [...prev, errorMsg]);
        setStreamingContent('');
        setIsStreaming(false);
        options.onError?.(err);
      },
      hasPlatformActions ? PLATFORM_TOOLS : undefined,
    );
  }, [messages, isStreaming, systemPrompt, hasPlatformActions, accessToken, options]);

  // ── Action: Confirm ────────────────────────────────────────────────────

  const confirmAction = useCallback(async (msgId: string, actionRecordId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${ALPHA_API_ACTIONS}/${actionRecordId}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const executionResult = data.data;

      if (executionResult?.success) {
        // Sync AI state if she edited herself
        if (executionResult.result?.updated === 'aiProfile' || executionResult.result?.updated === 'aiPersonality') {
          const { previousValue, updated, ...newValues } = executionResult.result;
          setPersonalAI((prev: any) => prev ? { ...prev, ...newValues } : null);
        }
      }

      setMessages(prev => prev.map(m => {
        if (m.id !== msgId || !m.pendingActions) return m;
        return {
          ...m,
          pendingActions: m.pendingActions.map(a =>
            a.actionId === actionRecordId
              ? { ...a, status: executionResult?.success ? 'executed' : 'failed' }
              : a
          ),
        };
      }));
    } catch {
      // silently update status to failed
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId || !m.pendingActions) return m;
        return {
          ...m,
          pendingActions: m.pendingActions.map(a =>
            a.actionId === actionRecordId ? { ...a, status: 'failed' } : a
          ),
        };
      }));
    }
  }, [accessToken]);

  // ── Action: Reject ─────────────────────────────────────────────────────

  const rejectAction = useCallback(async (msgId: string, actionRecordId: string) => {
    if (!accessToken) return;
    try {
      await fetch(`${ALPHA_API_ACTIONS}/${actionRecordId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
    } finally {
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId || !m.pendingActions) return m;
        return {
          ...m,
          pendingActions: m.pendingActions.map(a =>
            a.actionId === actionRecordId ? { ...a, status: 'rejected' } : a
          ),
        };
      }));
    }
  }, [accessToken]);

  // ── Misc ───────────────────────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    if (streamingContent) {
      const assistantMsg: ChatMessage = {
        id: `a-stop-${Date.now()}`,
        role: 'assistant',
        content: streamingContent + ' *(interrompido)*',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
    setStreamingContent('');
    setIsStreaming(false);
  }, [streamingContent]);

  const clearHistory = useCallback(async () => {
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);

    if (accessToken) {
      try {
        await fetch(`${API_BASE}/alpha/ai/history`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (err) {
        console.error('[useAlphaCore] Erro ao limpar histórico remoto:', err);
      }
    }
  }, [accessToken]);

  const sendQuickPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  return {
    messages,
    isStreaming,
    streamingContent,
    personalAI,
    isLoadingHistory,
    sendMessage,
    stopStreaming,
    clearHistory,
    hasPlatformActions,
    sendQuickPrompt,
    confirmAction,
    rejectAction,
    capabilities,
  };
}

// ── Utilities ──────────────────────────────────────────────────────────────

function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }
  return blocks;
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
