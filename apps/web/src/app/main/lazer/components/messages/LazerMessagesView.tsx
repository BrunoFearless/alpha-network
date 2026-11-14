'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { useAlphaCoreStore } from '@/store/useAlphaCoreStore';
import { useAlphaCore } from '@/components/alpha-core/useAlphaCore';
import { MessageContent } from '@/components/alpha-core/AlphaCoreChat';
import { resolveUrl } from '@/lib/api';
import { ALL_ANIMATED_EMOJIS, getAnimatedUrl } from '@/components/ui/EmojiRenderer';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface LazerMessagesViewProps {
  onClose?: () => void;
  onSelectView?: (view: any) => void;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  userAvatar?: string;
  userName?: string;
}

interface CallState {
  active: boolean;
  type: 'audio' | 'video';
  contactName: string;
  contactAvatar: string;
  status: 'calling' | 'connected';
  duration: number;
  muted: boolean;
  cameraOff: boolean;
}

// ─── Helper Time Formatter ───────────────────────────────────────────────────
function formatMessageTime(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHours < 24) return `${diffHours} h`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays} d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDateSeparator(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-PT', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function LazerMessagesView({
  onClose,
  onSelectView,
  themeColor = '#3b82f6',
  themeMode = 'dark',
  userAvatar,
  userName = 'Utilizador',
}: LazerMessagesViewProps) {
  const { user: authUser, accessToken, updateUserProfile } = useAuthStore();
  const { friendProfiles, fetchFriends } = useLazerStore();
  const {
    conversations,
    activeConversationId,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setActiveConversation,
    startConversation,
    deleteMessage,
    togglePin,
    toggleReaction,
    initSocket,
    isLoading: isChatLoading,
  } = useChatStore();

  const { messages: aiMessages, personalAI } = useAlphaCoreStore();
  const { sendMessage: sendAIMessage, isStreaming: isAIStreaming, streamingContent: aiStreamingContent } = useAlphaCore();

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'primary' | 'general' | 'ai'>('primary');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Input & Sending
  const [inputText, setInputText] = useState('');
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // Modals & Panels
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [myNoteText, setMyNoteText] = useState('');
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [callState, setCallState] = useState<CallState | null>(null);

  // Refs
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mount logic: fetch real conversations, real friends, init socket
  useEffect(() => {
    fetchConversations();
    fetchFriends();
    initSocket();
  }, [fetchConversations, fetchFriends, initSocket]);

  // Load existing user note if stored in lazerData
  useEffect(() => {
    const note = (authUser?.profile as any)?.lazerData?.userNote || '';
    setMyNoteText(note);
  }, [authUser]);

  // Auto-scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTo({
        top: messagesScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  const activeConv = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConv?.messages, aiMessages, scrollToBottom]);

  // Call duration counter
  useEffect(() => {
    if (callState?.active && callState.status === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallState((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState?.active, callState?.status]);

  // Map real contacts from conversations
  const contacts = useMemo(() => {
    return conversations.map((conv) => {
      const otherParticipant = conv.participants?.find((p) => p.id !== authUser?.id);
      const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;

      const isGroup = conv.isGroup;
      const name = isGroup
        ? conv.name || 'Grupo Alpha'
        : otherParticipant?.profile?.displayName || otherParticipant?.email?.split('@')[0] || 'Utilizador';
      const username = otherParticipant?.profile?.username || '';
      const avatar = isGroup ? '' : otherParticipant?.profile?.avatarUrl || '';
      const status = otherParticipant?.profile?.status || 'offline';

      let lastMessagePreview = 'Ainda sem mensagens';
      if (lastMsg) {
        if (lastMsg.content) {
          lastMessagePreview = lastMsg.content;
        } else if (lastMsg.imageUrl) {
          lastMessagePreview = '📷 Imagem partilhada';
        }
      }

      return {
        id: conv.id,
        isGroup,
        name,
        username,
        avatar,
        status,
        lastMessage: lastMessagePreview,
        lastMessageAt: lastMsg?.createdAt || conv.lastMessageAt || '',
        otherParticipant,
        unreadCount: 0,
      };
    });
  }, [conversations, authUser?.id]);

  // Filtered contacts by search and tab
  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q));
    }

    if (activeTab === 'general') {
      list = list.filter((c) => c.isGroup);
    } else if (activeTab === 'primary') {
      list = list.filter((c) => !c.isGroup);
    }
    return list;
  }, [contacts, searchQuery, activeTab]);

  // Active contact details
  const activeContact = useMemo(() => {
    if (activeConversationId === 'alpha-assistant') {
      return {
        id: 'alpha-assistant',
        name: personalAI?.name || 'Alpha Core',
        username: personalAI?.botname || 'alpha_ai',
        avatar: personalAI?.avatarUrl || '',
        status: 'online',
        isAI: true,
      };
    }
    return contacts.find((c) => c.id === activeConversationId);
  }, [contacts, activeConversationId, personalAI]);

  // Real Friends for Stories / Notes carousel
  const friendNotes = useMemo(() => {
    return (friendProfiles || []).map((friend: any) => {
      const p = friend.profile || friend;
      const note = p?.lazerData?.userNote || p?.statusText || (p?.status === 'online' ? 'Online' : '');
      return {
        id: friend.id || friend.userId,
        name: p?.displayName || p?.username || 'Amigo',
        avatar: p?.avatarUrl,
        note,
        online: p?.status === 'online',
      };
    });
  }, [friendProfiles]);

  // Handle Send Message (Real Network POST + Socket)
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);

    if (activeConversationId === 'alpha-assistant') {
      sendAIMessage(content);
      return;
    }

    if (activeConversationId) {
      await sendMessage(activeConversationId, content);
      scrollToBottom();
    }
  };

  // Handle Image Upload & Send (Real Network)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !accessToken) return;

    setIsSendingFile(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${apiUrl}/api/v1/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        await sendMessage(activeConversationId, '', url);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Erro ao enviar imagem:', err);
    } finally {
      setIsSendingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save personal note to real profile
  const handleSaveNote = async () => {
    if (!authUser || !accessToken) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const currentLazer = (authUser.profile as any)?.lazerData || {};
      const profileData = {
        lazerData: {
          ...currentLazer,
          userNote: myNoteText.trim(),
        },
      };

      const res = await fetch(`${apiUrl}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ profile: profileData }),
      });

      if (res.ok) {
        updateUserProfile(profileData as any);
        setShowNoteModal(false);
      }
    } catch (err) {
      console.error('Erro ao guardar nota:', err);
    }
  };

  // Start new chat with real friend
  const handleStartChatWithFriend = async (friendId: string) => {
    setShowNewChatModal(false);
    const convId = await startConversation(friendId);
    if (convId) {
      setActiveConversation(convId);
      setMobileView('chat');
    }
  };

  // Launch Call
  const handleStartCall = (type: 'audio' | 'video') => {
    if (!activeContact) return;
    setCallState({
      active: true,
      type,
      contactName: activeContact.name,
      contactAvatar: activeContact.avatar,
      status: 'calling',
      duration: 0,
      muted: false,
      cameraOff: false,
    });

    // Simulate transition to connected after 2.5s ring
    setTimeout(() => {
      setCallState((prev) => (prev ? { ...prev, status: 'connected' } : null));
    }, 2500);
  };

  const isLight = themeMode === 'light';
  const shellBg = isLight ? 'glass-panel-light' : 'liquid-glass-shell';

  return (
    <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-4 md:gap-5 overflow-hidden font-['Nunito',sans-serif] animate-in fade-in duration-500 relative select-none">
      
      {/* Specular Edge & Ambient Lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#3b82f6]/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#2563eb]/10 blur-[130px] pointer-events-none -z-10" />

      {/* ══════════════════════════════════════════════════════════════════════
          1. FLOATING VISIONOS CAPSULE SIDEBAR (Padrão Lazer Pill Lateral)
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col items-center justify-between w-14 lg:w-16 h-fit py-6 px-2.5 rounded-full border border-white/20 liquid-glass-shell shadow-2xl relative z-40 shrink-0 select-none transition-all duration-300"
        style={{
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/80 to-transparent blur-[0.2px]" />

        {/* Top: Avatar with Blue Neon Ring */}
        <button
          onClick={() => {
            setActiveConversation(null);
            setMobileView('list');
          }}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#3b82f6] p-0.5 hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(59,130,246,0.45)] cursor-pointer group relative bg-white/5"
          title="Início das Mensagens"
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-full bg-[#3b82f6]/20 text-[#3b82f6] font-black text-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          )}
        </button>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Action Navigation Icons */}
        <div className="flex flex-col items-center gap-3.5">
          {/* Feed / Todas as Mensagens */}
          <button
            onClick={() => {
              setActiveTab('primary');
              setMobileView('list');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeTab === 'primary' && !activeConversationId
                ? 'text-[#3b82f6] bg-white/15 shadow-[0_0_14px_rgba(59,130,246,0.4)] scale-110 border border-[#3b82f6]/50'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Caixa de Entrada"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>

          {/* Nova Conversa / Add */}
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-tr from-[#2563eb] to-[#3b82f6] hover:scale-110 active:scale-95 shadow-[0_0_18px_rgba(59,130,246,0.5)] transition-all cursor-pointer group relative"
            title="Nova Conversa com Amigo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Alpha AI Core */}
          <button
            onClick={() => {
              setActiveConversation('alpha-assistant');
              setMobileView('chat');
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer group relative ${
              activeConversationId === 'alpha-assistant'
                ? 'text-amber-400 bg-white/15 shadow-[0_0_14px_rgba(251,191,36,0.4)] scale-110 border border-amber-400/50'
                : 'text-white/50 hover:text-amber-400 hover:bg-white/5'
            }`}
            title="Conversar com Alpha AI Core"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </button>

          {/* Atalho Alpha Music */}
          <button
            onClick={() => onSelectView?.('music')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#1ed760] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Music"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>

          {/* Atalho Alpha Watch */}
          <button
            onClick={() => onSelectView?.('watch')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#ef4444] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Watch Cinema"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
            </svg>
          </button>

          {/* Atalho Alpha Art */}
          <button
            onClick={() => onSelectView?.('art')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-[#a855f7] hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Alpha Art Gallery"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </button>

          {/* Sair para o Feed */}
          <button
            onClick={() => onSelectView?.('feed') || onClose?.()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer group relative"
            title="Voltar ao Feed do Lazer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        </div>

        <div className="w-6 h-px bg-white/10 my-1" />

        {/* Bottom indicator jewel em azul neon */}
        <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6] animate-pulse" />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN CENTER: ACTIVE CONVERSATION CHAT WINDOW (Janela de Conversa)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border md:border-white/15 ${shellBg} flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300 ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
        style={{
          backdropFilter: 'blur(36px) saturate(140%)',
          WebkitBackdropFilter: 'blur(36px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* ── CHAT TOP HEADER ── */}
        <header className="px-5 sm:px-7 py-3.5 flex items-center justify-between border-b border-white/[0.08] shrink-0 z-20 bg-white/[0.02] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {activeContact ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-white/20">
                    {activeContact.avatar ? (
                      <img src={resolveUrl(activeContact.avatar)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-tr from-[#2563eb] to-[#3b82f6]">
                        {activeContact.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black/80 ${
                      activeContact.status === 'online' ? 'bg-emerald-500' : 'bg-white/30'
                    }`}
                  />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-1.5">
                    {activeContact.name}
                    {(activeContact as any).isAI && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-wider border border-amber-500/30">
                        IA
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] font-medium text-white/40 leading-none">
                    {activeContact.username ? `@${activeContact.username}` : activeContact.status}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold text-white/40">Selecione uma conversa</div>
            )}
          </div>

          {/* Right Call & Actions */}
          {activeContact && !(activeContact as any).isAI && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => handleStartCall('audio')}
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Chamada de Voz"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>

              <button
                onClick={() => handleStartCall('video')}
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Chamada de Vídeo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              </button>

              <button
                onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                  showInfoDrawer
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/10 text-white/70 hover:text-white'
                }`}
                title="Informações da Conversa"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </button>
            </div>
          )}
        </header>

        {/* ── CHAT MESSAGES BODY ── */}
        <div
          ref={messagesScrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 overscroll-contain flex flex-col gap-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {activeConversationId === 'alpha-assistant' ? (
            /* Alpha AI Assistant Chat */
            <div className="flex flex-col gap-4 pb-4">
              <div className="flex justify-center my-2">
                <span className="px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Assistente Inteligente Alpha Core
                </span>
              </div>
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 max-w-[85%] ${
                    msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start flex-row'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/20 mb-1">
                    {msg.role === 'user' ? (
                      userAvatar ? <img src={userAvatar} alt="" className="w-full h-full object-cover" /> : null
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-500/20 text-amber-300 text-xs">
                        ✦
                      </div>
                    )}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white rounded-tr-sm shadow-[0_4px_20px_rgba(37,99,235,0.35)]'
                        : 'bg-white/[0.08] backdrop-blur-xl border border-white/10 text-white rounded-tl-sm shadow-md'
                    }`}
                  >
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
              {isAIStreaming && (
                <div className="self-start flex items-end gap-2.5 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs shrink-0">
                    ✦
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.08] backdrop-blur-xl border border-white/10 text-white text-sm shadow-md">
                    <MessageContent content={aiStreamingContent} isStreaming />
                  </div>
                </div>
              )}
            </div>
          ) : activeConv ? (
            /* Real Network Conversation */
            <div className="flex flex-col gap-4 pb-4">
              {/* Date Header */}
              {activeConv.messages && activeConv.messages.length > 0 && (
                <div className="flex justify-center my-2">
                  <span className="px-4 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-extrabold text-white/50 tracking-wider">
                    {formatDateSeparator(activeConv.messages[0].createdAt)}
                  </span>
                </div>
              )}

              {activeConv.messages?.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-center opacity-60">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Nenhuma mensagem ainda</p>
                  <p className="text-[11px] text-white/50 max-w-xs">Diz olá para iniciar esta conversa na rede!</p>
                </div>
              ) : (
                activeConv.messages?.map((m) => {
                  const isMe = m.senderId === authUser?.id;
                  const senderAvatar = isMe ? userAvatar : m.sender?.profile?.avatarUrl;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2.5 max-w-[85%] group ${
                        isMe ? 'self-end flex-row-reverse' : 'self-start flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/15 mb-0.5">
                        {senderAvatar ? (
                          <img src={resolveUrl(senderAvatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/70">
                            {(m.sender?.profile?.displayName || 'U')[0]}
                          </div>
                        )}
                      </div>

                      {/* Bubble */}
                      <div className="flex flex-col gap-1">
                        {/* Media Attachment if present */}
                        {m.imageUrl && (
                          <div
                            onClick={() => setSelectedImagePreview(resolveUrl(m.imageUrl!))}
                            className="rounded-2xl overflow-hidden border border-white/20 max-h-72 max-w-sm cursor-zoom-in hover:scale-[1.01] transition-transform shadow-xl bg-white/5"
                          >
                            <img src={resolveUrl(m.imageUrl)} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Text Content */}
                        {m.content && (
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-md break-words ${
                              isMe
                                ? 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white rounded-tr-sm shadow-[0_4px_22px_rgba(37,99,235,0.4)]'
                                : 'bg-white/[0.08] backdrop-blur-xl border border-white/10 text-white rounded-tl-sm'
                            }`}
                          >
                            {m.content}
                          </div>
                        )}

                        {/* Timestamp & Actions */}
                        <div
                          className={`flex items-center gap-1.5 text-[9px] font-bold px-1 text-white/35 ${
                            isMe ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>{formatMessageTime(m.createdAt)}</span>
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(m.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 cursor-pointer ml-1"
                              title="Apagar Mensagem"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Empty Placeholder when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#3b82f6] shadow-2xl">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Alpha Messages</h3>
                <p className="text-xs text-white/50 max-w-sm mt-1">
                  Selecione uma conversa ou inicie um novo chat com amigos da sua rede.
                </p>
              </div>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white font-extrabold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer"
              >
                + Nova Mensagem
              </button>
            </div>
          )}
        </div>

        {/* ── CHAT FLOATING INPUT BAR ── */}
        {activeContact && (
          <div className="p-3 sm:p-5 border-t border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shrink-0 z-20">
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              {/* Attachment File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Attachment Button */}
              <button
                type="button"
                disabled={isSendingFile}
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-40"
                title="Partilhar Fotografia"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  showEmojiPicker
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white/60 hover:text-white'
                }`}
                title="Inserir Emoji"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>

              {/* Text Input */}
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escrever mensagem..."
                  className="w-full h-11 pl-4 pr-12 rounded-full bg-white/[0.07] hover:bg-white/[0.10] focus:bg-white/[0.12] border border-white/10 focus:border-[#3b82f6] text-white text-xs sm:text-sm font-semibold placeholder-white/40 outline-none transition-all shadow-inner"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isSendingFile}
                className="h-11 px-6 rounded-full bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-white/90 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 shadow-lg flex items-center gap-1.5"
              >
                <span>Enviar</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>

            {/* Floating Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 left-6 z-50 p-3 bg-neutral-900/90 liquid-glass-shell backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl max-w-xs max-h-56 overflow-y-auto no-scrollbar grid grid-cols-6 gap-2">
                {ALL_ANIMATED_EMOJIS.slice(0, 36).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                    }}
                    className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all hover:scale-125 cursor-pointer text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. RIGHT WINDOW: MESSAGES INBOX / DIRECTORY (Painel de Conversas)
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`w-full md:w-80 lg:w-96 h-full min-h-0 rounded-none md:rounded-[3rem] border-0 md:border md:border-white/15 ${shellBg} flex flex-col overflow-hidden relative shadow-2xl shrink-0 transition-all duration-300 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
        style={{
          backdropFilter: 'blur(36px) saturate(140%)',
          WebkitBackdropFilter: 'blur(36px) saturate(140%)',
        }}
      >
        {/* Specular Edge Highlight */}
        <div className="hidden md:block absolute top-0 left-[6%] right-[6%] h-[1.5px] rounded-full pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.3px] z-30" />

        {/* ── INBOX HEADER ── */}
        <div className="p-4 sm:p-6 pb-3 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Mensagens</h1>
            <span className="w-5 h-5 rounded-full bg-[#ef4444] text-white text-[10px] font-black flex items-center justify-center shadow-md">
              {filteredContacts.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* New Message */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Nova Conversa"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Close back to Feed */}
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 transition-all cursor-pointer"
                title="Fechar Mensagens"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── STORIES / NOTES HORIZONTAL CAROUSEL ── */}
        <div className="px-4 py-3 border-b border-white/[0.06] overflow-x-auto no-scrollbar flex items-center gap-3.5 shrink-0">
          {/* User's Note */}
          <div
            onClick={() => setShowNoteModal(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 border-2 border-dashed border-white/30 group-hover:border-[#3b82f6] p-0.5 transition-all">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-full bg-white/10 text-white font-black text-xs">
                    {userName[0]}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#3b82f6] text-white flex items-center justify-center text-xs font-black shadow-md">
                +
              </div>
            </div>
            <span className="text-[10px] font-bold text-white/70 max-w-[60px] truncate text-center">
              {myNoteText ? myNoteText : 'A tua nota'}
            </span>
          </div>

          {/* Friends' Notes (Real Data from friendProfiles) */}
          {friendNotes.map((friend) => (
            <div
              key={friend.id}
              onClick={() => handleStartChatWithFriend(friend.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group relative"
            >
              {/* Note Speech Bubble if friend has a note */}
              {friend.note && (
                <div className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[8px] font-black uppercase tracking-wider truncate max-w-[70px] shadow-sm z-10">
                  {friend.note}
                </div>
              )}

              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 border-2 border-[#3b82f6]/40 group-hover:border-[#3b82f6] p-0.5 transition-all">
                {friend.avatar ? (
                  <img src={resolveUrl(friend.avatar)} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-full bg-white/10 text-white font-black text-xs">
                    {friend.name[0]}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-white/60 max-w-[60px] truncate text-center">
                {friend.name}
              </span>
            </div>
          ))}
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="p-4 pb-2">
          <div className="relative flex items-center">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="absolute left-3.5 text-white/40 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar mensagens..."
              className="w-full h-10 pl-10 pr-4 rounded-full bg-white/[0.06] hover:bg-white/[0.10] focus:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold placeholder-white/40 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* ── CATEGORY TABS ── */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/[0.06]">
          {[
            { id: 'primary', label: 'Principais' },
            { id: 'general', label: 'Grupos' },
            { id: 'ai', label: 'Alpha AI' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'ai') {
                    setActiveConversation('alpha-assistant');
                    setMobileView('chat');
                  }
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all text-center cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-md scale-[1.02]'
                    : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── CONVERSATION DIRECTORY LIST ── */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
          {/* Alpha AI Core row */}
          {activeTab === 'ai' || activeTab === 'primary' ? (
            <div
              onClick={() => {
                setActiveConversation('alpha-assistant');
                setMobileView('chat');
              }}
              className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                activeConversationId === 'alpha-assistant'
                  ? 'bg-white/15 border-white/25 shadow-lg scale-[1.01]'
                  : 'bg-transparent hover:bg-white/[0.06] border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white text-base font-black shadow-md shrink-0">
                  ✦
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white leading-tight flex items-center gap-1.5">
                    {personalAI?.name || 'Alpha Core'}
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </h4>
                  <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium">
                    {aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].content : 'Assistente IA disponível'}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black text-amber-400/80 uppercase tracking-widest shrink-0">
                IA
              </span>
            </div>
          ) : null}

          {/* Real Contacts */}
          {filteredContacts.length === 0 ? (
            <div className="py-16 text-center text-white/40 flex flex-col items-center justify-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-wider">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = activeConversationId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConversation(c.id);
                    setMobileView('chat');
                  }}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-white/15 border-white/25 shadow-lg scale-[1.01]'
                      : 'bg-transparent hover:bg-white/[0.06] border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 border border-white/15">
                        {c.avatar ? (
                          <img src={resolveUrl(c.avatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#2563eb] to-[#3b82f6] text-white font-bold text-xs">
                            {c.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${
                          c.status === 'online' ? 'bg-emerald-500' : 'bg-white/30'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-white leading-tight truncate">{c.name}</h4>
                      <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium">{c.lastMessage}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] font-bold text-white/40">{formatRelativeTime(c.lastMessageAt)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartCall('video');
                      }}
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 text-white/60 hover:text-white transition-opacity"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 7 16 12 23 17 23 7Z" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── INBOX BOTTOM BUTTON ── */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.02]">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs uppercase tracking-wider border border-white/15 backdrop-blur-md transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nova Mensagem</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. MODALS: NEW CHAT MODAL, NOTE MODAL, CALL OVERLAY, LIGHTBOX
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── NEW CHAT MODAL (Real Network Friends) ── */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          onClick={() => setShowNewChatModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-md rounded-[2.5rem] border border-white/20 liquid-glass-shell shadow-2xl p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            style={{
              backdropFilter: 'blur(36px) saturate(140%)',
              WebkitBackdropFilter: 'blur(36px) saturate(140%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">Nova Conversa</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Escolha um amigo da sua rede
                </p>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
              {friendProfiles.length === 0 ? (
                <div className="py-10 text-center text-white/40 text-xs italic">
                  Ainda não tens amigos adicionados. Adiciona amigos na rede Alpha para conversar!
                </div>
              ) : (
                friendProfiles.map((friend: any) => {
                  const p = friend.profile || friend;
                  const friendId = friend.id || friend.userId;
                  return (
                    <div
                      key={friendId}
                      onClick={() => handleStartChatWithFriend(friendId)}
                      className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-white/20">
                          {p.avatarUrl ? (
                            <img src={resolveUrl(p.avatarUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs">
                              {(p.displayName || p.username || 'A')[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white leading-tight">
                            {p.displayName || p.username}
                          </h4>
                          <p className="text-[10px] text-white/40">@{p.username}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-wider">Conversar →</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTE MODAL (A Tua Nota) ── */}
      {showNoteModal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          onClick={() => setShowNoteModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-sm rounded-[2.5rem] border border-white/20 liquid-glass-shell shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            style={{
              backdropFilter: 'blur(36px) saturate(140%)',
              WebkitBackdropFilter: 'blur(36px) saturate(140%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Partilhar uma Nota</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Visível para os teus amigos
                </p>
              </div>
              <button
                onClick={() => setShowNoteModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <textarea
              value={myNoteText}
              onChange={(e) => setMyNoteText(e.target.value.slice(0, 60))}
              placeholder="Partilha o que estás a pensar ou a ouvir..."
              rows={3}
              className="w-full p-3.5 rounded-2xl bg-white/[0.06] border border-white/15 text-white text-xs font-semibold placeholder-white/40 outline-none resize-none focus:border-[#3b82f6]"
            />
            <div className="flex items-center justify-between text-[10px] text-white/40">
              <span>{60 - myNoteText.length} caracteres restantes</span>
            </div>

            <button
              onClick={handleSaveNote}
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white font-extrabold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 shadow-xl transition-all cursor-pointer"
            >
              Publicar Nota
            </button>
          </div>
        </div>
      )}

      {/* ── CALL OVERLAY MODAL ── */}
      {callState?.active && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl animate-in fade-in duration-300" />
          <div
            className="relative w-full max-w-sm rounded-[3rem] border border-white/20 liquid-glass-shell shadow-2xl p-8 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300"
            style={{
              backdropFilter: 'blur(36px) saturate(140%)',
              WebkitBackdropFilter: 'blur(36px) saturate(140%)',
            }}
          >
            {/* Top Badge */}
            <span className="px-4 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black text-white uppercase tracking-widest">
              {callState.type === 'video' ? 'Chamada de Vídeo' : 'Chamada de Voz'} ·{' '}
              {callState.status === 'calling' ? 'A chamar...' : 'Ligado'}
            </span>

            {/* Avatar with Soundwave Rings */}
            <div className="relative my-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl relative z-10 bg-white/10">
                {callState.contactAvatar ? (
                  <img src={resolveUrl(callState.contactAvatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white bg-gradient-to-tr from-[#2563eb] to-[#3b82f6]">
                    {callState.contactName[0]}
                  </div>
                )}
              </div>
              <div className="absolute -inset-4 rounded-full border border-blue-400/40 animate-ping pointer-events-none" />
              <div className="absolute -inset-8 rounded-full border border-blue-400/20 animate-pulse pointer-events-none" />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-black text-white">{callState.contactName}</h2>
              <p className="text-xs font-semibold text-white/50 mt-1">
                {callState.status === 'connected'
                  ? `${Math.floor(callState.duration / 60)}:${(callState.duration % 60)
                      .toString()
                      .padStart(2, '0')}`
                  : 'A tocar...'}
              </p>
            </div>

            {/* Call Controls */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setCallState((prev) => (prev ? { ...prev, muted: !prev.muted } : null))}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  callState.muted ? 'bg-red-500/30 border-red-500/50 text-red-400' : 'bg-white/10 border-white/20 text-white'
                }`}
                title={callState.muted ? 'Desmutar' : 'Mutar'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>

              <button
                onClick={() => setCallState(null)}
                className="w-16 h-16 rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-[0_0_25px_rgba(239,68,68,0.5)] cursor-pointer"
                title="Terminar Chamada"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 10.5c-1.8 0-3.5-.5-5-1.4l-1.9 1.9C7.4 12.5 9.6 13.5 12 13.5s4.6-1 6.9-2.5l-1.9-1.9c-1.5.9-3.2 1.4-5 1.4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE LIGHTBOX ── */}
      {selectedImagePreview && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          onClick={() => setSelectedImagePreview(null)}
        >
          <img
            src={selectedImagePreview}
            alt=""
            className="max-w-[90vw] max-h-[90vh] rounded-3xl object-contain shadow-2xl border border-white/20"
          />
          <button
            onClick={() => setSelectedImagePreview(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
