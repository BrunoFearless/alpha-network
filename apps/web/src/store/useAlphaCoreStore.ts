import { create } from 'zustand';
import { AlphaCoreAvatarState } from '@/components/ui/AlphaCoreAvatar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AlphaCoreState {
  isOpen: boolean;
  messages: Message[];
  status: AlphaCoreAvatarState;
  
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setStatus: (status: AlphaCoreAvatarState) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useAlphaCoreStore = create<AlphaCoreState>((set) => ({
  isOpen: false,
  messages: [],
  status: 'idle',

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  setStatus: (status) => set({ status }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
}));
