'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAlphaCoreStore } from '@/store/useAlphaCoreStore';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { usePathname } from 'next/navigation';
import { AlphaCoreAvatar } from '@/components/ui/AlphaCoreAvatar';
import { buildAlphaCoreSystemPrompt } from '@/lib/alpha-core/alpha-core-system-prompt';

export function AlphaCoreChat() {
  const { isOpen, closeChat, messages, addMessage, status, setStatus } = useAlphaCoreStore();
  const { user, accessToken } = useAuthStore();
  const { userPosts, fetchUserPosts } = useLazerStore();
  const pathname = usePathname();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 300);
      
      // Fetch user posts if not already loaded or to keep them fresh
      if (user?.id) {
        fetchUserPosts(user.id);
      }
    }
  }, [isOpen, user?.id, fetchUserPosts]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || status !== 'idle') return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setStatus('thinking');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Determine current mode from pathname
      const currentMode = pathname.includes('/lazer') ? 'Lazer' : 
                         pathname.includes('/community') ? 'Community' : 
                         pathname.includes('/creator') ? 'Creator' : 'Alpha Network';

      const systemPrompt = buildAlphaCoreSystemPrompt({
        userName: user?.profile?.displayName || user?.profile?.username,
        userProfile: user?.profile as any,
        recentPosts: userPosts.map(p => ({ content: p.content, createdAt: p.createdAt })),
        currentMode,
      });

      const response = await fetch(`${apiUrl}/api/v1/alpha-core/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          systemPrompt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addMessage({ role: 'assistant', content: data.reply });
      } else {
        addMessage({ role: 'assistant', content: 'Desculpa, tive um problema ao processar a tua mensagem. Tenta novamente.' });
      }
    } catch (error) {
      console.error('Alpha Core Error:', error);
      addMessage({ role: 'assistant', content: 'Parece que estou com dificuldades de ligação. Verifica a tua internet.' });
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        style={{ height: 'min(800px, 85vh)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <AlphaCoreAvatar size={32} state={status} />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Alpha Core</h2>
              <p className="text-[#a78bfa] text-xs font-medium">IA Nativa da Alpha Network</p>
            </div>
          </div>
          <button 
            onClick={closeChat}
            className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
              <AlphaCoreAvatar size={64} state="idle" />
              <div className="max-w-xs">
                <p className="text-white font-medium text-lg">Olá! Eu sou a Alpha.</p>
                <p className="text-white/60 text-sm mt-1">Como posso ajudar-te hoje na Alpha Network?</p>
              </div>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 mt-1">
                  {msg.role === 'assistant' ? (
                    <AlphaCoreAvatar size={28} state="idle" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      {user?.profile?.displayName?.[0] || user?.profile?.username?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div 
                  className={`px-4 py-3 rounded-[20px] text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#a78bfa] text-white rounded-tr-none' 
                      : 'bg-white/5 text-white/90 border border-white/5 rounded-tl-none'
                  }`}
                >
                  <ReactMarkdown className="markdown-body">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {status === 'thinking' && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-3 max-w-[85%]">
                <div className="flex-shrink-0 mt-1">
                  <AlphaCoreAvatar size={28} state="thinking" />
                </div>
                <div className="bg-white/5 text-white/40 px-4 py-3 rounded-[20px] rounded-tl-none border border-white/5 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form 
          onSubmit={handleSendMessage}
          className="p-4 border-t border-white/5 bg-white/[0.01]"
        >
          <div className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunta qualquer coisa sobre a Alpha Network..."
              className="flex-1 bg-white/5 border border-white/10 rounded-full py-3 px-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 focus:ring-1 focus:ring-[#a78bfa]/20 transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || status !== 'idle'}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                input.trim() && status === 'idle'
                  ? 'bg-[#a78bfa] text-white shadow-[0_4px_12px_rgba(167,139,250,0.4)] hover:scale-105'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </form>

        <style jsx global>{`
          .markdown-body p { margin-bottom: 0.5rem; }
          .markdown-body p:last-child { margin-bottom: 0; }
          .markdown-body code { background: rgba(255,255,255,0.1); padding: 0.1rem 0.3rem; rounded: 4px; font-family: monospace; }
          .markdown-body pre { background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 12px; margin: 0.5rem 0; overflow-x: auto; }
          .markdown-body ul, .markdown-body ol { margin-left: 1.5rem; margin-bottom: 0.5rem; }
          .markdown-body li { margin-bottom: 0.25rem; }
        `}</style>
      </div>
    </div>
  );
}
