'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

// ─── Alpha Network Modules ────────────────────────────────────────────────────

const ALPHA_MODULES = [
  {
    id: 'lazer',
    label: 'Lazer',
    emoji: '🎮',
    color: '#22c55e',
    description: 'Feed social · Reações · Comunidades',
    path: '/main/lazer',
  },
  {
    id: 'creator',
    label: 'Creator',
    emoji: '✍️',
    color: '#a855f7',
    description: 'Artigos · Portfólio · Presença digital',
    path: '/main/creator',
  },
  {
    id: 'developer',
    label: 'Developer',
    emoji: '💻',
    color: '#3b82f6',
    description: 'Projetos · Ficheiros · Chat em tempo real',
    path: '/main/developer',
  },
  {
    id: 'community',
    label: 'Community',
    emoji: '🏘️',
    color: '#f97316',
    description: 'Servidores · Canais · Grupos',
    path: '/main/community',
  },
  {
    id: 'alpha-ai',
    label: 'Minha IA',
    emoji: '🤖',
    color: '#ec4899',
    description: 'Alpha Core · IA Pessoal · Assistente',
    path: '/main/alpha-ai',
  },
  {
    id: 'bots',
    label: 'Bots',
    emoji: '⚙️',
    color: '#14b8a6',
    description: 'Automações · Comandos personalizados',
    path: '/main/bots',
  },
  {
    id: 'messages',
    label: 'Mensagens',
    emoji: '💬',
    color: '#6366f1',
    description: 'DMs · Conversas privadas',
    path: '/main/messages',
  },
];

// ─── Avatar Fallback ──────────────────────────────────────────────────────────

function AvatarFallback({ name, size = 40, color = '#6366f1' }: { name: string; size?: number; color?: string }) {
  const initials = name?.slice(0, 2).toUpperCase() || 'AL';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#fff',
    }}>
      {initials}
    </div>
  );
}

// ─── Ambient Background ───────────────────────────────────────────────────────

function AmbientBg({ bannerUrl, accentColor }: { bannerUrl?: string | null; accentColor: string }) {
  if (bannerUrl) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35) saturate(1.4)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,5,10,0.3) 0%, rgba(5,5,10,0.85) 100%)' }} />
      </div>
    );
  }
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      background: `radial-gradient(ellipse at 20% 20%, ${accentColor}33 0%, transparent 60%),
                   radial-gradient(ellipse at 80% 80%, ${accentColor}22 0%, transparent 55%),
                   linear-gradient(160deg, #09090b 0%, #0f0f1a 100%)`,
    }} />
  );
}

// ─── Clock Widget ─────────────────────────────────────────────────────────────

function ClockWidget({ accentColor, glassBorder }: { accentColor: string; glassBorder: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  const dayName = time.toLocaleDateString('pt-PT', { weekday: 'long' });
  const dateStr = time.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

  // Calendar
  const year = time.getFullYear();
  const month = time.getMonth();
  const dayNum = time.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthName = time.toLocaleDateString('pt-PT', { month: 'long' });

  const glass = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${glassBorder}`,
    borderRadius: 18,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Clock */}
      <div style={{ ...glass, padding: '14px 20px' }}>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: 46, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: 3 }}>
          {hours}<span style={{ opacity: 0.5, animation: 'blink 1s step-start infinite' }}>:</span>{minutes}
          <span style={{ fontSize: 22, opacity: 0.4, marginLeft: 6 }}>{seconds}</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'capitalize' }}>
          {dayName} · {dateStr}
        </div>
      </div>

      {/* Mini Calendar */}
      <div style={{ ...glass, padding: '12px 14px', minWidth: 180 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 8, textTransform: 'capitalize' }}>
          {monthName} {year}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} style={{ fontSize: 9, color: '#fff', opacity: 0.35, fontWeight: 700, paddingBottom: 3 }}>{d}</div>
          ))}
          {calDays.map((d, i) => (
            <div key={i} style={{
              fontSize: 10, color: '#fff',
              opacity: d === null ? 0 : d === dayNum ? 1 : 0.55,
              fontWeight: d === dayNum ? 800 : 400,
              background: d === dayNum ? accentColor : 'transparent',
              borderRadius: 5, padding: '2px 0',
            }}>
              {d ?? ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────

function UserCard({
  user, accentColor, glassBorder, onLogout,
}: {
  user: any; accentColor: string; glassBorder: string; onLogout: () => void;
}) {
  const profile = user?.profile;
  const name = profile?.displayName || profile?.username || 'Alpha';
  const username = profile?.username || 'user';
  const avatarUrl = profile?.avatarUrl;
  const listening = profile?.listening;

  const glass = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${glassBorder}`,
    borderRadius: 18,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 210 }}>
      {/* User info */}
      <div style={{ ...glass, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accentColor}` }} />
          ) : (
            <AvatarFallback name={name} size={38} color={accentColor} />
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>@{username}</div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
        </div>
      </div>

      {/* AI Assistant shortcut */}
      {user?.alphaAI?.isActive && (
        <div style={{ ...glass, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {user.alphaAI.avatarUrl ? (
            <img src={user.alphaAI.avatarUrl} alt="IA" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🤖</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{user.alphaAI.name || 'Minha IA'}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Assistente Ativo</div>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 6px #ec4899', animation: 'pulse 2s infinite' }} />
        </div>
      )}

      {/* Listening badge */}
      {listening && (
        <div style={{ ...glass, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>♫</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listening}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>A ouvir agora</div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          ...glass, padding: '8px 14px', border: `1px solid rgba(239,68,68,0.2)`,
          cursor: 'pointer', fontSize: 11, color: 'rgba(239,68,68,0.7)', fontWeight: 600,
          textAlign: 'center', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)'; }}
      >
        Sair da Rede ↗
      </button>
    </div>
  );
}

// ─── Module Dock ──────────────────────────────────────────────────────────────

function ModuleDock({
  modules, activeModes, accentColor, glassBorder, onNavigate, onToggle, toggling,
}: {
  modules: typeof ALPHA_MODULES;
  activeModes: string[];
  accentColor: string;
  glassBorder: string;
  onNavigate: (path: string) => void;
  onToggle: (id: string) => void;
  toggling: string | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    }}>
      {/* Tooltip */}
      {tooltip && (
        <div style={{
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          border: `1px solid ${glassBorder}`, borderRadius: 12,
          padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600,
          whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}>
          {tooltip}
        </div>
      )}

      {/* Dock bar */}
      <div style={{
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: `1px solid ${glassBorder}`,
        borderRadius: 24,
        padding: '10px 18px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {modules.map(mod => {
          const isActive = activeModes.includes(mod.id) || mod.id === 'messages';
          const isHov = hovered === mod.id;
          const isLoading = toggling === mod.id;

          return (
            <div key={mod.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                onClick={() => {
                  if (isActive) {
                    onNavigate(mod.path);
                  } else {
                    onToggle(mod.id);
                  }
                }}
                onMouseEnter={() => { setHovered(mod.id); setTooltip(`${mod.label} · ${mod.description}`); }}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                title={mod.label}
                style={{
                  width: isHov ? 60 : 52,
                  height: isHov ? 60 : 52,
                  borderRadius: isHov ? 18 : 16,
                  background: isActive
                    ? `linear-gradient(135deg, ${mod.color}cc, ${mod.color}88)`
                    : 'rgba(255,255,255,0.08)',
                  border: `1.5px solid ${isActive ? mod.color + '80' : glassBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: isHov ? 28 : 24,
                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: isHov ? 'translateY(-8px)' : 'translateY(0)',
                  boxShadow: isActive && isHov
                    ? `0 12px 32px ${mod.color}66`
                    : isActive
                    ? `0 4px 16px ${mod.color}44`
                    : 'none',
                  opacity: isLoading ? 0.5 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isLoading ? (
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  mod.emoji
                )}

                {/* Inactive overlay */}
                {!isActive && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 'inherit',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, lineHeight: 1 }}>+</span>
                  </div>
                )}
              </button>

              {/* Active dot */}
              {isActive && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: mod.color, marginTop: 4,
                  boxShadow: `0 0 6px ${mod.color}`,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Hint text */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 500, letterSpacing: 1 }}>
        CLIQUE PARA ENTRAR · + PARA ATIVAR MÓDULO
      </div>
    </div>
  );
}

// ─── Greeting Banner ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AmbientePage() {
  const router = useRouter();
  const { user, setUser, accessToken, logout } = useAuthStore();
  const [toggling, setToggling] = useState<string | null>(null);

  const profile = user?.profile;
  const activeModes = profile?.activeModes ?? [];
  const name = profile?.displayName || profile?.username || 'Alpha';

  // Accent color from profile
  const accentColor = profile?.nameColor || profile?.auroraTheme || '#6366f1';
  const glassBorder = 'rgba(255,255,255,0.12)';

  async function toggleMode(modeId: string) {
    const isActive = activeModes.includes(modeId);
    if (isActive) {
      router.push(`/main/${modeId}`);
      return;
    }
    setToggling(modeId);
    const newModes = [...activeModes, modeId];
    try {
      await api.patch('/users/me/modes', { modes: newModes });
      if (user) {
        setUser(
          { ...user, profile: user.profile ? { ...user.profile, activeModes: newModes } : user.profile },
          accessToken!,
        );
        router.push(`/main/${modeId}`);
      }
    } catch {
      // falha silenciosa
    } finally {
      setToggling(null);
    }
  }

  function handleNavigate(path: string) {
    router.push(path);
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: "'Outfit', 'system-ui', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .ambient-page * { box-sizing: border-box; }
      `}</style>

      {/* Background */}
      <AmbientBg bannerUrl={profile?.bannerUrl} accentColor={accentColor} />

      {/* Top-left: Clock + Calendar */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, animation: 'fadeIn 0.6s ease both' }}>
        <ClockWidget accentColor={accentColor} glassBorder={glassBorder} />
      </div>

      {/* Top-right: User Card */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, animation: 'fadeIn 0.6s ease 0.1s both' }}>
        <UserCard
          user={user}
          accentColor={accentColor}
          glassBorder={glassBorder}
          onLogout={logout}
        />
      </div>

      {/* Center: Greeting */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        zIndex: 10,
        textAlign: 'center',
        animation: 'fadeIn 0.8s ease 0.2s both',
      }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
          {getGreeting()}
        </div>
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.1,
          margin: 0,
          textShadow: `0 0 60px ${accentColor}66, 0 0 120px ${accentColor}33`,
        }}>
          {name}
        </h1>
        <div style={{
          marginTop: 12,
          fontSize: 14,
          color: 'rgba(255,255,255,0.35)',
          fontWeight: 500,
        }}>
          Bem-vindo à Alpha Network · {activeModes.length} módulo{activeModes.length !== 1 ? 's' : ''} ativo{activeModes.length !== 1 ? 's' : ''}
        </div>

        {/* Quick access to last visited module */}
        {activeModes.length > 0 && (
          <button
            onClick={() => handleNavigate(`/main/${activeModes[0]}`)}
            style={{
              marginTop: 24,
              padding: '10px 28px',
              borderRadius: 50,
              border: `1.5px solid ${accentColor}60`,
              background: `${accentColor}20`,
              backdropFilter: 'blur(12px)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = `${accentColor}40`;
              (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}`;
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = `${accentColor}20`;
              (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}60`;
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            ▶ Continuar em {ALPHA_MODULES.find(m => m.id === activeModes[0])?.label || activeModes[0]}
          </button>
        )}
      </div>

      {/* Bottom: Module Dock */}
      <ModuleDock
        modules={ALPHA_MODULES}
        activeModes={activeModes}
        accentColor={accentColor}
        glassBorder={glassBorder}
        onNavigate={handleNavigate}
        onToggle={toggleMode}
        toggling={toggling}
      />
    </div>
  );
}
