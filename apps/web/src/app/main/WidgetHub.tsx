import React, { useMemo } from 'react';
import { AmbientSettings } from './AmbientCustomizer';

interface WidgetHubProps {
  open: boolean;
  onClose: () => void;
  settings: AmbientSettings;
  update: (partial: Partial<AmbientSettings>) => void;
}

export function WidgetHub({ open, onClose, settings, update }: WidgetHubProps) {
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 20,
    bottom: 20,
    right: open ? 20 : -400,
    width: 340,
    background: 'rgba(10,10,16,0.7)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    transition: 'right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: `'${settings.font}', sans-serif`,
    color: '#fff',
  };

  const WIDGETS = [
    { key: 'showClock', icon: '⏰', label: 'Relógio Digital', desc: 'Hora local e data' },
    { key: 'showCalendarGrid', icon: '📅', label: 'Calendário em Grelha', desc: 'Mês completo interativo' },
    { key: 'showMusicPlayer', icon: '🎵', label: 'Music Player', desc: 'Leitor de música (mock)' },
    { key: 'showWeather', icon: '🌤️', label: 'Meteorologia', desc: 'Clima atual e temperatura' },
    { key: 'showNotes', icon: '📝', label: 'Quick Notes', desc: 'Post-it de vidro para ideias' },
    { key: 'showLinks', icon: '🔗', label: 'Quick Links', desc: 'Atalhos para sites favoritos' },
    { key: 'showTimer', icon: '⏳', label: 'Focus Timer', desc: 'Pomodoro minimalista' },
    { key: 'showPet', icon: '👾', label: 'Alpha Pet', desc: 'O teu companheiro virtual' },
    { key: 'showUserCard', icon: '👤', label: 'User Card', desc: 'O teu perfil Alpha' },
    { key: 'showStats', icon: '📊', label: 'Alpha Stats', desc: 'Métricas da tua conta' },
  ] as const;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${settings.accent}20`, color: settings.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧩</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}>Widget Hub</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Gerador de Ambiente Modular</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {/* Global Settings for Widgets */}
        <div style={{ marginBottom: 20, padding: '12px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>Estilo Global dos Widgets</div>
          <button onClick={() => update({ widgetsGlass: !settings.widgetsGlass })}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
              background: settings.widgetsGlass ? `${settings.accent}15` : 'rgba(255,255,255,0.05)', border: `1px solid ${settings.widgetsGlass ? settings.accent : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{settings.widgetsGlass ? '💎' : '🫥'}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Efeito Glassmorphism</span>
            </div>
            <div style={{ width: 34, height: 20, borderRadius: 10, background: settings.widgetsGlass ? settings.accent : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', top: 2, left: settings.widgetsGlass ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WIDGETS.map(w => {
            const isActive = settings[w.key as keyof AmbientSettings] !== false;
            return (
              <div key={w.key}>
                <button onClick={() => update({ [w.key]: !isActive })}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.01)', border: `1px solid ${isActive ? settings.accent : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{w.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }}>{w.label}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{w.desc}</div>
                    </div>
                  </div>
                  <div style={{ width: 34, height: 20, borderRadius: 10, background: isActive ? settings.accent : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.2s' }}>
                    <div style={{ position: 'absolute', top: 2, left: isActive ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
                  </div>
                </button>

                {/* Sub-config for Clock */}
                {w.key === 'showClock' && isActive && (
                  <div style={{ marginTop: 8, padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {(['default', 'stack', 'minimal'] as const).map(s => (
                      <button key={s} onClick={() => update({ clockStyle: s })}
                        style={{ padding: '6px', borderRadius: 8, fontSize: 9, fontWeight: 700, cursor: 'pointer',
                          background: settings.clockStyle === s ? settings.accent : 'transparent',
                          color: settings.clockStyle === s ? '#fff' : 'rgba(255,255,255,0.4)',
                          border: `1px solid ${settings.clockStyle === s ? settings.accent : 'rgba(255,255,255,0.1)'}`,
                          textTransform: 'uppercase' }}>
                        {s === 'default' ? 'Padrão' : s === 'stack' ? 'Stack' : 'Min'}
                      </button>
                    ))}
                    <button onClick={() => update({ clockGlass: !settings.clockGlass })}
                      style={{ gridColumn: 'span 3', marginTop: 4, padding: '8px', borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: 'pointer',
                        background: settings.clockGlass ? 'rgba(255,255,255,0.05)' : settings.accent,
                        color: '#fff', border: 'none', transition: 'all 0.2s' }}>
                      {settings.clockGlass ? '🫥 Remover Fundo' : '💎 Aplicar Vidro'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
