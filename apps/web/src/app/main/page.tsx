'use client';
// Ambiente Alpha — página de entrada da Alpha Network

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { useChatStore } from '@/store/chat.store';
import { useNotificationStore } from '@/store/useNotificationStore';
import { api } from '@/lib/api';
import AmbientCustomizer, { AmbientSettings, CustomText, DEFAULT_SETTINGS } from './AmbientCustomizer';

const ALPHA_MODULES = [
  { id: 'lazer',     label: 'Lazer',     emoji: '🎮', color: '#22c55e', path: '/main/lazer',     desc: 'Feed social · Reações · Comunidades' },
  { id: 'creator',   label: 'Creator',   emoji: '✍️',  color: '#a855f7', path: '/main/creator',   desc: 'Artigos · Portfólio' },
  { id: 'developer', label: 'Developer', emoji: '💻', color: '#3b82f6', path: '/main/developer', desc: 'Projetos · Ficheiros' },
  { id: 'community', label: 'Community', emoji: '🏘️', color: '#f97316', path: '/main/community', desc: 'Servidores · Canais' },
  { id: 'alpha-ai',  label: 'Minha IA',  emoji: '🤖', color: '#ec4899', path: '/main/alpha-ai',  desc: 'Alpha Core · Assistente' },
  { id: 'bots',      label: 'Bots',      emoji: '⚙️', color: '#14b8a6', path: '/main/bots',      desc: 'Automações' },
  { id: 'messages',  label: 'Mensagens', emoji: '💬', color: '#6366f1', path: '/main/messages',  desc: 'DMs · Privadas' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada'; if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde'; return 'Boa noite';
}

// ─── DraggableWidget ───────────────────────────────────────────────────────────────
function DraggableWidget({ defaultPos, onPosChange, children, style, zIndex }: {
  defaultPos: { x: number; y: number };
  onPosChange: (pos: { x: number; y: number }) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  zIndex?: number;
}) {
  // Usar ref para posição live — evita stale closure no onPointerUp
  const livePos = useRef(defaultPos);
  const [renderPos, setRenderPos] = useState(defaultPos);
  const [hov, setHov] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    // Só arrasta com botão esquerdo e não em inputs/buttons
    if (e.button !== 0) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current = { active: true, sx: e.clientX, sy: e.clientY, px: livePos.current.x, py: livePos.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.active) return;
    const nx = Math.max(0, Math.min(93, dragState.current.px + ((e.clientX - dragState.current.sx) / window.innerWidth) * 100));
    const ny = Math.max(0, Math.min(88, dragState.current.py + ((e.clientY - dragState.current.sy) / window.innerHeight) * 100));
    livePos.current = { x: nx, y: ny };
    setRenderPos({ x: nx, y: ny });
  };

  const onPointerUp = () => {
    if (dragState.current.active) {
      dragState.current.active = false;
      setIsDragging(false);
      onPosChange(livePos.current); // usa ref — valor garantidamente actual
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${renderPos.x}%`,
        top: `${renderPos.y}%`,
        zIndex: isDragging ? 50 : (zIndex ?? 10),
        userSelect: 'none',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : hov ? 'grab' : 'default',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Handle visual discreto — visível ao hover */}
      {hov && !isDragging && (
        <div style={{
          position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6, fontSize: 9, color: 'rgba(255,255,255,0.7)',
          padding: '2px 8px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 100,
        }}>✥ arrastar</div>
      )}
      {children}
    </div>
  );
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function Clock({ accent, glass }: { accent: string; glass: React.CSSProperties }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const hh = String(time.getHours()).padStart(2,'0'), mm = String(time.getMinutes()).padStart(2,'0'), ss = String(time.getSeconds()).padStart(2,'0');
  const day = time.toLocaleDateString('pt-PT', { weekday:'long', day:'2-digit', month:'long' });
  const year = time.getFullYear(), month = time.getMonth(), dayNum = time.getDate();
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month+1, 0).getDate();
  const calDays: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const monthName = time.toLocaleDateString('pt-PT',{month:'long'});
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div style={{...glass,padding:'14px 18px'}}>
        <div style={{fontFamily:"'Courier New',monospace",fontSize:44,fontWeight:800,color:'#fff',lineHeight:1,letterSpacing:2}}>
          {hh}<span style={{opacity:0.4}}>:</span>{mm}<span style={{fontSize:20,opacity:0.35,marginLeft:4}}>{ss}</span>
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:4,textTransform:'capitalize'}}>{day}</div>
      </div>
      <div style={{...glass,padding:'10px 12px',minWidth:172}}>
        <div style={{fontSize:11,fontWeight:700,color:'#fff',textAlign:'center',marginBottom:6,textTransform:'capitalize'}}>{monthName} {year}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,textAlign:'center'}}>
          {['D','S','T','Q','Q','S','S'].map((d,i)=><div key={i} style={{fontSize:8,color:'#fff',opacity:0.3,paddingBottom:2}}>{d}</div>)}
          {calDays.map((d,i)=>(
            <div key={i} style={{fontSize:9,color:'#fff',opacity:d==null?0:d===dayNum?1:0.5,fontWeight:d===dayNum?800:400,background:d===dayNum?accent:'transparent',borderRadius:4,padding:'1px 0'}}>{d??''}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Music Player ─────────────────────────────────────────────────────────────
function MusicPlayerWidget({ glass, accent }: { glass: React.CSSProperties, accent: string }) {
  const [progress, setProgress] = useState(30);
  // Fake progress loop
  useEffect(() => { const t = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.5), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{ ...glass, padding: '12px', display: 'flex', alignItems: 'center', gap: 14, width: 280 }}>
      {/* Cover */}
      <div style={{ width: 56, height: 56, borderRadius: 12, background: `url(https://i.pinimg.com/736x/87/4a/af/874aaf2260ffc3f91572c6c3df22d0c2.jpg) center/cover`, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0 }} />
      {/* Info & Controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Dusk till Dawn</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Alpha Records</div>
        </div>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: accent, borderRadius: 2 }} />
          </div>
        </div>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', opacity: 0.8 }}>
          <div style={{ fontSize: 12, cursor: 'pointer' }}>⏮</div>
          <div style={{ fontSize: 16, cursor: 'pointer' }}>⏸</div>
          <div style={{ fontSize: 12, cursor: 'pointer' }}>⏭</div>
          <div style={{ fontSize: 12, cursor: 'pointer' }}>♡</div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGridWidget({ glass, accent }: { glass: React.CSSProperties, accent: string }) {
  const time = new Date();
  const year = time.getFullYear(), month = time.getMonth(), dayNum = time.getDate();
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month+1, 0).getDate();
  const calDays: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const monthName = time.toLocaleDateString('pt-PT',{month:'long'});
  return (
    <div style={{ ...glass, padding: '16px 20px', minWidth: 240 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>{monthName} {year}</div>
        <div style={{ fontSize: 10, color: accent, fontWeight: 700, padding: '4px 8px', background: `${accent}22`, borderRadius: 6 }}>Hoje</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, textAlign: 'center' }}>
        {['D','S','T','Q','Q','S','S'].map((d,i)=><div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, paddingBottom: 4 }}>{d}</div>)}
        {calDays.map((d,i)=>(
          <div key={i} style={{
            fontSize: 11, color: d === dayNum ? '#fff' : 'rgba(255,255,255,0.8)', opacity: d == null ? 0 : 1,
            fontWeight: d === dayNum ? 800 : 500,
            background: d === dayNum ? accent : 'rgba(255,255,255,0.03)',
            borderRadius: 8, padding: '6px 0',
            border: d === dayNum ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.05)'
          }}>{d ?? ''}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsBar({ glass, postCount, friendCount, communityCount, notifCount }: any) {
  const items = [['📝',postCount,'Posts'],['👥',friendCount,'Amigos'],['🏘️',communityCount,'Communities'],['🔔',notifCount,'Alertas']];
  return (
    <div style={{...glass,padding:'10px 18px',display:'flex',gap:20,alignItems:'center'}}>
      {items.map(([icon,val,label],i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:13}}>{icon}</span>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#fff',lineHeight:1}}>{val}</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
          </div>
          {i<items.length-1 && <div style={{width:1,height:24,background:'rgba(255,255,255,0.08)',marginLeft:10}}/>}
        </div>
      ))}
    </div>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ user, accent, glass, onLogout }: any) {
  const p = user?.profile;
  const name = p?.displayName||p?.username||'Alpha';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8,width:210}}>
      <div style={{...glass,padding:'12px 14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {p?.avatarUrl
            ? <img src={p.avatarUrl} alt={name} style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:`2px solid ${accent}`}}/>
            : <div style={{width:38,height:38,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'#fff'}}>{name.slice(0,2).toUpperCase()}</div>
          }
          <div style={{flex:1,overflow:'hidden'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>@{p?.username||'user'}</div>
          </div>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px #22c55e'}}/>
        </div>
      </div>
      {user?.alphaAI?.isActive && (
        <div style={{...glass,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,borderRadius:'50%',background:'#ec4899',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>🤖</div>
          <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:'#fff'}}>{user.alphaAI.name||'Minha IA'}</div><div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>Assistente Ativo</div></div>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#ec4899',boxShadow:'0 0 6px #ec4899'}}/>
        </div>
      )}
      {p?.listening && (
        <div style={{...glass,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,borderRadius:6,background:'#1db954',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>♫</div>
          <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:10,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.listening}</div><div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>A ouvir agora</div></div>
        </div>
      )}
      <button onClick={onLogout} style={{...glass,padding:'8px 14px',border:'1px solid rgba(239,68,68,0.2)',cursor:'pointer',fontSize:11,color:'rgba(239,68,68,0.7)',fontWeight:600,textAlign:'center',transition:'all 0.2s'}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.15)'}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'}}>
        Sair da Rede ↗
      </button>
    </div>
  );
}

// ─── Module Layout ───────────────────────────────────────────────────────────
function ModuleLayout({ modules, activeModes, accent, glassBorder, badges, onNavigate, onToggle, toggling, layout }: any) {
  const [hovered, setHovered] = useState<string|null>(null);
  const isGrid    = layout === 'grid';
  const isSidebar = layout === 'sidebar';

  const containerStyle: React.CSSProperties = isGrid
    ? { display:'grid', gridTemplateColumns:'repeat(4,72px)', gap:16, padding:8 }
    : isSidebar
    ? { display:'flex', flexDirection:'column', gap:10, padding:'12px 10px',
        background:'rgba(255,255,255,0.04)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
        border:`1px solid rgba(255,255,255,0.12)`, borderRadius:24 }
    // dock: posicionado por DraggableWidget
    : { display:'flex', flexDirection:'column', alignItems:'center', gap:8, maxWidth:640 };

  const icons = modules.map((mod: any, idx: number) => {
    const isActive = activeModes.includes(mod.id) || mod.id === 'messages';
    const isHov    = hovered === mod.id;
    const badge    = badges[mod.id] || 0;
    return (
      <div key={mod.id} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, animation:`dockIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${idx*0.06}s both` }}>
        <button
          onClick={()=>isActive?onNavigate(mod.path):onToggle(mod.id)}
          onMouseEnter={()=>setHovered(mod.id)} onMouseLeave={()=>setHovered(null)}
          disabled={toggling===mod.id}
          style={{ width:isHov?58:50, height:isHov?58:50, borderRadius:isHov?18:15, background:isActive?`linear-gradient(135deg,${mod.color}cc,${mod.color}77)`:'rgba(255,255,255,0.07)', border:`1.5px solid ${isActive?mod.color+'80':glassBorder}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:isHov?26:22, transition:`all var(--anim-speed, 0.3s) cubic-bezier(0.34,1.56,0.64,1)`, transform:isHov?'translateY(-10px)':'translateY(0)', boxShadow:isActive&&isHov?`0 14px 36px ${mod.color}66`:isActive?`0 4px 18px ${mod.color}44`:'none', opacity:toggling===mod.id?0.5:1, position:'relative' }}>
          {toggling===mod.id ? <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> : <span>{mod.emoji}</span>}
          {!isActive && <div style={{position:'absolute',inset:0,borderRadius:'inherit',background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:10,color:'rgba(255,255,255,0.7)',fontWeight:800}}>+</span></div>}
          {badge>0 && <div style={{position:'absolute',top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:'#ef4444',border:'2px solid rgba(10,10,20,0.9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff',padding:'0 3px'}}>{badge>99?'99+':badge}</div>}
        </button>
        {isActive && <div style={{width:4,height:4,borderRadius:'50%',background:mod.color,marginTop:4,boxShadow:`0 0 6px ${mod.color}`}}/>}
        {isHov && <div style={{position:'absolute',bottom:-22,fontSize:9,color:'rgba(255,255,255,0.6)',fontWeight:700,whiteSpace:'nowrap',background:'rgba(0,0,0,0.7)',padding:'2px 6px',borderRadius:4}}>{mod.label}</div>}
      </div>
    );
  });

  if (isGrid || isSidebar) {
    return <div style={containerStyle}>{icons}</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:`1px solid rgba(255,255,255,0.14)`, borderRadius:28, padding:'10px 20px', display:'flex', gap:8, alignItems:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08)', overflowX:'auto', maxWidth:'100%' }}>
        {icons}
      </div>
      <div style={{fontSize:9,color:'rgba(255,255,255,0.2)',letterSpacing:1.5,marginTop:4}}>CLIQUE PARA ENTRAR · + PARA ATIVAR</div>
    </div>
  );
}

// ─── Background Renderer ──────────────────────────────────────────────────────
// blur em px extra para esconder borda do blur
const blurPad = 10;
function AmbientBackground({ settings, bannerUrl, parallax }: { settings: AmbientSettings; bannerUrl?: string|null; parallax: {x:number, y:number} }) {
  const blur = settings.blurIntensity ?? 0;
  const isParallax = settings.parallaxEffect ?? false;
  // Expande mais a imagem se parallax estiver ativo para não mostrar as bordas
  const pPad = isParallax ? 20 : 0;
  const mediaStyle: React.CSSProperties = {
    position:'absolute', inset:`-${blurPad + pPad}px`,
    width:`calc(100% + ${(blurPad + pPad)*2}px)`, height:`calc(100% + ${(blurPad + pPad)*2}px)`,
    objectFit:'cover',
    filter:`blur(${blur}px) brightness(${settings.wallpaperFilter === 'lighten' ? 0.9 : 0.6}) saturate(1.4)`,
    transform: isParallax ? `translate(${parallax.x}px, ${parallax.y}px)` : 'none',
    transition: 'transform 0.1s ease-out', // Suaviza o movimento do mouse
  };

  const getOverlay = () => {
    switch (settings.wallpaperFilter) {
      case 'none': return null;
      case 'lighten': return <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,0.15)',mixBlendMode:'overlay'}}/>;
      case 'tint': return <div style={{position:'absolute',inset:0,background:settings.accent,opacity:0.25,mixBlendMode:'color'}}/>;
      case 'darken':
      default: return <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(5,5,10,0.2),rgba(5,5,10,0.75))'}}/>;
    }
  };

  const renderMedia = () => {
    if (settings.wallpaperType === 'banner' && bannerUrl) {
      return <img src={bannerUrl} alt="" style={mediaStyle}/>;
    }
    if ((settings.wallpaperType === 'image' || settings.wallpaperType === 'video') && settings.wallpaperUrl) {
      return settings.wallpaperType === 'video'
        ? <video src={settings.wallpaperUrl} autoPlay muted loop playsInline style={mediaStyle}/>
        : <img src={settings.wallpaperUrl} alt="" style={mediaStyle}/>;
    }
    if (settings.wallpaperType === 'gradient' && settings.wallpaperGradient) {
      return <div style={{position:'absolute',inset:0,background:settings.wallpaperGradient}}/>;
    }
    if (settings.wallpaperType === 'mesh') {
      return <div style={{position:'absolute',inset:`-${blurPad + pPad}px`,width:`calc(100% + ${(blurPad + pPad)*2}px)`,height:`calc(100% + ${(blurPad + pPad)*2}px)`,background:`radial-gradient(circle at 15% 50%, ${settings.accent}4d, transparent 50%), radial-gradient(circle at 85% 30%, ${settings.accent}80, transparent 50%), radial-gradient(circle at 50% 80%, ${settings.accent}4d, transparent 50%), linear-gradient(135deg, #0f1016, #000)`,filter:`blur(${blur}px)`,animation:'mesh 15s ease-in-out infinite alternate',backgroundSize:'200% 200%'}}/>;
    }
    // Fallback default
    return <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 20% 20%,${settings.accent}33 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,${settings.accent}22 0%,transparent 55%),linear-gradient(160deg,#09090b 0%,#0f0f1a 100%)`}}/>;
  };

  return (
    <div style={{position:'absolute',inset:0,zIndex:0,overflow:'hidden'}}>
      {renderMedia()}
      {getOverlay()}
      {settings.wallpaperNoise && (
        <div style={{position:'absolute',inset:0,pointerEvents:'none',opacity:0.04,mixBlendMode:'overlay',backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}/>
      )}
    </div>
  );
}

// ─── Glass style ───────────────────────────────────────────────────────────────
function buildGlass(settings: AmbientSettings): React.CSSProperties {
  const { material, panelBorders, accent } = settings;
  const isNeon = panelBorders === 'neon';
  const isNone = panelBorders === 'none';
  
  let borderStyle = '1px solid rgba(255,255,255,0.18)';
  if (isNone) borderStyle = 'none';
  else if (isNeon) borderStyle = `1px solid ${accent}66`;

  const base: React.CSSProperties = {
    backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
    borderRadius: 18,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)',
    border: borderStyle,
    boxShadow: isNeon 
      ? `inset 0 0 12px ${accent}22, 0 8px 32px rgba(0,0,0,0.4), 0 0 8px ${accent}44`
      : 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1), 0 8px 32px rgba(0,0,0,0.4)',
  };

  if (material === 'flat') return {
    ...base,
    background: 'linear-gradient(135deg, rgba(16,16,28,0.75) 0%, rgba(10,10,20,0.6) 100%)',
    border: isNone ? 'none' : (isNeon ? `1px solid ${accent}66` : '1px solid rgba(255,255,255,0.14)'),
  };
  if (material === 'neuro') return {
    ...base,
    background: 'linear-gradient(135deg, rgba(20,20,35,0.6) 0%, rgba(12,12,22,0.45) 100%)',
    border: isNone ? 'none' : (isNeon ? `1px solid ${accent}66` : '1px solid rgba(255,255,255,0.10)'),
    boxShadow: isNeon
      ? `inset 0 1px 0 rgba(255,255,255,0.12), 6px 6px 14px rgba(0,0,0,0.5), inset 0 0 12px ${accent}33`
      : 'inset 0 1px 0 rgba(255,255,255,0.12), 6px 6px 14px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.04)',
  };
  return base; // glass
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AmbientePage() {
  const router = useRouter();
  const { user, setUser, accessToken, logout } = useAuthStore();
  const { feedPosts, friends, myCommunities, friendRequests, fetchFeed, fetchFriends, fetchMyCommunities } = useLazerStore();
  const { conversations, fetchConversations } = useChatStore();
  const { notifications, fetchNotifications } = useNotificationStore();
  const [toggling, setToggling] = useState<string|null>(null);
  const [mounted, setMounted] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [settings, setSettings] = useState<AmbientSettings>(DEFAULT_SETTINGS);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const profile = user?.profile;
  const activeModes = profile?.activeModes ?? [];
  const name = profile?.displayName||profile?.username||'Alpha';

  // Load settings: localStorage > profile accent
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('alpha_ambient');
      if (saved) {
        const parsed = JSON.parse(saved) as AmbientSettings;
        // Migração: garante que widgetPositions tem todos os campos novos (greeting, dock)
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          widgetPositions: { ...DEFAULT_SETTINGS.widgetPositions, ...(parsed.widgetPositions || {}) },
        });
        return;
      }
    } catch {}
    setSettings({ ...DEFAULT_SETTINGS, accent: profile?.nameColor||profile?.auroraTheme||'#6366f1', font: profile?.nameFont||'Outfit' });
  }, []);

  // Só fazer fetch quando o token estiver disponível
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    fetchFeed();
    fetchFriends();
    fetchMyCommunities();
    fetchConversations();
    fetchNotifications();
  }, [user?.id]);

  // Auto-save de settings (incluindo posições) no localStorage
  useEffect(() => {
    if (!mounted) return; // não guardar antes de carregar
    try { localStorage.setItem('alpha_ambient', JSON.stringify(settings)); } catch {}
  }, [settings, mounted]);

  const glass = useMemo(() => buildGlass(settings), [settings.material, settings.panelBorders, settings.accent]);
  const accent = settings.accent;
  const glassBorder = 'rgba(255,255,255,0.1)';

  const myPostCount = feedPosts.filter(p=>p.authorId===user?.id).length;
  const pendingReqs = friendRequests.filter(r=>r.toUserId===user?.id&&r.status==='pending').length;
  const unreadNotifs = notifications.filter(n=>!n.read).length;
  const unreadMsgs = useMemo(() => conversations.filter(c=>{ const last=c.messages?.[c.messages.length-1]; return last&&last.senderId!==user?.id; }).length, [conversations,user?.id]);
  const badges: Record<string,number> = { lazer: pendingReqs+unreadNotifs, messages: unreadMsgs };

  async function toggleMode(modeId: string) {
    setToggling(modeId);
    const newModes=[...activeModes,modeId];
    try {
      await api.patch('/users/me/modes',{modes:newModes});
      if(user){ setUser({...user,profile:user.profile?{...user.profile,activeModes:newModes}:user.profile},accessToken!); router.push(`/main/${modeId}`); }
    } catch {} finally { setToggling(null); }
  }

  const lastModule = activeModes.length>0?ALPHA_MODULES.find(m=>m.id===activeModes[0]):null;

  const animSpeedMap = { fast: '0.15s', normal: '0.3s', smooth: '0.5s', cinematic: '0.8s' };
  const currentSpeed = animSpeedMap[settings.animationSpeed || 'normal'];

  return (
    <div 
      onMouseMove={e => {
        if (settings.parallaxEffect) {
          setMousePos({ x: (e.clientX / window.innerWidth - 0.5) * -30, y: (e.clientY / window.innerHeight - 0.5) * -30 });
        }
      }}
      style={{
        position:'relative', width:'100%', height:'100vh', overflow:'hidden',
        fontFamily:`'${settings.font}','system-ui',sans-serif`,
        letterSpacing: `${settings.letterSpacing ?? 0}px`,
        lineHeight: settings.lineHeight ?? 1.2,
        '--anim-speed': currentSpeed,
      } as React.CSSProperties}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${settings.font.replace(/ /g,'+')}:wght@300;400;600;700;800;900&display=swap');
        ${settings.titleFont && settings.titleFont !== settings.font ? `@import url('https://fonts.googleapis.com/css2?family=${settings.titleFont.replace(/ /g,'+')}:wght@300;400;600;700;800;900&display=swap');` : ''}
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dockIn { from{opacity:0;transform:translateY(30px) scale(0.7)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes glow { 0%,100%{text-shadow:0 0 40px ${accent}66} 50%{text-shadow:0 0 80px ${accent}cc,0 0 120px ${accent}44} }
        @keyframes mesh { 0%{background-position:0% 0%} 50%{background-position:100% 100%} 100%{background-position:0% 0%} }
      `}</style>

      {/* Background */}
      <AmbientBackground settings={settings} bannerUrl={profile?.bannerUrl} parallax={mousePos} />

      {/* Foreground Layer (Personagem/Objeto) */}
      {mounted && settings.foregroundUrl && (
        <DraggableWidget
          defaultPos={settings.widgetPositions?.foreground || { x: 50, y: 50 }}
          onPosChange={pos => setSettings(s => ({ ...s, widgetPositions: { ...(s.widgetPositions || DEFAULT_SETTINGS.widgetPositions), foreground: pos } }))}
          zIndex={1} // Fica por trás dos vidros (zIndex: 10), mas à frente do background (zIndex: 0)
        >
          <div style={{ ...glass, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={settings.foregroundUrl} alt="Foreground" style={{ maxHeight: '85vh', maxWidth: '85vw', objectFit: 'contain', filter: 'drop-shadow(0 12px 36px rgba(0,0,0,0.4))', userSelect: 'none', pointerEvents: 'none', margin: '10px' }} />
          </div>
        </DraggableWidget>
      )}

      {/* Clock + Calendário — arrastável */}
      {mounted && (
        <DraggableWidget
          defaultPos={settings.widgetPositions?.clock || { x: 1.5, y: 2.5 }}
          onPosChange={pos => setSettings(s => ({ ...s, widgetPositions: { ...(s.widgetPositions || DEFAULT_SETTINGS.widgetPositions), clock: pos } }))}
        >
          <Clock accent={accent} glass={glass}/>
        </DraggableWidget>
      )}

      {/* User Card — arrastável */}
      <DraggableWidget
        defaultPos={settings.widgetPositions?.userCard || { x: 84, y: 2.5 }}
        onPosChange={pos => setSettings(s => ({ ...s, widgetPositions: { ...(s.widgetPositions || DEFAULT_SETTINGS.widgetPositions), userCard: pos } }))}
      >
        <UserCard user={user} accent={accent} glass={glass} onLogout={logout}/>
      </DraggableWidget>

      {/* Music Player — arrastável */}
      {mounted && settings.showMusicPlayer !== false && (
        <DraggableWidget
          defaultPos={settings.widgetPositions?.musicPlayer || { x: 84, y: 70 }}
          onPosChange={pos => setSettings(s => ({ ...s, widgetPositions: { ...(s.widgetPositions || DEFAULT_SETTINGS.widgetPositions), musicPlayer: pos } }))}
        >
          <MusicPlayerWidget accent={accent} glass={glass} />
        </DraggableWidget>
      )}

      {/* Calendar Grid — arrastável */}
      {mounted && settings.showCalendarGrid !== false && (
        <DraggableWidget
          defaultPos={settings.widgetPositions?.calendarGrid || { x: 1.5, y: 20 }}
          onPosChange={pos => setSettings(s => ({ ...s, widgetPositions: { ...(s.widgetPositions || DEFAULT_SETTINGS.widgetPositions), calendarGrid: pos } }))}
        >
          <CalendarGridWidget accent={accent} glass={glass} />
        </DraggableWidget>
      )}

      {/* Textos personalizados — arrastáveis */}
      {(settings.customTexts || []).map((t: CustomText) => (
        <DraggableWidget
          key={t.id}
          defaultPos={{ x: t.x, y: t.y }}
          onPosChange={pos => {
            const updated = (settings.customTexts || []).map((ct: CustomText) => ct.id === t.id ? { ...ct, ...pos } : ct);
            setSettings(s => ({ ...s, customTexts: updated }));
          }}
        >
          <div style={{ fontSize: t.fontSize, color: t.color, fontWeight: t.fontWeight, opacity: t.opacity,
            textShadow: '0 2px 12px rgba(0,0,0,0.5)', whiteSpace: 'pre-wrap', maxWidth: '40vw', lineHeight: 1.3 }}>
            {t.content}
          </div>
        </DraggableWidget>
      ))}

      {/* Edit button (bottom-right) */}
      <button
        onClick={()=>setCustomizerOpen(true)}
        style={{position:'absolute',bottom:90,right:20,zIndex:20,width:44,height:44,borderRadius:14,background:'rgba(255,255,255,0.03)',backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.7)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',boxShadow:'0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${accent}25`;(e.currentTarget as HTMLElement).style.borderColor=`${accent}80`;(e.currentTarget as HTMLElement).style.color='#fff';(e.currentTarget as HTMLElement).style.boxShadow=`0 4px 24px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.15)`;}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.15)';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.7)';(e.currentTarget as HTMLElement).style.boxShadow='0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';}}
        title="Personalizar Ambiente"
      >
        🎨
      </button>

      {/* Centro: saudação + nome + stats — arrastável */}
      <DraggableWidget
        defaultPos={settings.widgetPositions?.greeting || { x: 30, y: 36 }}
        onPosChange={pos => setSettings(s => ({ ...s, widgetPositions: { ...(s.widgetPositions || DEFAULT_SETTINGS.widgetPositions), greeting: pos } }))}
      >
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12, animation:`fadeIn ${currentSpeed === '0.8s' ? '1.2s' : '0.7s'} ease 0.15s both` }}>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',letterSpacing:5,textTransform:'uppercase',fontWeight:600}}>{getGreeting()}</div>
          <h1 style={{fontFamily:`'${settings.titleFont || settings.font}',sans-serif`,fontSize:'clamp(34px,5vw,60px)',fontWeight:900,color:'#fff',lineHeight:1.1,margin:0,animation:(settings.dynamicGlow ?? true) ? 'glow 4s ease-in-out infinite' : 'none'}}>{name}</h1>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.3)',fontWeight:500}}>{activeModes.length} módulo{activeModes.length!==1?'s':''} ativo{activeModes.length!==1?'s':''} · Alpha Network</div>
          <div style={{animation:'fadeIn 0.6s ease 0.3s both'}}>
            <StatsBar glass={glass} postCount={myPostCount} friendCount={friends.length} communityCount={myCommunities.length} notifCount={unreadNotifs+pendingReqs}/>
          </div>
          {lastModule && (
            <button onClick={()=>router.push(lastModule.path)}
              style={{marginTop:8,padding:'10px 28px',borderRadius:50,border:`1.5px solid ${accent}50`,background:`${accent}15`,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s',display:'flex',alignItems:'center',gap:8,boxShadow:`inset 0 1px 0 ${accent}30`}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${accent}30`;(e.currentTarget as HTMLElement).style.transform='scale(1.05)';(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${accent}44, inset 0 1px 0 ${accent}50`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${accent}15`;(e.currentTarget as HTMLElement).style.transform='scale(1)';(e.currentTarget as HTMLElement).style.boxShadow=`inset 0 1px 0 ${accent}30`;}}>
              <span>{lastModule.emoji}</span> Continuar em {lastModule.label}
            </button>
          )}
        </div>
      </DraggableWidget>

      {/* Dock — sempre arrastável em qualquer layout */}
      <DraggableWidget
        defaultPos={settings.widgetPositions?.dock || { x: 20, y: 87 }}
        onPosChange={pos => setSettings(s => ({ ...s, widgetPositions: { ...(s.widgetPositions || DEFAULT_SETTINGS.widgetPositions), dock: pos } }))}
      >
        <ModuleLayout modules={ALPHA_MODULES} activeModes={activeModes} accent={accent} glassBorder={glassBorder} badges={badges} onNavigate={(path:string)=>router.push(path)} onToggle={toggleMode} toggling={toggling} layout={settings.moduleLayout||'dock'}/>
      </DraggableWidget>

      {/* Customizer Drawer */}
      {customizerOpen && (
        <AmbientCustomizer
          settings={settings}
          onSettingsChange={setSettings}
          onClose={()=>setCustomizerOpen(false)}
          hasBanner={!!profile?.bannerUrl}
        />
      )}
    </div>
  );
}
