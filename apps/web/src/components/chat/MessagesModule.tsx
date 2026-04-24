'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
}

interface Message {
  id: string;
  from: 'me' | 'them';
  content: string;
  time: string;
  reactions?: string[];
  imageUrl?: string;
  replyTo?: string;
  status?: 'sent' | 'delivered' | 'read';
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const CONTACTS: Contact[] = [
  {
    id: '1', name: 'Kenji', username: 'kenji_plays', emoji: '🎮',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=kenji&backgroundColor=b6e3f4',
    status: 'in-game', statusText: 'In-game',
    lastMessage: "Don't take too long, lobby is...", lastTime: '7:33 PM',
    themeColor: '#3b82f6',
    sharedMedia: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&q=80',
      'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=200&q=80',
    ],
  },
  {
    id: '2', name: 'Aimi', username: 'aimi_chan', emoji: '💗',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=aimi&backgroundColor=ffdfbf',
    status: 'online', statusText: 'Online',
    lastMessage: 'Did you see the new episode of...', lastTime: '10:42 AM', unread: 1,
    themeColor: '#ec4899',
    sharedMedia: [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80',
      'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=200&q=80',
      'https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=200&q=80',
    ],
  },
  {
    id: '3', name: 'Sarah', username: 'sarah_writes', emoji: '✨',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=sarah&backgroundColor=c0aede',
    status: 'away', statusText: 'Away',
    lastMessage: 'Thanks for the manga recomme...', lastTime: 'Yesterday',
    themeColor: '#8b5cf6',
  },
  {
    id: '4', name: 'Yui', username: 'yui_cosplay', emoji: '🌸',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=yui&backgroundColor=ffd5dc',
    status: 'offline', statusText: 'Last seen 3h ago',
    lastMessage: "I'm going to the spring festival!!", lastTime: 'Tuesday',
    themeColor: '#f43f5e',
  },
  {
    id: 'ai', name: 'Nova', username: 'nova.alpha', emoji: '✦',
    avatar: '', isAI: true,
    status: 'online', statusText: 'Always here',
    lastMessage: 'Olá! Como posso ajudar hoje?', lastTime: '2:00 PM',
    themeColor: '#a78bfa',
  },
];

const MESSAGES_BY_CONTACT: Record<string, Message[]> = {
  '1': [
    { id: 'm1', from: 'them', content: 'Yo, ready for the tournament tonight?🏆', time: '7:30 PM', status: 'read' },
    { id: 'm2', from: 'me', content: 'Almost! Just tweaking my loadout. Give me 5.', time: '7:32 PM', status: 'read' },
    { id: 'm3', from: 'them', content: "Don't take too long, lobby is filling up fast 🔥", time: '7:33 PM', status: 'delivered' },
  ],
  '2': [
    { id: 'm1', from: 'them', content: 'Did you see the new episode of Demon Slayer? 👀', time: '10:40 AM' },
    { id: 'm2', from: 'me', content: 'Not yet!! Don\'t spoil me 😭', time: '10:41 AM' },
    { id: 'm3', from: 'them', content: 'OK OK I won\'t say anything but... just watch it ASAP 🔥', time: '10:42 AM' },
  ],
  '3': [
    { id: 'm1', from: 'me', content: 'Have you read Chainsaw Man vol 2? I think you\'d love it', time: 'Yesterday' },
    { id: 'm2', from: 'them', content: 'Thanks for the manga recommendation! Adding to my list ✨', time: 'Yesterday' },
  ],
  '4': [
    { id: 'm1', from: 'them', content: "I'm going to the spring festival next week!! 🌸", time: 'Tuesday' },
    { id: 'm2', from: 'me', content: 'That sounds amazing! Take lots of pictures!', time: 'Tuesday' },
  ],
  'ai': [
    { id: 'm1', from: 'them', content: 'Olá! Sou a Nova, a tua assistente pessoal na Alpha Network ✦ Como posso ajudar?', time: '2:00 PM' },
  ],
};

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'online':   { color: '#22c55e', label: 'Online' },
  'away':     { color: '#f59e0b', label: 'Away' },
  'offline':  { color: '#6b7280', label: 'Offline' },
  'in-game':  { color: '#3b82f6', label: 'In-game' },
  'watching': { color: '#a855f7', label: 'Watching' },
  'busy':     { color: '#ef4444', label: 'Busy' },
};

// ─── Settings panel ─────────────────────────────────────────────────────────────
function ChatSettings({ contact, onBack }: { contact: Contact; onBack: () => void }) {
  const [muted, setMuted] = useState(false);
  const [alertTone, setAlertTone] = useState('Default (Ping)');
  const [bubbleColor, setBubbleColor] = useState(contact.themeColor ?? '#3b82f6');
  const [fontSize, setFontSize] = useState('Medium');
  const [wallpaper, setWallpaper] = useState('default');
  const [showEmoji, setShowEmoji] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [previewMsg] = useState([
    { from: 'them', text: "Hey, are we still on for the raid tonight?" },
    { from: 'me', text: "Yeah! Let me just finish up some stuff. Give me 10 mins! 🎮" },
  ]);

  const wallpapers = [
    { id: 'default', label: 'Default', bg: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)' },
    { id: 'sakura', label: 'Sakura', bg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)' },
    { id: 'midnight', label: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
    { id: 'aurora', label: 'Aurora', bg: 'linear-gradient(135deg, #0a2463 0%, #1b4332 50%, #6a0572 100%)' },
    { id: 'minimal', label: 'Minimal', bg: '#f9fafb' },
  ];

  const wallpaperObj = wallpapers.find(w => w.id === wallpaper)!;
  const isDarkWall = ['midnight', 'aurora'].includes(wallpaper);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left — contact info */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '32px 24px',
        borderRight: '1px solid rgba(99,102,241,0.1)',
        background: 'rgba(255,255,255,0.5)',
      }}>
        <button onClick={onBack} style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)',
          background: 'rgba(99,102,241,0.06)', color: '#6366f1',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 32,
          fontFamily: 'inherit',
        }}>
          ← Back
        </button>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            border: `3px solid ${contact.themeColor ?? '#6366f1'}`,
            overflow: 'hidden', background: '#e5e7eb',
          }}>
            {contact.isAI
              ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: `${contact.themeColor}20` }}>✦</div>
              : <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            }
          </div>
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            width: 14, height: 14, borderRadius: '50%',
            background: STATUS_CONFIG[contact.status].color,
            border: '2px solid white',
          }}/>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {contact.name} {contact.emoji}
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>@{contact.username}</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          background: `${STATUS_CONFIG[contact.status].color}15`,
          border: `1px solid ${STATUS_CONFIG[contact.status].color}40`,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_CONFIG[contact.status].color }}/>
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_CONFIG[contact.status].color }}>
            {contact.statusText}
          </span>
        </div>
      </div>

      {/* Center — settings */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1e1b4b', marginBottom: 4, margin: '0 0 6px' }}>
          Chat Settings
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 32px' }}>
          Customize your experience with {contact.name}.
        </p>

        {/* NOTIFICATIONS */}
        <SectionHeader icon="🔔" label="NOTIFICATIONS"/>
        <SettingCard title="Mute Messages" desc="Stop receiving push notifications from this chat.">
          <Toggle checked={muted} onChange={setMuted}/>
        </SettingCard>
        <SettingCard title="Custom Alert Tone" desc="Choose a specific sound for new messages.">
          <select value={alertTone} onChange={e => setAlertTone(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid rgba(99,102,241,0.2)', background: 'white', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option>Default (Ping)</option>
            <option>Soft Bell</option>
            <option>Chime</option>
            <option>Pulse</option>
            <option>Silent</option>
          </select>
        </SettingCard>

        {/* APPEARANCE */}
        <SectionHeader icon="🎨" label="APPEARANCE"/>
        <SettingCard title="Bubble Color" desc="Colour of your outgoing message bubbles.">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['#3b82f6','#6366f1','#ec4899','#10b981','#f59e0b','#ef4444','#a78bfa'].map(col => (
              <button key={col} onClick={() => setBubbleColor(col)}
                style={{ width: 26, height: 26, borderRadius: '50%', background: col, border: `3px solid ${bubbleColor === col ? '#1e1b4b' : 'transparent'}`, cursor: 'pointer', transition: 'transform 0.15s', transform: bubbleColor === col ? 'scale(1.2)' : 'scale(1)' }}/>
            ))}
            <input type="color" value={bubbleColor} onChange={e => setBubbleColor(e.target.value)}
              style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}/>
          </div>
        </SettingCard>
        <SettingCard title="Font Size" desc="Adjust the size of text in the chat.">
          <div style={{ display: 'flex', gap: 6 }}>
            {['Small', 'Medium', 'Large'].map(s => (
              <button key={s} onClick={() => setFontSize(s)}
                style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid', borderColor: fontSize === s ? '#6366f1' : 'rgba(99,102,241,0.2)', background: fontSize === s ? '#6366f1' : 'transparent', color: fontSize === s ? 'white' : '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {s}
              </button>
            ))}
          </div>
        </SettingCard>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Chat Wallpaper</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {wallpapers.map(w => (
              <button key={w.id} onClick={() => setWallpaper(w.id)}
                style={{
                  width: 52, height: 52, borderRadius: 12, border: `2.5px solid ${wallpaper === w.id ? '#6366f1' : 'rgba(99,102,241,0.15)'}`,
                  background: w.bg, cursor: 'pointer', transition: 'all 0.15s',
                  transform: wallpaper === w.id ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: wallpaper === w.id ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
                }}
                title={w.label}
              />
            ))}
          </div>
        </div>

        {/* PRIVACY */}
        <SectionHeader icon="🔒" label="PRIVACY"/>
        <SettingCard title="Read Receipts" desc="Let the other person know when you've read messages.">
          <Toggle checked={readReceipts} onChange={setReadReceipts}/>
        </SettingCard>
        <SettingCard title="Show Emoji Reactions" desc="Display emoji reactions on messages.">
          <Toggle checked={showEmoji} onChange={setShowEmoji}/>
        </SettingCard>

        {/* DANGER */}
        <SectionHeader icon="⚠️" label="DANGER ZONE"/>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Clear Chat History', color: '#f59e0b' },
            { label: 'Block User', color: '#ef4444' },
            { label: 'Report', color: '#6b7280' },
          ].map(btn => (
            <button key={btn.label}
              style={{ padding: '9px 18px', borderRadius: 12, border: `1.5px solid ${btn.color}40`, background: `${btn.color}08`, color: btn.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.target as any).style.background = `${btn.color}18`; }}
              onMouseLeave={e => { (e.target as any).style.background = `${btn.color}08`; }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right — live preview */}
      <div style={{
        width: 280, flexShrink: 0, padding: '28px 20px',
        borderLeft: '1px solid rgba(99,102,241,0.1)',
        background: 'rgba(255,255,255,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}/>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Live Preview</span>
        </div>
        <div style={{
          borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.1)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
        }}>
          {/* Mini header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 9, background: 'white' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
              {contact.isAI
                ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: `${contact.themeColor}20` }}>✦</div>
                : <img src={contact.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              }
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b' }}>{contact.name}</div>
              <div style={{ fontSize: 11, color: STATUS_CONFIG[contact.status].color, fontWeight: 600 }}>
                ● {contact.statusText}
              </div>
            </div>
          </div>
          {/* Mini messages */}
          <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 130, background: wallpaperObj.bg }}>
            {previewMsg.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: m.from === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.from === 'me' ? `linear-gradient(135deg, ${bubbleColor}dd, ${bubbleColor})` : (isDarkWall ? 'rgba(255,255,255,0.12)' : 'white'),
                  color: m.from === 'me' ? 'white' : (isDarkWall ? 'white' : '#1e1b4b'),
                  fontSize: 11, lineHeight: 1.5, fontWeight: 500,
                  boxShadow: m.from === 'me' ? `0 4px 16px ${bubbleColor}40` : '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          {/* Mini input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(0,0,0,0.06)', background: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, padding: '6px 10px', borderRadius: 20, background: '#f1f5f9', fontSize: 11, color: '#94a3b8' }}>
              Type a message...
            </div>
            <div style={{ fontSize: 14 }}>😊</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 28, marginBottom: 12 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '1.5px' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(99,102,241,0.15), transparent)', marginLeft: 4 }}/>
    </div>
  );
}

function SettingCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderRadius: 14, marginBottom: 8,
      border: '1.5px solid rgba(99,102,241,0.08)',
      background: 'rgba(255,255,255,0.8)', gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ cursor: 'pointer', flexShrink: 0 }}>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? 'linear-gradient(135deg, #6366f1, #818cf8)' : '#e5e7eb',
        position: 'relative', transition: 'background 0.2s',
        boxShadow: checked ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: 'white', transition: 'left 0.2s',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}/>
      </div>
    </div>
  );
}

// ─── Main Chat Module ───────────────────────────────────────────────────────────
export default function MessagesModule() {
  const [selectedId, setSelectedId] = useState('1');
  const [messages, setMessages] = useState<Record<string, Message[]>>(MESSAGES_BY_CONTACT);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const contact = CONTACTS.find(c => c.id === selectedId)!;
  const chatMessages = messages[selectedId] ?? [];
  const filteredContacts = CONTACTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedId]);

  const sendMessage = useCallback(() => {
    const txt = inputText.trim();
    if (!txt) return;
    const newMsg: Message = {
      id: `m${Date.now()}`, from: 'me', content: txt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent', replyTo: replyTo ?? undefined,
    };
    setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), newMsg] }));
    setInputText('');
    setReplyTo(null);
  }, [inputText, selectedId, replyTo]);

  const addReaction = (msgId: string, emoji: string) => {
    setMessages(prev => ({
      ...prev,
      [selectedId]: prev[selectedId].map(m =>
        m.id === msgId
          ? { ...m, reactions: m.reactions?.includes(emoji) ? m.reactions.filter(r => r !== emoji) : [...(m.reactions ?? []), emoji] }
          : m
      ),
    }));
  };

  const QUICK_REACTIONS = ['❤️','😂','😮','😢','👍','🔥'];

  const bubbleColor = contact?.themeColor ?? '#6366f1';

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  chatMessages.forEach(m => {
    const date = m.time.includes('PM') || m.time.includes('AM') ? 'TODAY' : m.time.toUpperCase();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === date) last.messages.push(m);
    else groupedMessages.push({ date, messages: [m] });
  });

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: "'Nunito', sans-serif",
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 60%, #fff0f8 100%)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes msgIn { from { opacity:0; transform:translateY(8px) scale(0.98); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
        .msg-bubble { animation: msgIn 0.2s ease forwards; }
        .contact-item { transition: all 0.15s; }
        .contact-item:hover { background: rgba(99,102,241,0.06) !important; }
        .send-btn:hover { transform: scale(1.06) !important; filter: brightness(1.08); }
        .send-btn:active { transform: scale(0.95) !important; }
        .reaction-quick button:hover { transform: scale(1.25) !important; }
        input:focus { outline: none; }
        textarea:focus { outline: none; }
      `}</style>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* LEFT — Contact list */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(99,102,241,0.1)',
        boxShadow: '4px 0 24px rgba(99,102,241,0.06)',
      }}>
        {/* Header */}
        <div style={{ padding: '28px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#1e1b4b', letterSpacing: '-0.5px' }}>
              Messages
            </h1>
            <button style={{
              width: 36, height: 36, borderRadius: 12,
              border: '1.5px solid rgba(99,102,241,0.2)',
              background: 'rgba(99,102,241,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16, color: '#6366f1',
            }}>✏️</button>
          </div>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '10px 14px', borderRadius: 14,
            background: 'rgba(99,102,241,0.06)',
            border: '1.5px solid rgba(99,102,241,0.1)',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              style={{ flex: 1, background: 'none', border: 'none', fontSize: 13, color: '#374151', fontFamily: 'inherit' }}/>
          </div>
        </div>

        {/* Contact list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 16px' }}>
          {filteredContacts.map(c => (
            <div key={c.id} className="contact-item"
              onClick={() => { setSelectedId(c.id); setShowSettings(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 12px', borderRadius: 14, cursor: 'pointer', marginBottom: 2,
                background: selectedId === c.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                borderLeft: selectedId === c.id ? `3px solid ${c.themeColor ?? '#6366f1'}` : '3px solid transparent',
              }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: '#e5e7eb', overflow: 'hidden',
                  border: selectedId === c.id ? `2px solid ${c.themeColor ?? '#6366f1'}` : '2px solid transparent',
                }}>
                  {c.isAI
                    ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: `${c.themeColor}20` }}>✦</div>
                    : <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  }
                </div>
                <div style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 11, height: 11, borderRadius: '50%',
                  background: STATUS_CONFIG[c.status].color,
                  border: '2px solid white',
                }}/>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {c.name} {c.emoji}
                    {c.isAI && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 8, background: `${c.themeColor}20`, color: c.themeColor, border: `1px solid ${c.themeColor}40` }}>AI</span>}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{c.lastTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                    {c.lastMessage}
                  </span>
                  {c.unread && (
                    <div style={{
                      minWidth: 20, height: 20, borderRadius: 10,
                      background: c.themeColor ?? '#6366f1',
                      color: 'white', fontSize: 11, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 6px', flexShrink: 0,
                    }}>
                      {c.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* CENTER — Chat area or Settings */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)',
        overflow: 'hidden',
      }}>
        {showSettings ? (
          <ChatSettings contact={contact} onBack={() => setShowSettings(false)}/>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: '0 24px', height: 68, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 14,
              borderBottom: '1px solid rgba(99,102,241,0.08)',
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', background: '#e5e7eb' }}>
                  {contact.isAI
                    ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: `${contact.themeColor}20` }}>✦</div>
                    : <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  }
                </div>
                <div style={{
                  position: 'absolute', bottom: 1, right: 1, width: 11, height: 11,
                  borderRadius: '50%', background: STATUS_CONFIG[contact.status].color, border: '2px solid white',
                }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {contact.name} {contact.emoji}
                  {contact.isAI && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: `${contact.themeColor}20`, color: contact.themeColor, border: `1px solid ${contact.themeColor}40` }}>AI</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: STATUS_CONFIG[contact.status].color, fontWeight: 600 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_CONFIG[contact.status].color, animation: contact.status === 'online' ? 'pulse 2s infinite' : 'none' }}/>
                  {contact.statusText}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>, label: 'Call' },
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>, label: 'Video' },
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>, label: 'More', onClick: () => setShowSettings(true) },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.onClick}
                    style={{
                      width: 38, height: 38, borderRadius: 12,
                      border: '1.5px solid rgba(99,102,241,0.1)',
                      background: 'rgba(99,102,241,0.04)',
                      color: '#6b7280', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(99,102,241,0.1)'; (e.currentTarget as any).style.color = '#6366f1'; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(99,102,241,0.04)'; (e.currentTarget as any).style.color = '#6b7280'; }}>
                    {btn.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {groupedMessages.map(group => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 18px' }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.15))' }}/>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px', padding: '4px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' }}>
                      {group.date}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(99,102,241,0.15))' }}/>
                  </div>
                  {group.messages.map((msg, idx) => {
                    const isMe = msg.from === 'me';
                    const showAvatar = !isMe && (idx === 0 || group.messages[idx - 1]?.from === 'me');
                    return (
                      <div key={msg.id} className="msg-bubble"
                        style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}
                        onMouseEnter={() => setHoveredMsg(msg.id)}
                        onMouseLeave={() => setHoveredMsg(null)}>
                        {/* Avatar (them) */}
                        {!isMe && (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#e5e7eb', opacity: showAvatar ? 1 : 0 }}>
                            {contact.isAI
                              ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: `${contact.themeColor}20` }}>✦</div>
                              : <img src={contact.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                            }
                          </div>
                        )}
                        <div style={{ maxWidth: '62%', position: 'relative' }}>
                          {/* Reply indicator */}
                          {msg.replyTo && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${bubbleColor}`, opacity: 0.7 }}>
                              ↩ {chatMessages.find(m => m.id === msg.replyTo)?.content?.slice(0, 40)}...
                            </div>
                          )}
                          {/* Bubble */}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isMe
                              ? `linear-gradient(135deg, ${bubbleColor}dd 0%, ${bubbleColor} 100%)`
                              : 'white',
                            color: isMe ? 'white' : '#1e1b4b',
                            fontSize: 14, lineHeight: 1.55, fontWeight: 500,
                            boxShadow: isMe
                              ? `0 4px 20px ${bubbleColor}35`
                              : '0 2px 12px rgba(0,0,0,0.07)',
                            border: isMe ? 'none' : '1px solid rgba(99,102,241,0.08)',
                          }}>
                            {msg.content}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 5 }}>
                              <span style={{ fontSize: 10, opacity: 0.6, color: isMe ? 'white' : '#94a3b8' }}>{msg.time}</span>
                              {isMe && msg.status && (
                                <span style={{ fontSize: 10, opacity: 0.7, color: 'white' }}>
                                  {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div style={{
                              position: 'absolute', bottom: -12, right: isMe ? 6 : undefined, left: isMe ? undefined : 6,
                              display: 'flex', gap: 2, padding: '2px 6px', borderRadius: 20,
                              background: 'white', border: '1px solid rgba(99,102,241,0.12)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 1,
                            }}>
                              {msg.reactions.map((r, i) => <span key={i} style={{ fontSize: 13 }}>{r}</span>)}
                            </div>
                          )}
                          {/* Quick reactions on hover */}
                          {hoveredMsg === msg.id && (
                            <div className="reaction-quick" style={{
                              position: 'absolute', top: -36, right: isMe ? 0 : undefined, left: isMe ? undefined : 0,
                              display: 'flex', gap: 3, padding: '5px 8px', borderRadius: 20,
                              background: 'white', border: '1px solid rgba(99,102,241,0.12)',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 10,
                              animation: 'slideIn 0.15s ease',
                            }}>
                              {QUICK_REACTIONS.map(r => (
                                <button key={r} onClick={() => addReaction(msg.id, r)}
                                  style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', borderRadius: 6, transition: 'transform 0.15s' }}>
                                  {r}
                                </button>
                              ))}
                              <button onClick={() => setReplyTo(msg.id)}
                                style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: '1px 4px', borderRadius: 6, fontWeight: 700 }}>
                                ↩
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef}/>
            </div>

            {/* Reply banner */}
            {replyTo && (
              <div style={{
                margin: '0 24px', padding: '8px 14px', borderRadius: 10,
                background: `${bubbleColor}10`, border: `1px solid ${bubbleColor}30`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ flex: 1, fontSize: 12, color: '#374151' }}>
                  <span style={{ fontWeight: 700, color: bubbleColor }}>Replying to:</span>{' '}
                  {chatMessages.find(m => m.id === replyTo)?.content?.slice(0, 60)}...
                </div>
                <button onClick={() => setReplyTo(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>×</button>
              </div>
            )}

            {/* Input area */}
            <div style={{
              padding: '14px 20px 18px', flexShrink: 0,
              borderTop: '1px solid rgba(99,102,241,0.08)',
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  border: '1.5px solid rgba(99,102,241,0.15)',
                  background: 'rgba(99,102,241,0.05)', color: '#6366f1',
                  fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 24,
                  background: 'rgba(99,102,241,0.05)',
                  border: '1.5px solid rgba(99,102,241,0.12)',
                  transition: 'border-color 0.15s',
                }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = `${bubbleColor}50`)}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)')}>
                  <input ref={inputRef} value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, background: 'none', border: 'none', fontSize: 14, color: '#1e1b4b', fontFamily: 'inherit' }}/>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setShowEmojiPicker(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: 0.5 }}>😊</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: 0.5 }}>🖼️</button>
                  </div>
                </div>
                <button onClick={sendMessage} className="send-btn" disabled={!inputText.trim()}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    border: 'none', cursor: inputText.trim() ? 'pointer' : 'default',
                    background: inputText.trim()
                      ? `linear-gradient(135deg, ${bubbleColor}dd, ${bubbleColor})`
                      : 'rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: inputText.trim() ? `0 6px 20px ${bubbleColor}45` : 'none',
                    transition: 'all 0.2s',
                  }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={inputText.trim() ? 'white' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* RIGHT — Contact info panel */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {!showSettings && (
        <div style={{
          width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(99,102,241,0.08)',
          overflowY: 'auto', padding: '28px 18px',
        }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <div style={{
                width: 84, height: 84, borderRadius: '50%',
                border: `3px solid ${contact.themeColor ?? '#6366f1'}`,
                overflow: 'hidden', background: '#e5e7eb',
                boxShadow: `0 8px 32px ${contact.themeColor ?? '#6366f1'}30`,
              }}>
                {contact.isAI
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: `${contact.themeColor}20` }}>✦</div>
                  : <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                }
              </div>
              <div style={{
                position: 'absolute', bottom: 3, right: 3,
                width: 14, height: 14, borderRadius: '50%',
                background: STATUS_CONFIG[contact.status].color,
                border: '2.5px solid white',
              }}/>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              {contact.name} {contact.emoji}
            </div>
            <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 8 }}>@{contact.username}</div>
            {/* Status badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20,
              background: `${STATUS_CONFIG[contact.status].color}12`,
              border: `1px solid ${STATUS_CONFIG[contact.status].color}35`,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_CONFIG[contact.status].color }}/>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_CONFIG[contact.status].color }}>
                {contact.statusText}
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
            {[
              { label: 'Profile', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
              { label: 'Mute', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
              { label: 'Search', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>, onClick: () => setShowSettings(true) },
            ].map(a => (
              <button key={a.label} onClick={a.onClick}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 6px', borderRadius: 14,
                  border: '1.5px solid rgba(99,102,241,0.1)',
                  background: 'rgba(99,102,241,0.04)',
                  color: '#6b7280', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(99,102,241,0.1)'; (e.currentTarget as any).style.color = '#6366f1'; }}
                onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(99,102,241,0.04)'; (e.currentTarget as any).style.color = '#6b7280'; }}>
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>

          {/* Shared Media */}
          {contact.sharedMedia && contact.sharedMedia.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#1e1b4b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Shared Media
                </span>
                <button style={{ fontSize: 12, fontWeight: 700, color: bubbleColor, background: 'none', border: 'none', cursor: 'pointer' }}>
                  See All
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 20 }}>
                {contact.sharedMedia.map((url, i) => (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                    background: '#e5e7eb', cursor: 'pointer',
                  }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}/>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Chat colour strip */}
          <div style={{ padding: '12px 14px', borderRadius: 14, border: '1.5px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.03)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Chat Theme</div>
            <div style={{
              height: 6, borderRadius: 6,
              background: `linear-gradient(to right, ${bubbleColor}60, ${bubbleColor})`,
              marginBottom: 10,
            }}/>
            <button onClick={() => setShowSettings(true)}
              style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid rgba(99,102,241,0.15)', background: 'transparent', fontSize: 12, fontWeight: 700, color: '#6366f1', cursor: 'pointer', fontFamily: 'inherit' }}>
              Customise Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
