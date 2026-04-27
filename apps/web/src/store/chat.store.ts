import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  isPinned?: boolean;
  editedAt?: string;
  reactions?: Array<{ userId: string; emoji: string }>;
  createdAt: string;
  sender: {
    id: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    };
  };
}

interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  lastMessageAt: string;
  participants: any[];
  messages: Message[];
  sharedMedia: string[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  socket: Socket | null;
  isLoading: boolean;

  initSocket: () => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, imageUrl?: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  addMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, content: string) => void;
  togglePin: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  socket: null,
  isLoading: false,

  initSocket: () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken || get().socket) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${apiUrl}/chat`, {
      auth: { token: accessToken },
    });

    socket.on('chat.new_message', (message: Message) => {
      console.log('[Chat] New message received:', message.id);
      get().addMessage(message);
    });
    socket.on('chat.message_updated', (message: Message) => {
      console.log('[Chat] Message updated received:', message.id);
      get().addMessage(message);
    });
    socket.on('chat.message_deleted', ({ messageId }: { messageId: string }) => {
      console.log('[Chat] Message deleted received:', messageId);
      set(state => ({
        conversations: state.conversations.map(c => {
          const newMessages = (c.messages || []).filter(m => m.id !== messageId);
          const wasSharedMedia = (c.messages || []).find(m => m.id === messageId)?.imageUrl;
          
          return {
            ...c,
            messages: newMessages,
            sharedMedia: wasSharedMedia 
              ? newMessages.filter(m => m.imageUrl).map(m => m.imageUrl!)
              : c.sharedMedia
          };
        })
      }));
    });
    socket.on('conversation.joined', ({ conversationId }: { conversationId: string }) => {
      console.log('[Chat] Joined conversation room:', conversationId);
    });
    socket.on('error', (err: any) => console.error('[Chat] Socket error:', err));
    socket.on('connect', () => console.log('[Chat] Connected'));
    socket.on('disconnect', () => console.log('[Chat] Disconnected'));

    set({ socket });
  },

  fetchConversations: async () => {
    const { accessToken } = useAuthStore.getState();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    set({ isLoading: true });
    try {
      const res = await fetch(`${apiUrl}/api/v1/chat/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        set({ conversations: data.map((c: any) => ({ ...c, sharedMedia: [] })) });
      }
    } catch (e) {
      console.error('fetchConversations error', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    const { accessToken } = useAuthStore.getState();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const res = await fetch(`${apiUrl}/api/v1/chat/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        const messages = data.reverse();
        set(state => ({
          conversations: state.conversations.map(c => 
            c.id === conversationId ? { 
              ...c, 
              messages,
              sharedMedia: messages.filter((m: any) => m.imageUrl).map((m: any) => m.imageUrl)
            } : c
          ),
        }));
      }
    } catch (e) {
      console.error('fetchMessages error', e);
    }
  },

  sendMessage: async (conversationId: string, content: string, imageUrl?: string) => {
    const { accessToken } = useAuthStore.getState();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      // Optimistic Update
      const tempId = 'temp-' + Date.now();
      const { user: authUser } = useAuthStore.getState();
      if (authUser) {
        const tempMsg = {
          id: tempId,
          conversationId,
          senderId: authUser.id,
          content,
          imageUrl,
          createdAt: new Date().toISOString(),
          sender: {
            id: authUser.id,
            profile: {
              username: authUser.profile?.username || '',
              displayName: authUser.profile?.displayName || '',
              avatarUrl: authUser.profile?.avatarUrl || '',
            }
          }
        };
        get().addMessage(tempMsg as any);
      }

      const res = await fetch(`${apiUrl}/api/v1/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ conversationId, content, imageUrl }),
      });
      if (res.ok) { /* Real message will come via socket */ }
    } catch (e) {
      console.error('sendMessage error', e);
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    // 'alpha-assistant' is a UI-only sentinel for the AI chat — no DB record exists
    if (id && id !== 'alpha-assistant') {
      get().fetchMessages(id);
      // Join socket room
      get().socket?.emit('conversation.join', { conversationId: id });
    }
  },

  deleteMessage: (messageId: string) => {
    console.log('[Chat] Deleting:', messageId);
    get().socket?.emit('chat.delete', { messageId });
  },

  editMessage: (messageId: string, content: string) => {
    console.log('[Chat] Editing:', messageId, content);
    get().socket?.emit('chat.edit', { messageId, content });
  },

  togglePin: (messageId: string) => {
    console.log('[Chat] Pinning:', messageId);
    get().socket?.emit('chat.pin', { messageId });
  },

  toggleReaction: (messageId: string, emoji: string) => {
    console.log('[Chat] Reacting:', messageId, emoji);
    get().socket?.emit('chat.react', { messageId, emoji });
  },

  addMessage: (message) => {
    set(state => {
      const convIndex = state.conversations.findIndex(c => c.id === message.conversationId);
      if (convIndex === -1) return state;

      const conversation = state.conversations[convIndex];
      const isUpdate = (conversation.messages || []).some(m => m.id === message.id);
      let newMessages;
      
      if (isUpdate) {
        newMessages = conversation.messages.map(m => m.id === message.id ? message : m);
      } else {
        const filtered = [...(conversation.messages || [])];
        const tempIndex = filtered.findIndex(m => m.id.startsWith('temp-') && m.content === message.content);
        if (tempIndex !== -1) {
          filtered.splice(tempIndex, 1);
        }
        newMessages = [...filtered, message];
      }
      
      const updatedConv = {
        ...conversation,
        messages: newMessages,
        lastMessageAt: message.createdAt,
        sharedMedia: message.imageUrl 
          ? Array.from(new Set([...(conversation.sharedMedia || []), message.imageUrl]))
          : conversation.sharedMedia,
      };

      const otherConvs = state.conversations.filter(c => c.id !== message.conversationId);
      
      return {
        conversations: [updatedConv, ...otherConvs], // Move to top
      };
    });
  },
}));
