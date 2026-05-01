'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomText {
  id: string;
  content: string;
  x: number; y: number; // % of viewport
  fontSize: number;
  color: string;
  fontWeight: number;
  opacity: number;
}

export interface AmbientSettings {
  accent: string;
  material: 'glass' | 'flat' | 'neuro';
  font: string;
  mode: 'dark' | 'light' | 'auto';
  wallpaperType: 'banner' | 'gradient' | 'image' | 'video';
  wallpaperGradient?: string;
  wallpaperUrl?: string;
  blurIntensity: number;
  moduleLayout: 'dock' | 'grid' | 'sidebar';
  customTexts: CustomText[];
  widgetPositions: {
    clock:    { x: number; y: number };
    greeting: { x: number; y: number };
    userCard: { x: number; y: number };
    stats:    { x: number; y: number };
    dock:     { x: number; y: number };
  };
}

export const DEFAULT_SETTINGS: AmbientSettings = {
  accent: '#6366f1',
  material: 'glass',
  font: 'Outfit',
  mode: 'dark',
  wallpaperType: 'banner',
  blurIntensity: 40,
  moduleLayout: 'dock',
  customTexts: [],
  widgetPositions: {
    clock:    { x: 1.5, y: 2.5  },
    greeting: { x: 30,  y: 36   },
    userCard: { x: 84,  y: 2.5  },
    stats:    { x: 50,  y: 54   },
    dock:     { x: 20,  y: 87   },
  },
};

const ACCENT_PRESETS = [
  { label: 'Indigo',  color: '#6366f1' }, { label: 'Violet', color: '#8b5cf6' },
  { label: 'Pink',    color: '#ec4899' }, { label: 'Rose',   color: '#f43f5e' },
  { label: 'Amber',   color: '#f59e0b' }, { label: 'Emerald',color: '#10b981' },
  { label: 'Teal',    color: '#14b8a6' }, { label: 'Sky',    color: '#0ea5e9' },
  { label: 'Blue',    color: '#3b82f6' }, { label: 'Orange', color: '#f97316' },
  { label: 'Red',     color: '#ef4444' }, { label: 'Lime',   color: '#84cc16' },
];

const GRADIENT_PRESETS = [
  { label: 'Aurora',   value: 'linear-gradient(135deg,#6366f1,#ec4899,#14b8a6)' },
  { label: 'Sunset',   value: 'linear-gradient(135deg,#f97316,#ef4444,#8b5cf6)' },
  { label: 'Ocean',    value: 'linear-gradient(135deg,#0ea5e9,#6366f1,#14b8a6)' },
  { label: 'Forest',   value: 'linear-gradient(135deg,#10b981,#0ea5e9,#6366f1)' },
  { label: 'Midnight', value: 'linear-gradient(135deg,#020205,#1e1b4b,#09090b)' },
  { label: 'Neon',     value: 'linear-gradient(135deg,#ec4899,#6366f1,#14b8a6)' },
  { label: 'Gold',     value: 'linear-gradient(135deg,#92400e,#f59e0b,#fcd34d)' },
  { label: 'Cherry',   value: 'linear-gradient(135deg,#881337,#f43f5e,#fb923c)' },
];

const FONT_OPTIONS = [
  { label: 'Outfit',        value: 'Outfit'        },
  { label: 'Inter',         value: 'Inter'         },
  { label: 'Space Grotesk', value: 'Space Grotesk' },
  { label: 'Syne',          value: 'Syne'          },
  { label: 'DM Sans',       value: 'DM Sans'       },
  { label: 'Rajdhani',      value: 'Rajdhani'      },
  { label: 'Exo 2',         value: 'Exo 2'         },
];

// ─── Text Manager State ───────────────────────────────────────────────────────
interface TextEditorState {
  id: string | null; // null = creating new
  content: string;
  fontSize: number;
  color: string;
  fontWeight: number;
  opacity: number;
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

interface Props {
  settings: AmbientSettings;
  onSettingsChange: (s: AmbientSettings) => void;
  onClose: () => void;
  hasBanner: boolean;
}

export default function AmbientCustomizer({ settings, onSettingsChange, onClose, hasBanner }: Props) {
  const { updateUserProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customAccent, setCustomAccent] = useState(settings.accent);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addText = () => setTextEditor({ id: null, content: 'Texto livre', fontSize: 28, color: '#ffffff', fontWeight: 700, opacity: 1 });
  const editText = (t: CustomText) => setTextEditor({ id: t.id, content: t.content, fontSize: t.fontSize, color: t.color, fontWeight: t.fontWeight, opacity: t.opacity });
  const removeText = (id: string) => update({ customTexts: settings.customTexts.filter(t => t.id !== id) });
  const saveText = () => {
    if (!textEditor) return;
    const texts = settings.customTexts || [];
    if (textEditor.id) {
      const existingId = textEditor.id; // garantidamente string aqui
      update({ customTexts: texts.map(t => t.id === existingId
        ? { id: t.id, x: t.x, y: t.y, content: textEditor.content, fontSize: textEditor.fontSize, color: textEditor.color, fontWeight: textEditor.fontWeight, opacity: textEditor.opacity } as CustomText
        : t) });
    } else {
      const newId = Date.now().toString();
      const { id: _ignored, ...rest } = textEditor; // remove o null id antes do spread
      update({ customTexts: [...texts, { id: newId, x: 40, y: 40, ...rest } as CustomText] });
    }
    setTextEditor(null);
  };

  const update = (partial: Partial<AmbientSettings>) =>
    onSettingsChange({ ...settings, ...partial });

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', {
        nameColor: settings.accent, nameFont: settings.font,
        themeMode: settings.mode, auroraTheme: settings.accent,
      });
      updateUserProfile({ nameColor: settings.accent, nameFont: settings.font });
      localStorage.setItem('alpha_ambient', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error('Save error', e); }
    finally { setSaving(false); }
  };

  // Upload: use createObjectURL directly — no API call needed (stored in localStorage)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    update({ wallpaperType: isVideo ? 'video' : 'image', wallpaperUrl: url });
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const divider = <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '18px 0' }} />;

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 50, fontSize: 11, fontWeight: active ? 700 : 500,
    cursor: 'pointer', transition: 'all 0.2s',
    border: `1.5px solid ${active ? settings.accent : 'rgba(255,255,255,0.12)'}`,
    background: active ? `${settings.accent}22` : 'rgba(255,255,255,0.04)',
    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
  });

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href={`https://fonts.googleapis.com/css2?family=${FONT_OPTIONS.map(f => f.value.replace(/ /g, '+')).join('&family=')}&display=swap`} rel="stylesheet" />

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        zIndex: 100, display: 'flex', flexDirection: 'column',
        background: 'rgba(8,8,16,0.75)',
        backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        animation: 'slideInRight 0.3s cubic-bezier(0.22,1,0.36,1)',
        fontFamily: "'Outfit', sans-serif",
        boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
      }}>
        <style>{`
          @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
          .cust-scroll::-webkit-scrollbar{width:3px}
          .cust-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
          input[type=range]{-webkit-appearance:none;height:4px;border-radius:4px;outline:none;cursor:pointer}
          input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;cursor:pointer}
        `}</style>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>✦ Personalizar Ambiente</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Fase 1 · Aparência Geral</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Content */}
        <div className="cust-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* ── TEXTOS PERSONALIZADOS ── */}
          <SectionHeader icon="📝" label="Textos Personalizados" />
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:4 }}>
            {(settings.customTexts || []).map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ flex:1, fontSize:12, color:'rgba(255,255,255,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.content}</span>
                <button onClick={() => editText(t)} style={{ padding:'3px 8px', borderRadius:6, background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontSize:10, cursor:'pointer' }}>✏️</button>
                <button onClick={() => removeText(t.id)} style={{ padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,0.15)', border:'none', color:'#f87171', fontSize:10, cursor:'pointer' }}>🗑️</button>
              </div>
            ))}
            <button onClick={addText}
              style={{ padding:'10px', borderRadius:12, border:'2px dashed rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.02)', color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = settings.accent; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}>
              + Adicionar Texto ao Ambiente
            </button>
          </div>

          {/* Text editor modal */}
          {textEditor && (
            <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }}>
              <div style={{ width:320, background:'rgba(12,12,22,0.95)', backdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:24, display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{textEditor.id ? 'Editar Texto' : 'Novo Texto'}</div>
                <textarea value={textEditor.content} onChange={e => setTextEditor(p => p && ({...p, content:e.target.value}))}
                  placeholder="Escreve aqui..." rows={3}
                  style={{ padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, resize:'vertical', outline:'none', fontFamily:'inherit' }} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>TAMANHO: {textEditor.fontSize}px</div>
                    <input type="range" min={10} max={120} value={textEditor.fontSize} onChange={e => setTextEditor(p => p && ({...p, fontSize:+e.target.value}))}
                      style={{ width:'100%', accentColor: settings.accent }} />
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>OPACIDADE: {Math.round(textEditor.opacity*100)}%</div>
                    <input type="range" min={10} max={100} value={textEditor.opacity*100} onChange={e => setTextEditor(p => p && ({...p, opacity:+e.target.value/100}))}
                      style={{ width:'100%', accentColor: settings.accent }} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Cor:</span>
                  <input type="color" value={textEditor.color} onChange={e => setTextEditor(p => p && ({...p, color:e.target.value}))}
                    style={{ width:36, height:36, border:'none', background:'transparent', cursor:'pointer', borderRadius:8 }} />
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginLeft:8 }}>Peso:</span>
                  {[400,700,900].map(w => (
                    <button key={w} onClick={() => setTextEditor(p => p && ({...p, fontWeight:w}))}
                      style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${textEditor.fontWeight===w ? settings.accent : 'rgba(255,255,255,0.1)'}`, background: textEditor.fontWeight===w ? `${settings.accent}25` : 'transparent', color:'#fff', fontSize:10, cursor:'pointer' }}>
                      {w===400?'Normal':w===700?'Bold':'Black'}
                    </button>
                  ))}
                </div>
                {/* Preview */}
                <div style={{ textAlign:'center', padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: Math.min(textEditor.fontSize, 36), color:textEditor.color, fontWeight:textEditor.fontWeight, opacity:textEditor.opacity }}>{textEditor.content||'...'}</span>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setTextEditor(null)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', fontSize:12, cursor:'pointer' }}>Cancelar</button>
                  <button onClick={saveText} style={{ flex:2, padding:'10px', borderRadius:10, border:'none', background:settings.accent, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>✓ Aplicar</button>
                </div>
              </div>
            </div>
          )}

          {divider}

          {/* ── LAYOUT DE MÓDULOS ── */}
          <SectionHeader icon="🧩" label="Layout de Módulos" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 4 }}>
            {([
              { key: 'dock',    label: 'Dock',    icon: '⏤', desc: 'Barra inferior' },
              { key: 'grid',    label: 'Grid',    icon: '⊞', desc: 'Grade central' },
              { key: 'sidebar', label: 'Sidebar', icon: '▌', desc: 'Coluna lateral' },
            ] as const).map(l => (
              <button key={l.key} onClick={() => update({ moduleLayout: l.key })}
                style={{ padding: '10px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                  border: `1.5px solid ${settings.moduleLayout === l.key ? settings.accent : 'rgba(255,255,255,0.08)'}`,
                  background: settings.moduleLayout === l.key ? `${settings.accent}20` : 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{l.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: settings.moduleLayout === l.key ? '#fff' : 'rgba(255,255,255,0.5)' }}>{l.label}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{l.desc}</div>
              </button>
            ))}
          </div>

          {divider}

          {/* ── WALLPAPER ── */}
          <SectionHeader icon="🖼️" label="Wallpaper & Background" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {([
              { key: 'banner',   label: '📷 Banner' },
              { key: 'gradient', label: '🌈 Gradiente' },
              { key: 'image',    label: '🖼️ Imagem' },
              { key: 'video',    label: '🎬 Vídeo' },
            ] as const).map(opt => (
              <button key={opt.key} onClick={() => update({ wallpaperType: opt.key })}
                disabled={opt.key === 'banner' && !hasBanner}
                style={{ ...pill(settings.wallpaperType === opt.key), opacity: opt.key === 'banner' && !hasBanner ? 0.3 : 1 }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Gradient picker */}
          {settings.wallpaperType === 'gradient' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
              {GRADIENT_PRESETS.map(g => (
                <button key={g.label} onClick={() => update({ wallpaperGradient: g.value })} title={g.label}
                  style={{ height: 52, borderRadius: 12, cursor: 'pointer', background: g.value,
                    border: settings.wallpaperGradient === g.value ? '2.5px solid #fff' : '2px solid transparent',
                    transform: settings.wallpaperGradient === g.value ? 'scale(1.06)' : 'scale(1)', transition: 'all 0.15s' }} />
              ))}
            </div>
          )}

          {/* Upload — usa createObjectURL, sem API */}
          {(settings.wallpaperType === 'image' || settings.wallpaperType === 'video') && (
            <div>
              <input ref={fileRef} type="file"
                accept={settings.wallpaperType === 'video' ? 'video/mp4,video/webm,video/*' : 'image/jpeg,image/png,image/gif,image/webp,image/*'}
                style={{ display: 'none' }} onChange={handleImageUpload} />
              <button onClick={() => fileRef.current?.click()}
                style={{ width: '100%', padding: '18px', borderRadius: 14, border: '2px dashed rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.03)', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 13,
                  fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = settings.accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}>
                {settings.wallpaperUrl ? '✅ Carregado — clica para mudar' : `+ Selecionar ${settings.wallpaperType === 'video' ? 'Vídeo' : 'Imagem'}`}
              </button>
              {settings.wallpaperUrl && (
                <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', height: 90, position: 'relative' }}>
                  {settings.wallpaperType === 'video'
                    ? <video src={settings.wallpaperUrl} muted loop autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={settings.wallpaperUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  }
                  <button onClick={() => update({ wallpaperUrl: undefined })}
                    style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer' }}>✕</button>
                </div>
              )}
            </div>
          )}

          {/* Blur Intensity Slider */}
          {(settings.wallpaperType === 'image' || settings.wallpaperType === 'video' || settings.wallpaperType === 'gradient' || (settings.wallpaperType === 'banner' && hasBanner)) && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>💨 Desfocagem do Fundo</span>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{settings.blurIntensity}px</span>
              </div>
              <input type="range" min={0} max={80} value={settings.blurIntensity}
                onChange={e => update({ blurIntensity: Number(e.target.value) })}
                style={{ width: '100%', accentColor: settings.accent, background: `linear-gradient(to right, ${settings.accent} ${settings.blurIntensity/80*100}%, rgba(255,255,255,0.1) 0%)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Sem desfoque</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Máximo</span>
              </div>
            </div>
          )}

          {divider}

          {/* ── ACCENT COLOR ── */}
          <SectionHeader icon="🎨" label="Cor de Destaque" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 12 }}>
            {ACCENT_PRESETS.map(p => (
              <button key={p.color} title={p.label} onClick={() => { setCustomAccent(p.color); update({ accent: p.color }); }}
                style={{ width: '100%', aspectRatio: '1', borderRadius: 10, background: p.color, cursor: 'pointer', transition: 'all 0.15s',
                  border: settings.accent === p.color ? '3px solid #fff' : '2px solid transparent',
                  transform: settings.accent === p.color ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: settings.accent === p.color ? `0 0 14px ${p.color}` : 'none' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <input type="color" value={customAccent} onChange={e => { setCustomAccent(e.target.value); update({ accent: e.target.value }); }}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} />
            <input type="text" value={customAccent}
              onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) { setCustomAccent(e.target.value); if (e.target.value.length === 7) update({ accent: e.target.value }); }}}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }} />
            <div style={{ width: 20, height: 20, borderRadius: 6, background: customAccent, flexShrink: 0 }} />
          </div>

          {divider}

          {/* ── MATERIAL ── */}
          <SectionHeader icon="🪟" label="Material" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              { key: 'glass', label: 'Glassmorphism', desc: 'Blur + transparência — padrão Alpha.' },
              { key: 'flat',  label: 'Flat',          desc: 'Superfícies sólidas e limpas.'      },
              { key: 'neuro', label: 'Neumorphism',   desc: 'Relevo suave e subtil.'             },
            ] as const).map(m => (
              <button key={m.key} onClick={() => update({ material: m.key })}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${settings.material === m.key ? settings.accent : 'rgba(255,255,255,0.08)'}`,
                  background: settings.material === m.key ? `${settings.accent}18` : 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: settings.material === m.key ? '#fff' : 'rgba(255,255,255,0.65)' }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{m.desc}</div>
                </div>
                {settings.material === m.key && <div style={{ marginLeft: 'auto', fontSize: 14, color: settings.accent }}>✓</div>}
              </button>
            ))}
          </div>

          {divider}

          {/* ── FONT ── */}
          <SectionHeader icon="✍️" label="Tipografia" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FONT_OPTIONS.map(f => (
              <button key={f.value} onClick={() => update({ font: f.value })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${settings.font === f.value ? settings.accent : 'rgba(255,255,255,0.07)'}`,
                  background: settings.font === f.value ? `${settings.accent}15` : 'rgba(255,255,255,0.02)', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 12, color: settings.font === f.value ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: settings.font === f.value ? 700 : 400 }}>{f.label}</span>
                <span style={{ fontFamily: `'${f.value}', sans-serif`, fontSize: 18, color: settings.font === f.value ? settings.accent : 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Aa</span>
              </button>
            ))}
          </div>

          {divider}

          {/* ── MODE ── */}
          <SectionHeader icon="🌑" label="Modo de Tema" />
          <div style={{ display: 'flex', gap: 8 }}>
            {([{key:'dark',label:'🌑 Escuro'},{key:'light',label:'☀️ Claro'},{key:'auto',label:'🔄 Auto'}] as const).map(opt => (
              <button key={opt.key} onClick={() => update({ mode: opt.key })}
                style={{ ...pill(settings.mode === opt.key), flex: 1, textAlign: 'center' }}>
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ height: 20 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '10px', borderRadius: 12, border: 'none', background: saved ? '#10b981' : settings.accent, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s' }}>
            {saving ? '⏳ A guardar...' : saved ? '✅ Guardado!' : '💾 Guardar Ambiente'}
          </button>
        </div>
      </div>
    </>
  );
}
