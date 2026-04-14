import { useState, useRef, useEffect } from "react";

// ─── dados de demo ────────────────────────────────────────────────────────────
const DEMO_USER = {
  displayName: "Hikari",
  username: "hikari_chan",
  status: "Exploring the skies",
  bio: "Magic academy student by day, dream walker by night. ✨ Collecting fragments of stars.",
  avatarUrl: "https://api.dicebear.com/8.x/adventurer/svg?seed=Hikari&backgroundColor=ffdfbf",
  bannerUrl: null,
  listening: "Starry Sky OST",
  stats: [
    { label: "Allies",  value: "12.4k" },
    { label: "Rank",    value: "Lv. 42" },
    { label: "Relics",  value: "89"    },
  ],
  primaryAction: "Party Up",
  quickActions: ["Gift", "Wink", "Cheer", "Duel"],
  communities: ["Star Walkers Guild", "Magic Academy"],
  sectionLabel: "Equipped Relics",
  relics: ["👑", "🌙", "❤️"],
  nameFont: "Playfair Display",
  nameEffect: "shimmer",
  nameColor: "#e879f9",
  themeColor: "#e879f9",
  themeMode: "light",
  chronicles: [
    { id:1, side:"left",  title:"Spring Festival",      quote:"Blossoms falling like snow... a magical day! 🌸", img:"https://images.unsplash.com/photo-1522383225652-3cf7602f6b5a?w=300&q=80" },
    { id:2, side:"right", title:"New Spell Learned",    quote:"Mastered the arcane arts of light and shadow. ✨", img:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=80" },
    { id:3, side:"left",  title:"Ichiraku Time!",       quote:"Nothing beats a warm bowl after a long quest. 🍜", img:"https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&q=80" },
    { id:4, side:"right", title:"Studying Runes",       quote:"Ancient texts hold the secrets of the stars. 📚",  img:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&q=80" },
    { id:5, side:"left",  title:"Journey Begins",       quote:"Setting sail towards the floating islands. 🌊",    img:"https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&q=80" },
    { id:6, side:"right", title:"Peaceful Evening",     quote:"Watching the sun dip below the astral sea. 🌅",   img:"https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=300&q=80" },
  ],
};

const FONT_OPTIONS = [
  { id:"playfair",  label:"Playfair",   value:"Playfair Display, serif",   sample:"Aa" },
  { id:"poppins",   label:"Poppins",    value:"Poppins, sans-serif",        sample:"Aa" },
  { id:"raleway",   label:"Raleway",    value:"Raleway, sans-serif",        sample:"Aa" },
  { id:"cinzel",    label:"Cinzel",     value:"Cinzel, serif",              sample:"Aa" },
  { id:"lobster",   label:"Lobster",    value:"Lobster, cursive",           sample:"Aa" },
  { id:"oswald",    label:"Oswald",     value:"Oswald, sans-serif",         sample:"Aa" },
  { id:"merriw",    label:"Merriweather",value:"Merriweather, serif",       sample:"Aa" },
  { id:"mono",      label:"Mono",       value:"'Space Mono', monospace",    sample:"Aa" },
];

const EFFECT_OPTIONS = [
  { id:"none",     label:"Sólido"   },
  { id:"shimmer",  label:"Shimmer"  },
  { id:"gradient", label:"Gradiente"},
  { id:"neon",     label:"Neon"     },
  { id:"rainbow",  label:"Rainbow"  },
  { id:"fire",     label:"Fogo"     },
];

const COLOR_PALETTE = [
  "#e879f9","#a855f7","#3b82f6","#06b6d4",
  "#10b981","#f59e0b","#ef4444","#f97316",
  "#ec4899","#ffffff","#000000","#64748b",
];

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

// ─── utilitários ─────────────────────────────────────────────────────────────
function hex2rgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function luminance(hex) {
  if (!hex?.startsWith("#")) return 0;
  const [r,g,b] = hex2rgb(hex);
  return (0.299*r + 0.587*g + 0.114*b)/255;
}

// ─── estilos de nome ─────────────────────────────────────────────────────────
function nameStyle(color, effect, font) {
  const base = { fontFamily: font, fontWeight:700, fontSize:"inherit", display:"inline-block" };
  if (effect==="shimmer")  return { ...base, background:`linear-gradient(90deg,${color},#fff,${color})`, backgroundSize:"200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"shimmer 2.5s linear infinite" };
  if (effect==="gradient") return { ...base, background:`linear-gradient(135deg,${color},#fff)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" };
  if (effect==="neon")     return { ...base, color, textShadow:`0 0 8px ${color},0 0 24px ${color}60` };
  if (effect==="rainbow")  return { ...base, background:"linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)", backgroundSize:"200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"shimmer 3s linear infinite" };
  if (effect==="fire")     return { ...base, background:"linear-gradient(0deg,#ff4500,#ff8c00,#ffd700)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" };
  return { ...base, color };
}

// ─── background temático ──────────────────────────────────────────────────────
function ThemeBg({ color, mode }) {
  const [r,g,b] = color?.startsWith("#") ? hex2rgb(color) : [232,121,249];
  const isLight = mode==="light";
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
      <div style={{ position:"absolute", inset:0, background: isLight ? `#f9fafb` : `#09090b` }} />
      <div style={{ position:"absolute", top:"-20%", left:"-10%",  width:"60%", height:"60%", borderRadius:"50%", background:`rgba(${r},${g},${b},${isLight?0.18:0.12})`, filter:"blur(120px)" }} />
      <div style={{ position:"absolute", bottom:"-10%", right:"-10%", width:"50%", height:"50%", borderRadius:"50%", background:`rgba(${r},${g},${b},${isLight?0.14:0.09})`, filter:"blur(100px)" }} />
      <div style={{ position:"absolute", top:"40%", left:"30%",  width:"40%", height:"40%", borderRadius:"50%", background:`rgba(${r},${g},${b},${isLight?0.09:0.06})`, filter:"blur(80px)" }} />
    </div>
  );
}

// ─── avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size=56, color }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", overflow:"hidden", border:`3px solid ${color}`, flexShrink:0, background:"#1e1e2e" }}>
      {src
        ? <img src={src} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.4, fontWeight:700, color }}>{name?.[0]?.toUpperCase()}</div>
      }
    </div>
  );
}

// ─── timeline chronicle ───────────────────────────────────────────────────────
function Chronicle({ item, color, isLight }) {
  const textColor = isLight ? "#1f2937" : "#e5e7eb";
  const cardBg    = isLight ? "rgba(255,255,255,0.85)" : "rgba(20,20,30,0.85)";
  const isLeft    = item.side==="left";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, minHeight:160, position:"relative" }}>
      {isLeft ? (
        <>
          <div style={{ flex:1, paddingRight:32 }}>
            <div style={{ background:cardBg, backdropFilter:"blur(12px)", borderRadius:16, overflow:"hidden", boxShadow:`0 4px 24px rgba(0,0,0,0.1)`, border:`1px solid ${color}28` }}>
              <img src={item.img} alt={item.title} style={{ width:"100%", height:140, objectFit:"cover" }} />
              <div style={{ padding:"10px 14px 12px" }}>
                <p style={{ margin:0, fontWeight:700, fontSize:13, color:textColor }}>{item.title}</p>
              </div>
            </div>
          </div>
          <div style={{ width:14, height:14, borderRadius:"50%", background:color, flexShrink:0, boxShadow:`0 0 0 4px ${color}30`, zIndex:1 }} />
          <div style={{ flex:1, paddingLeft:32 }}>
            <p style={{ margin:0, fontSize:13, color: isLight?"#6b7280":"#9ca3af", fontStyle:"italic", lineHeight:1.6 }}>"{item.quote}"</p>
          </div>
        </>
      ) : (
        <>
          <div style={{ flex:1, paddingRight:32, textAlign:"right" }}>
            <p style={{ margin:0, fontSize:13, color: isLight?"#6b7280":"#9ca3af", fontStyle:"italic", lineHeight:1.6 }}>"{item.quote}"</p>
          </div>
          <div style={{ width:14, height:14, borderRadius:"50%", background:color, flexShrink:0, boxShadow:`0 0 0 4px ${color}30`, zIndex:1 }} />
          <div style={{ flex:1, paddingLeft:32 }}>
            <div style={{ background:cardBg, backdropFilter:"blur(12px)", borderRadius:16, overflow:"hidden", boxShadow:`0 4px 24px rgba(0,0,0,0.1)`, border:`1px solid ${color}28` }}>
              <img src={item.img} alt={item.title} style={{ width:"100%", height:140, objectFit:"cover" }} />
              <div style={{ padding:"10px 14px 12px" }}>
                <p style={{ margin:0, fontWeight:700, fontSize:13, color:textColor }}>{item.title}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
function LazerProfile({ user, onEdit }) {
  const isLight = user.themeMode==="light";
  const c = user.themeColor;
  const textPrimary   = isLight ? "#111827" : "#f3f4f6";
  const textSecondary = isLight ? "#6b7280" : "#9ca3af";
  const cardBg        = isLight ? "rgba(255,255,255,0.75)" : "rgba(18,18,28,0.75)";
  const borderCol     = `${c}35`;

  return (
    <div style={{ position:"relative", minHeight:"100vh", fontFamily:"system-ui, sans-serif" }}>
      <ThemeBg color={c} mode={user.themeMode} />

      {/* conteúdo */}
      <div style={{ position:"relative", zIndex:1 }}>

        {/* banner */}
        <div style={{ height:220, background: user.bannerUrl ? `url(${user.bannerUrl}) center/cover` : `linear-gradient(135deg, ${c}80, ${c}20)`, position:"relative" }}>
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, transparent 40%, ${isLight?"rgba(249,250,251,0.95)":"rgba(9,9,11,0.95)"} 100%)` }} />
          {/* botão editar */}
          <button onClick={onEdit} style={{ position:"absolute", top:16, right:16, background:`${c}cc`, border:"none", color:"#fff", borderRadius:20, padding:"7px 18px", fontSize:12, fontWeight:600, cursor:"pointer", backdropFilter:"blur(8px)" }}>
            ✏️ Editar Perfil
          </button>
        </div>

        {/* avatar + info */}
        <div style={{ maxWidth:680, margin:"0 auto", padding:"0 20px" }}>
          <div style={{ marginTop:-52, marginBottom:16 }}>
            <Avatar src={user.avatarUrl} name={user.displayName} size={96} color={c} />
            <div style={{ position:"relative", left:76, top:-14, width:14, height:14, borderRadius:"50%", background:"#22c55e", border:"2.5px solid white" }} />
          </div>

          {/* nome + status */}
          <h1 style={{ margin:"0 0 4px", fontSize:26, lineHeight:1.2 }}>
            <span style={nameStyle(c, user.nameEffect, user.nameFont)}>{user.displayName}</span>
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <span style={{ fontSize:13, color:textSecondary }}>@{user.username}</span>
            {user.status && <>
              <span style={{ color:textSecondary, fontSize:11 }}>•</span>
              <span style={{ fontSize:13, color:c, fontStyle:"italic" }}>{user.status}</span>
            </>}
          </div>

          {/* bio */}
          <p style={{ margin:"0 0 14px", fontSize:14, color:textPrimary, lineHeight:1.7 }}>{user.bio}</p>

          {/* listening */}
          {user.listening && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${c}18`, border:`1px solid ${c}40`, borderRadius:20, padding:"7px 14px", marginBottom:18 }}>
              <span style={{ fontSize:13 }}>🎵</span>
              <span style={{ fontSize:12, color:c, fontWeight:500 }}>Ouvindo: {user.listening}</span>
            </div>
          )}

          {/* stats */}
          <div style={{ display:"flex", gap:28, marginBottom:20 }}>
            {user.stats.map(s => (
              <div key={s.label}>
                <p style={{ margin:0, fontWeight:800, fontSize:20, color:textPrimary }}>{s.value}</p>
                <p style={{ margin:0, fontSize:11, color:textSecondary, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* acções */}
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <button style={{ flex:1, background:c, color:"#fff", border:"none", borderRadius:24, padding:"11px 0", fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:`0 4px 20px ${c}60` }}>
              👥 {user.primaryAction}
            </button>
            <button style={{ flex:1, background:"transparent", color:textPrimary, border:`1.5px solid ${borderCol}`, borderRadius:24, padding:"11px 0", fontWeight:600, fontSize:14, cursor:"pointer" }}>
              💬 Mensagem
            </button>
          </div>

          {/* quick actions */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:14 }}>
            {user.quickActions.map(a => (
              <button key={a} style={{ background:cardBg, backdropFilter:"blur(8px)", border:`1px solid ${borderCol}`, borderRadius:12, padding:"10px 0", fontSize:11, fontWeight:600, color:textSecondary, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                {a}
              </button>
            ))}
          </div>

          {/* comunidades */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:24 }}>
            {user.communities.map(co => (
              <div key={co} style={{ display:"flex", alignItems:"center", gap:6, background:cardBg, backdropFilter:"blur(8px)", border:`1px solid ${borderCol}`, borderRadius:20, padding:"6px 12px", fontSize:12, color:textSecondary, cursor:"pointer" }}>
                <span style={{ fontSize:14 }}>✦</span>{co}
              </div>
            ))}
          </div>

          {/* relíquias/ícones */}
          <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:textSecondary }}>{user.sectionLabel}</p>
          <div style={{ display:"flex", gap:10, marginBottom:32 }}>
            {user.relics.map((r,i) => (
              <div key={i} style={{ width:46, height:46, borderRadius:"50%", background:`linear-gradient(135deg,${c}60,${c}20)`, border:`2px solid ${c}60`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, cursor:"pointer" }}>{r}</div>
            ))}
            <div style={{ width:46, height:46, borderRadius:"50%", border:`2px dashed ${borderCol}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:textSecondary, cursor:"pointer" }}>+</div>
          </div>

          {/* timeline vertical */}
          <div style={{ position:"relative", paddingBottom:40 }}>
            {/* linha vertical */}
            <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:2, background:`linear-gradient(to bottom, ${c}80, ${c}20)`, transform:"translateX(-50%)" }} />
            <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
              {user.chronicles.map(ch => (
                <Chronicle key={ch.id} item={ch} color={c} isLight={isLight} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SECÇÃO DO EDITOR ─────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom:32 }}>
      <p style={{ margin:"0 0 14px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280" }}>{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <p style={{ margin:"0 0 6px", fontSize:12, color:"#9ca3af" }}>{label}</p>}
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
  borderRadius:8, padding:"10px 12px", color:"#f3f4f6", fontSize:14, outline:"none",
  boxSizing:"border-box",
};

// ─── MODAL DE EDIÇÃO ──────────────────────────────────────────────────────────
function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ ...user });
  const [tab, setTab]   = useState("perfil");
  const avatarRef       = useRef();
  const bannerRef       = useRef();

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  const tabs = ["perfil","aparência","tema","fundo"];
  const accentColor = form.themeColor || "#e879f9";

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.7)", backdropFilter:"blur(12px)" }}>
      <div style={{ width:"min(900px,96vw)", height:"min(740px,92vh)", background:"#0f0f17", borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 40px 100px rgba(0,0,0,0.8)" }}>

        {/* header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:18 }}>✦</span>
            <span style={{ fontWeight:700, fontSize:16, color:"#f3f4f6" }}>Editar Perfil Lazer</span>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#9ca3af", fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {/* tabs */}
        <div style={{ display:"flex", gap:0, padding:"0 24px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background:"transparent", border:"none", borderBottom:`2px solid ${tab===t?accentColor:"transparent"}`, padding:"12px 20px", fontSize:13, fontWeight:tab===t?700:500, color:tab===t?accentColor:"#6b7280", cursor:"pointer", textTransform:"capitalize", transition:"all 0.2s" }}>
              {t==="perfil"?"👤 Perfil":t==="aparência"?"✨ Aparência":t==="tema"?"🎨 Tema":"🖼️ Fundo"}
            </button>
          ))}
        </div>

        {/* corpo */}
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

          {/* painel esquerdo — formulário */}
          <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>

            {/* ── ABA PERFIL ── */}
            {tab==="perfil" && <>
              <Section title="Identidade">
                <Field label="Nome de exibição">
                  <input style={inputStyle} value={form.displayName} onChange={e=>set("displayName",e.target.value)} maxLength={32} />
                </Field>
                <Field label="Username">
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#6b7280", fontSize:14 }}>@</span>
                    <input style={{ ...inputStyle, paddingLeft:28 }} value={form.username} onChange={e=>set("username",e.target.value)} />
                  </div>
                </Field>
                <Field label="Frase de estado">
                  <input style={inputStyle} value={form.status} onChange={e=>set("status",e.target.value)} maxLength={60} placeholder="O que estás a viver..." />
                </Field>
                <Field label="Bio">
                  <textarea style={{ ...inputStyle, resize:"none", lineHeight:1.6 }} rows={3} value={form.bio} onChange={e=>set("bio",e.target.value)} maxLength={200} />
                  <p style={{ margin:"4px 0 0", fontSize:11, color:"#6b7280", textAlign:"right" }}>{form.bio?.length||0}/200</p>
                </Field>
                <Field label="A ouvir">
                  <input style={inputStyle} value={form.listening} onChange={e=>set("listening",e.target.value)} placeholder="Nome da música - Artista" />
                </Field>
              </Section>

              <Section title="Avatar">
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <Avatar src={form.avatarUrl} name={form.displayName} size={72} color={accentColor} />
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <button onClick={()=>avatarRef.current?.click()} style={{ background:accentColor, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      Mudar Avatar
                    </button>
                    <button onClick={()=>set("avatarUrl",null)} style={{ background:"transparent", color:"#9ca3af", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 18px", fontSize:13, cursor:"pointer" }}>
                      Remover
                    </button>
                    <input ref={avatarRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={e=>{
                      const f=e.target.files?.[0]; if(!f) return;
                      const url=URL.createObjectURL(f); set("avatarUrl",url);
                    }} />
                  </div>
                </div>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"#6b7280" }}>Suporta imagens e vídeos (MP4, WebM). O vídeo ficará animado no perfil.</p>
              </Section>

              <Section title="Estatísticas & Rótulos">
                {form.stats.map((s,i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
                    <input style={{ ...inputStyle, flex:1 }} placeholder="Valor" value={s.value} onChange={e=>{ const n=[...form.stats]; n[i]={...n[i],value:e.target.value}; set("stats",n); }} />
                    <input style={{ ...inputStyle, flex:1 }} placeholder="Rótulo" value={s.label} onChange={e=>{ const n=[...form.stats]; n[i]={...n[i],label:e.target.value}; set("stats",n); }} />
                  </div>
                ))}
              </Section>
            </>}

            {/* ── ABA APARÊNCIA ── */}
            {tab==="aparência" && <>
              <Section title="Fonte do Nome">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {FONT_OPTIONS.map(f => (
                    <button key={f.id} onClick={()=>set("nameFont",f.value)} style={{ background: form.nameFont===f.value ? `${accentColor}22` : "rgba(255,255,255,0.04)", border:`1.5px solid ${form.nameFont===f.value?accentColor:"rgba(255,255,255,0.08)"}`, borderRadius:10, padding:"12px 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <span style={{ fontFamily:f.value, fontSize:20, color: form.nameFont===f.value?accentColor:"#d1d5db", fontWeight:700 }}>{f.sample}</span>
                      <span style={{ fontSize:9, color: form.nameFont===f.value?accentColor:"#6b7280", fontWeight:600, textTransform:"uppercase" }}>{f.label}</span>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Efeito do Nome">
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {EFFECT_OPTIONS.map(e => (
                    <button key={e.id} onClick={()=>set("nameEffect",e.id)} style={{ background: form.nameEffect===e.id ? `${accentColor}22` : "rgba(255,255,255,0.04)", border:`1.5px solid ${form.nameEffect===e.id?accentColor:"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"8px 18px", fontSize:13, color: form.nameEffect===e.id?accentColor:"#9ca3af", cursor:"pointer", fontWeight:600, transition:"all 0.15s" }}>
                      {e.label}
                    </button>
                  ))}
                </div>
                {/* pré-visualização do efeito */}
                <div style={{ marginTop:14, padding:"16px", background:"rgba(255,255,255,0.04)", borderRadius:10, border:"1px solid rgba(255,255,255,0.07)", textAlign:"center" }}>
                  <span style={{ ...nameStyle(accentColor, form.nameEffect, form.nameFont), fontSize:22 }}>{form.displayName||"O teu nome"}</span>
                </div>
              </Section>

              <Section title="Cor do Nome">
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
                  {COLOR_PALETTE.map(c => (
                    <button key={c} onClick={()=>set("nameColor",c)} style={{ width:30, height:30, borderRadius:"50%", background:c, border:`2.5px solid ${form.nameColor===c?"#fff":"transparent"}`, cursor:"pointer", outline: c==="#ffffff" ? "1px solid rgba(255,255,255,0.2)" : "none" }} />
                  ))}
                  <label style={{ width:30, height:30, borderRadius:"50%", background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", cursor:"pointer", position:"relative", flexShrink:0 }}>
                    <input type="color" value={form.nameColor||"#ffffff"} onChange={e=>set("nameColor",e.target.value)} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                  </label>
                </div>
              </Section>

              <Section title="Banner do Perfil">
                <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                  <button onClick={()=>bannerRef.current?.click()} style={{ background:accentColor, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Carregar Imagem/Vídeo</button>
                  <button onClick={()=>set("bannerUrl",null)} style={{ background:"transparent", color:"#9ca3af", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer" }}>Remover</button>
                  <input ref={bannerRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={e=>{
                    const f=e.target.files?.[0]; if(!f) return;
                    set("bannerUrl",URL.createObjectURL(f));
                  }} />
                </div>
                {form.bannerUrl && <div style={{ height:80, borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}><img src={form.bannerUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} /></div>}
                <p style={{ margin:"8px 0 0", fontSize:11, color:"#6b7280" }}>Suporta imagens estáticas e vídeos em loop (MP4, WebM).</p>
              </Section>
            </>}

            {/* ── ABA TEMA ── */}
            {tab==="tema" && <>
              <Section title="Modo">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {["light","dark"].map(m => (
                    <button key={m} onClick={()=>set("themeMode",m)} style={{ background: form.themeMode===m?`${accentColor}22`:"rgba(255,255,255,0.04)", border:`1.5px solid ${form.themeMode===m?accentColor:"rgba(255,255,255,0.08)"}`, borderRadius:12, padding:"20px 0", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:28 }}>{m==="light"?"☀️":"🌙"}</span>
                      <span style={{ fontSize:13, fontWeight:600, color: form.themeMode===m?accentColor:"#9ca3af", textTransform:"capitalize" }}>{m==="light"?"Claro":"Escuro"}</span>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Cor de Destaque">
                <p style={{ margin:"0 0 12px", fontSize:12, color:"#6b7280" }}>Esta cor mistura-se com o tema escolhido e aparece por todo o perfil.</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                  {COLOR_PALETTE.map(c => (
                    <button key={c} onClick={()=>{ set("themeColor",c); set("nameColor",c); }} style={{ width:36, height:36, borderRadius:"50%", background:c, border:`3px solid ${form.themeColor===c?"#fff":"transparent"}`, cursor:"pointer", boxShadow: form.themeColor===c?`0 0 0 2px ${c}`:"none", outline: c==="#ffffff" ? "1px solid rgba(255,255,255,0.2)" : "none" }} />
                  ))}
                  <label style={{ width:36, height:36, borderRadius:"50%", background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", cursor:"pointer", position:"relative", flexShrink:0, border:"3px solid transparent" }}>
                    <input type="color" value={form.themeColor||"#e879f9"} onChange={e=>{ set("themeColor",e.target.value); }} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                  </label>
                </div>
                {/* pré-visualização do tema */}
                <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", position:"relative" }}>
                  <div style={{ height:60, background:`linear-gradient(135deg,${form.themeColor||accentColor}80,${form.themeColor||accentColor}20)` }} />
                  <div style={{ padding:"12px 16px 16px", background: form.themeMode==="light"?"rgba(249,250,251,0.95)":"rgba(9,9,11,0.95)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:`${form.themeColor||accentColor}40`, border:`2px solid ${form.themeColor||accentColor}` }} />
                      <div>
                        <p style={{ margin:0, fontWeight:700, fontSize:14, color: form.themeMode==="light"?"#111827":"#f3f4f6" }}>
                          <span style={nameStyle(form.nameColor||form.themeColor, form.nameEffect, form.nameFont)}>{form.displayName||"O teu nome"}</span>
                        </p>
                        <p style={{ margin:0, fontSize:11, color: form.themeMode==="light"?"#6b7280":"#9ca3af" }}>@{form.username}</p>
                      </div>
                    </div>
                    <div style={{ marginTop:10, display:"flex", gap:6 }}>
                      <div style={{ background:form.themeColor||accentColor, borderRadius:20, padding:"5px 14px", fontSize:11, color:"#fff", fontWeight:600 }}>Acção</div>
                      <div style={{ background:`${form.themeColor||accentColor}18`, border:`1px solid ${form.themeColor||accentColor}40`, borderRadius:20, padding:"5px 14px", fontSize:11, color:form.themeMode==="light"?"#374151":"#d1d5db" }}>Mensagem</div>
                    </div>
                  </div>
                </div>
              </Section>
            </>}

            {/* ── ABA FUNDO ── */}
            {tab==="fundo" && <>
              <Section title="Cor de Fundo do Banner">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {BANNER_PRESETS.map(b => (
                    <button key={b.color} onClick={()=>set("bannerColor",b.color)} style={{ background:b.color, border:`2px solid ${form.bannerColor===b.color?accentColor:"transparent"}`, borderRadius:10, height:50, cursor:"pointer", display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:6, position:"relative" }}>
                      <span style={{ fontSize:10, color: luminance(b.color)>0.5?"#1f2937":"#f3f4f6", fontWeight:600 }}>{b.label}</span>
                    </button>
                  ))}
                  <label style={{ background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", border:`2px solid ${form.bannerColor?.startsWith("c")?accentColor:"transparent"}`, borderRadius:10, height:50, cursor:"pointer", position:"relative", display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:6 }}>
                    <span style={{ fontSize:10, color:"#fff", fontWeight:600 }}>Custom</span>
                    <input type="color" onChange={e=>set("bannerColor",e.target.value)} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                  </label>
                </div>
              </Section>

              <Section title="Manchas de cor (fundo da rede)">
                <p style={{ margin:"0 0 14px", fontSize:13, color:"#9ca3af", lineHeight:1.6 }}>
                  A cor de destaque que escolheste no separador Tema vai criar manchas suaves no fundo da tua rede — visível para todos que visitam o teu perfil.
                </p>
                <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", height:120, position:"relative" }}>
                  <ThemeBg color={form.themeColor} mode={form.themeMode} />
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:12, color: form.themeMode==="light"?"#6b7280":"#9ca3af" }}>Pré-visualização do fundo</span>
                  </div>
                </div>
              </Section>
            </>}
          </div>

          {/* painel direito — preview */}
          <div style={{ width:280, borderLeft:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", background:"rgba(255,255,255,0.02)" }}>
            <div style={{ padding:"16px 16px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ margin:0, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280" }}>Pré-visualização</p>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:16, position:"relative" }}>
              {/* mini preview do perfil */}
              <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", position:"relative" }}>
                <ThemeBg color={form.themeColor} mode={form.themeMode} />
                {/* banner */}
                <div style={{ height:90, background: form.bannerUrl ? `url(${form.bannerUrl}) center/cover` : form.bannerColor ? form.bannerColor : `linear-gradient(135deg,${accentColor}80,${accentColor}20)`, position:"relative" }}>
                  <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom,transparent 40%,${form.themeMode==="light"?"rgba(249,250,251,0.95)":"rgba(9,9,11,0.95)"} 100%)` }} />
                </div>
                <div style={{ padding:"0 14px 16px", position:"relative", zIndex:1, background: form.themeMode==="light"?"rgba(249,250,251,0.95)":"rgba(9,9,11,0.95)" }}>
                  <div style={{ marginTop:-28 }}>
                    <Avatar src={form.avatarUrl} name={form.displayName} size={56} color={accentColor} />
                  </div>
                  <div style={{ marginTop:6 }}>
                    <p style={{ margin:0, fontSize:15, fontWeight:700 }}>
                      <span style={nameStyle(form.nameColor||accentColor, form.nameEffect, form.nameFont)}>{form.displayName||"Nome"}</span>
                    </p>
                    <p style={{ margin:"2px 0 6px", fontSize:11, color: form.themeMode==="light"?"#6b7280":"#9ca3af" }}>@{form.username}</p>
                    {form.status && <p style={{ margin:"0 0 8px", fontSize:11, color:accentColor, fontStyle:"italic" }}>{form.status}</p>}
                    <p style={{ margin:"0 0 10px", fontSize:11, color: form.themeMode==="light"?"#374151":"#d1d5db", lineHeight:1.5 }}>{form.bio?.slice(0,60)}{form.bio?.length>60?"…":""}</p>
                    <div style={{ display:"flex", gap:6 }}>
                      <div style={{ flex:1, background:accentColor, borderRadius:14, padding:"6px 0", fontSize:11, color:"#fff", fontWeight:600, textAlign:"center" }}>{form.primaryAction}</div>
                      <div style={{ flex:1, background:"transparent", border:`1px solid ${accentColor}40`, borderRadius:14, padding:"6px 0", fontSize:11, color: form.themeMode==="light"?"#374151":"#d1d5db", textAlign:"center" }}>Mensagem</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, padding:"14px 24px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} style={{ background:"transparent", color:"#9ca3af", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 24px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={()=>onSave(form)} style={{ background:accentColor, color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 20px ${accentColor}60` }}>
            ✓ Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(DEMO_USER);
  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(false);

  function handleSave(newUser) {
    setUser(newUser);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@700&family=Raleway:wght@700&family=Cinzel:wght@700&family=Lobster&family=Oswald:wght@700&family=Merriweather:wght@700&family=Space+Mono:wght@700&display=swap');
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:4px; }
      `}</style>

      <LazerProfile user={user} onEdit={() => setEditing(true)} />

      {editing && <EditModal user={user} onClose={() => setEditing(false)} onSave={handleSave} />}

      {saved && (
        <div style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", background:"#22c55e", color:"#fff", borderRadius:20, padding:"10px 24px", fontSize:13, fontWeight:700, zIndex:2000, boxShadow:"0 8px 32px rgba(34,197,94,0.4)", animation:"fadeIn 0.3s ease" }}>
          ✓ Perfil guardado com sucesso!
        </div>
      )}
    </>
  );
}