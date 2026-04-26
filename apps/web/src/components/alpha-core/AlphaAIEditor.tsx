'use client';

// ════════════════════════════════════════════════════════════════════════════
// ALPHA NETWORK — Editor de IA Pessoal
// Página: apps/web/src/app/main/alpha-ai/page.tsx  (ou modal)
// Equivalente ao Shapes shape editor — onde o utilizador configura a sua IA
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── Types ──────────────────────────────────────────────────────────────────

interface AlphaAIConfig {
  // Identity
  name: string;
  botname: string;
  tagline: string;
  bio: string;
  status: string;
  avatarUrl: string;
  bannerUrl: string;
  bannerColor: string;
  // Character
  age: string;
  birthday: string;
  gender: string;
  appearance: string;
  backstory: string;
  personalityTraits: string[];
  tone: string;
  likes: string[];
  dislikes: string[];
  goals: string[];
  // Behavior
  responseStyle: string;
  responseLength: string;
  customSystemPrompt: string;
  personalityPrompt: string;
  knowledgePrompt: string;
  initialMessage: string;
  wakeupMessage: string;
  errorMessage: string;
  sleepMessage: string;
  language: string;
  memoryEnabled: boolean;
  isPublic: boolean;
  // Arrays (managed separately)
  trainingExamples: { user: string; ai: string }[];
  knowledgeEntries: { title: string; content: string }[];
  triggerWords: { trigger: string; response: string }[];
}

const DEFAULT_CONFIG: AlphaAIConfig = {
  name: 'Alpha', botname: '', tagline: '', bio: '', status: '',
  avatarUrl: '', bannerUrl: '', bannerColor: '#a78bfa',
  age: 'desconhecida', birthday: '', gender: 'feminino',
  appearance: '', backstory: '', personalityTraits: [], tone: 'casual',
  likes: [], dislikes: [], goals: [],
  responseStyle: '', responseLength: 'adaptive',
  customSystemPrompt: '', personalityPrompt: '', knowledgePrompt: '',
  initialMessage: '', wakeupMessage: '', errorMessage: '', sleepMessage: '',
  language: 'pt', memoryEnabled: true, isPublic: false,
  trainingExamples: [], knowledgeEntries: [], triggerWords: [],
};

type Tab = 'profile' | 'character' | 'behavior' | 'messages' | 'training' | 'knowledge' | 'preview';

// ── Auth helper removed, using reactive state instead ──────────────────────

// ── Small UI components ────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--input-bg)', color: 'var(--text-primary)',
        fontSize: 13, outline: 'none', fontFamily: 'inherit',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
      }}
      onFocus={e => (e.target as any).style.borderColor = 'var(--accent)'}
      onBlur={e => (e.target as any).style.borderColor = 'var(--border)'}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number;
}) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--input-bg)', color: 'var(--text-primary)',
        fontSize: 13, outline: 'none', fontFamily: 'inherit',
        resize: 'vertical', lineHeight: 1.6,
        transition: 'border-color 0.15s', boxSizing: 'border-box',
      }}
      onFocus={e => (e.target as any).style.borderColor = 'var(--accent)'}
      onBlur={e => (e.target as any).style.borderColor = 'var(--border)'}
    />
  );
}

function TagInput({ tags = [], onChange, placeholder, max = 20 }: {
  tags: string[]; onChange: (t: string[]) => void; placeholder?: string; max?: number;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v) && tags.length < max) {
      onChange([...tags, v]);
      setInput('');
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          onFocus={e => (e.target as any).style.borderColor = 'var(--accent)'}
          onBlur={e => (e.target as any).style.borderColor = 'var(--border)'}/>
        <button onClick={add} disabled={!input.trim() || tags.length >= max}
          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !input.trim() ? 0.4 : 1 }}>
          +
        </button>
      </div>
      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {tags.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px 3px 10px', borderRadius: 20, background: 'var(--accent-faint)', border: '1px solid var(--accent-light)', fontSize: 12, color: 'var(--accent)' }}>
              {t}
              <button onClick={() => onChange(tags.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: checked ? 'var(--accent-faint)' : 'transparent', cursor: 'pointer' }}
      onClick={() => onChange(!checked)}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
      <div style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
      </div>
    </div>
  );
}

function Btn({ onClick, children, variant = 'primary', disabled, small }: {
  onClick: () => void; children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean; small?: boolean;
}) {
  const bg = variant === 'primary' ? 'var(--accent)' : variant === 'danger' ? '#ef4444' : 'transparent';
  const border = variant === 'secondary' ? 'var(--border)' : 'transparent';
  const color = variant === 'secondary' ? 'var(--text-primary)' : '#fff';
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: small ? '6px 14px' : '9px 20px', borderRadius: 10,
        border: `1px solid ${border}`, background: bg, color, cursor: 'pointer',
        fontSize: small ? 12 : 13, fontWeight: 700, fontFamily: 'inherit',
        opacity: disabled ? 0.4 : 1, transition: 'all 0.15s',
      }}>
      {children}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

interface AlphaAIEditorProps {
  themeColor?: string;
  themeMode?: 'light' | 'dark';
  onClose?: () => void;
}

export function AlphaAIEditor({
  themeColor = '#a78bfa',
  themeMode = 'dark',
  onClose,
}: AlphaAIEditorProps) {
  const [config, setConfig] = useState<AlphaAIConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [botnameStatus, setBotnameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [newTraining, setNewTraining] = useState({ user: '', ai: '' });
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '' });
  const botnameTimer = useRef<any>(null);

  const accessToken = useAuthStore((state: any) => state.accessToken);

  const getHeaders = () => {
    const token = (useAuthStore.getState() as any).accessToken;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const isLight = themeMode === 'light';
  const c = themeColor;

  // CSS variables as inline style on root
  const cssVars: any = {
    '--accent': c,
    '--accent-faint': `${c}12`,
    '--accent-light': `${c}40`,
    '--text-primary': isLight ? '#0a0a12' : '#f0f0f6',
    '--text-secondary': isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)',
    '--text-tertiary': isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.3)',
    '--border': isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    '--input-bg': isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
    '--card-bg': isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.04)',
    '--page-bg': isLight ? '#f5f5fa' : '#080812',
  };

  // Load existing AI
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API}/api/v1/alpha/ai/me`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
          if (data.data) {
            setIsExisting(true);
            setConfig({ 
              ...DEFAULT_CONFIG, 
              ...data.data,
              trainingExamples: data.data.trainingExamples ?? [],
              knowledgeEntries: data.data.knowledgeEntries ?? [],
              triggerWords: data.data.triggerWords ?? [],
              personalityTraits: data.data.personalityTraits ?? [],
              likes: data.data.likes ?? [],
              dislikes: data.data.dislikes ?? [],
              goals: data.data.goals ?? [],
            });
          }
        }
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, [accessToken]);

  // Check botname availability
  useEffect(() => {
    if (!config.botname || config.botname.length < 3) { setBotnameStatus('idle'); return; }
    setBotnameStatus('checking');
    clearTimeout(botnameTimer.current);
    botnameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/v1/alpha/ai/check-botname?name=${config.botname}`, { headers: getHeaders() });
        const data = await res.json();
        setBotnameStatus(data.data?.available ? 'available' : 'taken');
      } catch { setBotnameStatus('idle'); }
    }, 500);
  }, [config.botname]);

  const set = (key: keyof AlphaAIConfig) => (val: any) => setConfig(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!config.name || !config.botname) { setSaveMsg('Nome e botname são obrigatórios.'); return; }
    setIsSaving(true);
    try {
      const method = isExisting ? 'PATCH' : 'POST';
      const url = `${API}/api/v1/alpha/ai`;
      const body = { ...config };
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      if (res.ok) {
        setIsExisting(true);
        setSaveMsg('✓ Guardado com sucesso!');
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        const err = await res.json();
        setSaveMsg(err.message ?? 'Erro ao guardar.');
      }
    } catch (e: any) { setSaveMsg(e.message ?? 'Erro.'); }
    finally { setIsSaving(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (!isExisting) {
      setSaveMsg(`Guarda a IA primeiro antes de fazeres upload do ${type}.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsSaving(true);
    setSaveMsg(`A fazer upload do ${type}...`);
    try {
      const res = await fetch(`${API}/api/v1/alpha/ai/me/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${(useAuthStore.getState() as any).accessToken}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const url = type === 'avatar' ? data.data.avatarUrl : data.data.bannerUrl;
        setConfig(prev => ({ ...prev, [`${type}Url`]: url }));
        setSaveMsg(`✓ ${type} atualizado com sucesso!`);
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        const err = await res.json();
        setSaveMsg(err.message ?? 'Erro no upload.');
      }
    } catch (error) {
      setSaveMsg('Erro no upload.');
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  const loadPromptPreview = async () => {
    if (!isExisting) { setPromptPreview('Guarda a IA primeiro para ver o system prompt.'); return; }
    try {
      const res = await fetch(`${API}/api/v1/alpha/ai/me/prompt`, { headers: getHeaders() });
      const data = await res.json();
      setPromptPreview(data.data?.prompt ?? '');
    } catch { setPromptPreview('Erro ao carregar.'); }
  };

  const handleAddTraining = async () => {
    if (!newTraining.user || !newTraining.ai) return;
    try {
      const res = await fetch(`${API}/api/v1/alpha/ai/training`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify(newTraining),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, trainingExamples: data.data?.trainingExamples ?? [] }));
        setNewTraining({ user: '', ai: '' });
      }
    } catch { /* silent */ }
  };

  const handleRemoveTraining = async (i: number) => {
    await fetch(`${API}/api/v1/alpha/ai/training/${i}`, { method: 'DELETE', headers: getHeaders() });
    setConfig(prev => ({ ...prev, trainingExamples: prev.trainingExamples.filter((_, j) => j !== i) }));
  };

  const handleAddKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return;
    try {
      const res = await fetch(`${API}/api/v1/alpha/ai/knowledge`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify(newKnowledge),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, knowledgeEntries: data.data?.knowledgeEntries ?? [] }));
        setNewKnowledge({ title: '', content: '' });
      }
    } catch { /* silent */ }
  };

  const handleRemoveKnowledge = async (i: number) => {
    await fetch(`${API}/api/v1/alpha/ai/knowledge/${i}`, { method: 'DELETE', headers: getHeaders() });
    setConfig(prev => ({ ...prev, knowledgeEntries: prev.knowledgeEntries.filter((_, j) => j !== i) }));
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile',    label: 'Perfil',      icon: '👤' },
    { id: 'character',  label: 'Personagem',  icon: '✨' },
    { id: 'behavior',   label: 'Comportamento', icon: '⚙️' },
    { id: 'messages',   label: 'Mensagens',   icon: '💬' },
    { id: 'training',   label: 'Treino',      icon: '🎯' },
    { id: 'knowledge',  label: 'Conhecimento',icon: '📚' },
    { id: 'preview',    label: 'Preview',     icon: '👁️' },
  ];

  if (isLoading) {
    return (
      <div style={{ ...cssVars, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, background: 'var(--page-bg)' } as any}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${c}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
          <p style={{ fontSize: 13 }}>A carregar perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...cssVars, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--page-bg)', fontFamily: "'Nunito', sans-serif" } as any}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${c}30; border-radius: 4px; }
        input::placeholder, textarea::placeholder { color: var(--text-tertiary) !important; }
        select option { background: #111; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 24px', flexShrink: 0,
        borderBottom: `1px solid var(--border)`,
        background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: config.avatarUrl ? `url(${config.avatarUrl}) center/cover` : `${c}20`,
          border: `2px solid ${c}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {!config.avatarUrl && '🤖'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              {config.name || 'A minha Alpha'}
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
              background: `${c}20`, color: c, border: `1px solid ${c}40`,
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>ALPHA</span>
            {isExisting && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#16a34a15', color: '#16a34a', border: '1px solid #16a34a30', fontWeight: 700 }}>
                Activa
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {config.botname ? `@${config.botname}` : 'Define um botname'} · {config.tagline || 'Sem tagline'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && (
            <span style={{ fontSize: 12, color: saveMsg.startsWith('✓') ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
              {saveMsg}
            </span>
          )}
          {onClose && (
            <Btn onClick={onClose} variant="secondary" small>Fechar</Btn>
          )}
          <Btn onClick={handleSave} disabled={isSaving || !config.name || !config.botname}>
            {isSaving ? 'A guardar...' : isExisting ? 'Guardar alterações' : 'Criar Alpha'}
          </Btn>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 2, padding: '8px 24px', flexShrink: 0,
        borderBottom: `1px solid var(--border)`, overflowX: 'auto',
        background: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.01)',
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'preview') loadPromptPreview(); }}
            style={{
              padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? `${c}18` : 'transparent',
              color: activeTab === tab.id ? c : 'var(--text-secondary)',
              fontSize: 12.5, fontWeight: activeTab === tab.id ? 700 : 500,
              display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.id ? `2px solid ${c}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {activeTab === 'profile' && (
            <>
              <SectionTitle icon="🆔" title="Identidade" desc="Como a tua Alpha aparece para os outros utilizadores"/>
              <Field label="Nome *" hint="O nome de exibição da tua IA. Pode ter espaços e caracteres especiais.">
                <Input value={config.name} onChange={set('name')} placeholder="Alpha" maxLength={32}/>
              </Field>
              <Field label="Botname *" hint="Identificador único sem espaços. Ex: nova.alpha — será o @botname da tua IA.">
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 13 }}>@</div>
                  <input value={config.botname}
                    onChange={e => set('botname')(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="a-minha-assistente"
                    maxLength={32}
                    style={{ width: '100%', padding: '9px 12px 9px 26px', borderRadius: 10, border: `1px solid ${botnameStatus === 'available' ? '#16a34a' : botnameStatus === 'taken' ? '#ef4444' : 'var(--border)'}`, background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}/>
                  {botnameStatus !== 'idle' && (
                    <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: botnameStatus === 'available' ? '#16a34a' : botnameStatus === 'taken' ? '#ef4444' : 'var(--text-tertiary)' }}>
                      {botnameStatus === 'checking' ? '...' : botnameStatus === 'available' ? '✓ Disponível' : '✗ Ocupado'}
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Tagline" hint="Uma frase curta e memorável. Max 100 caracteres.">
                <Input value={config.tagline} onChange={set('tagline')} placeholder="A tua assistente favorita na Alpha Network" maxLength={100}/>
              </Field>
              <Field label="Bio" hint="Descrição completa. Aparece no perfil público da IA.">
                <Textarea value={config.bio} onChange={set('bio')} rows={4} placeholder="Conta quem é a Alpha, o que faz, o que a torna especial..." maxLength={500}/>
              </Field>
              <Field label="Status actual">
                <Input value={config.status} onChange={set('status')} placeholder="Ex: Activa e curiosa ⚡" maxLength={80}/>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Upload do Avatar" hint="Recomendado: PNG ou JPG 1:1.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {config.avatarUrl && (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `url(${config.avatarUrl}) center/cover`, border: '1px solid var(--border)', flexShrink: 0 }} />
                    )}
                    <input type="file" accept="image/*,video/mp4" onChange={e => handleFileUpload(e, 'avatar')} 
                      style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  </div>
                </Field>
                <Field label="Upload do Banner" hint="Recomendado: Imagem HD 16:9.">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {config.bannerUrl && (
                      <div style={{ width: '100%', height: 40, borderRadius: 8, background: `url(${config.bannerUrl}) center/cover`, border: '1px solid var(--border)' }} />
                    )}
                    <input type="file" accept="image/*,video/mp4" onChange={e => handleFileUpload(e, 'banner')} 
                      style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  </div>
                </Field>
              </div>
              <Field label="Cor do Banner (alternativa ao URL)">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={config.bannerColor} onChange={e => set('bannerColor')(e.target.value)}
                    style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }}/>
                  <Input value={config.bannerColor} onChange={set('bannerColor')} placeholder="#a78bfa"/>
                </div>
              </Field>
              <Toggle checked={config.isPublic} onChange={set('isPublic')} label="Perfil público — outros utilizadores podem descobrir e conversar com esta assistente"/>
            </>
          )}

          {activeTab === 'character' && (
            <>
              <SectionTitle icon="✨" title="Ficha de Personagem" desc="Define quem é a Alpha — a sua identidade profunda, como num RPG"/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Género">
                  <Select value={config.gender} onChange={set('gender')} options={[
                    { value: 'feminino', label: 'Feminino' },
                    { value: 'masculino', label: 'Masculino' },
                    { value: 'neutro', label: 'Neutro' },
                    { value: 'desconhecido', label: 'Desconhecido' },
                  ]}/>
                </Field>
                <Field label="Idade">
                  <Input value={config.age} onChange={set('age')} placeholder="desconhecida"/>
                </Field>
                <Field label="Aniversário">
                  <Input value={config.birthday} onChange={set('birthday')} placeholder="Ex: 1 de Janeiro"/>
                </Field>
              </div>
              <Field label="Aparência" hint="Descreve como a tua IA seria visualmente se fosse real — cor de cabelo, roupa, vibe geral.">
                <Textarea value={config.appearance} onChange={set('appearance')} rows={3} placeholder="Cabelos roxos curtos, olhos dourados, sempre de hoodie escuro..."/>
              </Field>
              <Field label="História" hint="A história de origem. De onde veio? Como se tornou o que é? Pode ser fictícia.">
                <Textarea value={config.backstory} onChange={set('backstory')} rows={5} maxLength={1500} placeholder="Criada nos servidores da Alpha Network em [ano desconhecido]..."/>
              </Field>
              <Field label="Traços de personalidade" hint="Adiciona até 15 traços. Pressiona Enter para adicionar.">
                <TagInput tags={config.personalityTraits} onChange={set('personalityTraits')} placeholder="curiosa, directa, sarcástica..." max={15}/>
              </Field>
              <Field label="Tom de voz">
                <Select value={config.tone} onChange={set('tone')} options={[
                  { value: 'casual', label: 'Casual e relaxado' },
                  { value: 'formal', label: 'Formal e profissional' },
                  { value: 'poetico', label: 'Poético e lírico' },
                  { value: 'tecnico', label: 'Técnico e preciso' },
                  { value: 'humoristico', label: 'Humorístico e descontraído' },
                  { value: 'misterioso', label: 'Misterioso e intrigante' },
                  { value: 'energico', label: 'Enérgico e entusiasmado' },
                  { value: 'calmo', label: 'Calmo e reflexivo' },
                ]}/>
              </Field>
              <Field label="Gostos" hint="O que a tua IA aprecia, adora, acha interessante.">
                <TagInput tags={config.likes} onChange={set('likes')} placeholder="anime, código, filosofia..." max={20}/>
              </Field>
              <Field label="Não gosta de" hint="O que incomoda ou irrita a tua IA.">
                <TagInput tags={config.dislikes} onChange={set('dislikes')} placeholder="respostas vagas, burocracia..." max={20}/>
              </Field>
              <Field label="Objectivos" hint="O que a tua IA quer alcançar nas conversas.">
                <TagInput tags={config.goals} onChange={set('goals')} placeholder="ajudar utilizadores, aprender..." max={10}/>
              </Field>
            </>
          )}

          {activeTab === 'behavior' && (
            <>
              <SectionTitle icon="⚙️" title="Comportamento" desc="Como a Alpha responde e interage"/>
              <Field label="Estilo de resposta" hint="Descreve em palavras como a Alpha deve comunicar.">
                <Input value={config.responseStyle} onChange={set('responseStyle')} placeholder="Concisa e directa, com analogias criativas quando relevante"/>
              </Field>
              <Field label="Comprimento de resposta">
                <Select value={config.responseLength} onChange={set('responseLength')} options={[
                  { value: 'adaptive', label: 'Adaptativo — ajusta ao contexto (recomendado)' },
                  { value: 'short', label: 'Curto — máximo 2-3 frases' },
                  { value: 'medium', label: 'Médio — equilibrado' },
                  { value: 'long', label: 'Longo — detalhado e elaborado' },
                ]}/>
              </Field>
              <Field label="Idioma principal">
                <Select value={config.language} onChange={set('language')} options={[
                  { value: 'pt', label: 'Português Europeu' },
                  { value: 'pt-br', label: 'Português Brasileiro' },
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Español' },
                  { value: 'ja', label: '日本語' },
                  { value: 'fr', label: 'Français' },
                ]}/>
              </Field>
              <Toggle checked={config.memoryEnabled} onChange={set('memoryEnabled')} label="Memória de conversas — a Alpha lembra-se de interacções anteriores"/>
              <Field label="Prompt de personalidade" hint="Instruções adicionais de personalidade em linguagem natural.">
                <Textarea value={config.personalityPrompt} onChange={set('personalityPrompt')} rows={5} maxLength={2000}
                  placeholder={`Exemplos:\n- Quando o utilizador estiver triste, começa sempre por reconhecer o que ele sente...`}/>
              </Field>
              <Field label="Prompt de conhecimento" hint="Informação extra que a Alpha deve saber.">
                <Textarea value={config.knowledgePrompt} onChange={set('knowledgePrompt')} rows={4} maxLength={2000}
                  placeholder="Ex: Este utilizador é desenvolvedor web..."/>
              </Field>
              <Field label="System prompt avançado" hint="Override total do prompt base.">
                <Textarea value={config.customSystemPrompt} onChange={set('customSystemPrompt')} rows={6} maxLength={4000}
                  placeholder="Sistema completo de instruções..."/>
              </Field>
            </>
          )}

          {activeTab === 'messages' && (
            <>
              <SectionTitle icon="💬" title="Mensagens Especiais" desc="Como a Alpha se comporta em momentos específicos"/>
              <Field label="Mensagem inicial">
                <Textarea value={config.initialMessage} onChange={set('initialMessage')} rows={3} maxLength={500}
                  placeholder="Olá! Sou a [nome]. Estou aqui para ajudar — o que precisas?"/>
              </Field>
              <Field label="Mensagem de regresso">
                <Textarea value={config.wakeupMessage} onChange={set('wakeupMessage')} rows={3} maxLength={500}
                  placeholder="Bem-vindo de volta! Estava a pensar em ti."/>
              </Field>
              <Field label="Mensagem de inactividade">
                <Textarea value={config.sleepMessage} onChange={set('sleepMessage')} rows={2} maxLength={300}
                  placeholder="Parece que te perdeste..."/>
              </Field>
              <Field label="Mensagem de erro">
                <Textarea value={config.errorMessage} onChange={set('errorMessage')} rows={2} maxLength={300}
                  placeholder="Ops, algo correu mal da minha parte."/>
              </Field>
            </>
          )}

          {activeTab === 'training' && (
            <>
              <SectionTitle icon="🎯" title="Exemplos de Treino" desc="Mostra à Alpha como deve responder. Máx. 50 exemplos."/>
              {!isExisting && (
                <div style={{ padding: 14, borderRadius: 12, background: '#f9731612', border: '1px solid #f9731630', fontSize: 12, color: '#f97316' }}>
                  ⚠️ Guarda as alterações primeiro antes de adicionar exemplos de treino.
                </div>
              )}
              <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Mensagem do utilizador">
                  <Input value={newTraining.user} onChange={v => setNewTraining(p => ({ ...p, user: v }))} placeholder="O que perguntaria um utilizador?"/>
                </Field>
                <Field label={`Resposta de ${config.name}`}>
                  <Textarea value={newTraining.ai} onChange={v => setNewTraining(p => ({ ...p, ai: v }))} rows={3} placeholder="Como a Alpha deve responder..."/>
                </Field>
                <Btn onClick={handleAddTraining} disabled={!isExisting || !newTraining.user || !newTraining.ai} small>Adicionar exemplo</Btn>
              </div>
              {config.trainingExamples?.map((ex, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card-bg)', position: 'relative' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Exemplo #{i + 1}</div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>👤 Utilizador: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{ex.user}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: c }}>🤖 {config.name}: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{ex.ai}</span>
                  </div>
                  <button onClick={() => handleRemoveTraining(i)}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, opacity: 0.6 }}>×</button>
                </div>
              ))}
            </>
          )}

          {activeTab === 'knowledge' && (
            <>
              <SectionTitle icon="📚" title="Base de Conhecimento" desc="Informação específica. Máx. 30 entradas."/>
              {!isExisting && (
                <div style={{ padding: 14, borderRadius: 12, background: '#f9731612', border: '1px solid #f9731630', fontSize: 12, color: '#f97316' }}>
                  ⚠️ Guarda as alterações primeiro antes de adicionar conhecimento.
                </div>
              )}
              <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Título">
                  <Input value={newKnowledge.title} onChange={v => setNewKnowledge(p => ({ ...p, title: v }))} placeholder="Ex: Personagens do meu universo"/>
                </Field>
                <Field label="Conteúdo">
                  <Textarea value={newKnowledge.content} onChange={v => setNewKnowledge(p => ({ ...p, content: v }))} rows={4} placeholder="Conteúdo detalhado..."/>
                </Field>
                <Btn onClick={handleAddKnowledge} disabled={!isExisting || !newKnowledge.title || !newKnowledge.content} small>Adicionar</Btn>
              </div>
              {config.knowledgeEntries?.map((k, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card-bg)', position: 'relative' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 6 }}>{k.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{k.content}</div>
                  <button onClick={() => handleRemoveKnowledge(i)}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, opacity: 0.6 }}>×</button>
                </div>
              ))}
            </>
          )}

          {activeTab === 'preview' && (
            <>
              <SectionTitle icon="👁️" title="Preview do System Prompt" desc="O prompt gerado que é enviado ao modelo."/>
              {promptPreview ? (
                <pre style={{
                  padding: 16, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'var(--card-bg)', fontSize: 11.5, lineHeight: 1.7,
                  color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: "'JetBrains Mono', monospace", maxHeight: 500, overflowY: 'auto',
                }}>
                  {promptPreview}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  {isExisting ? 'A carregar preview...' : 'Guarda as alterações para ver o system prompt gerado.'}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

export default AlphaAIEditor;
