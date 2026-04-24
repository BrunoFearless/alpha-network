'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const MODES = [
  { id: 'lazer',     label: 'Lazer',      icon: '🎮', href: '/main/lazer',     color: '#22C55E', description: 'Diversão & Jogos' },
  { id: 'creator',   label: 'Criador',    icon: '🎨', href: '/main/creator',   color: '#A855F7', description: 'Criação & Arte' },
  { id: 'developer', label: 'Developer',  icon: '⚙️', href: '/main/developer', color: '#0EA5E9', description: 'Dev & Código' },
  { id: 'community', label: 'Comunidade', icon: '👥', href: '/main/community', color: '#F97316', description: 'Servidores & Chat' },
  { id: 'messages',  label: 'Mensagens',  icon: '💬', href: '/main/messages',  color: '#6366F1', description: 'Chat Global & DMs' },
  { id: 'alpha-ai',  label: 'Minha IA',   icon: '✨', href: '/main/alpha-ai',  color: '#A78BFA', description: 'Personalizar IA' },
  { id: 'bots',      label: 'Bots',       icon: '🤖', href: '/main/bots',      color: '#EC4899', description: 'Automação IA' },
];

interface SidebarProps {
  activeModes?: string[];
  collapsed?: boolean;
}

export function Sidebar({ activeModes = [], collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação de modos"
      className="bg-alpha-bg flex flex-col h-full min-h-0 transition-all duration-200"
      style={{ width: collapsed ? '64px' : '280px' }}
    >
      {/* Header */}
      {!collapsed && (
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '8px',
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '700',
            color: '#A5E600',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            opacity: 0.8,
          }}>
            ✨ Meus Modos
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: collapsed ? '12px 8px' : '12px 12px', overflowY: 'auto' }}>
        {MODES.map(mode => {
          const isActive = pathname.startsWith(mode.href);
          const isEnabled = mode.id === 'alpha-ai' || mode.id === 'messages' || activeModes.includes(mode.id);
          const isDisabled = !isEnabled;

          return (
            <Link
              key={mode.id}
              href={isEnabled ? mode.href : '/main'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                padding: collapsed ? '12px' : '12px 14px',
                borderRadius: '12px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                position: 'relative',
                overflow: 'hidden',
                background: isActive 
                  ? `linear-gradient(135deg, ${mode.color}20, ${mode.color}10)`
                  : 'rgba(255,255,255,0.02)',
                border: isActive 
                  ? `1.5px solid ${mode.color}40`
                  : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isActive 
                  ? `0 0 20px ${mode.color}20, inset 0 0 20px ${mode.color}08`
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = isActive 
                    ? `linear-gradient(135deg, ${mode.color}30, ${mode.color}15)`
                    : `rgba(${parseInt(mode.color.slice(1,3), 16)}, ${parseInt(mode.color.slice(3,5), 16)}, ${parseInt(mode.color.slice(5,7), 16)}, 0.08)`;
                  el.style.borderColor = isActive 
                    ? `${mode.color}60`
                    : `${mode.color}40`;
                  el.style.transform = 'translateX(2px)';
                  el.style.boxShadow = `0 4px 16px ${mode.color}25, inset 0 0 20px ${mode.color}12`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = isActive 
                    ? `linear-gradient(135deg, ${mode.color}20, ${mode.color}10)`
                    : 'rgba(255,255,255,0.02)';
                  el.style.borderColor = isActive 
                    ? `${mode.color}40`
                    : 'rgba(255,255,255,0.06)';
                  el.style.transform = 'translateX(0)';
                  el.style.boxShadow = isActive 
                    ? `0 0 20px ${mode.color}20, inset 0 0 20px ${mode.color}08`
                    : 'none';
                }
              }}
            >
              {/* Ícone Grande */}
              <div style={{
                fontSize: collapsed ? '28px' : '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: isActive ? `drop-shadow(0 0 8px ${mode.color}60)` : 'none',
                transition: 'filter 0.25s ease',
                flexShrink: 0,
              }}>
                {mode.icon}
              </div>

              {/* Texto */}
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isActive ? mode.color : '#E8E0F0',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.25s ease',
                  }}>
                    {mode.label}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isActive ? `${mode.color}CC` : '#9890B8',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                    transition: 'color 0.25s ease',
                  }}>
                    {mode.description}
                  </div>
                </div>
              )}

              {/* Indicador Ativo */}
              {!collapsed && isActive && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: mode.color,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  boxShadow: `0 0 12px ${mode.color}`,
                  flexShrink: 0,
                }} />
              )}

              {/* Indicador Colapsado */}
              {collapsed && isActive && (
                <div style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: mode.color,
                  boxShadow: `0 0 10px ${mode.color}`,
                }} />
              )}

              {/* Background animado no hover */}
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div style={{
          padding: '12px 12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '11px',
          color: '#504870',
          textAlign: 'center',
          opacity: 0.6,
        }}>
          🚀 Alpha Network Hub
        </div>
      )}
    </nav>
  );
}
