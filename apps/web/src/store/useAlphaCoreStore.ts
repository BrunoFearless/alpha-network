import { create } from 'zustand';

export type MessageRole = 'user' | 'assistant';

export interface PendingAction {
  actionId: string;
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
  imageUrl?: string;
  isError?: boolean;
  isFromHistory?: boolean;
  pendingActions?: PendingAction[];
  codeBlocks?: { language: string; code: string }[];
}

export type AlphaCoreStatus = 'idle' | 'thinking' | 'speaking';

interface AlphaCoreState {
  isOpen: boolean;
  messages: ChatMessage[];
  status: AlphaCoreStatus;
  isStreaming: boolean;
  streamingContent: string;
  personalAI: any;

  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setStatus: (status: AlphaCoreStatus) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingContent: (v: string) => void;
  setPersonalAI: (ai: any) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  updateMessage: (id: string, update: Partial<ChatMessage>) => void;
}

// NOTE: Sem persist intencional — o histórico é carregado do servidor
// (tabela AlphaAiMessage) a cada sessão. Usar localStorage causaria
// vazamento de dados entre contas no mesmo browser.
export const useAlphaCoreStore = create<AlphaCoreState>()((set) => ({
  isOpen: false,
  messages: [],
  status: 'idle',
  isStreaming: false,
  streamingContent: '',
  personalAI: null,

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  setStatus: (status) => set({ status }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setStreamingContent: (v) => set({ streamingContent: v }),
  setPersonalAI: (personalAI) => set({ personalAI }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  updateMessage: (id, update) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, ...update } : m)
  })),
}));

// Limpar o localStorage legado ao importar este módulo (uma única vez)
if (typeof window !== 'undefined') {
  localStorage.removeItem('alpha-core-storage');
}

