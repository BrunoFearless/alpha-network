'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useAuthStore } from '@/store/auth.store';
import { useAlphaCore } from '@/components/alpha-core/useAlphaCore';
import { MessageContent } from '@/components/alpha-core/AlphaCoreChat';
import { useAlphaCoreStore } from '@/store/useAlphaCoreStore';
import { EmojiRenderer, getAnimatedUrl, ALL_ANIMATED_EMOJIS } from '@/components/ui/EmojiRenderer';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconMessage = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const IconPlus = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const IconFile = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
);

const IconDownload = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

const IconPaperclip = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);
const IconSmile = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
);
const IconUser = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconVolumeX = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
);
const IconSearch = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const IconSparkles = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);
const IconEdit = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const IconTrash = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);
const IconPin = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>
);
const IconSmilePlus = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M16 5h6"/><path d="M19 2v6"/><circle cx="12" cy="12" r="10"/></svg>
);
const IconUsers = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconBell = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);
const IconPalette = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H17c2.8 0 5-2.2 5-5 0-5.5-4.5-10-10-10z"/></svg>
);
const IconLock = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const IconAlertTriangle = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconMoreHorizontal = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
);
const IconPhone = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);
const IconVideo = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
);
const IconInfo = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
);
const IconChevronLeft = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status: 'online' | 'away' | 'offline' | 'in-game' | 'watching' | 'busy';
  statusText: string;
  emoji?: string;
  lastMessage: string;
  lastTime: string;
  unread?: number;
  isAI?: boolean;
  themeColor?: string;
  sharedMedia?: string[];
  icon?: React.ReactNode;
}

interface Reaction {
  userId: string;
  emoji: string;
}

interface Message {
  id: string;
  from: 'me' | 'them';
  content: string;
  time: string;
  reactions?: Reaction[];
  imageUrl?: string;
  replyTo?: string;
  isPinned?: boolean;
  editedAt?: string;
  status?: 'sent' | 'delivered' | 'read';
}

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'online':   { color: '#22c55e', label: 'Online' },
  'away':     { color: '#f59e0b', label: 'Away' },
  'offline':  { color: '#6b7280', label: 'Offline' },
  'in-game':  { color: '#3b82f6', label: 'In-game' },
  'watching': { color: '#a855f7', label: 'Watching' },
  'busy':     { color: '#ef4444', label: 'Busy' },
};

// ─── Helper components ──────────────────────────────────────────────────────────
function SectionHeader({ icon, label, ts }: { icon: React.ReactNode; label: string; ts: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 28, marginBottom: 12 }}>
      <div style={{ color: ts }}>{icon}</div>
      <span style={{ fontSize: 11, fontWeight: 800, color: ts, letterSpacing: '1.5px' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${ts}20, transparent)`, marginLeft: 4 }}/>
    </div>
  );
}

function SettingCard({ title, desc, children, isLight, tp, ts, borderCol }: { title: string; desc: string; children: React.ReactNode; isLight: boolean; tp: string; ts: string; borderCol: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderRadius: 14, marginBottom: 8,
      border: `1.5px solid ${borderCol}`,
      background: isLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.03)', gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: tp, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: ts, lineHeight: 1.4 }}>{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, themeColor }: { checked: boolean; onChange: (v: boolean) => void; themeColor: string }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? themeColor : 'rgba(0,0,0,0.1)',
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
      flexShrink: 0
    }}>
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}/>
    </div>
  );
}

function ChatSettings({ contact, onBack, themeColor, themeMode }: { contact: Contact; onBack: () => void; themeColor: string; themeMode: 'light' | 'dark' }) {
  const isLight = themeMode === 'light';
  const tp = isLight ? '#1e1b4b' : '#ffffff';
  const ts = isLight ? '#94a3b8' : '#94a3b8';
  const glassBg = isLight ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const accentBorder = `${themeColor}30`;

  const [muted, setMuted] = useState(false);
  const [alertTone, setAlertTone] = useState('Padrão (Ping)');
  const [bubbleColor, setBubbleColor] = useState(themeColor);
  const [fontSize, setFontSize] = useState('Médio');
  const [readReceipts, setReadReceipts] = useState(true);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 300, flexShrink: 0, padding: '32px 24px', borderRight: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column', alignItems: 'center', background: glassBg, backdropFilter: 'blur(32px)' }}>
        <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: ts, marginBottom: 32 }}><IconChevronLeft size={24}/></button>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${themeColor}`, padding: 3, background: isLight ? 'white' : '#27272a' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: isLight ? '#f1f5f9' : '#18181b' }}>
              {contact.isAI
                ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${themeColor}20` }}><IconSparkles size={40} color={themeColor}/></div>
                : <img src={contact.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              }
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 5, right: 5, width: 16, height: 16, borderRadius: '50%', background: STATUS_CONFIG[contact.status]?.color || '#ccc', border: `3px solid ${isLight ? 'white' : '#18181b'}` }}/>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: tp, margin: '0 0 4px', textAlign: 'center' }}>{contact.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_CONFIG[contact.status]?.color || ts }}>
            {contact.statusText || 'Offline'}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: tp, margin: '0 0 6px' }}>Configurações do Chat</h2>
        <p style={{ color: ts, fontSize: 14, margin: '0 0 32px' }}>Personaliza a tua experiência com {contact.name}.</p>

        <SectionHeader icon={<IconBell size={18}/>} label="NOTIFICAÇÕES" ts={ts}/>
        <SettingCard title="Silenciar Mensagens" desc="Para de receber notificações push deste chat." isLight={isLight} tp={tp} ts={ts} borderCol={borderCol}>
          <Toggle checked={muted} onChange={setMuted} themeColor={themeColor}/>
        </SettingCard>
        <SettingCard title="Som de Alerta" desc="Escolhe um som específico para novas mensagens." isLight={isLight} tp={tp} ts={ts} borderCol={borderCol}>
          <select value={alertTone} onChange={e => setAlertTone(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${accentBorder}`, background: isLight ? 'white' : '#27272a', fontSize: 13, fontWeight: 600, color: tp, cursor: 'pointer', fontFamily: 'inherit' }}>
            <option>Padrão (Ping)</option>
            <option>Sino Suave</option>
            <option>Carrilhão</option>
            <option>Pulso</option>
            <option>Silencioso</option>
          </select>
        </SettingCard>

        <SectionHeader icon={<IconPalette size={18}/>} label="APARÊNCIA" ts={ts}/>
        <SettingCard title="Cor do Balão" desc="Cor das tuas mensagens enviadas." isLight={isLight} tp={tp} ts={ts} borderCol={borderCol}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['#3b82f6','#6366f1','#ec4899','#10b981','#f59e0b','#ef4444','#a78bfa'].map(col => (
              <button key={col} onClick={() => setBubbleColor(col)}
                style={{ width: 26, height: 26, borderRadius: '50%', background: col, border: `3px solid ${bubbleColor === col ? tp : 'transparent'}`, cursor: 'pointer', transition: 'transform 0.15s', transform: bubbleColor === col ? 'scale(1.2)' : 'scale(1)' }}/>
            ))}
          </div>
        </SettingCard>
        <SettingCard title="Tamanho da Fonte" desc="Ajusta o tamanho do texto no chat." isLight={isLight} tp={tp} ts={ts} borderCol={borderCol}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Pequeno', 'Médio', 'Grande'].map(s => (
              <button key={s} onClick={() => setFontSize(s)}
                style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid', borderColor: fontSize === s ? themeColor : accentBorder, background: fontSize === s ? themeColor : 'transparent', color: fontSize === s ? 'white' : ts, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {s}
              </button>
            ))}
          </div>
        </SettingCard>

        <SectionHeader icon={<IconLock size={18}/>} label="PRIVACIDADE" ts={ts}/>
        <SettingCard title="Recibos de Leitura" desc="Deixa a outra pessoa saber quando leste as mensagens." isLight={isLight} tp={tp} ts={ts} borderCol={borderCol}>
          <Toggle checked={readReceipts} onChange={setReadReceipts} themeColor={themeColor}/>
        </SettingCard>

        <SectionHeader icon={<IconAlertTriangle size={18}/>} label="ZONA DE PERIGO" ts={ts}/>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Limpar Histórico', 'Bloquear Utilizador', 'Denunciar'].map(label => (
            <button key={label}
              style={{ padding: '9px 18px', borderRadius: 12, border: '1.5px solid #ef444440', background: '#ef444410', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Alpha Chat View ───────────────────────────────────────────────────────────
function AlphaChatView({ themeColor, themeMode, authUser }: { themeColor: string; themeMode: 'light' | 'dark'; authUser: any }) {
  const {
    messages, isStreaming, streamingContent, sendMessage, 
    personalAI, isLoadingHistory, confirmAction, rejectAction
  } = useAlphaCore({
    capabilities: ['chat', 'platform_actions'],
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLight = themeMode === 'light';
  const tp = isLight ? '#1e1b4b' : '#ffffff';
  const ts = isLight ? '#94a3b8' : '#94a3b8';
  const borderCol = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isStreaming) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const userColor = authUser?.profile?.bannerColor || '#6366f1';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '0 24px', height: 68, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${borderCol}`, background: 'transparent' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: `${themeColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {personalAI?.avatarUrl 
              ? <img src={personalAI.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <IconSparkles size={22} color={themeColor}/>
            }
          </div>
          <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid white' }}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: tp }}>{personalAI?.name || 'Alpha Core'}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>{personalAI?.tagline || 'Online'}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
            <div style={{ 
              padding: '10px 14px', 
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
              background: msg.role === 'user' ? `linear-gradient(135deg, ${userColor}dd 0%, ${userColor} 100%)` : isLight ? 'white' : 'rgba(255,255,255,0.08)', 
              color: msg.role === 'user' ? 'white' : tp, 
              fontSize: 14, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)', 
              border: msg.role === 'user' ? `1.5px solid ${userColor}` : `1px solid ${borderCol}`, 
              maxWidth: '85%' 
            }}>
              <MessageContent content={msg.content} />
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 5, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.timestamp instanceof Date 
                  ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '100%' }}>
            <div style={{ padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: isLight ? 'white' : 'rgba(255,255,255,0.08)', color: tp, fontSize: 14, border: `1px solid ${borderCol}`, maxWidth: '85%' }}>
              <MessageContent content={streamingContent} isStreaming />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${borderCol}` }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, padding: '10px 16px', borderRadius: 24, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${themeColor}20` }}>
            <input type="text" placeholder="Conversar com a Alpha..." value={input} onChange={(e) => setInput(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: tp, fontSize: 14, outline: 'none', width: '100%' }}/>
          </div>
          <button type="submit" disabled={!input.trim() || isStreaming} style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: input.trim() ? userColor : '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MessagesModule() {
  const { user: authUser } = useAuthStore();
  const themeMode = (authUser?.profile as any)?.lazerData?.themeMode || 'dark';
  const isLight = themeMode === 'light';
  const tp = isLight ? '#1e1b4b' : '#ffffff';
  const ts = isLight ? '#94a3b8' : '#94a3b8';
  const glassBg = isLight ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
  const borderCol = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const accentBorder = `rgba(99,102,241,0.1)`;
  const themeColor = authUser?.profile?.bannerColor || '#6366f1';

  const { 
    conversations, activeConversationId, initSocket, fetchConversations, 
    setActiveConversation, sendMessage: sendStoreMessage, isLoading,
    deleteMessage: deleteStoreMessage, editMessage: editStoreMessage,
    togglePin: toggleStorePin, toggleReaction: toggleStoreReaction,
  } = useChatStore();

  const { messages, personalAI } = useAlphaCoreStore();

  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [pendingFile, setPendingFile] = useState<{ file: File; preview: string } | null>(null);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingFile({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setPendingFile({ file, preview: '' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAndSend = async (file: File, text: string) => {
    setIsSendingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        sendStoreMessage(activeConversationId!, text, url);
        setPendingFile(null);
        setMessage('');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsSendingFile(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    initSocket();
  }, [fetchConversations, initSocket]);

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isVideo = (url: string) => /\.(mp4|webm|ogg)$/i.test(url);
  const isAudio = (url: string) => /\.(mp3|wav|ogg)$/i.test(url);

  const mappedContacts = useMemo(() => {
    const assistantContact: Contact = {
      id: 'alpha-assistant',
      name: personalAI?.name || 'Alpha Core',
      username: personalAI?.botname || 'alpha',
      avatar: personalAI?.avatarUrl || '',
      status: 'online',
      statusText: personalAI?.tagline || 'Online',
      lastMessage: messages.length > 0 ? messages[messages.length - 1].content : 'Olá! Estou aqui para ajudar.',
      lastTime: messages.length > 0 ? new Date(messages[messages.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      isAI: true,
      unread: 0,
      themeColor: '#a78bfa',
      icon: <IconSparkles size={16} color="#a78bfa" />,
    };

    const userConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p.id !== authUser?.id);
      const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;

      return {
        id: conv.id,
        name: conv.isGroup ? (conv.name || 'Chat de Grupo') : (otherParticipant?.profile?.displayName || 'Desconhecido'),
        username: otherParticipant?.profile?.username || 'desconhecido',
        avatar: otherParticipant?.profile?.avatarUrl || '',
        status: (otherParticipant?.profile?.status as any) || 'offline',
        statusText: otherParticipant?.profile?.status || 'Offline',
        icon: conv.isGroup ? <IconUsers size={20} color={tp}/> : undefined,
        lastMessage: lastMsg?.content 
          ? lastMsg.content 
          : lastMsg?.imageUrl 
            ? isImage(lastMsg.imageUrl)
              ? `${lastMsg.senderId === authUser?.id ? 'Tu enviaste' : (otherParticipant?.profile?.displayName || 'Alguém') + ' enviou'} uma imagem`
              : `${lastMsg.senderId === authUser?.id ? 'Tu enviaste' : (otherParticipant?.profile?.displayName || 'Alguém') + ' enviou'} um ficheiro`
            : 'Ainda sem mensagens',
        lastTime: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: 0,
        themeColor: '#6366f1',
        isAI: otherParticipant?.profile?.username === 'nova',
      } as Contact;
    });

    return [assistantContact, ...userConversations];
  }, [conversations, authUser?.id, tp, messages]);

  useEffect(() => {
    // Auto-select the first REAL conversation (not the AI assistant entry)
    if (!activeConversationId) {
      const firstReal = mappedContacts.find(c => c.id !== 'alpha-assistant');
      if (firstReal) {
        setActiveConversation(firstReal.id);
      } else {
        // Only the AI contact exists — select it without triggering fetchMessages
        setActiveConversation('alpha-assistant');
      }
    }
  }, [mappedContacts, activeConversationId, setActiveConversation]);

  const contact = mappedContacts.find(c => c.id === activeConversationId);
  const activeConv = conversations.find(c => c.id === activeConversationId);
  
  const chatMessages = useMemo(() => {
    if (!activeConv?.messages) return [];
    return activeConv.messages.map(m => ({
      id: m.id,
      from: m.senderId === authUser?.id ? 'me' : 'them',
      content: m.content,
      imageUrl: m.imageUrl,
      isPinned: m.isPinned,
      editedAt: m.editedAt,
      reactions: m.reactions,
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    } as Message));
  }, [activeConv?.messages, authUser?.id]);

  const filteredContacts = mappedContacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const prefix = url.startsWith('/') ? '' : '/uploads/chat/';
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${prefix}${url}`;
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editingMessageId) {
      if (editContent.trim()) {
        editStoreMessage(editingMessageId, editContent.trim());
      }
      setEditingMessageId(null);
      setEditContent('');
      return;
    }

    if (pendingFile) {
      uploadAndSend(pendingFile.file, message.trim());
      return;
    }

    if (message.trim() && activeConversationId) {
      sendStoreMessage(activeConversationId, message.trim());
      setMessage('');
    }
  };

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  chatMessages.forEach(m => {
    const date = 'HOJE';
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === date) last.messages.push(m);
    else groupedMessages.push({ date, messages: [m] });
  });

  const handleProfileClick = () => {
    if (contact?.username) {
      window.location.href = `/main/lazer/profile/${contact.username}`;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes msgIn { from { opacity:0; transform:translateY(8px) scale(0.98); } to { opacity:1; transform:none; } }
        .msg-bubble { animation: msgIn 0.2s ease forwards; }
        .contact-item { transition: all 0.15s; }
        .contact-item:hover { background: rgba(99,102,241,0.06) !important; }
        .send-btn:hover { transform: scale(1.06) !important; filter: brightness(1.08); }
        .send-btn:active { transform: scale(0.95) !important; }
      `}</style>

      {/* LEFT — Contact list */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', background: glassBg, backdropFilter: 'blur(32px)', borderRight: `1px solid ${borderCol}` }}>
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 14, background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${accentBorder}` }}>
            <IconSearch size={15} color={isLight ? "#94a3b8" : "#666"}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Procurar conversas..." style={{ flex: 1, background: 'none', border: 'none', fontSize: 13, color: tp, fontFamily: 'inherit' }}/>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 16px' }}>
          {filteredContacts.map(c => (
            <div key={c.id} className="contact-item" onClick={() => { setActiveConversation(c.id); setShowSettings(false); }} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 14, cursor: 'pointer', marginBottom: 2, background: activeConversationId === c.id ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)') : 'transparent', borderLeft: activeConversationId === c.id ? `3px solid ${themeColor}` : '3px solid transparent' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: isLight ? '#e5e7eb' : '#27272a', overflow: 'hidden', border: activeConversationId === c.id ? `2px solid ${themeColor}` : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {c.isAI 
                    ? (c.avatar 
                        ? <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${themeColor}20` }}><IconSparkles size={24} color={themeColor}/></div>
                      )
                    : <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  }
                </div>
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: STATUS_CONFIG[c.status]?.color || '#ccc', border: '2px solid white' }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: tp, display: 'flex', alignItems: 'center', gap: 4 }}>{c.name} {c.icon}</span>
                  <span style={{ fontSize: 11, color: ts }}>{c.lastTime}</span>
                </div>
                <span style={{ fontSize: 12.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.lastMessage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER — Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {!contact ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ marginBottom: 20, color: themeColor, opacity: 0.8 }}><IconMessage size={64}/></div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: tp }}>Clica numa conversa para começar</h2>
            <p style={{ color: ts }}>As tuas mensagens aparecerão aqui em tempo real.</p>
          </div>
        ) : activeConversationId === 'alpha-assistant' ? (
          <AlphaChatView themeColor="#a78bfa" themeMode={themeMode} authUser={authUser} />
        ) : showSettings ? (
          <ChatSettings contact={contact} onBack={() => setShowSettings(false)} themeColor={themeColor} themeMode={themeMode}/>
        ) : (
          <>
            <div style={{ padding: '0 24px', height: 68, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${borderCol}`, background: glassBg, backdropFilter: 'blur(20px)' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: isLight ? '#f1f5f9' : '#27272a' }}>
                  {contact.isAI ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${themeColor}20` }}><IconSparkles size={22} color={themeColor}/></div> : <img src={contact.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>}
                </div>
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: STATUS_CONFIG[contact.status]?.color || '#ccc', border: '2px solid white' }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: tp }}>{contact.name}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: STATUS_CONFIG[contact.status]?.color || ts }}>{contact.statusText}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ts }}><IconPhone size={20}/></button>
                <button style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ts }}><IconVideo size={20}/></button>
                <button onClick={() => setShowSettings(true)} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ts }}><IconInfo size={20}/></button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 10px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {groupedMessages.map((group, gIdx) => (
                <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.15))' }}/>
                    <span style={{ fontSize: 10, fontWeight: 800, color: ts, letterSpacing: '1px' }}>{group.date}</span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(99,102,241,0.15))' }}/>
                  </div>
                  {group.messages.map((msg) => (
                    <div key={msg.id} onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => { setHoveredMessageId(null); setShowEmojiPickerFor(null); }} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.from === 'me' ? 'flex-end' : 'flex-start', position: 'relative', marginBottom: 6 }}>
                      {hoveredMessageId === msg.id && (
                        <div style={{ position: 'absolute', bottom: '100%', [msg.from === 'me' ? 'right' : 'left']: 0, paddingBottom: 8, display: 'flex', gap: 4, zIndex: 10 }}>
                          <div style={{ display: 'flex', gap: 10, background: isLight ? 'white' : '#1a1a1a', padding: '6px 12px', borderRadius: 24, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: `1px solid ${borderCol}`, alignItems: 'center' }}>
                            {['❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                              <button key={emoji} onClick={() => toggleStoreReaction(msg.id, emoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 16, transition: 'transform 0.1s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <EmojiRenderer content={emoji} emojiSize={18} />
                              </button>
                            ))}
                            <div style={{ width: 1, height: 16, background: borderCol, margin: '0 4px' }} />
                            <button onClick={() => toggleStorePin(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }} title="Fixar"><IconPin size={16} color={msg.isPinned ? themeColor : ts}/></button>
                            {msg.from === 'me' && (
                              <>
                                <button onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); setMessage(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }} title="Editar"><IconEdit size={16} color={ts}/></button>
                                <button onClick={() => setDeleteConfirmId(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }} title="Apagar"><IconTrash size={16} color="#ef4444"/></button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <div style={{ padding: '10px 14px', borderRadius: msg.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.from === 'me' ? `linear-gradient(135deg, ${themeColor}dd 0%, ${themeColor} 100%)` : isLight ? 'white' : 'rgba(255,255,255,0.08)', color: msg.from === 'me' ? 'white' : tp, fontSize: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: msg.from === 'me' ? `1.5px solid ${themeColor}` : `1px solid ${borderCol}`, position: 'relative', maxWidth: '85%' }}>
                        {msg.isPinned && <div style={{ position: 'absolute', top: -8, right: -8, background: themeColor, borderRadius: '50%', padding: 4, display: 'flex', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}><IconPin size={10} color="white"/></div>}
                        {msg.imageUrl && (
                          isImage(msg.imageUrl) ? (
                            <img src={getImageUrl(msg.imageUrl)} alt="Shared" style={{ maxWidth: 320, width: '100%', borderRadius: 10, marginBottom: msg.content ? 8 : 0, display: 'block', objectFit: 'contain', cursor: 'pointer' }} onClick={() => setSelectedImage(msg.imageUrl!)} />
                          ) : isVideo(msg.imageUrl) ? (
                            <video src={getImageUrl(msg.imageUrl)} controls style={{ maxWidth: 320, width: '100%', borderRadius: 10, marginBottom: msg.content ? 8 : 0, display: 'block' }} />
                          ) : isAudio(msg.imageUrl) ? (
                            <audio src={getImageUrl(msg.imageUrl)} controls style={{ width: '100%', maxWidth: 300, marginBottom: msg.content ? 8 : 0, display: 'block' }} />
                          ) : (
                            <div style={{ padding: '12px 16px', borderRadius: 12, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: msg.content ? 8 : 0, minWidth: 200 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <IconFile size={20} />
                              </div>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: tp, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.imageUrl.split('/').pop()}</div>
                                <div style={{ fontSize: 11, color: ts }}>Ficheiro</div>
                              </div>
                              <a href={getImageUrl(msg.imageUrl)} target="_blank" rel="noopener noreferrer" style={{ color: themeColor }}><IconDownload size={18}/></a>
                            </div>
                          )
                        )}
                        {msg.content && <EmojiRenderer content={msg.content} style={{ color: 'inherit' }} />}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 5 }}>
                          {msg.editedAt && <span style={{ fontSize: 9, opacity: 0.5 }}>Editado</span>}
                          <span style={{ fontSize: 10, opacity: 0.6 }}>{msg.time}</span>
                        </div>
                      </div>
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([emoji, count]) => (
                            <button key={emoji} onClick={() => toggleStoreReaction(msg.id, emoji)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: isLight ? 'white' : '#222', padding: '2px 6px', borderRadius: 8, border: `1px solid ${borderCol}`, cursor: 'pointer' }}>
                              <EmojiRenderer content={emoji} emojiSize={14} /><span style={{ fontSize: 10, fontWeight: 700, color: tp }}>{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef}/>
            </div>

            <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${borderCol}`, background: glassBg, backdropFilter: 'blur(20px)' }}>
              {pendingFile && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 16, background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${borderCol}` }}>
                  <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', position: 'relative', background: isLight ? '#eee' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pendingFile.preview ? (
                      <img src={pendingFile.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <IconFile size={24} color={ts} />
                    )}
                    <button onClick={() => setPendingFile(null)} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: ts }}>
                    A enviar: <strong>{pendingFile.file.name}</strong>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{pendingFile.file.type || 'Ficheiro'}</div>
                  </div>
                </div>
              )}
              <form onSubmit={handleSendMessage} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                {editingMessageId && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: themeColor, color: 'white', padding: '4px 12px', borderRadius: '8px 8px 0 0', fontSize: 11, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Editando mensagem...</span>
                    <button type="button" onClick={() => { setEditingMessageId(null); setEditContent(''); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
                  </div>
                )}
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 24, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${accentBorder}` }}>
                  <input type="text" placeholder={editingMessageId ? "Editar mensagem..." : "Escreva uma mensagem..."} value={editingMessageId ? editContent : message} onChange={(e) => editingMessageId ? setEditContent(e.target.value) : setMessage(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: tp, fontSize: 14, outline: 'none' }}/>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: ts }}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    <button type="button" onClick={handleFileClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}><IconPaperclip size={18}/></button>
                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}><IconSmile size={20}/></button>
                  </div>
                </div>
                <button type="submit" disabled={!(editingMessageId ? editContent.trim() : (message.trim() || pendingFile))} style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: (editingMessageId ? editContent.trim() : (message.trim() || pendingFile)) ? themeColor : '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* RIGHT — Contact info */}
      {!showSettings && contact && (
        <div style={{ width: 264, flexShrink: 0, background: glassBg, backdropFilter: 'blur(24px)', borderLeft: `1px solid ${borderCol}`, overflowY: 'auto', padding: '28px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', border: `3px solid ${themeColor}`, overflow: 'hidden', background: isLight ? '#e5e7eb' : '#27272a', marginBottom: 14 }}>
              {contact.isAI 
                ? (contact.avatar 
                    ? <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: `${themeColor}20` }}>✦</div>
                  )
                : <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              }
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: tp, marginBottom: 3 }}>{contact.name}</div>
            <div style={{ fontSize: 12.5, color: ts }}>@{personalAI?.botname || contact.username}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: `${STATUS_CONFIG[contact.status]?.color}12`, border: `1px solid ${STATUS_CONFIG[contact.status]?.color}35`, marginTop: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_CONFIG[contact.status]?.color }}/>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_CONFIG[contact.status]?.color }}>{contact.statusText}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
            {[
              { label: 'Perfil', icon: <IconUser size={18}/>, onClick: handleProfileClick },
              { label: 'Mudo', icon: <IconVolumeX size={18}/>, onClick: () => console.log('Mute toggle') },
              { label: 'Search', icon: <IconSearch size={18}/>, onClick: () => setShowSettings(true) },
            ].map(a => (
              <button key={a.label} onClick={a.onClick}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 6px', borderRadius: 14,
                  border: `1.5px solid ${borderCol}`,
                  background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                  color: ts, cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>

          {/* Shared Media */}
          {(activeConv as any)?.sharedMedia && (activeConv as any).sharedMedia.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: tp, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Mídias Partilhadas</span>
                <button onClick={() => setShowFullGallery(true)} style={{ fontSize: 12, fontWeight: 700, color: themeColor, background: 'none', border: 'none', cursor: 'pointer' }}>Ver Todos</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 20 }}>
                {(activeConv as any).sharedMedia.slice(0, 6).map((url: string, i: number) => (
                  <div key={i} onClick={() => setSelectedImage(url)} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: isLight ? '#f3f4f6' : '#27272a', border: `1px solid ${borderCol}`, cursor: 'pointer' }}>
                    <img src={getImageUrl(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button style={{ padding: '12px', borderRadius: 12, border: `1px solid ${borderCol}`, background: isLight ? 'white' : 'rgba(255,255,255,0.05)', color: tp, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Limpar Chat</button>
            <button style={{ padding: '12px', borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Bloquear</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: 320, background: isLight ? 'white' : '#1a1a1a', padding: 24, borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: `1px solid ${borderCol}`, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ef444415', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><IconTrash size={28}/></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: tp, marginBottom: 8 }}>Apagar mensagem?</h3>
            <p style={{ fontSize: 14, color: ts, lineHeight: 1.5, marginBottom: 24 }}>Esta ação não pode ser desfeita. A mensagem será removida para todos os participantes.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${borderCol}`, background: 'none', color: tp, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { deleteStoreMessage(deleteConfirmId); setDeleteConfirmId(null); }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#ef4444', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* Full Gallery Overlay */}
      {showFullGallery && (
        <div style={{ position: 'fixed', inset: 0, background: isLight ? 'white' : '#0f172a', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 40px', borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: tp }}>Mídias Partilhadas</h2>
            <button onClick={() => setShowFullGallery(false)} style={{ width: 40, height: 40, borderRadius: '50%', background: isLight ? '#f1f5f9' : '#1e293b', border: 'none', color: tp, fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {(activeConv as any)?.sharedMedia?.map((url: string, i: number) => (
              <div key={i} onClick={() => setSelectedImage(url)} style={{ aspectRatio: '1', borderRadius: 20, overflow: 'hidden', background: isLight ? '#f3f4f6' : '#1e293b', border: `1px solid ${borderCol}`, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <img src={getImageUrl(url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single Image Full View */}
      {selectedImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }} onClick={() => setSelectedImage(null)}>
          <img src={getImageUrl(selectedImage)} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }} />
          <button style={{ position: 'absolute', top: 30, right: 30, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  );
}
