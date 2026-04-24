import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  imageUrl?: string;
  isError?: boolean;
}

export type AlphaCoreStatus = 'idle' | 'thinking' | 'speaking';

interface AlphaCoreState {
  isOpen: boolean;
  messages: ChatMessage[];
  status: AlphaCoreStatus;
  
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setStatus: (status: AlphaCoreStatus) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

export const useAlphaCoreStore = create<AlphaCoreState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [],
      status: 'idle',

      openChat: () => set({ isOpen: true }),
      closeChat: () => set({ isOpen: false }),
      toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
      setStatus: (status) => set({ status }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'alpha-core-storage',
      // Only persist messages and open state
      partialize: (state) => ({ messages: state.messages, isOpen: state.isOpen }),
    }
  )
);
