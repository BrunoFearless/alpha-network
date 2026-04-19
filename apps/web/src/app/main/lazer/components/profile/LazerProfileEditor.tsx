'use client';

import React, { useState, useRef } from 'react';
import { Avatar } from '@/components/ui';
import { DisplayName, FONT_OPTIONS, EFFECT_OPTIONS, COLOR_OPTIONS } from '@/components/ui/DisplayName';
import { EmojiRenderer } from '@/components/ui/EmojiRenderer';
import { ThemeBg, luminance } from './ThemeBg';
import { LazerUserProfile } from './types';
import { useLazerStore } from '@/store/lazer.store';

const BANNER_PRESETS = [
  { color:"#0d0e10", label:"Void"     },
  { color:"#1a1a2e", label:"Midnight" },
  { color:"#4c1d95", label:"Purple"   },
  { color:"#1e3a5f", label:"Ocean"    },
  { color:"#14532d", label:"Forest"   },
  { color:"#7f1d1d", label:"Crimson"  },
  { color:"#78350f", label:"Amber"    },
  { color:"#f9fafb", label:"White"    },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="m-0 mb-3.5 text-[11px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {label && <p className="m-0 mb-1.5 text-xs text-gray-400">{label}</p>}
      {children}
    </div>
  );
}

interface LazerProfileEditorProps {
  user: LazerUserProfile;
  onClose: () => void;
  onSave: (user: LazerUserProfile, files: { avatar: File | null; banner: File | null }) => void;
}

export function LazerProfileEditor({ user, onClose, onSave }: LazerProfileEditorProps) {
  const { connectSpotify } = useLazerStore();
  const [form, setForm] = useState<LazerUserProfile>({ ...user });
  const [tab, setTab]   = useState("perfil");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const avatarRef       = useRef<HTMLInputElement>(null);
  const bannerRef       = useRef<HTMLInputElement>(null);

  function setKey<K extends keyof LazerUserProfile>(key: K, val: LazerUserProfile[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const tabs = ["perfil", "aparência", "tema", "fundo"];
  const accentColor = form.themeColor || "#e879f9";
  const inputClassName = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-gray-100 text-sm outline-none focus:border-white/30 transition-colors";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-[900px] h-full max-h-[740px] bg-[#0f0f17] rounded-2xl overflow-hidden flex flex-col border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg text-white">✦</span>
            <span className="font-bold text-base text-gray-100">Editar Perfil Lazer</span>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-gray-400 text-xl cursor-pointer hover:text-white transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-white/5 shrink-0">
          {tabs.map(t => (
            <button 
               key={t} 
               onClick={() => setTab(t)} 
               className={`bg-transparent border-none border-b-2 px-5 py-3 text-[13px] cursor-pointer capitalize transition-all ${tab === t ? 'font-bold' : 'font-medium text-gray-500 hover:text-gray-300'}`}
               style={{ 
                 borderColor: tab === t ? accentColor : 'transparent', 
                 color: tab === t ? accentColor : undefined 
               }}
            >
              {t === "perfil" ? "👤 Perfil" : t === "aparência" ? "✨ Aparência" : t === "tema" ? "🎨 Tema" : "🖼️ Fundo"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Panel */}
          <div className="flex-1 overflow-y-auto p-7 relative custom-scrollbar">

            {/* TAB: PERFIL */}
            {tab === "perfil" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Section title="Identidade">
                  <Field label="Nome de exibição">
                    <input className={inputClassName} value={form.displayName} onChange={e => setKey("displayName", e.target.value)} maxLength={32} />
                  </Field>
                  <Field label="Username">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                      <input className={`${inputClassName} pl-8`} value={form.username} onChange={e => setKey("username", e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Frase de estado">
                    <input className={inputClassName} value={form.status} onChange={e => setKey("status", e.target.value)} maxLength={60} placeholder="O que estás a viver..." />
                  </Field>
                  <Field label="Bio">
                    <textarea className={`${inputClassName} resize-none leading-relaxed`} rows={3} value={form.bio} onChange={e => setKey("bio", e.target.value)} maxLength={200} />
                    <p className="m-0 mt-1 text-[11px] text-gray-500 text-right">{form.bio?.length || 0}/200</p>
                  </Field>
                  <Field label="A ouvir">
                    <input className={inputClassName} value={form.listening} onChange={e => setKey("listening", e.target.value)} placeholder="Nome da música - Artista" />
                  </Field>
                </Section>

                <Section title="Integração Spotify">
                  <div 
                    className="p-5 rounded-2xl border-[1.5px] border-dashed flex flex-col items-center text-center gap-3 transition-colors hover:bg-white/5"
                    style={{ borderColor: form.spotifyEnabled ? '#1db954' : 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.492 17.301c-.216.353-.673.465-1.026.249-2.859-1.748-6.458-2.143-10.697-1.176-.403.092-.806-.162-.898-.565-.092-.403.162-.806.565-.898 4.639-1.061 8.611-.611 11.807 1.344.353.216.465.673.249 1.026v.02zm1.465-3.264c-.272.443-.85.586-1.294.314-3.273-2.012-8.259-2.593-12.127-1.419-.496.151-1.027-.129-1.178-.625-.151-.497.129-1.028.625-1.178 4.417-1.34 9.914-.689 13.66 1.614.444.272.587.85.314 1.294zm.126-3.414c-3.924-2.33-10.395-2.546-14.156-1.404-.602.183-1.241-.163-1.424-.764-.183-.601.163-1.241.764-1.424 4.316-1.31 11.455-1.054 15.962 1.621.541.321.718 1.018.397 1.559-.321.541-1.018.718-1.559.397l.016-.01z"/></svg>
                    </div>
                    <div>
                      <p className="m-0 text-[13px] font-bold text-gray-100">
                        {form.spotifyEnabled ? 'Spotify Ligado' : 'Sincronizar com Spotify'}
                      </p>
                      <p className="m-0 text-[11px] text-gray-500 mt-1">
                        {form.spotifyEnabled 
                          ? 'A tua música atual aparecerá automaticamente no teu perfil.' 
                          : 'Mostra o que estás a ouvir em tempo real no teu perfil.'}
                      </p>
                    </div>
                    <a 
                      href={`http://localhost:3001/api/v1/lazer/spotify/auth?userId=${form.userId}`}
                      className="mt-2 inline-block rounded-lg px-6 py-2.5 text-[12px] font-bold text-white cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-md no-underline"
                      style={{ backgroundColor: '#1db954' }}
                    >
                      {form.spotifyEnabled ? 'Reconectar Spotify' : 'Conectar Agora'}
                    </a>
                    {form.spotifyEnabled && (
                      <button 
                        onClick={(e) => { e.preventDefault(); setKey("spotifyEnabled", false); }}
                        className="bg-transparent border-none text-[10px] text-gray-500 font-bold uppercase tracking-widest cursor-pointer hover:text-red-400"
                      >
                        Desativar Sincronização
                      </button>
                    )}
                  </div>
                </Section>

                <Section title="Avatar">
                  <div className="flex items-center gap-4">
                    <Avatar src={form.avatarUrl} name={form.displayName} size="xl" className="!w-[72px] !h-[72px] text-2xl border-2" style={{ borderColor: accentColor }} />
                    <div className="flex flex-col gap-2">
                      <button 
                         onClick={() => avatarRef.current?.click()} 
                         className="border-none rounded-lg px-4 py-2 text-[13px] font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                         style={{ backgroundColor: accentColor }}
                      >
                        Mudar Avatar
                      </button>
                      <button 
                         onClick={() => setKey("avatarUrl", null)} 
                         className="bg-transparent border border-white/10 rounded-lg px-4 py-2 text-[13px] text-gray-400 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        Remover
                      </button>
                      <input ref={avatarRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setAvatarFile(f);
                        setKey("avatarUrl", URL.createObjectURL(f));
                      }} />
                    </div>
                  </div>
                  <p className="m-0 mt-2.5 text-[11px] text-gray-500">Suporta imagens e vídeos (MP4, WebM).</p>
                </Section>

                <Section title="Estatísticas">
                  {form.stats.map((s, i) => (
                    <div key={i} className="flex gap-2.5 mb-2.5">
                      <input 
                         className={`${inputClassName} flex-1`} 
                         placeholder="Valor" 
                         value={s.value} 
                         onChange={e => { const n = [...form.stats]; n[i] = { ...n[i], value: e.target.value }; setKey("stats", n); }} 
                      />
                      <input 
                         className={`${inputClassName} flex-1`} 
                         placeholder="Rótulo" 
                         value={s.label} 
                         onChange={e => { const n = [...form.stats]; n[i] = { ...n[i], label: e.target.value }; setKey("stats", n); }} 
                      />
                    </div>
                  ))}
                </Section>
              </div>
            )}

            {/* TAB: APARÊNCIA */}
            {tab === "aparência" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Section title="Efeito do Nome">
                  <div className="flex flex-wrap gap-2">
                    {EFFECT_OPTIONS.map(e => (
                      <button 
                         key={e.id} 
                         onClick={() => setKey("nameEffect", e.id)} 
                         className="border-[1.5px] rounded-full px-4 py-2 text-[13px] font-semibold cursor-pointer transition-all hover:-translate-y-0.5"
                         style={{ 
                            backgroundColor: form.nameEffect === e.id ? `${accentColor}22` : "rgba(255,255,255,0.04)", 
                            borderColor: form.nameEffect === e.id ? accentColor : "rgba(255,255,255,0.08)", 
                            color: form.nameEffect === e.id ? accentColor : "#9ca3af" 
                         }}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Pré-visualização do Nome */}
                  <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                    <DisplayName profile={form} fallbackName={form.displayName || "O teu nome"} style={{ fontSize: 28 }} baseColor={accentColor} />
                  </div>
                </Section>

                <Section title="Fonte do Nome">
                  <div className="grid grid-cols-4 gap-2">
                    {FONT_OPTIONS.map(f => (
                      <button 
                         key={f.id} 
                         onClick={() => setKey("nameFont", f.value)} 
                         className="border-[1.5px] rounded-xl py-3 px-2 flex flex-col items-center gap-1 cursor-pointer transition-colors"
                         style={{ 
                            backgroundColor: form.nameFont === f.value ? `${accentColor}22` : "rgba(255,255,255,0.04)", 
                            borderColor: form.nameFont === f.value ? accentColor : "rgba(255,255,255,0.08)" 
                         }}
                      >
                        <span className="text-xl font-bold" style={{ fontFamily: f.value, color: form.nameFont === f.value ? accentColor : "#d1d5db" }}>Aa</span>
                        <span className="text-[9px] font-bold uppercase truncate w-full px-1" style={{ color: form.nameFont === f.value ? accentColor : "#6b7280" }}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Cor do Nome (Estrito)">
                  <div className="flex flex-wrap gap-2 mb-2.5">
                    {COLOR_OPTIONS.map(c => (
                      <button 
                         key={c} 
                         onClick={() => setKey("nameColor", c)} 
                         className="w-[30px] h-[30px] rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                         style={{ 
                            backgroundColor: c, 
                            borderColor: form.nameColor === c ? "#fff" : "transparent",
                            outline: c === "#FFFFFF" ? "1px solid rgba(255,255,255,0.2)" : "none" 
                         }} 
                      />
                    ))}
                    <button 
                       onClick={() => setKey("nameColor", "")} 
                       className="px-3 rounded-full border border-white/20 text-xs text-white/70 hover:bg-white/10 ml-2"
                    >
                      Automático (Usar Tema)
                    </button>
                  </div>
                </Section>
              </div>
            )}

            {/* TAB: TEMA */}
            {tab === "tema" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Section title="Modo">
                  <div className="grid grid-cols-2 gap-2.5">
                    {(["light", "dark"] as const).map(m => (
                      <button 
                         key={m} 
                         onClick={() => setKey("themeMode", m)} 
                         className="border-[1.5px] rounded-xl py-5 flex flex-col items-center gap-2 cursor-pointer transition-colors"
                         style={{ 
                            backgroundColor: form.themeMode === m ? `${accentColor}22` : "rgba(255,255,255,0.04)", 
                            borderColor: form.themeMode === m ? accentColor : "rgba(255,255,255,0.08)" 
                         }}
                      >
                        <span className="text-2xl">{m === "light" ? "☀️" : "🌙"}</span>
                        <span className="text-[13px] font-bold capitalize" style={{ color: form.themeMode === m ? accentColor : "#9ca3af" }}>{m === "light" ? "Claro" : "Escuro"}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Cor de Destaque">
                  <p className="m-0 mb-3 text-xs text-gray-500">Esta cor mistura-se com o tema escolhido e aparece por todo o perfil.</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COLOR_OPTIONS.map(c => (
                      <button 
                         key={c} 
                         onClick={() => setKey("themeColor", c)} 
                         className="w-9 h-9 rounded-full border-[3px] cursor-pointer transition-transform hover:scale-110"
                         style={{ 
                            backgroundColor: c, 
                            borderColor: form.themeColor === c ? "#fff" : "transparent",
                            boxShadow: form.themeColor === c ? `0 0 0 2px ${c}` : "none",
                            outline: c === "#FFFFFF" ? "1px solid rgba(255,255,255,0.2)" : "none" 
                         }} 
                      />
                    ))}
                  </div>
                  
                  {/* Pré-visualização Míni */}
                  <div className="rounded-xl overflow-hidden border border-white/10 relative">
                    <div className="h-[60px]" style={{ background: `linear-gradient(135deg, ${accentColor}80, ${accentColor}20)` }} />
                    <div className="px-4 py-3" style={{ background: form.themeMode === "light" ? "rgba(249,250,251,1)" : "rgba(9,9,11,1)" }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full border-2 shrink-0" style={{ backgroundColor: `${accentColor}40`, borderColor: accentColor }} />
                        <div className="min-w-0">
                          <p className="m-0 font-bold text-sm truncate" style={{ color: form.themeMode === "light" ? "#111827" : "#f3f4f6" }}>
                            <DisplayName profile={form} fallbackName={form.displayName} baseColor={accentColor} />
                          </p>
                          <p className="m-0 text-[11px] truncate" style={{ color: form.themeMode === "light" ? "#6b7280" : "#9ca3af" }}>@{form.username}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <div className="rounded-full px-3.5 py-1 text-[11px] font-bold text-white text-center" style={{ backgroundColor: accentColor }}>Acção</div>
                        <div className="rounded-full border px-3.5 py-1 text-[11px] text-center" style={{ backgroundColor: `${accentColor}18`, borderColor: `${accentColor}40`, color: form.themeMode === "light" ? "#374151" : "#d1d5db" }}>Mensagem</div>
                      </div>
                    </div>
                  </div>
                </Section>
              </div>
            )}

            {/* TAB: FUNDO */}
            {tab === "fundo" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Section title="Banner do Perfil">
                  <div className="flex gap-2.5 mb-3">
                    <button 
                       onClick={() => bannerRef.current?.click()} 
                       className="border-none rounded-lg px-4 py-2 text-[13px] font-semibold text-white cursor-pointer hover:opacity-90"
                       style={{ backgroundColor: accentColor }}
                    >
                      Carregar Imagem
                    </button>
                    <button 
                       onClick={() => setKey("bannerUrl", null)} 
                       className="bg-transparent border border-white/10 rounded-lg px-4 py-2 text-[13px] text-gray-400 cursor-pointer hover:bg-white/5"
                    >
                      Remover
                    </button>
                    <input ref={bannerRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setBannerFile(f);
                      setKey("bannerUrl", URL.createObjectURL(f));
                    }} />
                  </div>
                  {form.bannerUrl && (
                    <div className="h-24 rounded-xl overflow-hidden border border-white/10 relative">
                      {form.bannerUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                        <video src={form.bannerUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <img src={form.bannerUrl} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                </Section>

                <Section title="Cor Sólida / Preset do Banner">
                  <div className="grid grid-cols-4 gap-2">
                    {BANNER_PRESETS.map(b => (
                      <button 
                         key={b.color} 
                         onClick={() => setKey("bannerColor", b.color)} 
                         className="border-2 rounded-xl h-[50px] relative flex items-end justify-center pb-1.5 cursor-pointer hover:opacity-90"
                         style={{ 
                            backgroundColor: b.color, 
                            borderColor: form.bannerColor === b.color ? accentColor : "transparent" 
                         }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: luminance(b.color) > 0.5 ? "#1f2937" : "#f3f4f6" }}>{b.label}</span>
                      </button>
                    ))}
                    <label 
                       className="border-2 rounded-xl h-[50px] relative flex items-end justify-center pb-1.5 cursor-pointer"
                       style={{ 
                          background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                          borderColor: form.bannerColor && !BANNER_PRESETS.find(p=>p.color===form.bannerColor) ? accentColor : "transparent"
                       }}
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow-md">Custom</span>
                      <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setKey("bannerColor", e.target.value)} />
                    </label>
                  </div>
                </Section>
                
                <Section title="Efeito Rede Temático">
                  <p className="m-0 mb-3.5 text-[13px] text-gray-400 leading-relaxed">
                    A cor de destaque mistura suavemente círculos luminosos visíveis atrás do teu conteúdo.
                  </p>
                  <div className="rounded-xl overflow-hidden border border-white/10 h-[120px] relative">
                    <ThemeBg color={accentColor} mode={form.themeMode} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className={`text-xs ${form.themeMode === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Visualização Fundo da Rede</span>
                    </div>
                  </div>
                </Section>
              </div>
            )}
          </div>

          {/* Right Panel (Live Preview) */}
          <div className="w-[280px] shrink-0 border-l border-white/5 flex flex-col bg-white/[0.02]">
            <div className="p-4 py-3.5 border-b border-white/5 shrink-0">
              <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-gray-500">Pré-visualização</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 relative custom-scrollbar">
              
              <div className={`rounded-2xl overflow-hidden border-[1.5px] relative pb-4 shadow-xl backdrop-blur-xl ${form.themeMode === 'light' ? 'bg-white/40' : 'bg-black/25'}`} style={{ borderColor: `${accentColor}30` }}>
                <ThemeBg color={accentColor} mode={form.themeMode} />
                
                <div 
                   className="h-[90px] relative bg-cover bg-center overflow-hidden"
                   style={{ 
                      backgroundImage: form.bannerUrl && !form.bannerUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? `url('${form.bannerUrl}')` : form.bannerColor || `linear-gradient(135deg, ${accentColor}80, ${accentColor}20)` 
                   }}
                >
                  {form.bannerUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) && (
                     <video src={form.bannerUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />
                  )}
                  <div className="absolute inset-0 z-10" style={{ background: `linear-gradient(to bottom, transparent 40%, ${form.themeMode === "light" ? "rgba(249,250,251,1)" : "rgba(9,9,11,1)"} 100%)` }} />
                </div>
                
                <div className="px-3.5 relative z-10" style={{ background: form.themeMode === "light" ? "rgba(249,250,251,1)" : "rgba(9,9,11,1)" }}>
                  <div className="mt-[-28px] relative inline-block">
                     <div className="rounded-full border-2 border-alpha-bg bg-[#1e1e2e] relative inline-flex shrink-0">
                       <Avatar src={form.avatarUrl} name={form.displayName} size="lg" className="!w-14 !h-14 border" style={{ borderColor: accentColor }} />
                     </div>
                     <div className="w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white absolute bottom-0.5 right-0.5 z-10" />
                  </div>
                  
                  <div className="mt-1.5">
                    <p className="m-0 text-[15px] leading-tight font-bold truncate">
                      <DisplayName profile={form} fallbackName={form.displayName} baseColor={accentColor} />
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] mb-2" style={{ color: form.themeMode === "light" ? "#6b7280" : "#9ca3af" }}>@{form.username}</p>
                    
                    
                    {form.status && <p className="m-0 mb-2 text-[11px] italic" style={{ color: accentColor }}><EmojiRenderer content={form.status} emojiSize={11} /></p>}
                    
                    <p className="m-0 mb-3.5 text-[11px] leading-relaxed line-clamp-3" style={{ color: form.themeMode === "light" ? "#374151" : "#d1d5db" }}>
                      <EmojiRenderer content={form.bio} emojiSize={11} />
                    </p>
                    
                    <div className="flex gap-2">
                       <div className="flex-1 rounded-full py-1.5 text-[11px] text-white font-bold text-center" style={{ backgroundColor: accentColor }}>{form.primaryAction || 'Acção'}</div>
                       <div className="flex-1 border rounded-full py-1.5 text-[11px] text-center" style={{ borderColor: `${accentColor}40`, color: form.themeMode === "light" ? "#374151" : "#d1d5db" }}>Mensagem</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-3.5 border-t border-white/5 shrink-0 bg-black/20">
          <button 
             onClick={onClose} 
             className="bg-transparent text-gray-400 border border-white/10 rounded-xl px-6 py-2.5 text-[13px] font-bold cursor-pointer hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
             onClick={() => onSave(form, { avatar: avatarFile, banner: bannerFile })} 
             className="text-white border-none rounded-xl px-7 py-2.5 text-[13px] font-bold cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02]"
             style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px ${accentColor}60` }}
          >
            ✓ Guardar
          </button>
        </div>
        
      </div>
    </div>
  );
}
