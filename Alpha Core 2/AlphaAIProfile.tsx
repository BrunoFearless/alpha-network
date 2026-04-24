'use client';

// ════════════════════════════════════════════════════════════════════════════
// ALPHA NETWORK — Perfil Público da IA + Hook de Chat com IA Personalizada
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = typeof window !== 'undefined'
    ? (window as any).__ALPHA_TOKEN__ ?? ''
    : '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface PublicAIProfile {
  botname: string;
  name: string;
  tagline?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerColor?: string;
  personalityTraits: string[];
  tone?: string;
  gender?: string;
  isPublic: boolean;
  user?: { profile?: { username: string; displayName?: string } };
}

// ── AI Profile Card ────────────────────────────────────────────────────────

interface AlphaAIProfileCardProps {
  ai: PublicAIProfile;
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  onChat?: (botname: string) => void;
  compact?: boolean;
}

export function AlphaAIProfileCard({
  ai, themeColor = '#a78bfa', themeMode = 'dark', onChat, compact = false,
}: AlphaAIProfileCardProps) {
  const isLight = themeMode === 'light';
  const c = themeColor;

  const bannerStyle: React.CSSProperties = {
    width: '100%',
    height: compact ? 60 : 100,
    background: ai.bannerUrl
      ? `url(${ai.bannerUrl}) center/cover`
      : (ai.bannerColor ?? c) + '40',
    borderRadius: compact ? '12px 12px 0 0' : '16px 16px 0 0',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={{
      borderRadius: compact ? 12 : 16,
      border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
      background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: onChat ? 'pointer' : 'default',
    }}
      onMouseEnter={e => { if (onChat) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${c}25`; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>

      {/* Banner */}
      <div style={bannerStyle}>
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3))' }}/>
      </div>

      {/* Body */}
      <div style={{ padding: compact ? '0 12px 12px' : '0 16px 16px', marginTop: compact ? -20 : -30 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: compact ? 8 : 10 }}>
          <div style={{
            width: compact ? 44 : 60, height: compact ? 44 : 60,
            borderRadius: '50%', flexShrink: 0,
            background: ai.avatarUrl ? `url(${ai.avatarUrl}) center/cover` : `${c}25`,
            border: `3px solid ${isLight ? '#fff' : '#080812'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: compact ? 18 : 24,
          }}>
            {!ai.avatarUrl && '🤖'}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: compact ? 14 : 16, fontWeight: 800, color: isLight ? '#0a0a12' : '#f0f0f6' }}>
                {ai.name}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 20,
                background: `${c}20`, color: c, border: `1px solid ${c}35`,
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>IA</span>
            </div>
            <div style={{ fontSize: 11, color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)' }}>
              @{ai.botname}
              {ai.user?.profile?.username && (
                <span style={{ marginLeft: 6 }}>· criada por @{ai.user.profile.username}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tagline */}
        {ai.tagline && !compact && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.4 }}>
            "{ai.tagline}"
          </p>
        )}

        {/* Bio */}
        {ai.bio && !compact && (
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.5)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {ai.bio}
          </p>
        )}

        {/* Traits */}
        {ai.personalityTraits?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: compact ? 0 : 10 }}>
            {ai.personalityTraits.slice(0, compact ? 3 : 6).map(t => (
              <span key={t} style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: `${c}12`, border: `1px solid ${c}25`, color: c,
              }}>
                {t}
              </span>
            ))}
            {ai.personalityTraits.length > (compact ? 3 : 6) && (
              <span style={{ fontSize: 10, color: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }}>
                +{ai.personalityTraits.length - (compact ? 3 : 6)}
              </span>
            )}
          </div>
        )}

        {/* Action */}
        {onChat && (
          <button onClick={() => onChat(ai.botname)}
            style={{
              width: '100%', padding: '8px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${c}cc, ${c})`,
              color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 14px ${c}35`, marginTop: compact ? 8 : 0,
              transition: 'filter 0.15s',
            }}
            onMouseEnter={e => (e.target as any).style.filter = 'brightness(1.1)'}
            onMouseLeave={e => (e.target as any).style.filter = 'none'}>
            Conversar com {ai.name}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Discover Grid ──────────────────────────────────────────────────────────

interface AlphaAIDiscoverProps {
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  onChat?: (botname: string) => void;
}

export function AlphaAIDiscover({ themeColor = '#a78bfa', themeMode = 'dark', onChat }: AlphaAIDiscoverProps) {
  const [ais, setAIs] = useState<PublicAIProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v1/alpha/ai/discover`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setAIs(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isLight = themeMode === 'light';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      A carregar IAs públicas...
    </div>
  );

  if (ais.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
      <p style={{ fontSize: 13, margin: 0 }}>Nenhuma IA pública ainda. Cria a tua e partilha com a comunidade!</p>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
      {ais.map(ai => (
        <AlphaAIProfileCard key={ai.botname} ai={ai} themeColor={themeColor} themeMode={themeMode} onChat={onChat}/>
      ))}
    </div>
  );
}

// ── useUserAI Hook — chat com qualquer IA pessoal ─────────────────────────

export interface UserAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useUserAI(botname: string) {
  const [aiProfile, setAIProfile] = useState<any>(null);
  const [messages, setMessages] = useState<UserAIMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Load AI profile
  useEffect(() => {
    if (!botname) return;
    fetch(`${API}/api/v1/alpha/ai/${botname}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setAIProfile(d.data);
          // Show initial message if configured
          if (d.data.initialMessage) {
            setMessages([{
              id: 'initial',
              role: 'assistant',
              content: d.data.initialMessage,
              timestamp: new Date(),
            }]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingProfile(false));
  }, [botname]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isStreaming || !aiProfile) return;

    const userMsg: UserAIMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    // Get system prompt from backend
    const promptRes = await fetch(`${API}/api/v1/alpha/ai/me/prompt`, { headers: authHeaders() });
    const promptData = await promptRes.json();
    const systemPrompt = promptData.data?.prompt ?? `És ${aiProfile.name}. Responds sempre em personagem.`;

    // Build conversation history
    const history = [...messages, userMsg]
      .filter(m => m.id !== 'initial')
      .map(m => ({ role: m.role, content: m.content }));

    // Call Claude via backend proxy (or direct)
    let accumulated = '';
    const assistantId = `a-${Date.now()}`;

    try {
      const res = await fetch(`${API}/api/v1/alpha/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messages: history, systemPrompt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const p = JSON.parse(raw);
            if (p.text) {
              accumulated += p.text;
              setStreamingContent(accumulated);
            }
          } catch { /* ignore */ }
        }
      }

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: accumulated, timestamp: new Date() }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: assistantId, role: 'assistant',
        content: aiProfile.errorMessage ?? `Ocorreu um erro: ${e.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setStreamingContent('');
      setIsStreaming(false);
    }
  };

  return {
    aiProfile, messages, streamingContent, isStreaming, isLoadingProfile,
    sendMessage,
    clearHistory: () => setMessages(aiProfile?.initialMessage ? [{ id: 'initial', role: 'assistant', content: aiProfile.initialMessage, timestamp: new Date() }] : []),
  };
}

export default AlphaAIProfileCard;
