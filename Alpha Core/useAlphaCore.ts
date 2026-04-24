'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { buildAlphaCoreSystemPrompt } from './alpha-core-system-prompt';

// ── Types ──────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  // Fase 2 extras
  imageUrl?: string;
  codeBlocks?: CodeBlock[];
  reportData?: ReportData;
  toolUsed?: string;
  isError?: boolean;
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
  | 'image_generation'    // Fase 2
  | 'code_execution'      // Fase 2
  | 'report_generation'   // Fase 2
  | 'platform_actions';   // Fase 3

export interface UseAlphaCoreOptions {
  themeColor?: string;
  currentMode?: string;
  capabilities?: AlphaCoreCapability[];
  onError?: (err: string) => void;
}

// ── Anthropic API call ──────────────────────────────────────────────────────

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callAnthropicStreaming(
  messages: AnthropicMessage[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  tools?: any[],
): Promise<void> {
  try {
    const body: any = {
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      onError(`Erro da API: ${response.status} — ${err}`);
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
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            onChunk(parsed.delta.text);
          }
        } catch {
          // ignore parse errors on individual chunks
        }
      }
    }

    onDone();
  } catch (e: any) {
    onError(e.message ?? 'Erro de rede desconhecido.');
  }
}

// ── Fase 2: Tool definitions ───────────────────────────────────────────────

const PHASE2_TOOLS = [
  {
    name: 'generate_image',
    description: 'Gera uma imagem com base na descrição do utilizador usando um modelo de imagem.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descrição detalhada da imagem a gerar.' },
        style: { type: 'string', enum: ['anime', 'realistic', 'sketch', 'pixel_art', 'watercolor'], description: 'Estilo da imagem.' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'generate_report',
    description: 'Gera um relatório estruturado em markdown com base nos dados fornecidos.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        topic: { type: 'string', description: 'Tema do relatório.' },
        format: { type: 'string', enum: ['markdown', 'json', 'outline'], default: 'markdown' },
      },
      required: ['title', 'topic'],
    },
  },
  {
    name: 'generate_code',
    description: 'Gera código de alta qualidade num idioma específico para resolver o problema descrito.',
    input_schema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Linguagem de programação (typescript, python, etc.)' },
        task: { type: 'string', description: 'O que o código deve fazer.' },
        context: { type: 'string', description: 'Contexto adicional (framework, bibliotecas, etc.).' },
      },
      required: ['language', 'task'],
    },
  },
];

// ── Main hook ──────────────────────────────────────────────────────────────

export function useAlphaCore(options: UseAlphaCoreOptions = {}) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef<boolean>(false);

  const capabilities = options.capabilities ?? ['chat'];
  const hasPhase2 = capabilities.includes('image_generation')
    || capabilities.includes('code_execution')
    || capabilities.includes('report_generation');

  // Build system prompt with user context
  const systemPrompt = buildAlphaCoreSystemPrompt({
    userName: user?.profile?.displayName || user?.profile?.username,
    userProfile: user?.profile ? {
      username: user.profile.username,
      displayName: user.profile.displayName ?? undefined,
      activeModes: user.profile.activeModes ?? [],
    } : undefined,
    currentMode: options.currentMode,
  });

  // Convert internal messages to Anthropic format
  const toAnthropicMessages = (msgs: ChatMessage[]): AnthropicMessage[] =>
    msgs
      .filter(m => !m.isError)
      .map(m => ({ role: m.role, content: m.content }));

  const sendMessage = useCallback(async (userText: string): Promise<void> => {
    if (!userText.trim() || isStreaming) return;

    abortRef.current = false;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    const assistantId = `a-${Date.now()}`;
    let accumulated = '';

    const history = toAnthropicMessages([...messages, userMsg]);

    await callAnthropicStreaming(
      history,
      systemPrompt,
      // onChunk
      (chunk) => {
        if (abortRef.current) return;
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      // onDone
      () => {
        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: accumulated,
          timestamp: new Date(),
          codeBlocks: extractCodeBlocks(accumulated),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingContent('');
        setIsStreaming(false);
      },
      // onError
      (err) => {
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
      hasPhase2 ? PHASE2_TOOLS : undefined,
    );
  }, [messages, isStreaming, systemPrompt, hasPhase2]);

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

  const clearHistory = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
  }, []);

  const sendQuickPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  return {
    messages,
    streamingContent,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearHistory,
    sendQuickPrompt,
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
