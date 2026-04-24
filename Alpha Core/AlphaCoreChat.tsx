'use client';

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import { useAlphaCore, ChatMessage, parseMarkdown } from './useAlphaCore';
import { AlphaCoreAvatar } from './AlphaCoreAvatar';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui';

// ── Icons ──────────────────────────────────────────────────────────────────
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconStop = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IconClear = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconCode = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

// ── Quick prompts ──────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: 'Como publicar?', prompt: 'Como faço uma publicação no Modo Lazer?' },
  { label: 'Personalizar perfil', prompt: 'Como personalizo o meu perfil na Alpha Network?' },
  { label: 'Sistema de amigos', prompt: 'Como funciona o sistema de amigos?' },
  { label: 'Sobre ti', prompt: 'Quem és tu? Conta-me sobre a Alpha Core.' },
  { label: 'Notificações', prompt: 'Como funcionam as notificações?' },
  { label: 'Modos da plataforma', prompt: 'Quais são os modos disponíveis na Alpha Network?' },
];

// ── Code Block Component ───────────────────────────────────────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl overflow-hidden my-2 border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-1.5 opacity-60">
          <IconCode/>
          <span style={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{language}</span>
        </div>
        <button onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-md border-none cursor-pointer transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.06)', color: copied ? '#86efac' : 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          {copied ? <IconCheck/> : <IconCopy/>}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: '12px 14px', overflowX: 'auto',
        fontSize: 12.5, lineHeight: 1.7, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#e2e8f0', whiteSpace: 'pre',
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Message Content Renderer ───────────────────────────────────────────────
function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
  return (
    <div style={{ fontSize: 14, lineHeight: 1.75 }}>
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```([\w]*)\n([\s\S]*?)```$/);
        if (codeMatch) {
          return <CodeBlock key={i} language={codeMatch[1] || 'text'} code={codeMatch[2].trim()}/>;
        }
        // Render inline markdown
        const html = part
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-size:12.5px;font-family:monospace">$1</code>')
          .replace(/^### (.+)$/gm, '<div style="font-weight:600;font-size:13px;margin:10px 0 4px;opacity:0.9;letter-spacing:0.3px">$1</div>')
          .replace(/^## (.+)$/gm, '<div style="font-weight:600;font-size:14px;margin:12px 0 5px">$1</div>')
          .replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:15px;margin:14px 0 6px">$1</div>')
          .replace(/^- (.+)$/gm, '<div style="padding-left:14px;margin:2px 0">· $1</div>')
          .replace(/^\d+\. (.+)$/gm, (_, text, offset, str) => {
            const num = str.slice(0, offset).match(/^\d+\./gm)?.length ?? 0;
            return `<div style="padding-left:14px;margin:2px 0">${num + 1}. ${text}</div>`;
          })
          .replace(/\n\n/g, '<div style="height:8px"/>')
          .replace(/\n/g, '<br/>');
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
      {isStreaming && (
        <span
          style={{
            display: 'inline-block', width: 2, height: 14, marginLeft: 2,
            background: 'currentColor', animation: 'ac-cursor-blink 0.8s step-end infinite',
            verticalAlign: 'middle', opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

interface AlphaCoreChatProps {
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  currentMode?: string;
  onClose?: () => void;
  /** Se `floating=true`, renderiza como painel flutuante. Se false, inline. */
  floating?: boolean;
}

export function AlphaCoreChat({
  themeColor = '#a78bfa',
  themeMode = 'dark',
  currentMode = 'Lazer',
  onClose,
  floating = true,
}: AlphaCoreChatProps) {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    streamingContent,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearHistory,
    sendQuickPrompt,
  } = useAlphaCore({
    themeColor,
    currentMode,
    capabilities: ['chat', 'code_execution', 'report_generation'],
  });

  const isLight = themeMode === 'light';
  const c = themeColor;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Hide quick prompts when first message is sent
  useEffect(() => {
    if (messages.length > 0) setShowQuickPrompts(false);
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text);
  }, [input, isStreaming, sendMessage]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const panelBg = isLight
    ? 'rgba(255,255,255,0.92)'
    : 'rgba(8,8,16,0.92)';
  const borderColor = `${c}30`;
  const textPrimary = isLight ? '#0a0a12' : '#f0f0f6';
  const textSecondary = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)';
  const inputBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
  const msgUserBg = `${c}18`;
  const msgUserBorder = `${c}35`;

  const containerStyle: React.CSSProperties = floating ? {
    position: 'fixed',
    bottom: 90,
    right: 24,
    width: 'min(440px, calc(100vw - 32px))',
    height: isMinimized ? 'auto' : 'min(640px, calc(100vh - 120px))',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 20,
    border: `1px solid ${borderColor}`,
    background: panelBg,
    backdropFilter: 'blur(40px)',
    boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px ${c}15, inset 0 1px 0 rgba(255,255,255,0.06)`,
    overflow: 'hidden',
    transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
  } : {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 20,
    border: `1px solid ${borderColor}`,
    background: panelBg,
    backdropFilter: 'blur(40px)',
    overflow: 'hidden',
    height: '100%',
    minHeight: 480,
  };

  return (
    <>
      <style>{`
        @keyframes ac-cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ac-msg-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes ac-thinking-dot {
          0%,80%,100%{transform:scale(0.6);opacity:0.3}
          40%{transform:scale(1);opacity:1}
        }
        .ac-msg-animate { animation: ac-msg-in 0.25s ease forwards; }
        .ac-user-select::-webkit-scrollbar { width: 4px; }
        .ac-user-select::-webkit-scrollbar-track { background: transparent; }
        .ac-user-select::-webkit-scrollbar-thumb { background: ${c}30; border-radius: 4px; }
        .ac-quick-btn:hover { background: ${c}20 !important; border-color: ${c}60 !important; }
        .ac-input-area:focus { outline: none; }
        .ac-send-btn:disabled { opacity: 0.35; cursor: default; }
        .ac-send-btn:not(:disabled):hover { filter: brightness(1.1); transform: scale(1.05); }
      `}</style>

      <div style={containerStyle}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: `1px solid ${borderColor}`,
          background: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.03)',
          flexShrink: 0,
        }}>
          {/* Avatar + status dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AlphaCoreAvatar
              size={36}
              state={isStreaming ? 'thinking' : 'idle'}
              themeColor={c}
            />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 9, height: 9, borderRadius: '50%',
              background: '#22c55e',
              border: `2px solid ${isLight ? '#fff' : '#080810'}`,
            }}/>
          </div>

          {/* Name + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Georgia', serif",
              fontSize: 14, fontWeight: 600,
              color: textPrimary, letterSpacing: '-0.2px',
            }}>
              Alpha Core
            </div>
            <div style={{ fontSize: 11, color: isStreaming ? c : '#22c55e', fontWeight: 500 }}>
              {isStreaming ? '● a pensar...' : '● online'}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4 }}>
            {messages.length > 0 && (
              <button onClick={clearHistory}
                title="Limpar conversa"
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: 'transparent', color: textSecondary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(239,68,68,0.12)'; (e.target as HTMLElement).closest('button')!.style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.target as HTMLElement).closest('button')!.style.background = 'transparent'; (e.target as HTMLElement).closest('button')!.style.color = textSecondary; }}>
                <IconClear/>
              </button>
            )}
            {floating && (
              <button onClick={() => setIsMinimized(v => !v)}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: 'transparent', color: textSecondary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: isMinimized ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>
                <IconChevronDown/>
              </button>
            )}
            {onClose && (
              <button onClick={onClose}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: 'transparent', color: textSecondary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <IconClose/>
              </button>
            )}
          </div>
        </div>

        {/* ── Body (hidden when minimized) ────────────────────────────── */}
        {!isMinimized && (
          <>
            {/* Messages */}
            <div
              className="ac-user-select"
              style={{
                flex: 1, overflowY: 'auto', padding: '16px 14px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>

              {/* Welcome state */}
              {messages.length === 0 && !isStreaming && (
                <div style={{ textAlign: 'center', padding: '24px 16px 8px' }}>
                  <AlphaCoreAvatar size={56} state="idle" themeColor={c} style={{ margin: '0 auto 12px' }}/>
                  <div style={{
                    fontFamily: "'Georgia', serif",
                    fontSize: 17, fontWeight: 600,
                    color: textPrimary, marginBottom: 6,
                  }}>
                    Olá. Sou a Alpha.
                  </div>
                  <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
                    Inteligência nativa da Alpha Network. Pergunta-me qualquer coisa — sobre a plataforma, código, anime, ou qualquer outra coisa.
                  </div>
                </div>
              )}

              {/* Quick prompts */}
              {showQuickPrompts && messages.length === 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', padding: '4px 0 8px' }}>
                  {QUICK_PROMPTS.map(qp => (
                    <button
                      key={qp.label}
                      className="ac-quick-btn"
                      onClick={() => sendQuickPrompt(qp.prompt)}
                      style={{
                        padding: '5px 11px', borderRadius: 20,
                        border: `1px solid ${c}25`,
                        background: `${c}0c`,
                        color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.65)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}>
                      {qp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Message list */}
              {messages.map((msg) => (
                <div key={msg.id} className="ac-msg-animate" style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 8, alignItems: 'flex-end',
                }}>
                  {/* Avatar */}
                  <div style={{ flexShrink: 0, marginBottom: 2 }}>
                    {msg.role === 'assistant' ? (
                      <AlphaCoreAvatar size={26} state="idle" themeColor={c}/>
                    ) : (
                      <Avatar
                        src={user?.profile?.avatarUrl}
                        name={user?.profile?.displayName || user?.profile?.username || 'U'}
                        style={{ width: 26, height: 26, borderRadius: '50%' }}
                      />
                    )}
                  </div>

                  {/* Bubble */}
                  <div style={{
                    maxWidth: '82%',
                    padding: msg.role === 'assistant' ? '10px 13px' : '9px 13px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? msgUserBg : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'),
                    border: msg.role === 'user'
                      ? `1px solid ${msgUserBorder}`
                      : `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}`,
                    color: msg.isError ? '#f87171' : textPrimary,
                  }}>
                    <MessageContent content={msg.content}/>
                    <div style={{
                      fontSize: 10, color: textSecondary,
                      marginTop: 5, textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}>
                      {msg.timestamp.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="ac-msg-animate" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <AlphaCoreAvatar size={26} state="thinking" themeColor={c} style={{ flexShrink: 0, marginBottom: 2 }}/>
                  <div style={{
                    maxWidth: '82%', padding: '10px 13px',
                    borderRadius: '16px 16px 16px 4px',
                    background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}`,
                    color: textPrimary,
                  }}>
                    <MessageContent content={streamingContent} isStreaming/>
                  </div>
                </div>
              )}

              {/* Thinking indicator (before first chunk arrives) */}
              {isStreaming && !streamingContent && (
                <div className="ac-msg-animate" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <AlphaCoreAvatar size={26} state="thinking" themeColor={c} style={{ flexShrink: 0, marginBottom: 2 }}/>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', gap: 5, alignItems: 'center',
                  }}>
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: c,
                        animation: `ac-thinking-dot 1.2s ease-in-out ${delay}s infinite`,
                      }}/>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef}/>
            </div>

            {/* ── Input area ─────────────────────────────────────────── */}
            <div style={{
              padding: '10px 12px 12px',
              borderTop: `1px solid ${borderColor}`,
              background: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.02)',
              flexShrink: 0,
            }}>
              {/* Phase 2 capability badges */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                {[
                  { label: 'Código', icon: '⟨/⟩' },
                  { label: 'Relatórios', icon: '⊞' },
                  { label: 'Alpha Network', icon: 'α' },
                ].map(cap => (
                  <div key={cap.label} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 20,
                    background: `${c}10`,
                    border: `1px solid ${c}20`,
                    fontSize: 10, fontWeight: 600,
                    color: c, opacity: 0.7,
                    letterSpacing: '0.3px',
                  }}>
                    <span style={{ fontSize: 10 }}>{cap.icon}</span>
                    {cap.label}
                  </div>
                ))}
              </div>

              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                background: inputBg,
                borderRadius: 14,
                border: `1px solid ${c}20`,
                padding: '8px 10px 8px 14px',
                transition: 'border-color 0.15s',
              }}
                onFocusCapture={e => e.currentTarget.style.borderColor = `${c}50`}
                onBlurCapture={e => e.currentTarget.style.borderColor = `${c}20`}
              >
                <textarea
                  ref={inputRef}
                  className="ac-input-area"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Pergunta à Alpha..."
                  disabled={isStreaming}
                  rows={1}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    resize: 'none', outline: 'none',
                    fontSize: 13.5, lineHeight: 1.55,
                    color: textPrimary, fontFamily: 'inherit',
                    maxHeight: 120, overflowY: 'auto',
                    paddingTop: 2,
                  }}
                  onInput={e => {
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }}
                />

                {/* Send / Stop button */}
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    style={{
                      width: 32, height: 32, borderRadius: 10,
                      border: `1px solid rgba(239,68,68,0.4)`,
                      background: 'rgba(239,68,68,0.12)',
                      color: '#f87171', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s',
                    }}>
                    <IconStop/>
                  </button>
                ) : (
                  <button
                    className="ac-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim()}
                    style={{
                      width: 32, height: 32, borderRadius: 10,
                      border: 'none',
                      background: input.trim() ? `linear-gradient(135deg, ${c}dd, ${c})` : `${c}30`,
                      color: input.trim() ? '#fff' : c,
                      cursor: input.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: input.trim() ? `0 4px 14px ${c}50` : 'none',
                      transition: 'all 0.15s',
                    }}>
                    <IconSend/>
                  </button>
                )}
              </div>

              <div style={{
                textAlign: 'center', marginTop: 7,
                fontSize: 10, color: textSecondary, letterSpacing: '0.3px',
              }}>
                Alpha Core · Alpha Network · Fase 1
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Floating trigger button ────────────────────────────────────────────────

interface AlphaCoreButtonProps {
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  currentMode?: string;
}

export function AlphaCoreButton({
  themeColor = '#a78bfa',
  themeMode = 'dark',
  currentMode = 'Lazer',
}: AlphaCoreButtonProps) {
  const [open, setOpen] = useState(false);
  const c = themeColor;

  return (
    <>
      {open && (
        <AlphaCoreChat
          themeColor={c}
          themeMode={themeMode}
          currentMode={currentMode}
          onClose={() => setOpen(false)}
          floating
        />
      )}
      <button
        onClick={() => setOpen(v => !v)}
        title="Alpha Core"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: `1.5px solid ${c}50`,
          background: open
            ? `linear-gradient(135deg, ${c}ee, ${c})`
            : 'rgba(8,8,16,0.85)',
          backdropFilter: 'blur(20px)',
          boxShadow: open
            ? `0 8px 32px ${c}80, 0 0 0 4px ${c}18`
            : `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${c}20`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 499,
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          transform: open ? 'rotate(15deg) scale(1.05)' : 'none',
        }}>
        <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="38" fill={open ? 'rgba(255,255,255,0.15)' : `${c}20`}/>
          <text
            x="50" y="63"
            textAnchor="middle"
            fontSize="38"
            fontWeight="300"
            fontFamily="Georgia, serif"
            fill={open ? '#fff' : c}
            opacity="0.95"
          >
            α
          </text>
        </svg>
      </button>
    </>
  );
}

export default AlphaCoreChat;
